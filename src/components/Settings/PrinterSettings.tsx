import React, { useState, useEffect, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { Bluetooth, Wifi, Usb, RefreshCw, Printer, Check, X, Radio, Download, Unplug, Signal } from "lucide-react";
import { downloadKioskShortcut } from "@/utils/kioskShortcut";
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
import { cn } from "@/lib/utils";

// ─── Shared styles ────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(255,255,255,0.08)",
};

const gradientBtnClass =
  "bg-gradient-to-r from-indigo-500 via-purple-500 to-violet-500 hover:from-indigo-600 hover:via-purple-600 hover:to-violet-600 text-white border-0 shadow-lg shadow-purple-500/20 transition-all active:scale-[0.98]";

// ─── Paper size selector ──────────────────────────────────────────────────────

const PaperSizeSelector = () => {
  const [size, setSize] = useState<"58" | "80">(getPaperSize);

  const handleChange = (v: "58" | "80") => {
    setSize(v);
    setPaperSize(v);
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl"
          style={{ background: "linear-gradient(135deg, #6366f1, #a855f7)" }}
        >
          <Printer className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Paper Width</p>
          <p className="text-[11px] text-muted-foreground">Thermal roll size</p>
        </div>
      </div>
      <div
        className="flex rounded-full overflow-hidden p-0.5"
        style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}
      >
        {(["58", "80"] as const).map((s) => (
          <button
            key={s}
            onClick={() => handleChange(s)}
            className={cn(
              "px-4 py-1.5 text-xs font-semibold rounded-full transition-all",
              size === s
                ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md"
                : "text-muted-foreground hover:text-foreground"
            )}
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
  <div
    className={cn(
      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium",
    )}
    style={{
      background: connected ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.1)",
      border: `1px solid ${connected ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.2)"}`,
    }}
  >
    <span className="relative flex h-2 w-2">
      {connected && (
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
      )}
      <span className={cn("relative inline-flex rounded-full h-2 w-2", connected ? "bg-green-400" : "bg-red-400")} />
    </span>
    <span className={connected ? "text-green-500" : "text-red-400"}>
      {connected ? "Connected" : "Disconnected"}
    </span>
  </div>
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
    <button
      onClick={handleTest}
      disabled={disabled || loading}
      className={cn(
        "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none",
      )}
      style={{
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.1)",
      }}
    >
      <Printer className="h-4 w-4 text-purple-400" />
      <span className="text-foreground">{loading ? "Printing..." : "Send Test Print"}</span>
    </button>
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
          <span className="text-sm font-medium text-foreground">Web Bluetooth</span>
          <StatusBadge connected={connected} />
        </div>
        
        <div className="rounded-xl p-4 text-sm space-y-2.5" style={cardStyle}>
          <p className="font-semibold text-foreground flex items-center gap-2">
            <Usb className="h-4 w-4 text-purple-400" /> USB / System Printer
          </p>
          <p className="text-muted-foreground text-xs leading-relaxed">
            Plug in your USB thermal printer. KOT and Bill receipts print automatically via the Windows/system printer driver.
          </p>
          <div className="border-t border-white/5 my-2 pt-2">
            <p className="font-semibold text-foreground flex items-center gap-2 text-xs">
              <Bluetooth className="h-3.5 w-3.5 text-blue-400" /> Bluetooth Wireless
            </p>
            <p className="text-muted-foreground text-xs mt-1">1. Turn on Bluetooth & thermal printer</p>
            <p className="text-muted-foreground text-xs">2. Click "Connect" below to pair directly</p>
          </div>
        </div>

        <Button onClick={connectWeb} disabled={webConnecting} className={cn("w-full rounded-xl h-11", gradientBtnClass)}>
          <Bluetooth className="h-4 w-4 mr-2" />
          {webConnecting ? "Connecting..." : "Connect Bluetooth Printer"}
        </Button>

        <TestPrintButton disabled={false} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">Bluetooth Classic (SPP)</span>
        <StatusBadge connected={connected} />
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={loadPaired}
          disabled={loadingPaired || scanning}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-[0.97] disabled:opacity-40"
          style={cardStyle}
        >
          <RefreshCw className={cn("h-3.5 w-3.5 text-indigo-400", loadingPaired && "animate-spin")} />
          <span className="text-foreground">{loadingPaired ? "Loading..." : "Paired Devices"}</span>
        </button>
        <button
          onClick={scanNearby}
          disabled={scanning || loadingPaired}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-[0.97] disabled:opacity-40"
          style={cardStyle}
        >
          <Signal className={cn("h-3.5 w-3.5 text-purple-400", scanning && "animate-pulse")} />
          <span className="text-foreground">{scanning ? "Scanning..." : "Scan Nearby"}</span>
        </button>
      </div>

      {scanning && (
        <div className="flex items-center justify-center gap-2 py-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-purple-500" />
          </span>
          <p className="text-xs text-muted-foreground animate-pulse">
            Scanning for nearby devices… ~10 seconds
          </p>
        </div>
      )}

      {/* Device list */}
      {allDevices.length > 0 && (
        <div className="space-y-2">
          {allDevices.map((d) => (
            <div
              key={d.address}
              className="flex items-center justify-between p-3 rounded-xl transition-all"
              style={cardStyle}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: d._paired ? "rgba(99,102,241,0.15)" : "rgba(168,85,247,0.12)" }}
                >
                  <Bluetooth className={cn("h-4 w-4", d._paired ? "text-indigo-400" : "text-purple-400")} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-foreground truncate">{d.name || "Unknown Device"}</p>
                    {d._paired && (
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded-full font-bold shrink-0"
                        style={{ background: "rgba(34,197,94,0.15)", color: "#4ade80" }}
                      >
                        PAIRED
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground font-mono truncate">{d.address}</p>
                </div>
              </div>
              <button
                onClick={() => connect(d)}
                disabled={connecting === d.address}
                className={cn(
                  "shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95 disabled:opacity-50",
                  gradientBtnClass
                )}
              >
                {connecting === d.address ? "..." : "Connect"}
              </button>
            </div>
          ))}
        </div>
      )}

      {!loadingPaired && !scanning && allDevices.length === 0 && (
        <div className="text-center py-6 space-y-2">
          <div
            className="mx-auto flex h-12 w-12 items-center justify-center rounded-full"
            style={{ background: "rgba(168,85,247,0.1)" }}
          >
            <Bluetooth className="h-5 w-5 text-purple-400 opacity-60" />
          </div>
          <p className="text-sm text-muted-foreground">
            No devices found
          </p>
          <p className="text-xs text-muted-foreground/70">
            Pair in <span className="font-medium text-foreground/80">Android Settings → Bluetooth</span>, then tap <span className="font-medium text-foreground/80">Paired Devices</span>
          </p>
        </div>
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
        <span className="text-sm font-medium text-foreground">LAN / WiFi (TCP:9100)</span>
        <StatusBadge connected={connected} />
      </div>

      <div className="space-y-3">
        <div>
          <Label htmlFor="printer-ip" className="text-xs text-muted-foreground mb-1.5 block">
            Printer IP Address
          </Label>
          <Input
            id="printer-ip"
            value={ip}
            onChange={(e) => setIp(e.target.value)}
            placeholder="192.168.1.100"
            type="text"
            inputMode="numeric"
            className="rounded-xl h-11 bg-white/[0.04] border-white/10 focus:border-purple-500/50"
          />
        </div>
        <div>
          <Label htmlFor="printer-port" className="text-xs text-muted-foreground mb-1.5 block">
            Port
          </Label>
          <Input
            id="printer-port"
            value={port}
            onChange={(e) => setPort(e.target.value)}
            placeholder="9100"
            type="number"
            className="rounded-xl h-11 bg-white/[0.04] border-white/10 focus:border-purple-500/50"
          />
        </div>
      </div>

      <button
        onClick={handleConnect}
        disabled={loading}
        className={cn("w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold disabled:opacity-50", gradientBtnClass)}
      >
        <Wifi className="h-4 w-4" />
        {loading ? "Connecting..." : "Connect"}
      </button>

      <TestPrintButton disabled={!connected} />
    </div>
  );
};

// ─── USB Tab (Silent Direct Printing Shortcut) ────────────────────────────────

const USBTab = () => {
  const { toast } = useToast();

  const handleDownload = () => {
    downloadKioskShortcut();
    toast({
      title: "Shortcut Installer Downloaded ✓",
      description: "Double-click the downloaded .bat file to create the Direct Print shortcut on your Desktop.",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">USB Cable Printing</span>
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
          style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}
        >
          <Usb className="h-3 w-3 text-amber-400" />
          <span className="text-amber-400">Windows USB</span>
        </div>
      </div>

      <div className="rounded-xl p-4 text-sm space-y-2.5" style={cardStyle}>
        <p className="font-semibold text-foreground text-xs">How USB Silent Printing Works</p>
        <p className="text-muted-foreground text-xs leading-relaxed">
          USB printers print through the Windows driver. To print KOTs and Bills <strong className="text-foreground/80">directly with zero popup</strong>, open POS using the Direct Print shortcut.
        </p>
        <div className="border-t border-white/5 pt-2.5 space-y-1 text-[11px] text-muted-foreground">
          <p className="font-semibold text-foreground text-xs mb-1">1-Time Setup:</p>
          <p>1. Set thermal printer as default in Windows</p>
          <p>2. Download the Desktop Shortcut below</p>
          <p>3. Double-click to create the shortcut</p>
        </div>
      </div>

      <button
        onClick={handleDownload}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
        style={{
          background: "linear-gradient(135deg, #d97706, #f59e0b)",
          color: "white",
          boxShadow: "0 4px 15px rgba(245,158,11,0.25)",
        }}
      >
        <Download className="h-4 w-4" />
        Download Direct Print Shortcut
      </button>

      <TestPrintButton disabled={false} />
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
    <div className="p-4 space-y-4 max-w-lg mx-auto pb-8">
      {/* Connected device hero */}
      {status.connected && (
        <div
          className="rounded-2xl p-4 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, rgba(34,197,94,0.12), rgba(16,185,129,0.08))",
            border: "1px solid rgba(34,197,94,0.2)",
          }}
        >
          {/* Decorative glow */}
          <div
            className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-30"
            style={{ background: "radial-gradient(circle, rgba(34,197,94,0.4), transparent)" }}
          />
          <div className="flex items-center justify-between relative">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ background: "rgba(34,197,94,0.15)" }}
              >
                <Printer className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-green-400">
                  {status.deviceName ?? "Printer"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {status.type?.toUpperCase()} · {status.address}
                </p>
              </div>
            </div>
            <button
              onClick={handleDisconnect}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}
            >
              <Unplug className="h-3 w-3 text-red-400" />
              <span className="text-red-400">Disconnect</span>
            </button>
          </div>
        </div>
      )}

      {/* Paper size */}
      <div className="rounded-2xl p-4" style={cardStyle}>
        <PaperSizeSelector />
      </div>

      {/* Connection tabs */}
      <div className="rounded-2xl overflow-hidden" style={cardStyle}>
        <Tabs defaultValue="bluetooth">
          <TabsList
            className="w-full rounded-none h-12 grid grid-cols-3 bg-transparent p-0"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
          >
            <TabsTrigger
              value="bluetooth"
              className="text-xs gap-1.5 rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-indigo-400 border-b-2 border-transparent data-[state=active]:border-indigo-400 transition-all"
            >
              <Bluetooth className="h-3.5 w-3.5" />
              Bluetooth
            </TabsTrigger>
            <TabsTrigger
              value="usb"
              className="text-xs gap-1.5 rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-amber-400 border-b-2 border-transparent data-[state=active]:border-amber-400 transition-all"
            >
              <Usb className="h-3.5 w-3.5" />
              USB Cable
            </TabsTrigger>
            <TabsTrigger
              value="lan"
              className="text-xs gap-1.5 rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-purple-400 border-b-2 border-transparent data-[state=active]:border-purple-400 transition-all"
            >
              <Wifi className="h-3.5 w-3.5" />
              LAN/WiFi
            </TabsTrigger>
          </TabsList>

          <div className="p-4">
            <TabsContent value="bluetooth">
              <BluetoothTab
                connected={status.connected && status.type === "bluetooth"}
                onStatusChange={refresh}
              />
            </TabsContent>
            <TabsContent value="usb">
              <USBTab />
            </TabsContent>
            <TabsContent value="lan">
              <LANTab
                connected={status.connected && status.type === "lan"}
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
