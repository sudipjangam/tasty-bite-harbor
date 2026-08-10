import React, { useState, useRef, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import {
  Loader2,
  CreditCard,
  Smartphone,
  Save,
  Check,
  Upload,
  Camera,
  QrCode,
  AlertCircle,
  X,
  ScanLine,
} from "lucide-react";
import jsQR from "jsqr";

// ─── Security constants ────────────────────────────────────────────────
/** Valid UPI ID: localpart@provider  — no script/SQL chars allowed */
const UPI_ID_REGEX = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;

/** Business name: printable unicode only, max 100 chars */
const BUSINESS_NAME_REGEX = /^[\p{L}\p{N}\p{P}\p{Z}]{1,100}$/u;

/** Max upload: 5 MB — DoS mitigation */
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

/** Allowed MIME — reject arbitrary file uploads */
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/** Max canvas dim — prevent memory DoS from giant images */
const MAX_CANVAS_DIM = 2048;

// ─── Sanitize helpers ──────────────────────────────────────────────────
function sanitizeUpiId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9.\-_@]/g, "").slice(0, 300);
}

function sanitizeBusinessName(raw: string): string {
  // Remove control chars and HTML-dangerous chars
  return raw.replace(/[\x00-\x1F\x7F<>&"'`]/g, "").slice(0, 100);
}

// ─── UPI QR parsing ────────────────────────────────────────────────────
interface ParsedUPI {
  upiId: string;
  name: string;
}

/**
 * Parse a UPI deep-link safely.
 * Only accepts upi:// scheme — rejects data:, javascript:, etc.
 * All extracted values are sanitised before returning.
 */
function parseUpiQrData(rawData: string): ParsedUPI | null {
  try {
    if (!rawData.startsWith("upi://")) return null;
    const url = new URL(rawData.replace(/^upi:\/\//, "http://dummy/"));
    const pa = url.searchParams.get("pa") ?? "";
    const pn = url.searchParams.get("pn") ?? "";
    const upiId = sanitizeUpiId(decodeURIComponent(pa));
    const name = sanitizeBusinessName(decodeURIComponent(pn));
    if (!UPI_ID_REGEX.test(upiId)) return null;
    return { upiId, name };
  } catch {
    return null;
  }
}

/**
 * Decode QR from a File.
 * 1. Tries native BarcodeDetector (highly accurate for blurry/tilted photos via native ML)
 * 2. Falls back to jsQR (canvas pixel data) with inversion attempts for glare.
 */
async function decodeQrFromFile(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = async () => {
      URL.revokeObjectURL(objectUrl);

      // Attempt 1: Native BarcodeDetector (Android Chrome / macOS Safari)
      // Exceptionally good at real-world photos with glare/tilt
      if ("BarcodeDetector" in window) {
        try {
          // @ts-ignore - BarcodeDetector is not fully typed in TS standard DOM yet
          const detector = new BarcodeDetector({ formats: ["qr_code"] });
          const barcodes = await detector.detect(img);
          if (barcodes.length > 0) {
            resolve(barcodes[0].rawValue);
            return;
          }
        } catch (e) {
          console.warn("BarcodeDetector failed, falling back to jsQR", e);
        }
      }

      // Attempt 2: jsQR Fallback
      const scale = Math.min(
        1,
        MAX_CANVAS_DIM / Math.max(img.naturalWidth, img.naturalHeight)
      );
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      const imageData = ctx.getImageData(0, 0, w, h);
      
      // Use inversionAttempts to help with glare/shadows
      const result = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "attemptBoth",
      });
      
      resolve(result?.data ?? null);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(null);
    };
    img.src = objectUrl;
  });
}

// ─── File validation ───────────────────────────────────────────────────
function validateFile(file: File): { ok: boolean; error?: string } {
  if (!ALLOWED_MIME.includes(file.type))
    return { ok: false, error: "Only JPEG, PNG, WebP, or GIF images allowed" };
  if (file.size > MAX_FILE_SIZE_BYTES)
    return { ok: false, error: "Image must be smaller than 5 MB" };
  return { ok: true };
}

type ScanState = "idle" | "scanning" | "success" | "error";

