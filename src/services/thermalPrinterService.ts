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

const STORAGE_KEY = "thermal_printer_device_id";
const CHAR_STORAGE_KEY = "thermal_printer_char_uuid";
const SERVICE_STORAGE_KEY = "thermal_printer_service_uuid";

class ThermalPrinterService {
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private connectionListeners: Array<(connected: boolean) => void> = [];

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

  // Common BLE printer service UUIDs
  private PRINTER_SERVICE_UUIDS = [
    '000018f0-0000-1000-8000-00805f9b34fb',
    'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
    '0000ff00-0000-1000-8000-00805f9b34fb',
    '0000ffe0-0000-1000-8000-00805f9b34fb',
    '49535343-fe7d-4ae5-8fa9-9fafd205e455',
    '0000fff0-0000-1000-8000-00805f9b34fb',
    '0000ae30-0000-1000-8000-00805f9b34fb',
    '0000fee7-0000-1000-8000-00805f9b34fb',
    '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
  ];

  /** Subscribe to connection state changes */
  onConnectionChange(listener: (connected: boolean) => void): () => void {
    this.connectionListeners.push(listener);
    return () => {
      this.connectionListeners = this.connectionListeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(connected: boolean) {
    this.connectionListeners.forEach(l => l(connected));
  }

  isConnected(): boolean {
    return this.device !== null && this.device.gatt?.connected === true;
  }

  /** Get connected device name */
  getDeviceName(): string | null {
    return this.device?.name || null;
  }

  async connect(): Promise<boolean> {
    try {
      if (!navigator.bluetooth) {
        throw new Error("Web Bluetooth API is not supported in this browser. Please use Chrome/Edge.");
      }

      this.device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: this.PRINTER_SERVICE_UUIDS,
      });

      this.device.addEventListener('gattserverdisconnected', this.onDisconnected);

      await this.connectToGATT();

      // Save device ID for auto-reconnect after page reload
      if (this.device.id) {
        localStorage.setItem(STORAGE_KEY, this.device.id);
      }

      console.log("Bluetooth Printer Connected:", this.device.name);
      this.notifyListeners(true);
      return true;
    } catch (error) {
      console.error("Printer connection failed:", error);
      throw error;
    }
  }

  /**
   * Auto-reconnect to previously paired printer after page reload.
   * Uses navigator.bluetooth.getDevices() — no user gesture needed.
   * Returns true if reconnected, false if no saved device or reconnect failed.
   */
  async tryAutoReconnect(): Promise<boolean> {
    try {
      const savedDeviceId = localStorage.getItem(STORAGE_KEY);
      if (!savedDeviceId) return false;

      // getDevices() returns previously-granted devices without user gesture
      if (!navigator.bluetooth?.getDevices) {
        console.warn("navigator.bluetooth.getDevices() not supported. Auto-reconnect unavailable.");
        return false;
      }

      const devices = await navigator.bluetooth.getDevices();
      const device = devices.find(d => d.id === savedDeviceId);

      if (!device) {
        console.log("Saved printer device not found in granted devices list.");
        // Don't clear storage — device might appear later
        return false;
      }

      this.device = device;
      this.device.addEventListener('gattserverdisconnected', this.onDisconnected);

      // Wait for device to be available (it may take a moment after page load)
      // Use watchAdvertisements if available, otherwise direct connect
      try {
        await this.connectToGATT();
        console.log("Auto-reconnected to printer:", this.device.name);
        this.notifyListeners(true);
        return true;
      } catch (gattError) {
        console.warn("GATT connect failed, trying with advertisement watch...", gattError);
        
        // Some browsers/devices need watchAdvertisements before GATT connect works
        if ('watchAdvertisements' in device) {
          return new Promise<boolean>((resolve) => {
            const timeout = setTimeout(() => {
              console.log("Auto-reconnect timed out waiting for advertisements.");
              resolve(false);
            }, 5000);

            const onAdvert = async () => {
              device.removeEventListener('advertisementreceived', onAdvert as any);
              clearTimeout(timeout);
              try {
                await this.connectToGATT();
                console.log("Auto-reconnected to printer via advertisement:", this.device!.name);
                this.notifyListeners(true);
                resolve(true);
              } catch (err) {
                console.error("GATT connect after advertisement failed:", err);
                resolve(false);
              }
            };

            device.addEventListener('advertisementreceived', onAdvert as any);
            (device as any).watchAdvertisements({ signal: AbortSignal.timeout(5000) }).catch(() => {
              clearTimeout(timeout);
              resolve(false);
            });
          });
        }

        return false;
      }
    } catch (error) {
      console.error("Auto-reconnect failed:", error);
      return false;
    }
  }

  /** Connect to GATT server and find writable characteristic */
  private async connectToGATT(): Promise<void> {
    if (!this.device?.gatt) throw new Error("No GATT on device");

    this.server = await this.device.gatt.connect();
    if (!this.server) throw new Error("Could not connect to GATT server.");

    // Try to reconnect to the exact same service+characteristic we used before
    const savedServiceUuid = localStorage.getItem(SERVICE_STORAGE_KEY);
    const savedCharUuid = localStorage.getItem(CHAR_STORAGE_KEY);

    if (savedServiceUuid && savedCharUuid) {
      try {
        const service = await this.server.getPrimaryService(savedServiceUuid);
        this.characteristic = await service.getCharacteristic(savedCharUuid);
        console.log("Reconnected to saved characteristic:", savedCharUuid);
        return;
      } catch {
        console.log("Saved characteristic not found, scanning all services...");
      }
    }

    // Fallback: scan all services for writable characteristic
    let services = await this.server.getPrimaryServices();
    
    if (services.length === 0) {
      await new Promise(resolve => setTimeout(resolve, 500));
      services = await this.server.getPrimaryServices();
    }

    if (services.length === 0) {
      throw new Error("No BLE services found on this device. It may not be a supported printer.");
    }
    
    for (const service of services) {
      try {
        const characteristics = await service.getCharacteristics();
        for (const char of characteristics) {
          if (char.properties.write || char.properties.writeWithoutResponse) {
            this.characteristic = char;
            // Save for fast reconnect next time
            localStorage.setItem(SERVICE_STORAGE_KEY, service.uuid);
            localStorage.setItem(CHAR_STORAGE_KEY, char.uuid);
            console.log("Found writable characteristic:", char.uuid);
            break;
          }
        }
        if (this.characteristic) break;
      } catch (charErr) {
        console.warn("Could not enumerate characteristics for service:", service.uuid, charErr);
      }
    }

    if (!this.characteristic) {
      throw new Error("Could not find a writable characteristic on this device.");
    }
  }


  async disconnect() {
    if (this.device && this.device.gatt?.connected) {
      this.device.gatt.disconnect();
    }
    // Clear saved device so it doesn't auto-reconnect
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(CHAR_STORAGE_KEY);
    localStorage.removeItem(SERVICE_STORAGE_KEY);
    this.cleanup();
    this.notifyListeners(false);
  }

  private onDisconnected = () => {
    console.log("Printer disconnected");
    this.cleanup();
    this.notifyListeners(false);
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
