import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Printer, PrinterCheck, RefreshCw, Bluetooth, FileText, Receipt, Check, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { thermalPrinterService } from "@/services/thermalPrinterService";
import { getPaperSize, setPaperSize, nativePrinterBridge } from "@/services/nativePrinterBridge";
import { Capacitor } from "@capacitor/core";

interface QSRPrinterDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onPrinterStateChange?: () => void;
}

export const QSRPrinterDialog: React.FC<QSRPrinterDialogProps> = ({
  isOpen,
  onClose,
  onPrinterStateChange,
}) => {
  const { toast } = useToast();
  const [paperSize, setPaperSizeState] = useState<"58" | "80">(getPaperSize);
  const [isConnected, setIsConnected] = useState(thermalPrinterService.isConnected());
  const [deviceName, setDeviceName] = useState<string | null>(thermalPrinterService.getDeviceName());
  const [isConnecting, setIsConnecting] = useState(false);
  const [isTestPrinting, setIsTestPrinting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPaperSizeState(getPaperSize());
      setIsConnected(thermalPrinterService.isConnected());
      setDeviceName(thermalPrinterService.getDeviceName());
    }
  }, [isOpen]);

  const handleSizeChange = (newSize: "58" | "80") => {
    setPaperSize(newSize);
    setPaperSizeState(newSize);
    toast({
      title: `Paper Size: ${newSize}mm`,
      description: `Format adjusted for ${newSize === "58" ? "32-column (58mm)" : "48-column (80mm)"} receipts`,
    });
    onPrinterStateChange?.();
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      if (isConnected) {
        await thermalPrinterService.disconnect();
        setIsConnected(false);
        setDeviceName(null);
        toast({ title: "Printer Disconnected" });
      } else {
        await thermalPrinterService.connect();
        setIsConnected(thermalPrinterService.isConnected());
        setDeviceName(thermalPrinterService.getDeviceName());
        toast({
          title: "Printer Connected ✓",
          description: `Ready for ${paperSize}mm printing`,
        });
      }
      onPrinterStateChange?.();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Connection Failed",
        description: err.message || "Failed to connect to printer",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleTestKOT = async () => {
    if (!isConnected) {
      toast({ variant: "destructive", title: "Printer Not Connected", description: "Please connect printer first" });
      return;
    }
    setIsTestPrinting(true);
    try {
      await thermalPrinterService.printKOT({
        tableName: "Table 1",
        serverName: "Staff",
        items: [
          { name: "Paneer Butter Masala", quantity: 1, price: 240 },
          { name: "Garlic Naan", quantity: 2, price: 60, notes: "Crispy" },
        ],
        orderType: "dine_in",
        roundNumber: 1,
      });
      toast({ title: "Test KOT Printed ✓", description: `Printed in ${paperSize}mm format` });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Test Print Failed", description: err.message });
    } finally {
      setIsTestPrinting(false);
    }
  };

  const handleTestBill = async () => {
    if (!isConnected) {
      toast({ variant: "destructive", title: "Printer Not Connected", description: "Please connect printer first" });
      return;
    }
    setIsTestPrinting(true);
    try {
      await thermalPrinterService.printReceipt({
        restaurantName: "Tasty Bite Restaurant",
        address: "Main Street, City",
        phone: "9876543210",
        billNumber: "#999999",
        date: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
        time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
        tableName: "Table 1",
        customerName: "Guest",
        serverName: "Staff",
        items: [
          { name: "Paneer Butter Masala", quantity: 1, price: 240 },
          { name: "Garlic Naan", quantity: 2, price: 60 },
        ],
        subtotal: 360,
        cgst: 0,
        sgst: 0,
        discount: 0,
        netAmount: 360,
        currencySymbol: "₹",
      });
      toast({ title: "Test Bill Printed ✓", description: `Printed in ${paperSize}mm format` });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Test Print Failed", description: err.message });
    } finally {
      setIsTestPrinting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md p-6 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white">
                Thermal Printer Setup
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500 dark:text-gray-400">
                Configure printer paper size & test KOT / bill output
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 pt-3">
          {/* Paper Size Selection */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Paper Width Size
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleSizeChange("58")}
                className={`flex flex-col items-start p-3.5 rounded-2xl border-2 transition-all text-left ${
                  paperSize === "58"
                    ? "border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 shadow-sm"
                    : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 text-gray-600 dark:text-gray-400"
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="font-bold text-sm">58 mm</span>
                  {paperSize === "58" && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                </div>
                <span className="text-[11px] opacity-80">2-inch (Standard Mobile POS)</span>
                <span className="text-[10px] font-mono mt-1 opacity-60">32 chars / line</span>
              </button>

              <button
                type="button"
                onClick={() => handleSizeChange("80")}
                className={`flex flex-col items-start p-3.5 rounded-2xl border-2 transition-all text-left ${
                  paperSize === "80"
                    ? "border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 shadow-sm"
                    : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 text-gray-600 dark:text-gray-400"
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="font-bold text-sm">80 mm</span>
                  {paperSize === "80" && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                </div>
                <span className="text-[11px] opacity-80">3-inch (Desktop Receipt)</span>
                <span className="text-[10px] font-mono mt-1 opacity-60">48 chars / line</span>
              </button>
            </div>
          </div>

          {/* Connection Status & Toggle */}
          <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${isConnected ? "bg-emerald-500 animate-pulse" : "bg-gray-400"}`} />
              <div>
                <p className="text-xs font-bold text-gray-900 dark:text-white">
                  {isConnected ? (deviceName || "Connected") : "Disconnected"}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  {isConnected ? `Ready (${paperSize}mm)` : "Bluetooth / LAN Printer"}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant={isConnected ? "destructive" : "default"}
              onClick={handleConnect}
              disabled={isConnecting}
              className="rounded-xl text-xs h-8 px-3"
            >
              {isConnecting ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" />
              ) : isConnected ? (
                "Disconnect"
              ) : (
                "Connect"
              )}
            </Button>
          </div>

          {/* Test Printing Actions */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Verify Output
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestKOT}
                disabled={!isConnected || isTestPrinting}
                className="gap-1.5 rounded-xl text-xs h-10 border-gray-200 dark:border-gray-700"
              >
                <FileText className="w-3.5 h-3.5 text-orange-500" />
                Test Print KOT
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestBill}
                disabled={!isConnected || isTestPrinting}
                className="gap-1.5 rounded-xl text-xs h-10 border-gray-200 dark:border-gray-700"
              >
                <Receipt className="w-3.5 h-3.5 text-emerald-500" />
                Test Print Bill
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
