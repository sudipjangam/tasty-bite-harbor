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
  AlertCircle, 
  Check, 
  Barcode, 
  Loader2,
  Upload,
  RefreshCw,
  ShieldCheck
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

// Helper to wait until dialog DOM container is mounted
const waitForElement = (id: string, maxAttempts = 25, delayMs = 50): Promise<boolean> => {
  return new Promise((resolve) => {
    let attempts = 0;
    const check = () => {
      if (document.getElementById(id)) {
        resolve(true);
      } else if (attempts++ < maxAttempts) {
        setTimeout(check, delayMs);
      } else {
        resolve(false);
      }
    };
    check();
  });
};

export const CameraBarcodeScannerModal: React.FC<CameraBarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
  title = "Scan Barcode / QR Code",
  description = "Align 1D line barcode or QR code inside the frame to scan",
}) => {
  const scannerContainerId = "html5-barcode-scanner-viewport";
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [hasTorch, setHasTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPermissionDenied, setIsPermissionDenied] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<"checking" | "prompt" | "granted" | "denied">("checking");

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

      // Small delay for user to see success feedback
      setTimeout(() => {
        onScanSuccess(cleanCode);
        onClose();
      }, 350);
    },
    [onScanSuccess, onClose, stopScanner]
  );

  // Query cameras after stream started (devices have full labels once permission is granted)
  const refreshCameraList = useCallback(async () => {
    try {
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        setCameras(devices);
      }
    } catch {
      // Ignored if enumeration not allowed
    }
  }, []);

  // Pre-acquire camera permission via raw getUserMedia.
  // Triggers native mobile browser permission prompt with direct user gesture context.
  const acquireCameraPermission = useCallback(async (): Promise<MediaStream | null> => {
    const constraints: MediaStreamConstraints[] = [
      { video: { facingMode: "environment" } },
      { video: { facingMode: "user" } },
      { video: true },
    ];

    for (const constraint of constraints) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraint);
        return stream;
      } catch (err: any) {
        if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
          throw err;
        }
        console.warn("getUserMedia constraint failed, trying next:", constraint, err?.name);
      }
    }
    return null;
  }, []);

  // Start scanner with resilient mobile fallbacks
  const startScanner = useCallback(
    async (preferredCameraId?: string) => {
      if (!isOpen) return;
      setErrorMsg(null);
      setIsPermissionDenied(false);
      setIsInitializing(true);

      // Secure context validation
      if (typeof window !== "undefined") {
        const isLocal =
          window.location.hostname === "localhost" ||
          window.location.hostname === "127.0.0.1";
        if (!window.isSecureContext && !isLocal) {
          setErrorMsg("Camera access requires HTTPS. Please access using a secure connection.");
          setPermissionState("denied");
          setIsInitializing(false);
          return;
        }
        if (!navigator?.mediaDevices?.getUserMedia) {
          setErrorMsg("Camera API is not supported in this browser. Please use Chrome, Brave, Safari, or Firefox.");
          setPermissionState("denied");
          setIsInitializing(false);
          return;
        }
      }

      await stopScanner();
      const currentStartId = ++startIdRef.current;

      // Ensure DOM portal node exists (Radix dialog portal race)
      const isElementReady = await waitForElement(scannerContainerId);
      if (!isElementReady || currentStartId !== startIdRef.current || !isOpen) {
        setIsInitializing(false);
        return;
      }

      try {
        // Step 1: Pre-acquire permission via direct getUserMedia.
        let preStream: MediaStream | null = null;
        try {
          preStream = await acquireCameraPermission();
          setPermissionState("granted");
        } catch (permErr: any) {
          setPermissionState("denied");
          setIsPermissionDenied(true);
          throw permErr;
        }

        // Release pre-acquired stream — html5-qrcode will mount its own video stream
        if (preStream) {
          preStream.getTracks().forEach((t) => t.stop());
        }

        if (currentStartId !== startIdRef.current || !isOpen) {
          setIsInitializing(false);
          return;
        }

        const scanner = new Html5Qrcode(scannerContainerId, {
          formatsToSupport: SUPPORTED_FORMATS,
          verbose: false,
        });
        scannerRef.current = scanner;

        const config = {
          fps: 15,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            const width = Math.floor(Math.min(viewfinderWidth * 0.9, 360));
            const height = Math.floor(Math.min(viewfinderHeight * 0.55, 200));
            return { width, height };
          },
        };

        const onFrameSuccess = (decodedText: string) => {
          handleDetected(decodedText);
        };
        const onFrameFailure = () => {
          // Silent frame ignore
        };

        let started = false;

        // Strategy 1: User-selected specific camera
        if (preferredCameraId) {
          try {
            await scanner.start(
              { deviceId: { exact: preferredCameraId } },
              config,
              onFrameSuccess,
              onFrameFailure
            );
            started = true;
            setSelectedCameraId(preferredCameraId);
          } catch (camErr: any) {
            console.warn("Preferred camera failed:", camErr?.name, camErr?.message);
          }
        }

        // Strategy 2: Back/rear camera
        if (!started) {
          try {
            await scanner.start(
              { facingMode: "environment" },
              config,
              onFrameSuccess,
              onFrameFailure
            );
            started = true;
          } catch (envErr: any) {
            if (envErr?.name === "NotAllowedError" || envErr?.name === "PermissionDeniedError") {
              throw envErr;
            }
            console.warn("Environment camera failed:", envErr?.name, envErr?.message);
          }
        }

        // Strategy 3: Front/user camera (laptops, tablets)
        if (!started) {
          try {
            await scanner.start(
              { facingMode: "user" },
              config,
              onFrameSuccess,
              onFrameFailure
            );
            started = true;
          } catch (userErr: any) {
            if (userErr?.name === "NotAllowedError" || userErr?.name === "PermissionDeniedError") {
              throw userErr;
            }
            console.warn("User camera failed:", userErr?.name, userErr?.message);
          }
        }

        // Strategy 4: Enumerate devices and try first available by deviceId
        if (!started) {
          try {
            const devices = await Html5Qrcode.getCameras();
            if (devices && devices.length > 0) {
              setCameras(devices);
              await scanner.start(
                { deviceId: { exact: devices[0].id } },
                config,
                onFrameSuccess,
                onFrameFailure
              );
              started = true;
              setSelectedCameraId(devices[0].id);
            }
          } catch (enumErr: any) {
            console.warn("Enumerate+start failed:", enumErr?.name, enumErr?.message);
          }
        }

        if (!started) {
          throw new Error("Unable to start video feed. Please use photo scan or enter code manually.");
        }

        // Stale check
        if (currentStartId !== startIdRef.current || !isOpen) {
          try {
            if (scanner.isScanning) await scanner.stop();
            scanner.clear();
          } catch {}
          if (scannerRef.current === scanner) scannerRef.current = null;
          return;
        }

        // Populate camera list in background now that permission is active
        refreshCameraList();

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
          console.error("Camera scanner init failed:", err?.name, err?.message, err);
          const errName = err?.name || "";
          if (errName === "NotAllowedError" || errName === "PermissionDeniedError") {
            setPermissionState("denied");
            setIsPermissionDenied(true);
            setErrorMsg(
              "Camera permission is blocked. Tap the tune/lock icon in browser URL bar to allow camera, then tap Retry below."
            );
          } else if (errName === "NotFoundError" || errName === "DevicesNotFoundError") {
            setErrorMsg("No camera device found on this system.");
          } else if (errName === "NotReadableError" || errName === "TrackStartError") {
            setErrorMsg("Camera is busy. Close other apps using camera, then retry.");
          } else if (errName === "OverconstrainedError") {
            setErrorMsg("Camera resolution not supported by this device. Try photo upload or manual entry.");
          } else {
            setErrorMsg(err?.message || "Failed to access camera. Use photo upload or manual entry.");
          }
        }
      } finally {
        if (currentStartId === startIdRef.current) {
          setIsInitializing(false);
        }
      }
    },
    [isOpen, handleDetected, stopScanner, refreshCameraList, acquireCameraPermission]
  );

  // Check initial permission state on modal open
  useEffect(() => {
    let isMounted = true;

    if (!isOpen) {
      stopScanner();
      return;
    }

    setErrorMsg(null);
    setIsPermissionDenied(false);
    setLastScannedCode(null);
    setManualCode("");

    const evaluatePermissions = async () => {
      if (typeof window === "undefined" || !navigator?.mediaDevices?.getUserMedia) {
        if (isMounted) {
          setPermissionState("denied");
          setErrorMsg("Camera is not supported on this device/browser.");
        }
        return;
      }

      // Check if browser permission query API is supported
      if (navigator?.permissions?.query) {
        try {
          const status = await navigator.permissions.query({ name: "camera" as any });
          if (!isMounted) return;

          if (status.state === "granted") {
            setPermissionState("granted");
            startScanner();
            return;
          } else if (status.state === "denied") {
            setPermissionState("denied");
            setIsPermissionDenied(true);
            setErrorMsg("Camera permission was blocked. Tap the tune/lock icon in your URL bar, allow Camera, then tap Retry.");
            return;
          } else {
            // 'prompt' state: Show explicit "Allow Camera" screen for clean user gesture
            setPermissionState("prompt");
            return;
          }
        } catch {
          // Unsupported query parameter in some browsers (e.g. Safari)
        }
      }

      // Default fallback: show prompt card so user's tap provides clean user gesture context
      if (isMounted) {
        setPermissionState("prompt");
      }
    };

    evaluatePermissions();

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

  // Scan from photo / image upload fallback
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsInitializing(true);
    setErrorMsg(null);

    try {
      const tempScanner =
        scannerRef.current ||
        new Html5Qrcode(scannerContainerId, {
          formatsToSupport: SUPPORTED_FORMATS,
          verbose: false,
        });

      const decodedText = await tempScanner.scanFile(file, false);
      if (decodedText) {
        handleDetected(decodedText);
      } else {
        setErrorMsg("No readable barcode found in image. Please try another angle or enter code manually.");
      }
    } catch (err: any) {
      console.warn("File scan error:", err);
      setErrorMsg("Could not detect barcode from image. Please ensure code is clear and well lit.");
    } finally {
      setIsInitializing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
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

        {/* Camera Viewport Container */}
        <div className="relative w-full aspect-square max-h-[380px] bg-black overflow-hidden flex items-center justify-center">
          {/* HTML5 QR Code Mount Node */}
          <div
            id={scannerContainerId}
            className="w-full h-full [&_video]:object-cover [&_video]:w-full [&_video]:h-full"
          />

          {/* Aiming Reticle Overlay (Active when camera ready and running) */}
          {permissionState === "granted" && !errorMsg && !isInitializing && (
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

          {/* Prompt State: Ask for Permission with clear action */}
          {permissionState === "prompt" && !errorMsg && !isInitializing && (
            <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center z-20">
              <div className="p-3.5 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 mb-3 shadow-lg">
                <Camera className="w-9 h-9" />
              </div>
              <p className="text-base font-semibold text-slate-100 mb-1">
                Camera Access Required
              </p>
              <p className="text-xs text-slate-400 max-w-xs leading-relaxed mb-5">
                Grant camera access to scan item barcodes and QR codes directly from your device.
              </p>

              <div className="flex flex-col w-full max-w-xs gap-2.5">
                <Button
                  size="default"
                  onClick={() => {
                    setPermissionState("granted");
                    startScanner();
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs py-2.5 rounded-lg shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Allow & Start Camera
                </Button>

                <Button
                  size="sm"
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full bg-slate-900 border-slate-700 hover:bg-slate-800 text-slate-300 text-xs py-2 rounded-lg"
                >
                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                  Scan from Photo / Snapshot
                </Button>
              </div>
            </div>
          )}

          {/* Initializing Spinner */}
          {isInitializing && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center gap-2 z-10">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
              <p className="text-xs font-medium text-slate-300">Connecting to camera...</p>
            </div>
          )}

          {/* Error Message Display & Recovery */}
          {errorMsg && (
            <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-5 text-center z-20 overflow-y-auto">
              <div className="p-2.5 rounded-full bg-rose-500/20 text-rose-400 mb-2">
                <AlertCircle className="w-8 h-8" />
              </div>
              <p className="text-sm font-semibold text-slate-100 mb-1">
                {isPermissionDenied ? "Camera Access Required" : "Camera Error"}
              </p>
              <p className="text-xs text-slate-300 max-w-xs leading-relaxed mb-4">
                {errorMsg}
              </p>

              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    setPermissionState("granted");
                    startScanner(selectedCameraId || undefined);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-4 py-2 rounded-lg shadow-md transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Retry Camera
                </Button>

                <Button
                  size="sm"
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-slate-900 border-slate-700 hover:bg-slate-800 text-slate-200 text-xs px-3.5 py-2 rounded-lg"
                >
                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                  Scan Photo / File
                </Button>
              </div>

              {isPermissionDenied && (
                <p className="text-[11px] text-amber-400/90 mt-3 max-w-xs">
                  Tip: On Brave or Chrome, tap the address bar icon to permit camera.
                </p>
              )}
            </div>
          )}

          {/* Success Flash Overlay */}
          {lastScannedCode && (
            <div className="absolute inset-0 bg-emerald-950/90 backdrop-blur-sm flex flex-col items-center justify-center gap-2 z-30 transition-all">
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
          {permissionState === "granted" && !errorMsg && (
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
          )}
        </div>

        {/* Hidden Photo File Input for Instant Photo Barcode Fallback */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhotoUpload}
          className="hidden"
        />

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
          <div className="flex items-center justify-between mt-2 px-0.5">
            <p className="text-[10px] text-slate-500">
              Reads 1D Barcodes (EAN, UPC, Code 128) & 2D QR Codes
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1 font-medium"
            >
              <Upload className="w-3 h-3" />
              Scan from photo
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CameraBarcodeScannerModal;
