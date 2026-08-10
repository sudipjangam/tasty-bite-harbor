import { Capacitor } from "@capacitor/core";

// Minimal Web Bluetooth typings (not part of the default TS DOM lib)
type BluetoothRemoteGATTCharacteristic = {
  uuid: string;
  properties: Record<string, boolean>;
  writeValue(value: BufferSource): Promise<void>;
};
type BluetoothRemoteGATTService = {
  uuid: string;
  getCharacteristic(uuid: string): Promise<BluetoothRemoteGATTCharacteristic>;
  getCharacteristics(): Promise<BluetoothRemoteGATTCharacteristic[]>;
};
type BluetoothRemoteGATTServer = {
  connected: boolean;
  connect(): Promise<BluetoothRemoteGATTServer>;
  disconnect(): void;
  getPrimaryService(uuid: string): Promise<BluetoothRemoteGATTService>;
  getPrimaryServices(): Promise<BluetoothRemoteGATTService[]>;
};
type BluetoothDevice = {
  id: string;
  name?: string;
  gatt?: BluetoothRemoteGATTServer;
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
};
type BluetoothNavigator = Navigator & {
  bluetooth?: {
    requestDevice(options: unknown): Promise<BluetoothDevice>;
    getDevices?(): Promise<BluetoothDevice[]>;
  };
};
import { nativePrinterBridge, getPaperWidth } from "./nativePrinterBridge";

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

export interface ReceiptData {
  restaurantName: string;
  address?: string;
  phone?: string;
  gstin?: string;
  billNumber: string;
  date: string;
  time: string;
  tableName?: string;
  customerName?: string;
  customerMobile?: string;
  items: { name: string; quantity: number; price: number }[];
  subtotal: number;
  cgst: number;
  sgst: number;
  discount: number;
  netAmount: number;
  currencySymbol: string;
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
  
