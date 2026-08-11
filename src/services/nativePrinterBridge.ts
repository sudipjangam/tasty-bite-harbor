/**
 * nativePrinterBridge.ts
 *
 * Capacitor/Cordova native bridge for thermal printer communication.
 *
 * Bluetooth Classic (SPP) via cordova-plugin-bluetooth-serial
 *   → accessed as window.bluetoothSerial
 *   → supports raw ArrayBuffer writes (ESC/POS)
 *
 * LAN/WiFi TCP (port 9100) — requires separate TCP socket plugin (future).
 * USB OTG — reserved for future plugin integration.
 */

import { Capacitor, registerPlugin } from "@capacitor/core";
import { App } from "@capacitor/app";

// ─── TcpPrinterPlugin — inline Java bridge (no npm package needed) ────────────
// Registered in MainActivity.java via registerPlugin(TcpPrinterPlugin.class)
interface TcpPrinterPlugin {
  connectAndPrint(opts: { ip: string; port: number; data: string }): Promise<void>;
  testConnection(opts: { ip: string; port: number }): Promise<void>;
}

const TcpPrinter = registerPlugin<TcpPrinterPlugin>("TcpPrinter");

// ─── Types ────────────────────────────────────────────────────────────────────

export type PrinterConnectionType = "bluetooth" | "lan" | "usb" | "none";

export interface BluetoothDevice {
  name: string;
  address: string;
  class?: number;
  id?: string;
  uuid?: string;
}

export interface NativePrinterStatus {
  connected: boolean;
  type: PrinterConnectionType;
  deviceName?: string;
  address?: string;
}

// ─── Storage keys ─────────────────────────────────────────────────────────────

const KEYS = {
  CONNECTION_TYPE: "native_printer_type",
  BT_ADDRESS: "native_printer_bt_address",
  BT_NAME: "native_printer_bt_name",
  LAN_IP: "native_printer_lan_ip",
  LAN_PORT: "native_printer_lan_port",
  CONNECTED: "native_printer_connected",
  PAPER_SIZE: "printer_paper_size",
};

// ─── Internal state ───────────────────────────────────────────────────────────
// Restore state from localStorage immediately on module load.
// This ensures isConnected() returns true without waiting for tryAutoReconnect()
// when the PaymentDialog or other components mount after a navigation.
let _connectionType: PrinterConnectionType =
  (localStorage.getItem(KEYS.CONNECTION_TYPE) as PrinterConnectionType | null) ?? "none";
let _deviceName: string | null = localStorage.getItem(KEYS.BT_NAME);
let _address: string | null = localStorage.getItem(KEYS.BT_ADDRESS);
let _connected = localStorage.getItem(KEYS.CONNECTED) === "1";

const _listeners: Array<(status: NativePrinterStatus) => void> = [];

// ─── Print Queue ──────────────────────────────────────────────────────────────
let _isWriting = false;
const _writeQueue: Array<() => Promise<void>> = [];

async function _processWriteQueue() {
  if (_isWriting) return;
  _isWriting = true;
  while (_writeQueue.length > 0) {
    const fn = _writeQueue.shift();
    if (fn) {
      try {
        await fn();
      } catch (err) {
        console.error("[NativePrinter] Queue item failed:", err);
      }
    }
  }
  _isWriting = false;
}


function _notify() {
  const status = nativePrinterBridge.getStatus();
  _listeners.forEach((l) => l(status));
}

// ─── Active Connection Verification ──────────────────────────────────────────
async function verifyConnectionState() {
  if (!_connected || !Capacitor.isNativePlatform()) return;
  
  if (_connectionType === "bluetooth") {
    try {
      const isActuallyConnected = await new Promise<boolean>((resolve) => {
        try {
          _getBT().isConnected(
            () => resolve(true),
            () => resolve(false)
          );
        } catch {
          resolve(false);
        }
      });
      
      if (!isActuallyConnected) {
        console.log("[NativePrinter] BT connection lost in background. Updating state...");
        _connected = false;
        _notify();
        // Try to recover it automatically
        nativePrinterBridge.tryAutoReconnect();
      }
    } catch {
      // ignore
    }
  }
}

if (Capacitor.isNativePlatform()) {
  // Check shortly after load
  setTimeout(verifyConnectionState, 2000);
  
  // Check every time app comes to foreground
  App.addListener("appStateChange", ({ isActive }) => {
    if (isActive) {
      verifyConnectionState();
    }
  });
}

