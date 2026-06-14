export interface KOTItem {
  name: string;
  quantity: number;
  printed_qty?: number;
  price?: number;
  notes?: string;
}

export interface KOTData {
  tableName: string;
  serverName: string;
  items: KOTItem[];
  isAddition?: boolean;
  roundNumber?: number;
  orderId?: string;
  orderType?: string;
}

class ThermalPrinterService {
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;

  // Standard ESC/POS commands
  private ESC = "\x1b";
  private GS = "\x1d";
  
  // Initialization
  private INIT = `${this.ESC}@`;
  
  // Text format
  private ALIGN_LEFT = `${this.ESC}a0`;
  private ALIGN_CENTER = `${this.ESC}a1`;
  private ALIGN_RIGHT = `${this.ESC}a2`;
  
  private BOLD_ON = `${this.ESC}E1`;
  private BOLD_OFF = `${this.ESC}E0`;
  
  private TEXT_NORMAL = `${this.GS}!0`;
  private TEXT_DOUBLE_HEIGHT = `${this.GS}!\x01`;
  private TEXT_DOUBLE_WIDTH = `${this.GS}!\x10`;
  private TEXT_DOUBLE_BOTH = `${this.GS}!\x11`;
  
  // Paper Cut
  private CUT_PAPER = `${this.GS}V\x41\x03`; // Partial cut

  isConnected(): boolean {
    return this.device !== null && this.device.gatt?.connected === true;
  }

  async connect(): Promise<boolean> {
    try {
      if (!navigator.bluetooth) {
        throw new Error("Web Bluetooth API is not supported in this browser. Please use Chrome/Edge.");
      }

      // Common BLE printer service UUIDs (various Chinese/generic thermal printers)
      const PRINTER_SERVICE_UUIDS = [
        '000018f0-0000-1000-8000-00805f9b34fb', // Common generic printer
        'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Another common printer
        '0000ff00-0000-1000-8000-00805f9b34fb', // Chinese printer (FF00)
        '0000ffe0-0000-1000-8000-00805f9b34fb', // HM-10 / JDY-type modules
        '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC (Microchip) transparent UART
        '0000fff0-0000-1000-8000-00805f9b34fb', // FFF0 service (some Goojprt/Xprinter)
        '0000ae30-0000-1000-8000-00805f9b34fb', // AE30 service
        '0000fee7-0000-1000-8000-00805f9b34fb', // FEE7 (Tencent)
        '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // Nordic UART Service (NUS)
      ];

      this.device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: PRINTER_SERVICE_UUIDS,
      });

      this.device.addEventListener('gattserverdisconnected', this.onDisconnected);

      this.server = await this.device.gatt?.connect() || null;
      if (!this.server) throw new Error("Could not connect to GATT server.");

      // Try known services first
      let services = await this.server.getPrimaryServices();
      
      if (services.length === 0) {
        // Some printers need a small delay after connection before services are available
        await new Promise(resolve => setTimeout(resolve, 500));
        services = await this.server.getPrimaryServices();
      }

      if (services.length === 0) {
        throw new Error("No BLE services found on this device. It may not be a supported printer.");
      }
      
      // Find the first service with a writable characteristic
      for (const service of services) {
        try {
          const characteristics = await service.getCharacteristics();
          for (const char of characteristics) {
            if (char.properties.write || char.properties.writeWithoutResponse) {
              this.characteristic = char;
              console.log("Found writable characteristic:", char.uuid);
              break;
            }
          }
          if (this.characteristic) break;
        } catch (charErr) {
          // Some services may not allow characteristic enumeration, skip
          console.warn("Could not enumerate characteristics for service:", service.uuid, charErr);
        }
      }

      if (!this.characteristic) {
        throw new Error("Could not find a writable characteristic on this device.");
      }