// ─── Shared sub-component ──────────────────────────────────────────────
interface ToggleProps {
  isActive: boolean;
  upiId: string;
  onToggle: (v: boolean) => void;
}

const UpiToggleAndStatus: React.FC<ToggleProps> = ({ isActive, upiId, onToggle }) => (
  <div className="space-y-4">
    <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-2xl border border-blue-100 dark:border-blue-800">
      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="isActive" className="text-sm font-semibold text-blue-600">
            Enable UPI Payments
          </Label>
          <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">
            Allow customers to pay via UPI QR codes
          </p>
        </div>
        <Switch id="isActive" checked={isActive} onCheckedChange={onToggle} />
      </div>
    </div>

    {isActive && upiId && UPI_ID_REGEX.test(upiId) && (
      <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 rounded-2xl border border-green-100 dark:border-green-800">
        <div className="flex items-center gap-2 mb-3">
          <Check className="h-5 w-5 text-green-600" />
          <span className="text-sm font-semibold text-green-600">Ready for Payments</span>
        </div>
        <p className="text-xs text-green-500 dark:text-green-400">
          QR codes will be generated with UPI ID:{" "}
          <code className="bg-white dark:bg-gray-700 px-1 rounded">{upiId}</code>
        </p>
      </div>
    )}
  </div>
);