// ─── Helper: get window.bluetoothSerial ──────────────────────────────────────

function _getBT(): any {
  if (!Capacitor.isNativePlatform()) {
    throw new Error("Bluetooth printing only available on Android app");
  }
  const bt = (window as any).bluetoothSerial;
  if (!bt) {
    throw new Error(
      "bluetoothSerial plugin not available. Ensure cap sync was run."
    );
  }
  return bt;
}

// ─── Runtime Bluetooth permissions (Android 12+) ─────────────────────────────

/**
 * Requests BLUETOOTH_CONNECT (and BLUETOOTH_SCAN) at runtime.
 * Required on Android 12+ (API 31+) before any Bluetooth call.
 * Uses cordova-plugin-android-permissions if available, else silently continues.
 */
function _requestBluetoothPermissions(): Promise<void> {
  return new Promise((resolve) => {
    const perms = (window as any).cordova?.plugins?.permissions;
    if (!perms) {
      // Plugin not available — continue and let Android throw if needed
      resolve();
      return;
    }

    const PERMISSIONS = [
      perms.BLUETOOTH_CONNECT,
      perms.BLUETOOTH_SCAN,
    ].filter(Boolean); // filter out undefined on older Android

    if (PERMISSIONS.length === 0) {
      resolve();
      return;
    }

    perms.requestPermissions(
      PERMISSIONS,
      (status: any) => {
        // Check if all granted
        const allGranted = PERMISSIONS.every(
          (p: string) => status.results?.[p] === true || status[p] === true
        );
        if (!allGranted) {
          // Some denied — we still resolve, the BT call will fail with a clear message
          console.warn("[NativePrinter] Bluetooth permission denied by user");
        }
        resolve();
      },
      () => {
        // Error requesting — continue anyway
        resolve();
      }
    );
  });
}

// ─── Promise wrappers around cordova callback style ──────────────────────────

function _btList(): Promise<BluetoothDevice[]> {
  return new Promise((resolve, reject) => {
    _getBT().list(
      (devices: BluetoothDevice[]) => resolve(devices ?? []),
      (err: any) => reject(new Error(String(err)))
    );
  });
}

/** Active scan for unpaired devices — takes a few seconds */
function _btDiscoverUnpaired(onFound?: (d: BluetoothDevice) => void): Promise<BluetoothDevice[]> {
  return new Promise((resolve, reject) => {
    const bt = _getBT();
    // Set a per-device callback if provided
    if (onFound) {
      try {
        bt.setDeviceDiscoveredListener((device: BluetoothDevice) => onFound(device));
      } catch { /* ignore — not all versions support this */ }
    }
    bt.discoverUnpaired(
      (devices: BluetoothDevice[]) => {
        try { bt.clearDeviceDiscoveredListener(); } catch { /* ignore */ }
        resolve(devices ?? []);
      },
      (err: any) => {
        try { bt.clearDeviceDiscoveredListener(); } catch { /* ignore */ }
        reject(new Error(String(err)));
      }
    );
  });
}

function _btConnect(address: string): Promise<void> {
  return new Promise((resolve, reject) => {
    _getBT().connect(
      address,
      () => resolve(),
      (err: any) => reject(new Error(String(err)))
    );
  });
}

function _btDisconnect(): Promise<void> {
  return new Promise((resolve) => {
    try {
      _getBT().disconnect(() => resolve(), () => resolve());
    } catch {
      resolve();
    }
  });
}

function _btWrite(data: ArrayBuffer): Promise<void> {
  return new Promise((resolve, reject) => {
    _getBT().write(
      data,
      () => resolve(),
      (err: any) => reject(new Error(String(err)))
    );
  });
}

// ─── Paper size helpers ───────────────────────────────────────────────────────

export function getPaperWidth(): number {
  const size = localStorage.getItem(KEYS.PAPER_SIZE) ?? "80";
  return size === "58" ? 32 : 48;
}

export function setPaperSize(size: "58" | "80") {
  localStorage.setItem(KEYS.PAPER_SIZE, size);
}

export function getPaperSize(): "58" | "80" {
  return (localStorage.getItem(KEYS.PAPER_SIZE) ?? "80") as "58" | "80";
}