      console.log("Bluetooth Printer Connected:", this.device.name);
      return true;
    } catch (error) {
      console.error("Printer connection failed:", error);
      throw error;
    }
  }


  async disconnect() {
    if (this.device && this.device.gatt?.connected) {
      this.device.gatt.disconnect();
    }
    this.cleanup();
  }

  private onDisconnected = () => {
    console.log("Printer disconnected");
    this.cleanup();
  }

  private cleanup() {
    this.device = null;
    this.server = null;
    this.characteristic = null;
  }

  private async writeBytes(data: Uint8Array) {
    if (!this.characteristic) throw new Error("Not connected to printer");
    
    // Bluetooth LE typically has a 20-512 byte MTU limit. 
    // We chunk the data to be safe (512 bytes is usually fine for modern devices, but let's do 100).
    const chunkSize = 100;
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      await this.characteristic.writeValue(chunk);
      // Small delay to prevent buffer overflow on cheap printers
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

  private encodeText(text: string): Uint8Array {
    // Basic ASCII encoding. For special chars, might need TextEncoder with specific code page
    const encoder = new TextEncoder();
    return encoder.encode(text);
  }

  // Format a line with left text and right text for 80mm paper (approx 48 chars)
  private formatLineLR(left: string, right: string, width = 48): string {
    const spaces = Math.max(0, width - left.length - right.length);
    return left + ' '.repeat(spaces) + right + '\n';
  }

  async printKOT(data: KOTData) {
    if (!this.isConnected()) {
      throw new Error("Printer is not connected");
    }

    const W = 32; // 58mm paper ≈ 32 chars
    const SEP = "-".repeat(W) + "\n";
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
    const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

    const typeLabels: Record<string, string> = {
      dine_in: "Dine In", takeaway: "Takeaway",
      delivery: "Delivery", nc: "NC",
    };

    // Helper: fit two values on one line, right-pad left side
    const row2 = (l: string, r: string) => {
      const pad = Math.max(1, W - l.length - r.length);
      return l + " ".repeat(pad) + r + "\n";
    };

    let receipt = this.INIT;

    // Title - bold, centered
    receipt += this.ALIGN_CENTER;
    receipt += this.BOLD_ON;
    receipt += data.isAddition ? "*** ADDITION ***\n" : "*** KOT ***\n";
    receipt += this.BOLD_OFF;
    receipt += SEP;

    // Info block - compact, 2 items per line
    receipt += this.ALIGN_LEFT;

    // Line 1: Table + Round (or just Table if round 1)
    const tableStr = `Table: ${data.tableName}`;
    if (data.roundNumber && data.roundNumber > 1) {
      receipt += row2(tableStr, `Round: ${data.roundNumber}`);
    } else {
      receipt += tableStr + "\n";
    }

    // Line 2: Server + Type
    const serverStr = `Server: ${data.serverName}`;
    const typeStr = data.orderType ? typeLabels[data.orderType] || data.orderType : "";
    if (typeStr) {
      receipt += row2(serverStr, typeStr);
    } else {
      receipt += serverStr + "\n";
    }

    // Line 3: Date + Time (single line)
    receipt += row2(dateStr, timeStr);

    receipt += SEP;

    // Items - "1x  Item Name" format
    let totalItems = 0;
    for (const item of data.items) {
      const deltaQty = item.quantity - (item.printed_qty || 0);
      if (deltaQty > 0) {
        receipt += this.BOLD_ON;
        receipt += `${deltaQty}x  ${item.name}\n`;
        receipt += this.BOLD_OFF;
        if (item.notes) {
          receipt += `    * ${item.notes}\n`;
        }
        totalItems += deltaQty;
      }
    }

    // Footer - compact
    receipt += SEP;
    receipt += `Total: ${totalItems} items\n`;

    if (data.isAddition) {
      receipt += this.ALIGN_CENTER;
      receipt += this.BOLD_ON;
      receipt += "** ADDITION ONLY **\n";
      receipt += this.BOLD_OFF;
    }

    receipt += "\n\n"; // Feed paper
    receipt += this.CUT_PAPER;

    await this.writeBytes(this.encodeText(receipt));
  }
}

export const thermalPrinterService = new ThermalPrinterService();