// ─── Main component ────────────────────────────────────────────────────
const PaymentSettingsTab = () => {
  const { toast } = useToast();
  const { restaurantId } = useRestaurantId();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [scanError, setScanError] = useState("");
  const [qrPreviewUrl, setQrPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [formData, setFormData] = useState({
    upiId: "",
    upiName: "",
    isActive: true,
    gatewayType: "upi" as "upi" | "qr_scan",
  });

  // ── Fetch ─────────────────────────────────────────────────────────────
  const { data: paymentSettings, isLoading } = useQuery({
    queryKey: ["payment-settings", restaurantId],
    enabled: !!restaurantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_settings")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  React.useEffect(() => {
    if (paymentSettings) {
      setFormData({
        upiId: paymentSettings.upi_id || "",
        upiName: paymentSettings.upi_name || "",
        isActive: paymentSettings.is_active ?? true,
        gatewayType: "upi",
      });
    }
  }, [paymentSettings]);

  // ── QR file processor ─────────────────────────────────────────────────
  const processFile = useCallback(
    async (file: File) => {
      const validation = validateFile(file);
      if (!validation.ok) {
        setScanState("error");
        setScanError(validation.error!);
        return;
      }
      // Show preview (revoke old one to avoid memory leak)
      if (qrPreviewUrl) URL.revokeObjectURL(qrPreviewUrl);
      const preview = URL.createObjectURL(file);
      setQrPreviewUrl(preview);
      setScanState("scanning");
      setScanError("");

      const rawData = await decodeQrFromFile(file);
      if (!rawData) {
        setScanState("error");
        setScanError("No QR code found. Try a clearer, well-lit photo.");
        return;
      }

      const parsed = parseUpiQrData(rawData);
      if (!parsed) {
        setScanState("error");
        setScanError("QR found but it's not a valid UPI QR code.");
        return;
      }

      setFormData((prev) => ({
        ...prev,
        upiId: parsed.upiId,
        upiName: parsed.name || prev.upiName,
      }));
      setScanState("success");
      toast({ title: "✅ UPI ID Extracted", description: `Found: ${parsed.upiId}` });
    },
    [qrPreviewUrl, toast]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = ""; // reset so same file can be re-selected
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const clearScan = () => {
    if (qrPreviewUrl) URL.revokeObjectURL(qrPreviewUrl);
    setQrPreviewUrl(null);
    setScanState("idle");
    setScanError("");
  };


  const handleSave = async () => {
    if (!restaurantId) {
      toast({
        title: "Error",
        description: "Restaurant ID not found",
        variant: "destructive",
      });
      return;
    }

    // ── Validate ────────────────────────────────────────────────────────
    const trimmedUpi = formData.upiId.trim();
    if (!trimmedUpi) {
      toast({ title: "Error", description: "UPI ID is required", variant: "destructive" });
      return;
    }
    // Strict regex — blocks SQL injection & XSS chars at the application layer
    if (!UPI_ID_REGEX.test(trimmedUpi)) {
      toast({
        title: "Invalid UPI ID",
        description: "Format: name@bank (letters, numbers, dots, hyphens, underscores only)",
        variant: "destructive",
      });
      return;
    }
    const trimmedName = formData.upiName.trim();
    if (trimmedName && !BUSINESS_NAME_REGEX.test(trimmedName)) {
      toast({
        title: "Invalid Business Name",
        description: "Business name contains invalid characters",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const upsertData: Record<string, unknown> = {
        ...(paymentSettings?.id ? { id: paymentSettings.id } : {}),
        restaurant_id: restaurantId,
        upi_id: trimmedUpi,
        upi_name: trimmedName || null,
        is_active: formData.isActive,
        gateway_type: "upi",      // qr_scan is only a UI mode; both persist as "upi"
        paytm_mid: null,
        paytm_merchant_key: null,
        paytm_website: null,
        paytm_test_mode: false,
        soundbox_enabled: false,
        voice_announcement_language: "en",
        voice_announcement_template: "detailed",
        updated_at: new Date().toISOString(),
      };

      const { error: upsertError } = await supabase
        .from("payment_settings")
        .upsert(upsertData as any, { onConflict: "restaurant_id", ignoreDuplicates: false });

      if (upsertError) throw upsertError;

      // Backward compatibility update
      const { error: restaurantError } = await supabase
        .from("restaurants")
        .update({ upi_id: trimmedUpi, payment_gateway_enabled: formData.isActive })
        .eq("id", restaurantId);

      if (restaurantError) console.warn("Restaurant table update failed:", restaurantError);

      await queryClient.invalidateQueries({ queryKey: ["payment-settings"] });
      toast({ title: "✅ Settings Saved", description: "UPI payment settings saved successfully" });
    } catch (error: any) {
      console.error("Error saving payment settings:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save payment settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Gateway Card ── */}
      <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg border border-white/30 dark:border-gray-700/30 rounded-3xl shadow-2xl">
        <CardHeader className="pb-4 border-b border-gray-100 dark:border-gray-700">
          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl shadow-lg">
              <CreditCard className="h-6 w-6 text-white" />
            </div>
            Payment Gateway
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400 mt-2 text-lg">
            Configure UPI payments — type your UPI ID or auto-extract it from your QR sticker
          </CardDescription>
        </CardHeader>

        <CardContent className="p-8 space-y-6">
          {/* ── Mode selector ── */}
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, gatewayType: "upi" }))}
              className={`p-6 rounded-2xl border-2 transition-all duration-300 text-left ${
                formData.gatewayType === "upi"
                  ? "border-green-500 bg-green-50 dark:bg-green-900/30 shadow-lg shadow-green-200/50"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
              }`}
            >
              <Smartphone
                className={`h-8 w-8 mx-auto mb-2 ${
                  formData.gatewayType === "upi" ? "text-green-600" : "text-gray-400"
                }`}
              />
              <p className={`font-bold text-lg text-center ${
                formData.gatewayType === "upi"
                  ? "text-green-700 dark:text-green-300"
                  : "text-gray-600 dark:text-gray-400"
              }`}>
                Type UPI ID
              </p>
              <p className="text-xs text-gray-500 mt-1 text-center">Enter your UPI ID manually</p>
            </button>

            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, gatewayType: "qr_scan" }))}
              className={`p-6 rounded-2xl border-2 transition-all duration-300 text-left ${
                formData.gatewayType === "qr_scan"
                  ? "border-violet-500 bg-violet-50 dark:bg-violet-900/30 shadow-lg shadow-violet-200/50"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
              }`}
            >
              <QrCode
                className={`h-8 w-8 mx-auto mb-2 ${
                  formData.gatewayType === "qr_scan" ? "text-violet-600" : "text-gray-400"
                }`}
              />
              <p className={`font-bold text-lg text-center ${
                formData.gatewayType === "qr_scan"
                  ? "text-violet-700 dark:text-violet-300"
                  : "text-gray-600 dark:text-gray-400"
              }`}>
                Scan QR Code
              </p>
              <p className="text-xs text-gray-500 mt-1 text-center">
                Upload or photo your UPI QR sticker
              </p>
            </button>
          </div>

          <Separator />

          {/* ── Manual UPI mode ── */}
          {formData.gatewayType === "upi" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label
                    htmlFor="upiId"
                    className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2"
                  >
                    <Smartphone className="h-4 w-4" />
                    UPI ID *
                  </Label>
                  <Input
                    id="upiId"
                    type="text"
                    placeholder="your-business@upi"
                    value={formData.upiId}
                    maxLength={300}
                    autoComplete="off"
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, upiId: sanitizeUpiId(e.target.value) }))
                    }
                    className="mt-2"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Used to generate QR codes for customer payments
                  </p>
                </div>

                <div>
                  <Label
                    htmlFor="upiName"
                    className="text-sm font-semibold text-gray-700 dark:text-gray-300"
                  >
                    Business Name <span className="font-normal text-gray-400">(Optional)</span>
                  </Label>
                  <Input
                    id="upiName"
                    type="text"
                    placeholder="Your Business Name"
                    value={formData.upiName}
                    maxLength={100}
                    autoComplete="off"
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, upiName: sanitizeBusinessName(e.target.value) }))
                    }
                    className="mt-2"
                  />
                </div>
              </div>

              <UpiToggleAndStatus
                isActive={formData.isActive}
                upiId={formData.upiId}
                onToggle={(v) => setFormData((prev) => ({ ...prev, isActive: v }))}
              />
            </div>
          )}

          {/* ── QR Scan mode ── */}
          {formData.gatewayType === "qr_scan" && (
            <div className="space-y-6">
              {/* Hidden inputs */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleFileChange}
                aria-label="Upload QR code image"
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileChange}
                aria-label="Capture QR code with camera"
              />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: drop zone */}
                <div className="space-y-4">
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label="Drop QR code image here or click to upload"
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
                    className={`relative min-h-[200px] rounded-2xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center gap-3 cursor-pointer select-none
                      ${isDragging
                        ? "border-violet-500 bg-violet-50 dark:bg-violet-900/20 scale-[1.01]"
                        : scanState === "success"
                        ? "border-green-400 bg-green-50 dark:bg-green-900/20"
                        : scanState === "error"
                        ? "border-red-400 bg-red-50 dark:bg-red-900/20"
                        : scanState === "scanning"
                        ? "border-violet-400 bg-violet-50 dark:bg-violet-900/20 animate-pulse"
                        : "border-gray-300 dark:border-gray-600 hover:border-violet-400 hover:bg-violet-50/50 dark:hover:bg-violet-900/10"
                      }`}
                  >
                    {qrPreviewUrl && (
                      <>
                        <img
                          src={qrPreviewUrl}
                          alt="Uploaded QR code preview"
                          className="max-h-36 max-w-full rounded-xl object-contain shadow-md"
                        />
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); clearScan(); }}
                          className="absolute top-2 right-2 p-1 bg-white dark:bg-gray-700 rounded-full shadow hover:bg-gray-100 dark:hover:bg-gray-600 transition"
                          aria-label="Remove image"
                        >
                          <X className="h-4 w-4 text-gray-500" />
                        </button>
                      </>
                    )}

                    {scanState === "idle" && !qrPreviewUrl && (
                      <>
                        <div className="p-4 bg-violet-100 dark:bg-violet-900/40 rounded-full">
                          <ScanLine className="h-8 w-8 text-violet-500" />
                        </div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          Drop your UPI QR image here
                        </p>
                        <p className="text-xs text-gray-400">or click to browse</p>
                        <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">
                          JPEG · PNG · WebP · GIF · max 5 MB
                        </p>
                      </>
                    )}

                    {scanState === "scanning" && (
                      <div className="flex flex-col items-center gap-2 mt-2">
                        <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
                        <p className="text-sm text-violet-600 font-medium">Scanning QR code…</p>
                      </div>
                    )}

                    {scanState === "success" && (
                      <div className="flex items-center gap-2 mt-2">
                        <Check className="h-5 w-5 text-green-600" />
                        <p className="text-sm text-green-600 font-semibold">QR decoded!</p>
                      </div>
                    )}

                    {scanState === "error" && (
                      <div className="flex flex-col items-center gap-1 mt-2 px-4">
                        <AlertCircle className="h-5 w-5 text-red-500" />
                        <p className="text-sm text-red-600 font-medium text-center">{scanError}</p>
                        <p className="text-xs text-gray-400 mt-1">Tap to try a different image</p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 gap-2 border-violet-300 text-violet-700 hover:bg-violet-50 dark:hover:bg-violet-900/20"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4" />
                      Upload Image
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 gap-2 border-violet-300 text-violet-700 hover:bg-violet-50 dark:hover:bg-violet-900/20"
                      onClick={() => cameraInputRef.current?.click()}
                    >
                      <Camera className="h-4 w-4" />
                      Use Camera
                    </Button>
                  </div>
                </div>

                {/* Right: extracted fields */}
                <div className="space-y-4">
                  <div>
                    <Label
                      htmlFor="upiIdQr"
                      className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2"
                    >
                      <Smartphone className="h-4 w-4" />
                      UPI ID{" "}
                      {scanState === "success" && (
                        <span className="text-green-600 text-xs font-normal">(auto-filled)</span>
                      )}{" "}
                      *
                    </Label>
                    <Input
                      id="upiIdQr"
                      type="text"
                      placeholder="Will be filled after scan…"
                      value={formData.upiId}
                      maxLength={300}
                      autoComplete="off"
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, upiId: sanitizeUpiId(e.target.value) }))
                      }
                      className={`mt-2 transition-all ${
                        scanState === "success"
                          ? "border-green-400 bg-green-50 dark:bg-green-900/20"
                          : ""
                      }`}
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      You can also type or correct the UPI ID manually
                    </p>
                  </div>

                  <div>
                    <Label
                      htmlFor="upiNameQr"
                      className="text-sm font-semibold text-gray-700 dark:text-gray-300"
                    >
                      Business Name{" "}
                      {scanState === "success" && formData.upiName && (
                        <span className="text-green-600 text-xs font-normal">(auto-filled)</span>
                      )}
                      <span className="text-gray-400 font-normal"> (Optional)</span>
                    </Label>
                    <Input
                      id="upiNameQr"
                      type="text"
                      placeholder="Your Business Name"
                      value={formData.upiName}
                      maxLength={100}
                      autoComplete="off"
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          upiName: sanitizeBusinessName(e.target.value),
                        }))
                      }
                      className={`mt-2 transition-all ${
                        scanState === "success" && formData.upiName
                          ? "border-green-400 bg-green-50 dark:bg-green-900/20"
                          : ""
                      }`}
                    />
                  </div>

                  <UpiToggleAndStatus
                    isActive={formData.isActive}
                    upiId={formData.upiId}
                    onToggle={(v) => setFormData((prev) => ({ ...prev, isActive: v }))}
                  />
                </div>
              </div>

              {/* Privacy note */}
              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  <strong>100% private:</strong> QR decoding happens entirely in your browser.
                  No image is sent to any server.
                </p>
              </div>
            </div>
          )}

          {/* Save */}
          <div className="flex justify-end pt-4">
            <Button
              onClick={handleSave}
              disabled={loading || !formData.upiId || !UPI_ID_REGEX.test(formData.upiId)}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── How It Works ── */}
      <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg border border-white/30 dark:border-gray-700/30 rounded-3xl shadow-2xl">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">
            How UPI QR Payments Work
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 rounded-xl">
              <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-white font-bold">1</span>
              </div>
              <p className="text-sm font-medium dark:text-gray-300">Customer scans QR code</p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30 rounded-xl">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-white font-bold">2</span>
              </div>
              <p className="text-sm font-medium dark:text-gray-300">UPI app opens with pre-filled amount</p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 rounded-xl">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-white font-bold">3</span>
              </div>
              <p className="text-sm font-medium dark:text-gray-300">Payment completed instantly</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export { UPI_ID_REGEX };
export default PaymentSettingsTab;
