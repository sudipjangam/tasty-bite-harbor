import React, { useState, useEffect, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { Bluetooth, Wifi, Usb, RefreshCw, Printer, Check, X, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  nativePrinterBridge,
  BluetoothDevice,
  getPaperSize,
  setPaperSize,
} from "@/services/nativePrinterBridge";
import { thermalPrinterService } from "@/services/thermalPrinterService";

// ─── Paper size selector ──────────────────────────────────────────────────────

const PaperSizeSelector = () => {
  const [size, setSize] = useState<"58" | "80">(getPaperSize);

  const handleChange = (v: "58" | "80") => {
    setSize(v);
    setPaperSize(v);
  };

  return (
    <div className="flex gap-3 items-center">
      <Label className="text-sm text-muted-foreground shrink-0">Paper Size</Label>
      <div className="flex rounded-lg border border-border overflow-hidden">
        {(["58", "80"] as const).map((s) => (
          <button
            key={s}
            onClick={() => handleChange(s)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              size === s
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {s}mm
          </button>
        ))}
      </div>
    </div>
  );
};

// ─── Connection badge ─────────────────────────────────────────────────────────

const StatusBadge = ({ connected }: { connected: boolean }) => (
  <Badge
    variant={connected ? "default" : "secondary"}
    className={connected ? "bg-green-500/20 text-green-500 border-green-500/30" : ""}
  >
    {connected ? (
      <><Check className="h-3 w-3 mr-1" /> Connected</>
    ) : (
      <><X className="h-3 w-3 mr-1" /> Not connected</>
    )}
  </Badge>
);

// ─── Test print button ────────────────────────────────────────────────────────

const TestPrintButton = ({ disabled }: { disabled: boolean }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleTest = async () => {
    setLoading(true);
    try {
      await thermalPrinterService.printKOT({
        tableName: "T-01",
        serverName: "Test",
        items: [
          { name: "Paneer Butter Masala", quantity: 2 },
          { name: "Garlic Naan", quantity: 4 },
        ],
        orderType: "dine_in",
      });
      toast({ title: "Test print sent ✓", description: "Check your printer" });
    } catch (err: any) {
      toast({
        title: "Print failed",
        description: err?.message ?? "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleTest}
      disabled={disabled || loading}
      variant="outline"
      className="w-full"
    >
      <Printer className="h-4 w-4 mr-2" />
      {loading ? "Printing..." : "Send Test Print"}
    </Button>
  );
};

// ─── Bluetooth Tab ────────────────────────────────────────────────────────────

const BluetoothTab = ({
  connected,
  onStatusChange,
}: {
  connected: boolean;
  onStatusChange: () => void;
}) => {
  const { toast } = useToast();
  const [pairedDevices, setPairedDevices] = useState<BluetoothDevice[]>([]);
  const [nearbyDevices, setNearbyDevices] = useState<BluetoothDevice[]>([]);
  const [loadingPaired, setLoadingPaired] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [webConnecting, setWebConnecting] = useState(false);
  const isNative = Capacitor.isNativePlatform();

  // Load paired devices on mount
  useEffect(() => {
    if (!isNative) return;
    loadPaired();
  }, [isNative]);

  const loadPaired = async () => {
    setLoadingPaired(true);
    try {
      const found = await nativePrinterBridge.discoverBluetooth();
      setPairedDevices(found);
    } catch (err: any) {
      toast({
        title: "Could not load paired devices",
        description: err?.message ?? "Make sure Bluetooth is enabled",
        variant: "destructive",
      });
    } finally {
      setLoadingPaired(false);
    }
  };

  // Active scan for nearby unpaired devices
  const scanNearby = async () => {
    if (!isNative) {
      toast({ title: "Available on Android app only", variant: "destructive" });
      return;
    }
    setScanning(true);
    setNearbyDevices([]);
    try {
      // Real-time: add each device as it's discovered
      await nativePrinterBridge.discoverUnpairedBluetooth((device) => {
        setNearbyDevices((prev) => {
          if (prev.find((d) => d.address === device.address)) return prev;
          return [...prev, device];
        });
      });
    } catch (err: any) {
      const msg = err?.message ?? "";
      // Location permission required on older Android for BT discovery
      const needsLocation = msg.toLowerCase().includes("location") || msg.toLowerCase().includes("permission");
      toast({
        title: needsLocation ? "Location permission needed" : "Scan failed",
        description: needsLocation
          ? "Android requires location permission to scan for nearby Bluetooth devices. Please grant it in App Settings."
          : msg,
        variant: "destructive",
      });
    } finally {
      setScanning(false);
    }
  };

  const connect = async (device: BluetoothDevice) => {
    setConnecting(device.address);
    try {
      const ok = await nativePrinterBridge.connectBluetooth(device.address, device.name);
      if (ok) {
        toast({ title: `Connected to ${device.name} ✓` });
        onStatusChange();
      } else {
        toast({ title: "Connection failed", description: "Ensure printer is on and in range", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    } finally {
      setConnecting(null);
    }
  };

  const allDevices = [
    ...pairedDevices.map((d) => ({ ...d, _paired: true })),
    ...nearbyDevices
      .filter((d) => !pairedDevices.find((p) => p.address === d.address))
      .map((d) => ({ ...d, _paired: false })),
  ];

  const connectWeb = async () => {
    setWebConnecting(true);
    try {
      await thermalPrinterService.connect();
      toast({ title: "Printer Connected ✓" });
      onStatusChange();
    } catch (err: any) {
      toast({ title: "Connection Failed", description: err?.message, variant: "destructive" });
    } finally {
      setWebConnecting(false);
    }
  };

  if (!isNative) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Web Bluetooth</span>
          <StatusBadge connected={connected} />
        </div>
        
        <div className="rounded-lg bg-muted/50 border border-border p-4 text-sm text-muted-foreground space-y-2">
          <p>Web Bluetooth connects to thermal printers directly from your browser.</p>
          <p>1. Ensure Bluetooth is enabled on your device</p>
          <p>2. Turn on your thermal printer</p>
          <p>3. Click Connect below and select your printer from the browser prompt</p>
        </div>

        <Button onClick={connectWeb} disabled={webConnecting} className="w-full">
          <Bluetooth className="h-4 w-4 mr-2" />
          {webConnecting ? "Connecting..." : "Connect Printer"}
        </Button>

        <TestPrintButton disabled={!connected} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Bluetooth Classic (SPP)</span>
        <StatusBadge connected={connected} />
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button
          onClick={loadPaired}
          disabled={loadingPaired || scanning}
          variant="outline"
          className="flex-1"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loadingPaired ? "animate-spin" : ""}`} />
          {loadingPaired ? "Loading..." : "Paired Devices"}
        </Button>
        <Button
          onClick={scanNearby}
          disabled={scanning || loadingPaired}
          variant="outline"
          className="flex-1"
        >
          <Radio className={`h-4 w-4 mr-2 ${scanning ? "animate-pulse text-primary" : ""}`} />
          {scanning ? "Scanning..." : "Scan Nearby"}
        </Button>
      </div>

      {scanning && (
        <p className="text-xs text-muted-foreground text-center animate-pulse">
          Scanning for nearby Bluetooth devices… this may take ~10 seconds
        </p>
      )}

      {/* Device list */}
      {allDevices.length > 0 && (
        <div className="rounded-lg border border-border divide-y divide-border">
          {allDevices.map((d) => (
            <div key={d.address} className="flex items-center justify-between p-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground">{d.name || "Unknown Device"}</p>
                  {d._paired && (
                    <span className="text-[10px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded-full font-medium">
                      Paired
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground font-mono">{d.address}</p>
              </div>
              <Button
                size="sm"
                onClick={() => connect(d)}
                disabled={connecting === d.address}
              >
                {connecting === d.address ? "Connecting..." : "Connect"}
              </Button>
            </div>
          ))}
        </div>
      )}

      {!loadingPaired && !scanning && allDevices.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-4">
          No devices found. Pair your printer first in{" "}
          <span className="font-medium">Android Settings → Bluetooth</span>, then tap
          {" "}<span className="font-medium">Paired Devices</span>.
        </p>
      )}

      <TestPrintButton disabled={!connected} />
    </div>
  );
};


// ─── LAN Tab ──────────────────────────────────────────────────────────────────

const LANTab = ({
  connected,
  onStatusChange,
}: {
  connected: boolean;
  onStatusChange: () => void;
}) => {
  const { toast } = useToast();
  const [ip, setIp] = useState(localStorage.getItem("native_printer_lan_ip") ?? "");
  const [port, setPort] = useState(localStorage.getItem("native_printer_lan_port") ?? "9100");
  const [loading, setLoading] = useState(false);
  const isNative = Capacitor.isNativePlatform();

  const handleConnect = async () => {
    if (!ip.trim()) {
      toast({ title: "Enter printer IP address", variant: "destructive" });
      return;
    }
    if (!isNative) {
      toast({ title: "LAN printing available on Android app only", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const ok = await nativePrinterBridge.connectLAN(ip.trim(), parseInt(port, 10));
      if (ok) {
        toast({ title: `Connected to ${ip} ✓` });
        onStatusChange();
      } else {
        toast({ title: "Connection failed", description: "Check IP and ensure printer is on same network", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">LAN / WiFi (TCP port 9100)</span>
        <StatusBadge connected={connected} />
      </div>

      <div className="space-y-3">
        <div>
          <Label htmlFor="printer-ip" className="text-xs text-muted-foreground mb-1 block">
            Printer IP Address
          </Label>
          <Input
            id="printer-ip"
            value={ip}
            onChange={(e) => setIp(e.target.value)}
            placeholder="192.168.1.100"
            type="text"
            inputMode="numeric"
          />
        </div>
        <div>
          <Label htmlFor="printer-port" className="text-xs text-muted-foreground mb-1 block">
            Port
          </Label>
          <Input
            id="printer-port"
            value={port}
            onChange={(e) => setPort(e.target.value)}
            placeholder="9100"
            type="number"
          />
        </div>
      </div>

      <Button onClick={handleConnect} disabled={loading} className="w-full">
        <Wifi className="h-4 w-4 mr-2" />
        {loading ? "Connecting..." : "Connect"}
      </Button>

      <TestPrintButton disabled={!connected} />
    </div>
  );
};

// ─── USB Tab ──────────────────────────────────────────────────────────────────

const USBTab = ({
  connected,
  onStatusChange,
}: {
  connected: boolean;
  onStatusChange: () => void;
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const isNative = Capacitor.isNativePlatform();

  const handleConnect = async () => {
    if (!isNative) {
      toast({ title: "USB printing available on Android app only", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const ok = await nativePrinterBridge.connectUSB();
      if (ok) {
        toast({ title: "USB Printer connected ✓" });
        onStatusChange();
      } else {
        toast({ title: "No USB printer found", description: "Ensure OTG cable is connected", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">USB OTG Thermal Printer</span>
        <StatusBadge connected={connected} />
      </div>

      <div className="rounded-lg bg-muted/50 border border-border p-4 text-sm text-muted-foreground space-y-1">
        <p>1. Connect printer via USB OTG cable</p>
        <p>2. Grant USB permission when prompted</p>
        <p>3. Tap Auto-detect below</p>
      </div>

      <Button onClick={handleConnect} disabled={loading} className="w-full">
        <Usb className="h-4 w-4 mr-2" />
        {loading ? "Detecting..." : "Auto-detect USB Printer"}
      </Button>

      <TestPrintButton disabled={!connected} />
    </div>
  );
};

// ─── Main PrinterSettings component ──────────────────────────────────────────

export const PrinterSettings = () => {
  const { toast } = useToast();
  
  const getCombinedStatus = useCallback(() => {
    if (Capacitor.isNativePlatform()) {
      return nativePrinterBridge.getStatus();
    }
    return {
      connected: thermalPrinterService.isConnected(),
      type: "bluetooth" as const,
      deviceName: thermalPrinterService.getDeviceName(),
      address: "web-bluetooth"
    };
  }, []);

  const [status, setStatus] = useState(getCombinedStatus);

  const refresh = useCallback(() => {
    setStatus(getCombinedStatus());
  }, [getCombinedStatus]);

  useEffect(() => {
    const unsubNative = nativePrinterBridge.onStatusChange(() => refresh());
    const unsubWeb = thermalPrinterService.onConnectionChange(() => refresh());
    return () => {
      unsubNative();
      unsubWeb();
    };
  }, [refresh]);

  const handleDisconnect = async () => {
    if (Capacitor.isNativePlatform()) {
      await nativePrinterBridge.disconnect();
    } else {
      await thermalPrinterService.disconnect();
    }
    toast({ title: "Printer disconnected" });
  };

  return (
    <div className="p-4 space-y-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Printer Setup</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure thermal receipt printer
          </p>
        </div>
        {status.connected && (
          <Button size="sm" variant="ghost" onClick={handleDisconnect} className="text-destructive hover:text-destructive">
            Disconnect
          </Button>
        )}
      </div>

      {/* Current connection status */}
      {status.connected && (
        <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-green-500 animate-pulse" />
            <span className="text-sm font-medium text-green-600 dark:text-green-400">
              {status.deviceName ?? "Printer"} connected
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1 ml-6">
            Type: {status.type?.toUpperCase()} · {status.address}
          </p>
        </div>
      )}

      {/* Paper size */}
      <div className="rounded-xl border border-border p-4 space-y-3">
        <h3 className="text-sm font-medium text-foreground">Paper Settings</h3>
        <PaperSizeSelector />
      </div>

      {/* Connection tabs */}
      <div className="rounded-xl border border-border overflow-hidden">
        <Tabs defaultValue="bluetooth">
          <TabsList className="w-full rounded-none border-b border-border h-11 grid grid-cols-3">
            <TabsTrigger value="bluetooth" className="text-xs gap-1.5">
              <Bluetooth className="h-3.5 w-3.5" />
              Bluetooth
            </TabsTrigger>
            <TabsTrigger value="lan" className="text-xs gap-1.5">
              <Wifi className="h-3.5 w-3.5" />
              LAN/WiFi
            </TabsTrigger>
            <TabsTrigger value="usb" className="text-xs gap-1.5">
              <Usb className="h-3.5 w-3.5" />
              USB
            </TabsTrigger>
          </TabsList>

          <div className="p-4">
            <TabsContent value="bluetooth">
              <BluetoothTab
                connected={status.connected && status.type === "bluetooth"}
                onStatusChange={refresh}
              />
            </TabsContent>
            <TabsContent value="lan">
              <LANTab
                connected={status.connected && status.type === "lan"}
                onStatusChange={refresh}
              />
            </TabsContent>
            <TabsContent value="usb">
              <USBTab
                connected={status.connected && status.type === "usb"}
                onStatusChange={refresh}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default PrinterSettings;