  private TEXT_NORMAL = `${this.GS}!\x00`;
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
    if (Capacitor.isNativePlatform()) {
      return nativePrinterBridge.isConnected();
    }
    return this.device !== null && this.device.gatt?.connected === true;
  }

  /** Get connected device name */
  getDeviceName(): string | null {
    if (Capacitor.isNativePlatform()) {
      return nativePrinterBridge.getStatus().deviceName ?? null;
    }
    return this.device?.name || null;
  }

  async connect(): Promise<boolean> {
    try {
      if (!(navigator as BluetoothNavigator).bluetooth) {
        throw new Error("Web Bluetooth API is not available in this browser.");
      }

      const device = await (navigator as BluetoothNavigator).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: this.PRINTER_SERVICE_UUIDS
      });

      this.device = device;

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
   * Uses (navigator as BluetoothNavigator).bluetooth.getDevices() — no user gesture needed.
   * Returns true if reconnected, false if no saved device or reconnect failed.
   */
  async tryAutoReconnect(): Promise<boolean> {
    if (Capacitor.isNativePlatform()) {
      return nativePrinterBridge.tryAutoReconnect();
    }

    try {
      const savedDeviceId = localStorage.getItem(STORAGE_KEY);
      if (!savedDeviceId) return false;

      // getDevices() returns previously-granted devices without user gesture
      if (!(navigator as BluetoothNavigator).bluetooth?.getDevices) {
        console.warn("(navigator as BluetoothNavigator).bluetooth.getDevices() not supported. Auto-reconnect unavailable.");
        return false;
      }

      // Add a 1000ms delay to let the browser clean up previous connection
      await new Promise(resolve => setTimeout(resolve, 1000));

      const devices = await (navigator as BluetoothNavigator).bluetooth.getDevices();
      const device = devices.find(d => d.id === savedDeviceId);

      if (!device) {
        console.log("Saved printer device not found in granted devices list.");
        // Don't clear storage — device might appear later
        return false;
      }

      this.device = device;
      this.device.addEventListener('gattserverdisconnected', this.onDisconnected);

      const maxAttempts = 3;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          console.log(`Auto-reconnect attempt ${attempt}/${maxAttempts} for device:`, device.name);
          await this.connectToGATT();
          console.log("Auto-reconnected to printer:", this.device.name);
          this.notifyListeners(true);
          return true;
        } catch (gattError) {
          console.warn(`GATT connect attempt ${attempt} failed:`, gattError);
          if (attempt === maxAttempts) {
            // Last resort: check if watchAdvertisements can help
            if ('watchAdvertisements' in device) {
              console.log("Trying watchAdvertisements as last resort...");
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
          // Delay between retries
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }
      return false;
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
    // ── Native Android path: route via Bluetooth Serial plugin ───────────────
    if (Capacitor.isNativePlatform()) {
      await nativePrinterBridge.sendESCPOS(data);
      return;
    }

    // ── Web Bluetooth (GATT) path ─────────────────────────────────────────────
    if (!this.characteristic) throw new Error("Not connected to printer");
    
    // Bluetooth LE typically has a 20-512 byte MTU limit. 
    // We chunk the data to be safe.
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

  async printReceipt(data: ReceiptData) {
    const nativeConnected = Capacitor.isNativePlatform() && nativePrinterBridge.isConnected();
    const webConnected = !Capacitor.isNativePlatform() && this.isConnected();
    if (!nativeConnected && !webConnected) {
      throw new Error("Printer is not connected");
    }

    const W = getPaperWidth();
    const SEP = "-".repeat(W) + "\n";

    const row2 = (l: string, r: string) => {
      const pad = Math.max(1, W - l.length - r.length);
      return l + " ".repeat(pad) + r + "\n";
    };

    const formatItemRow = (name: string, qty: string, rate: string, amt: string) => {
      const qLen = W === 32 ? 3 : 4;
      const rLen = W === 32 ? 5 : 7;
      const aLen = W === 32 ? 6 : 8;
      
      const restLen = 1 + qLen + 1 + rLen + 1 + aLen;
      const nameLen = W - restLen;
      
      const n = name.substring(0, nameLen).padEnd(nameLen);
      const q = qty.substring(0, qLen).padStart(qLen);
      const r = rate.substring(0, rLen).padStart(rLen);
      const a = amt.substring(0, aLen).padStart(aLen);
      
      return `${n} ${q} ${r} ${a}\n`;
    };

    let receipt = this.INIT;

    // Header
    receipt += this.ALIGN_CENTER;
    receipt += this.BOLD_ON;
    receipt += this.TEXT_DOUBLE_HEIGHT;
    receipt += data.restaurantName + "\n";
    receipt += this.TEXT_NORMAL;
    receipt += this.BOLD_OFF;

    if (data.address) receipt += data.address + "\n";
    if (data.phone) receipt += `Ph: ${data.phone}\n`;
    if (data.gstin) receipt += `GSTIN: ${data.gstin}\n`;
    receipt += SEP;

    // Info
    receipt += this.ALIGN_LEFT;
    receipt += `Bill#: ${data.billNumber}\n`;
    if (data.tableName) receipt += `To: ${data.tableName}\n`;
    else if (data.customerName) receipt += `To: ${data.customerName}\n`;
    else receipt += `To: POS Order\n`;
    
    receipt += `Date: ${data.date}  Time: ${data.time}\n`;
    if (data.customerName && !data.tableName) receipt += `Guest: ${data.customerName}\n`;
    
    receipt += SEP;

    // Items Header
    receipt += this.ALIGN_CENTER;
    receipt += this.BOLD_ON;
    receipt += "Particulars\n";
    receipt += this.ALIGN_LEFT;
    receipt += formatItemRow("Item", "Qty", "Rate", "Amt");
    receipt += this.BOLD_OFF;
    receipt += SEP;

    // Items
    for (const item of data.items) {
      const qtyStr = item.quantity.toString();
      const rateStr = item.price.toFixed(0);
      const amtStr = (item.price * item.quantity).toFixed(0);
      receipt += formatItemRow(item.name, qtyStr, rateStr, amtStr);
    }
    receipt += SEP;

    // Totals
    receipt += row2("Sub Total:", data.subtotal.toFixed(2));
    if (data.cgst > 0) receipt += row2("CGST:", data.cgst.toFixed(2));
    if (data.sgst > 0) receipt += row2("SGST:", data.sgst.toFixed(2));
    if (data.discount > 0) receipt += row2("Discount:", "-" + data.discount.toFixed(2));
    
    receipt += SEP;
    receipt += this.BOLD_ON;
    receipt += this.TEXT_DOUBLE_HEIGHT;
    receipt += row2("Net Amount:", `${data.currencySymbol === '₹' ? 'Rs.' : data.currencySymbol}${data.netAmount.toFixed(2)}`);
    receipt += this.TEXT_NORMAL;
    receipt += this.BOLD_OFF;
    receipt += SEP;

    // Footer
    receipt += this.ALIGN_CENTER;
    receipt += "Thank You!\n";
    receipt += "Please visit again\n\n\n";

    receipt += this.CUT_PAPER;

    await this.writeBytes(this.encodeText(receipt));
  }
}

export const thermalPrinterService = new ThermalPrinterService();
