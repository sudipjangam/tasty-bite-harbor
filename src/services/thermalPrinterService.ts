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
import { nativePrinterBridge, getPaperWidth, getPaperSize } from "./nativePrinterBridge";

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
  serverName?: string;
  items: { name: string; quantity: number; price: number }[];
  subtotal: number;
  cgst: number;
  sgst: number;
  discount: number;
  netAmount: number;
  currencySymbol: string;
  /** UPI ID to embed as ESC/POS QR code at the bottom of the receipt */
  upiId?: string;
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

  // Common BLE printer service UUIDs (16-bit and 128-bit)
  private PRINTER_SERVICE_UUIDS = [
    '000018f0-0000-1000-8000-00805f9b34fb',
    'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
    '0000ff00-0000-1000-8000-00805f9b34fb',
    '0000ffe0-0000-1000-8000-00805f9b34fb',
    '0000ffe1-0000-1000-8000-00805f9b34fb',
    '49535343-fe7d-4ae5-8fa9-9fafd205e455',
    '49535343-1e4d-4bd9-ba61-23c647249616',
    '0000fff0-0000-1000-8000-00805f9b34fb',
    '0000fff1-0000-1000-8000-00805f9b34fb',
    '0000ae30-0000-1000-8000-00805f9b34fb',
    '0000af30-0000-1000-8000-00805f9b34fb',
    '0000fee7-0000-1000-8000-00805f9b34fb',
    '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
    '00001800-0000-1000-8000-00805f9b34fb',
    '00001801-0000-1000-8000-00805f9b34fb',
    '0000180a-0000-1000-8000-00805f9b34fb',
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
    return this.device !== null && (this.server?.connected === true || this.device.gatt?.connected === true);
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
        throw new Error("Web Bluetooth API is not supported in this browser. Please use Chrome, Brave, or Edge.");
      }

      // Cleanup any previous stale connection/device first
      if (this.device?.gatt?.connected) {
        try {
          this.device.gatt.disconnect();
        } catch {}
      }
      this.cleanup();

      const device = await (navigator as BluetoothNavigator).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: this.PRINTER_SERVICE_UUIDS
      });

      this.device = device;
      this.device.addEventListener('gattserverdisconnected', this.onDisconnected);

      await this.connectToGATT();

      // Save device ID for auto-reconnect after page reload
      if (this.device?.id) {
        localStorage.setItem(STORAGE_KEY, this.device.id);
      }

      this.notifyListeners(true);
      return true;
    } catch (error: any) {
      console.error("Printer connection failed:", error);
      this.cleanup();
      this.notifyListeners(false);
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
        // Don't clear storage — device might appear later
        return false;
      }

      this.device = device;
      this.device.addEventListener('gattserverdisconnected', this.onDisconnected);

      const maxAttempts = 3;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          await this.connectToGATT();
          this.notifyListeners(true);
          return true;
        } catch (gattError) {
          console.warn(`GATT connect attempt ${attempt} failed:`, gattError);
          if (attempt === maxAttempts) {
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
    if (!this.device || !this.device.gatt) {
      throw new Error("No Bluetooth GATT server found on selected device.");
    }

    let gattServer: BluetoothRemoteGATTServer | null = null;
    let lastError: any = null;

    // Retry connection up to 3 times to handle handshake latency
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        if (!this.device.gatt.connected) {
          gattServer = await this.device.gatt.connect();
        } else {
          gattServer = this.device.gatt;
        }
        if (gattServer && gattServer.connected) break;
      } catch (err: any) {
        lastError = err;
        console.warn(`GATT connection attempt ${attempt} failed:`, err);
        await new Promise(r => setTimeout(r, 600));
      }
    }

    if (!gattServer || !gattServer.connected) {
      throw new Error(
        lastError?.message || "Could not connect to printer. Ensure printer is turned ON and not connected to another phone/app."
      );
    }

    this.server = gattServer;

    // 1. Try previously saved service & characteristic UUIDs
    const savedServiceUuid = localStorage.getItem(SERVICE_STORAGE_KEY);
    const savedCharUuid = localStorage.getItem(CHAR_STORAGE_KEY);

    if (savedServiceUuid && savedCharUuid) {
      try {
        const service = await gattServer.getPrimaryService(savedServiceUuid);
        if (service) {
          const char = await service.getCharacteristic(savedCharUuid);
          if (char && (char.properties.write || char.properties.writeWithoutResponse)) {
            this.characteristic = char;
            return;
          }
        }
      } catch {
        // Fallback to searching
      }
    }

    // 2. Try known printer service UUIDs directly first (most reliable in Chrome)
    for (const uuid of this.PRINTER_SERVICE_UUIDS) {
      try {
        const service = await gattServer.getPrimaryService(uuid);
        if (service) {
          const chars = await service.getCharacteristics();
          for (const char of chars) {
            if (char.properties.write || char.properties.writeWithoutResponse) {
              this.characteristic = char;
              localStorage.setItem(SERVICE_STORAGE_KEY, uuid);
              localStorage.setItem(CHAR_STORAGE_KEY, char.uuid);
              return;
            }
          }
        }
      } catch {
        // Continue to next known UUID
      }
    }

    // 3. Fallback: query all primary services if supported
    try {
      if (typeof gattServer.getPrimaryServices === "function") {
        const services = await gattServer.getPrimaryServices();
        for (const service of services) {
          try {
            const chars = await service.getCharacteristics();
            for (const char of chars) {
              if (char.properties.write || char.properties.writeWithoutResponse) {
                this.characteristic = char;
                localStorage.setItem(SERVICE_STORAGE_KEY, service.uuid);
                localStorage.setItem(CHAR_STORAGE_KEY, char.uuid);
                return;
              }
            }
          } catch {}
        }
      }
    } catch (scanErr) {
      console.warn("Could not query all primary services:", scanErr);
    }

    if (!this.characteristic) {
      throw new Error("Connected to printer, but no writable channel (ESC/POS) was found on this BLE device.");
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

  /**
   * Browser / USB Printer Fallback for KOT:
   * Formats KOT as thermal HTML and prints via hidden iframe to default system/USB printer.
   */
  async printKOTViaBrowser(data: KOTData): Promise<void> {
    const size = getPaperSize();
    const is58 = size === "58";
    const paperMm = is58 ? 58 : 80;
    const bodyWidthMm = is58 ? 50 : 72;

    const now = new Date();
    const dateStr = now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

    const typeLabels: Record<string, string> = {
      dine_in: "Dine In",
      takeaway: "Takeaway",
      delivery: "Delivery",
      nc: "NC",
    };

    const cleanTable = data.tableName
      ? (/^table/i.test(data.tableName) ? data.tableName : `Table ${data.tableName}`)
      : "Order";
    const tableStr = cleanTable.startsWith("Table:") ? cleanTable : `Table: ${cleanTable.replace(/^table\s*/i, "")}`;
    const typeStr = data.orderType ? (typeLabels[data.orderType] || data.orderType) : "";

    let totalItems = 0;
    const itemsHtml = data.items
      .map((item) => {
        const deltaQty = item.printed_qty !== undefined ? (item.quantity - item.printed_qty) : item.quantity;
        const printQty = deltaQty > 0 ? deltaQty : item.quantity;
        if (printQty <= 0) return "";
        totalItems += printQty;

        return `
          <div style="margin: 4px 0;">
            <div style="display:flex; justify-content:space-between; align-items:baseline; font-size:${is58 ? "12px" : "13px"}; font-weight:bold;">
              <span style="width: 24px; flex-shrink:0;">${printQty}x</span>
              <span style="flex:1; word-break:break-word;">${item.name}</span>
            </div>
            ${item.notes ? `<div style="font-size:10px; font-style:italic; margin-left:24px; color:#444;">* ${item.notes}</div>` : ""}
          </div>
        `;
      })
      .filter(Boolean)
      .join("");

    const kotHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>KOT - ${tableStr}</title>
<style>
  @page {
    size: ${paperMm}mm auto;
    margin: 2mm 1mm;
  }
  @media print {
    body {
      width: ${bodyWidthMm}mm;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
    }
  }
  * { box-sizing: border-box; }
  body {
    font-family: 'Courier New', Courier, monospace, Arial, sans-serif;
    width: ${bodyWidthMm}mm;
    margin: 0 auto;
    padding: 0;
    color: #000;
    line-height: 1.25;
  }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .dash { border-top: 1px dashed #000; margin: 4px 0; }
  .row { display: flex; justify-content: space-between; font-size: ${is58 ? "11px" : "12px"}; margin-bottom: 2px; }
  .title { font-size: ${is58 ? "15px" : "17px"}; font-weight: bold; }
</style>
</head>
<body>
  <div class="center title">${data.isAddition ? "*** ADDITION ***" : "*** KOT ***"}</div>
  <div class="dash"></div>
  <div class="row">
    <span><b>${tableStr}</b></span>
    ${data.roundNumber && data.roundNumber > 1 ? `<span><b>Round ${data.roundNumber}</b></span>` : ""}
  </div>
  <div class="row">
    <span>Server: ${data.serverName || "Staff"}</span>
    <span>${typeStr}</span>
  </div>
  <div class="row">
    <span>${dateStr}</span>
    <span>${timeStr}</span>
  </div>
  <div class="dash"></div>
  <div style="margin: 4px 0;">
    ${itemsHtml}
  </div>
  <div class="dash"></div>
  <div class="row bold" style="font-size:${is58 ? "12px" : "13px"};">
    <span>Total Items:</span>
    <span>${totalItems}</span>
  </div>
  ${data.isAddition ? '<div class="center bold" style="margin-top:4px; font-size:12px;">** ADDITION ONLY **</div>' : ""}
  <div style="height: 10mm;"></div>
</body>
</html>`;

    const stale = document.getElementById("_kot_print_frame") as HTMLIFrameElement | null;
    if (stale) stale.remove();

    const iframe = document.createElement("iframe");
    iframe.id = "_kot_print_frame";
    iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:58mm;height:1px;border:none;visibility:hidden;";
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) throw new Error("Could not access print frame");
    iframeDoc.open();
    iframeDoc.write(kotHtml);
    iframeDoc.close();

    await new Promise((r) => setTimeout(r, 100));

    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      // Fallback: if iframe print is blocked, use window.print() with dialog
      console.warn("[ThermalPrinter] iframe.print() blocked, falling back to window.print()", e);
      window.print();
    }
  }

  /**
   * Browser / USB Printer Fallback for Bills:
   * Formats Bill receipt as thermal HTML and prints via hidden iframe to default system/USB printer.
   */
  async printReceiptViaBrowser(data: ReceiptData): Promise<void> {
    const size = getPaperSize();
    const is58 = size === "58";
    const paperMm = is58 ? 58 : 80;
    const bodyWidthMm = is58 ? 50 : 72;

    const printSymbol = data.currencySymbol === "₹" ? "Rs." : data.currencySymbol;
    const displayTable = data.tableName
      ? (/^table/i.test(data.tableName) ? data.tableName : `Table ${data.tableName}`)
      : undefined;

    const itemRowsHtml = data.items.map(item => `
      <tr>
        <td style="padding:2px 0;font-size:${is58 ? "10px" : "11px"};">${item.name}</td>
        <td style="padding:2px 0;font-size:${is58 ? "10px" : "11px"};text-align:right;">${item.quantity}</td>
        <td style="padding:2px 0;font-size:${is58 ? "10px" : "11px"};text-align:right;">${item.price.toFixed(0)}</td>
        <td style="padding:2px 0;font-size:${is58 ? "10px" : "11px"};text-align:right;">${(item.price * item.quantity).toFixed(0)}</td>
      </tr>
    `).join("");

    const receiptHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>Bill ${data.billNumber}</title>
<style>
  @page { size: ${paperMm}mm auto; margin: 2mm 1mm; }
  @media print {
    body { width: ${bodyWidthMm}mm; margin: 0; padding: 0; -webkit-print-color-adjust: exact; }
  }
  * { box-sizing: border-box; }
  body { font-family: 'Courier New', Courier, monospace, Arial, sans-serif; width: ${bodyWidthMm}mm; margin: 0 auto; padding: 0; color: #000; line-height: 1.25; }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .dash { border-top: 1px dashed #000; margin: 4px 0; }
  table { width: 100%; border-collapse: collapse; }
  td, th { vertical-align: top; }
</style>
</head>
<body>
  <div class="center bold" style="font-size:15px;">${data.restaurantName}</div>
  ${data.address ? `<div class="center" style="font-size:9px;">${data.address}</div>` : ""}
  ${data.phone ? `<div class="center" style="font-size:9px;">Ph: ${data.phone}</div>` : ""}
  ${data.gstin ? `<div class="center" style="font-size:9px;">GSTIN: ${data.gstin}</div>` : ""}
  <div class="dash"></div>
  <div style="font-size:10px;">Bill#: ${data.billNumber}</div>
  <div style="font-size:10px;">${displayTable ? `To: ${displayTable}` : data.customerName ? `To: ${data.customerName}` : "To: POS"}</div>
  <div style="font-size:10px;">Date: ${data.date}&nbsp;&nbsp;Time: ${data.time}</div>
  ${data.serverName ? `<div style="font-size:10px;">Server: ${data.serverName}</div>` : ""}
  ${data.customerName && displayTable && data.customerName !== displayTable ? `<div style="font-size:10px;">Guest: ${data.customerName}</div>` : ""}
  ${data.customerMobile ? `<div style="font-size:10px;">Phone: ${data.customerMobile}</div>` : ""}
  <div class="dash"></div>
  <div class="center bold" style="font-size:11px;">Particulars</div>
  <table>
    <tr>
      <th style="font-size:10px;text-align:left;">Item</th>
      <th style="font-size:10px;text-align:right;">Qty</th>
      <th style="font-size:10px;text-align:right;">Rate</th>
      <th style="font-size:10px;text-align:right;">Amt</th>
    </tr>
    <tr><td colspan="4"><div style="border-top:1px solid #000;margin:2px 0;"></div></td></tr>
    ${itemRowsHtml}
    <tr><td colspan="4"><div class="dash"></div></td></tr>
    <tr>
      <td colspan="3" style="font-size:11px;">Sub Total:</td>
      <td style="font-size:11px;text-align:right;">${data.subtotal.toFixed(2)}</td>
    </tr>
    ${data.discount > 0 ? `<tr><td colspan="3" style="font-size:10px;">Discount:</td><td style="font-size:10px;text-align:right;">-${data.discount.toFixed(2)}</td></tr>` : ""}
    ${data.cgst > 0 ? `<tr><td colspan="3" style="font-size:10px;">CGST:</td><td style="font-size:10px;text-align:right;">${data.cgst.toFixed(2)}</td></tr>` : ""}
    ${data.sgst > 0 ? `<tr><td colspan="3" style="font-size:10px;">SGST:</td><td style="font-size:10px;text-align:right;">${data.sgst.toFixed(2)}</td></tr>` : ""}
    <tr><td colspan="4"><div class="dash"></div></td></tr>
    <tr>
      <td colspan="2" style="font-size:14px;font-weight:bold;">Net Amount:</td>
      <td colspan="2" style="font-size:14px;font-weight:bold;text-align:right;">${printSymbol}${data.netAmount.toFixed(2)}</td>
    </tr>
    <tr><td colspan="4"><div class="dash"></div></td></tr>
    <tr><td colspan="4" style="text-align:center;font-size:13px;font-weight:bold;padding-top:4px;">Thank You!</td></tr>
    <tr><td colspan="4" style="text-align:center;font-size:10px;">Please visit again</td></tr>
  </table>
  <div style="height: 10mm;"></div>
</body>
</html>`;

    const stale = document.getElementById("_bill_print_frame") as HTMLIFrameElement | null;
    if (stale) stale.remove();

    const iframe = document.createElement("iframe");
    iframe.id = "_bill_print_frame";
    iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:58mm;height:1px;border:none;visibility:hidden;";
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) throw new Error("Could not access print frame");
    iframeDoc.open();
    iframeDoc.write(receiptHtml);
    iframeDoc.close();

    await new Promise((r) => setTimeout(r, 100));

    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      // Fallback: if iframe print is blocked, use window.print() with dialog
      console.warn("[ThermalPrinter] iframe.print() blocked, falling back to window.print()", e);
      window.print();
    }
  }

  async printKOT(data: KOTData, options?: { forceBrowser?: boolean }) {
    const nativeConnected = Capacitor.isNativePlatform() && nativePrinterBridge.isConnected();
    const webConnected = !Capacitor.isNativePlatform() && this.isConnected();

    // Browser print dialog when forced (e.g. on web or requested)
    if (options?.forceBrowser) {
      await this.printKOTViaBrowser(data);
      return;
    }

    // Direct Bluetooth/Native thermal print if connected
    if (nativeConnected || webConnected) {

    const W = getPaperWidth();
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
    const cleanTable = data.tableName
      ? (/^table/i.test(data.tableName) ? data.tableName : `Table ${data.tableName}`)
      : "Order";
    const tableStr = cleanTable.startsWith("Table:") ? cleanTable : `Table: ${cleanTable.replace(/^table\s*/i, '')}`;
    if (data.roundNumber && data.roundNumber > 1) {
      receipt += row2(tableStr, `Round: ${data.roundNumber}`);
    } else {
      receipt += tableStr + "\n";
    }

    // Line 2: Server + Type
    const serverStr = `Server: ${data.serverName || "Staff"}`;
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
      const deltaQty = item.printed_qty !== undefined ? (item.quantity - item.printed_qty) : item.quantity;
      const printQty = deltaQty > 0 ? deltaQty : item.quantity;
      if (printQty > 0) {
        receipt += this.BOLD_ON;
        receipt += `${printQty}x  ${item.name}\n`;
        receipt += this.BOLD_OFF;
        if (item.notes) {
          receipt += `    * ${item.notes}\n`;
        }
        totalItems += printQty;
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

    const bytes = this.encodeText(receipt);
    await this.writeBytes(bytes);
    return;
  }

  // Fallback: print via hidden iframe (works for USB/Windows thermal printers)
  await this.printKOTViaBrowser(data);
}

  async printReceipt(data: ReceiptData, options?: { forceBrowser?: boolean }) {
    const nativeConnected = Capacitor.isNativePlatform() && nativePrinterBridge.isConnected();
    const webConnected = !Capacitor.isNativePlatform() && this.isConnected();

    // Direct Bluetooth/Native thermal print if connected
    if (nativeConnected || webConnected) {

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

    const displayTable = data.tableName
      ? (/^table/i.test(data.tableName) ? data.tableName : `Table ${data.tableName}`)
      : undefined;

    const leftBill = `Bill#: ${data.billNumber}`;
    const rightTarget = displayTable
      ? `To: ${displayTable}`
      : data.customerName
      ? `To: ${data.customerName}`
      : `To: POS`;

    if (leftBill.length + rightTarget.length + 1 <= W) {
      receipt += row2(leftBill, rightTarget);
    } else {
      receipt += leftBill + "\n" + rightTarget + "\n";
    }

    if (data.serverName) receipt += `Server: ${data.serverName}\n`;

    const dateStr = `Date: ${data.date}`;
    const timeStr = `Time: ${data.time}`;
    if (dateStr.length + timeStr.length + 1 <= W) {
      receipt += row2(dateStr, timeStr);
    } else {
      receipt += `${dateStr}  ${timeStr}\n`;
    }

    if (data.customerName && displayTable && data.customerName !== displayTable) {
      receipt += `Guest: ${data.customerName}\n`;
    }
    
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

    // QR Code for UPI payment
    if (data.upiId) {
      const upiUrl = `upi://pay?pa=${data.upiId}&pn=${encodeURIComponent(data.restaurantName)}&cu=INR`;
      receipt += this.ALIGN_CENTER;
      receipt += "\nScan QR to pay\n";
      // ESC/POS QR Code: GS ( k — store data, then print
      const upiBytes = this.encodeText(upiUrl);
      const dataLen = upiBytes.length + 3;
      const lenL = dataLen & 0xff;
      const lenH = (dataLen >> 8) & 0xff;
      // Store QR data
      const storeCmd = new Uint8Array([0x1d, 0x28, 0x6b, lenL, lenH, 0x31, 0x50, 0x30, ...upiBytes]);
      // Set module size (5) — bigger than 3, still paper-efficient
      const sizeCmd = new Uint8Array([0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, 0x05]);
      // Set error correction level M (better scan reliability)
      const ecCmd = new Uint8Array([0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x31]);
      // Print QR
      const printCmd = new Uint8Array([0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30]);

      // Write text so far, then binary QR commands, then continue
      await this.writeBytes(this.encodeText(receipt));
      receipt = ""; // reset receipt buffer — already sent above
      await this.writeBytes(sizeCmd);
      await this.writeBytes(ecCmd);
      await this.writeBytes(storeCmd);
      await this.writeBytes(printCmd);

      receipt += "\n";
      receipt += SEP;
    }

    // Footer
    receipt += this.ALIGN_CENTER;
    receipt += "Thank You!\n";
    receipt += "Please visit again\n\n\n";

    receipt += this.CUT_PAPER;

    await this.writeBytes(this.encodeText(receipt));
    return;
  }

  // Fallback: print via hidden iframe (works for USB/Windows thermal printers)
  await this.printReceiptViaBrowser(data);
}
}

export const thermalPrinterService = new ThermalPrinterService();