// ─── Native Printer Bridge ────────────────────────────────────────────────────

export const nativePrinterBridge = {

  getStatus(): NativePrinterStatus {
    return {
      connected: _connected,
      type: _connectionType,
      deviceName: _deviceName ?? undefined,
      address: _address ?? undefined,
    };
  },

  isConnected(): boolean {
    return _connected;
  },

  onStatusChange(listener: (status: NativePrinterStatus) => void): () => void {
    _listeners.push(listener);
    return () => {
      const idx = _listeners.indexOf(listener);
      if (idx !== -1) _listeners.splice(idx, 1);
    };
  },

  // ── Bluetooth ──────────────────────────────────────────────────────────────

  /**
   * Returns list of already-paired Bluetooth devices.
   */
  async discoverBluetooth(): Promise<BluetoothDevice[]> {
    await _requestBluetoothPermissions();
    try {
      return await _btList();
    } catch (err) {
      console.error("[NativePrinter] BT list failed:", err);
      throw err;
    }
  },

  /**
   * Active scan for unpaired Bluetooth devices.
   * Calls onFound() as each device is discovered.
   */
  async discoverUnpairedBluetooth(
    onFound?: (d: BluetoothDevice) => void
  ): Promise<BluetoothDevice[]> {
    await _requestBluetoothPermissions();
    try {
      return await _btDiscoverUnpaired(onFound);
    } catch (err) {
      console.error("[NativePrinter] BT discover unpaired failed:", err);
      throw err;
    }
  },

  /**
   * Connect to Bluetooth Classic (SPP) printer by MAC address.
   */
  async connectBluetooth(address: string, name?: string): Promise<boolean> {
    try {
      if (_connected && _connectionType === "bluetooth") {
        await _btDisconnect().catch(() => {});
      }
      await _btConnect(address);
      _connectionType = "bluetooth";
      _address = address;
      _deviceName = name ?? address;
      _connected = true;
      localStorage.setItem(KEYS.CONNECTION_TYPE, "bluetooth");
      localStorage.setItem(KEYS.BT_ADDRESS, address);
      if (name) localStorage.setItem(KEYS.BT_NAME, name);
      localStorage.setItem(KEYS.CONNECTED, "1");
      _notify();
      return true;
    } catch (err) {
      console.error("[NativePrinter] BT connect failed:", err);
      _connected = false;
      _notify();
      return false;
    }
  },

  // ── LAN / WiFi ─────────────────────────────────────────────────────────────

  async connectLAN(ip: string, port = 9100): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      throw new Error("LAN/WiFi printing is only available on the Android app.");
    }
    try {
      // Test reachability first (3s timeout) — will throw if unreachable
      await TcpPrinter.testConnection({ ip, port });

      // Save to localStorage for auto-reconnect on next app start
      localStorage.setItem(KEYS.LAN_IP, ip);
      localStorage.setItem(KEYS.LAN_PORT, String(port));

      // Update internal state
      _connectionType = "lan";
      _address = ip;
      _deviceName = `WiFi Printer (${ip})`;
      _connected = true;

      // Persist connection state
      localStorage.setItem(KEYS.CONNECTION_TYPE, "lan");
      localStorage.setItem(KEYS.BT_ADDRESS, ip); // reuse address key for display
      localStorage.setItem(KEYS.BT_NAME, `WiFi Printer (${ip})`);
      localStorage.setItem(KEYS.CONNECTED, "1");

      _notify();
      return true;
    } catch (err) {
      console.error("[NativePrinter] LAN connect failed:", err);
      _connected = false;
      _notify();
      return false;
    }
  },

  // ── USB ────────────────────────────────────────────────────────────────────

  async connectUSB(): Promise<boolean> {
    throw new Error(
      "USB OTG printing requires a USB serial Capacitor plugin. " +
      "Use Bluetooth for now."
    );
  },

  // ── Send raw ESC/POS bytes ─────────────────────────────────────────────────

  async sendESCPOS(data: Uint8Array): Promise<void> {
    if (!_connected) throw new Error("Printer not connected");

    // Add this print job to the mutex queue to prevent byte interleaving
    return new Promise<void>((resolve, reject) => {
      _writeQueue.push(async () => {
        try {
          await this._executeSendESCPOS(data);
          resolve();
        } catch (err) {
          reject(err);
        }
      });
      _processWriteQueue();
    });
  },

  async _executeSendESCPOS(data: Uint8Array): Promise<void> {
    // ── LAN / WiFi path ───────────────────────────────────────────────────────
    if (_connectionType === "lan") {
      const ip   = _address ?? localStorage.getItem(KEYS.LAN_IP);
      const port = Number(localStorage.getItem(KEYS.LAN_PORT) ?? 9100);

      if (!ip) throw new Error("LAN printer IP not configured.");

      // Convert Uint8Array → Base64 string for Java bridge
      // Use chunked approach to avoid call stack overflow on large buffers
      let binary = "";
      const chunkSize = 8192;
      for (let i = 0; i < data.length; i += chunkSize) {
        binary += String.fromCharCode(...data.subarray(i, i + chunkSize));
      }
      const b64 = btoa(binary);

      try {
        await TcpPrinter.connectAndPrint({ ip, port, data: b64 });
      } catch (lanErr) {
        _connected = false;
        localStorage.removeItem(KEYS.CONNECTED);
        _notify();
        throw new Error(`WiFi printer error: ${(lanErr as any)?.message ?? lanErr}. Check IP and network.`);
      }
      return;
    }

    // ── Bluetooth path ────────────────────────────────────────────────────────
    const tryWrite = async () => {
      const CHUNK = 512;
      for (let i = 0; i < data.length; i += CHUNK) {
        const chunk = data.slice(i, i + CHUNK);
        await _btWrite(chunk.buffer as ArrayBuffer);
        await new Promise((r) => setTimeout(r, 15));
      }
    };

    try {
      await tryWrite();
    } catch (writeErr) {
      // Socket may have closed (module reload but BT session still exists on OS side).
      // Try to reconnect the physical socket once before giving up.
      console.warn("[NativePrinter] Write failed, attempting socket reconnect...", writeErr);
      const address = _address ?? localStorage.getItem(KEYS.BT_ADDRESS);
      const name = _deviceName ?? localStorage.getItem(KEYS.BT_NAME) ?? undefined;
      if (!address) throw writeErr;
      try {
        await _btConnect(address);
        _connected = true;
        _address = address;
        _deviceName = name ?? null;
        console.log("[NativePrinter] Socket reconnected, retrying write...");
        await tryWrite();
      } catch (reconnectErr) {
        _connected = false;
        localStorage.removeItem(KEYS.CONNECTED);
        _notify();
        throw new Error("Printer disconnected. Please reconnect from Printer Settings.");
      }
    }
  },

  // ── Disconnect ─────────────────────────────────────────────────────────────

  async disconnect(): Promise<void> {
    if (_connectionType === "bluetooth") {
      await _btDisconnect();
    }
    _connected = false;
    _connectionType = "none";
    _address = null;
    _deviceName = null;
    localStorage.removeItem(KEYS.CONNECTED);
    _notify();
  },

  // ── Auto-reconnect ────────────────────────────────────────────────────────

  async tryAutoReconnect(): Promise<boolean> {
    const type = localStorage.getItem(KEYS.CONNECTION_TYPE) as PrinterConnectionType | null;

    // ── LAN auto-reconnect: just ping to verify reachability ─────────────────
    if (type === "lan") {
      const ip   = localStorage.getItem(KEYS.LAN_IP);
      const port = Number(localStorage.getItem(KEYS.LAN_PORT) ?? 9100);
      if (!ip || !Capacitor.isNativePlatform()) return false;
      try {
        await TcpPrinter.testConnection({ ip, port });
        _connectionType = "lan";
        _address = ip;
        _deviceName = `WiFi Printer (${ip})`;
        _connected = true;
        localStorage.setItem(KEYS.CONNECTED, "1");
        _notify();
        return true;
      } catch {
        _connected = false;
        localStorage.removeItem(KEYS.CONNECTED);
        _notify();
        return false;
      }
    }

    // ── Bluetooth auto-reconnect ──────────────────────────────────────────────
    if (type !== "bluetooth") return false;
    const address = localStorage.getItem(KEYS.BT_ADDRESS);
    const name = localStorage.getItem(KEYS.BT_NAME) ?? undefined;
    if (!address) return false;
    try {
      return await nativePrinterBridge.connectBluetooth(address, name);
    } catch {
      return false;
    }
  },
};

export default nativePrinterBridge;
