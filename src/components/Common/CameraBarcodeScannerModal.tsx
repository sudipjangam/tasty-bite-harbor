import React, { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats, CameraDevice } from "html5-qrcode";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Camera, 
  Flashlight, 
  FlashlightOff, 
  FlipHorizontal, 
  X, 
  AlertCircle, 
  Check, 
  Barcode, 
  Loader2 
} from "lucide-react";
import { playScanSuccessFeedback } from "@/utils/audioFeedback";

interface CameraBarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (barcode: string) => void;
  title?: string;
  description?: string;
}

const SUPPORTED_FORMATS = [
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.DATA_MATRIX,
];

export const CameraBarcodeScannerModal: React.FC<CameraBarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
  title = "Scan Barcode / QR Code",
  description = "Align 1D line barcode or QR code inside the frame to scan",
}) => {
  const scannerContainerId = "html5-barcode-scanner-viewport";
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [hasTorch, setHasTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);

  const startIdRef = useRef(0);

  // Stop scanner safely
  const stopScanner = useCallback(async () => {
    startIdRef.current++;
    if (scannerRef.current) {
      const scanner = scannerRef.current;
      scannerRef.current = null;
      try {
        if (scanner.isScanning) {
          await scanner.stop();
        }
        scanner.clear();
      } catch (err) {
        console.warn("Failed to stop scanner cleanly:", err);
      }
    }
  }, []);

  // Handle successful scan
  const handleDetected = useCallback(
    async (decodedText: string) => {
      const cleanCode = decodedText.trim();
      if (!cleanCode) return;

      playScanSuccessFeedback();
      setLastScannedCode(cleanCode);

      // Stop scanner immediately upon success to prevent multiple triggers
      await stopScanner();

      // Small delay for user to see success UI
      setTimeout(() => {
        onScanSuccess(cleanCode);
        onClose();
      }, 300);
    },
    [onScanSuccess, onClose, stopScanner]
  );

  // Start scanner
  const startScanner = useCallback(
    async (cameraId?: string) => {
      if (!isOpen) return;
      setErrorMsg(null);
      setIsInitializing(true);

      await stopScanner();
      const currentStartId = ++startIdRef.current;

      try {
        const scanner = new Html5Qrcode(scannerContainerId, {
          formatsToSupport: SUPPORTED_FORMATS,
          verbose: false,
        });
        scannerRef.current = scanner;

        // Configuration optimized for both 1D line codes and 2D QR codes
        const config = {
          fps: 15,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            // Horizontal rectangular box ideal for 1D line barcodes & QR
            const width = Math.floor(Math.min(viewfinderWidth * 0.88, 360));
            const height = Math.floor(Math.min(viewfinderHeight * 0.55, 200));
            return { width, height };
          },
          aspectRatio: 1.0,
        };

        const cameraTarget = cameraId
          ? { deviceId: { exact: cameraId } }
          : { facingMode: "environment" };

        await scanner.start(
          cameraTarget,
          config,
          (decodedText) => {
            handleDetected(decodedText);
          },
          () => {
            // Frame ignored without error noise
          }
        );

        // If cancelled or closed while starting, stop this scanner instance immediately
        if (currentStartId !== startIdRef.current || !isOpen) {
          try {
            if (scanner.isScanning) {
              await scanner.stop();
            }
            scanner.clear();
          } catch (stopErr) {
            console.warn("Failed to stop cancelled scanner:", stopErr);
          }
          if (scannerRef.current === scanner) {
            scannerRef.current = null;
          }
          return;
        }

        // Check torch capability
        try {
          const capabilities = scanner.getRunningTrackCapabilities() as any;
          if (capabilities && "torch" in capabilities) {
            setHasTorch(true);
            setIsTorchOn(false);
          } else {
            setHasTorch(false);
          }
        } catch {
          setHasTorch(false);
        }
      } catch (err: any) {
        if (currentStartId === startIdRef.current && isOpen) {
          console.error("Camera scanner init failed:", err);
          const message =
            err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError"
              ? "Camera permission denied. Please allow camera access in browser/app settings."
              : err?.message || "Failed to access camera.";
          setErrorMsg(message);
        }
      } finally {
        if (currentStartId === startIdRef.current) {
          setIsInitializing(false);
        }
      }
    },
    [isOpen, handleDetected, stopScanner]
  );

  // Initialize cameras and start when modal opens
  useEffect(() => {
    let isMounted = true;

    if (isOpen) {
      setErrorMsg(null);
      setLastScannedCode(null);
      setManualCode("");

      Html5Qrcode.getCameras()
        .then((availableCameras) => {
          if (!isMounted) return;
          setCameras(availableCameras);

          // Prefer back camera if available
          const backCam = availableCameras.find(
            (c) =>
              c.label.toLowerCase().includes("back") ||
              c.label.toLowerCase().includes("rear") ||
              c.label.toLowerCase().includes("environment")
          );

          const defaultCamId = backCam?.id || availableCameras[0]?.id;
          if (defaultCamId) {
            setSelectedCameraId(defaultCamId);
          }
          startScanner(defaultCamId);
        })
        .catch(() => {
          // Fallback to facingMode constraint if camera enum fails
          if (isMounted) {
            startScanner();
          }
        });
    } else {
      stopScanner();
    }

    return () => {
      isMounted = false;
      stopScanner();
    };
  }, [isOpen, startScanner, stopScanner]);

  // Toggle Torch/Flashlight
  const toggleTorch = async () => {
    if (!scannerRef.current || !hasTorch) return;
    try {
      const nextState = !isTorchOn;
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: nextState } as any],
      });
      setIsTorchOn(nextState);
    } catch (err) {
      console.warn("Failed to toggle flashlight:", err);
    }
  };

  // Switch Camera
  const switchCamera = () => {
    if (cameras.length < 2) return;
    const currentIndex = cameras.findIndex((c) => c.id === selectedCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextCamera = cameras[nextIndex];
    setSelectedCameraId(nextCamera.id);
    startScanner(nextCamera.id);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleDetected(manualCode.trim());
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-slate-950 border-slate-800 text-slate-100 shadow-2xl">
        <DialogHeader className="p-4 pb-2 border-b border-slate-800/80 bg-slate-900/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                <Barcode className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-slate-100">
                  {title}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400">
                  {description}
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Camera Container */}
        <div className="relative w-full aspect-square max-h-[380px] bg-black overflow-hidden flex items-center justify-center">
          {/* HTML5 QR Code Mount Node */}
          <div
            id={scannerContainerId}
            className="w-full h-full [&_video]:object-cover [&_video]:w-full [&_video]:h-full"
          />

          {/* Aiming Reticle Overlay (Active when no error and camera ready) */}
          {!errorMsg && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              {/* Semi-dark frosted surround */}
              <div className="relative w-[85%] max-w-[340px] h-[52%] max-h-[190px] border-2 border-emerald-400/80 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]">
                {/* Corner markers */}
                <span className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-emerald-400 rounded-tl" />
                <span className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-emerald-400 rounded-tr" />
                <span className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-emerald-400 rounded-bl" />
                <span className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-emerald-400 rounded-br" />

                {/* Animated Red Laser Scan Line */}
                <div className="absolute left-1 right-1 h-0.5 bg-gradient-to-r from-red-500 via-rose-300 to-red-500 shadow-[0_0_8px_#ef4444] animate-[scan_2s_ease-in-out_infinite]" />
              </div>
            </div>
          )}

          {/* Initializing Spinner */}
          {isInitializing && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2 z-10">
              <Loader2 className="w-7 h-7 text-emerald-400 animate-spin" />
              <p className="text-xs text-slate-300">Starting camera...</p>
            </div>
          )}

          {/* Error Message Display */}
          {errorMsg && (
            <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center z-10">
              <AlertCircle className="w-10 h-10 text-rose-500 mb-2" />
              <p className="text-sm font-medium text-slate-200 mb-1">Camera Error</p>
              <p className="text-xs text-slate-400 mb-4">{errorMsg}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => startScanner(selectedCameraId || undefined)}
                className="border-slate-700 hover:bg-slate-800 text-xs text-slate-200"
              >
                Retry Camera
              </Button>
            </div>
          )}

          {/* Success Flash Overlay */}
          {lastScannedCode && (
            <div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2 z-20 transition-all">
              <div className="p-3 bg-emerald-500 text-slate-950 rounded-full animate-bounce">
                <Check className="w-6 h-6 stroke-[3]" />
              </div>
              <p className="text-xs font-semibold text-emerald-300 tracking-wide uppercase">
                Scanned Successfully!
              </p>
              <p className="text-sm font-mono font-bold text-white bg-emerald-900/60 px-3 py-1 rounded border border-emerald-500/40">
                {lastScannedCode}
              </p>
            </div>
          )}

          {/* Camera Controls (Torch & Switch Camera) */}
          <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
            {hasTorch && (
              <Button
                type="button"
                size="icon"
                variant="secondary"
                onClick={toggleTorch}
                title={isTorchOn ? "Turn off torch" : "Turn on torch"}
                className={`w-9 h-9 rounded-full backdrop-blur-md transition-colors ${
                  isTorchOn
                    ? "bg-amber-500 text-slate-950 hover:bg-amber-400"
                    : "bg-slate-900/80 text-slate-200 hover:bg-slate-800 border border-slate-700/60"
                }`}
              >
                {isTorchOn ? (
                  <Flashlight className="w-4 h-4 fill-current" />
                ) : (
                  <FlashlightOff className="w-4 h-4" />
                )}
              </Button>
            )}

            {cameras.length > 1 && (
              <Button
                type="button"
                size="icon"
                variant="secondary"
                onClick={switchCamera}
                title="Switch Camera"
                className="w-9 h-9 rounded-full bg-slate-900/80 text-slate-200 hover:bg-slate-800 border border-slate-700/60 backdrop-blur-md"
              >
                <FlipHorizontal className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Footer / Manual Fallback Entry */}
        <div className="p-3 bg-slate-900/90 border-t border-slate-800/80">
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <Input
              type="text"
              placeholder="Or type/paste barcode manually..."
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="h-9 text-xs bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-emerald-500"
            />
            <Button
              type="submit"
              size="sm"
              disabled={!manualCode.trim()}
              className="h-9 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium"
            >
              Submit
            </Button>
          </form>
          <p className="text-[10px] text-slate-500 text-center mt-2">
            Reads 1D Barcodes (EAN, UPC, Code 128) & 2D QR Codes
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CameraBarcodeScannerModal;
