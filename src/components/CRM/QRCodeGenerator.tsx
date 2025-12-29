import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  QrCode,
  Download,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  Smartphone,
  Loader2,
  Share2,
} from "lucide-react";

interface QRCodeGeneratorProps {
  restaurantId?: string;
}

export function QRCodeGenerator({ restaurantId }: QRCodeGeneratorProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [slug, setSlug] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [qrSize, setQrSize] = useState(256);

  const effectiveRestaurantId = restaurantId || user?.restaurant_id;
  const enrollmentUrl = slug ? `${window.location.origin}/enroll/${slug}` : "";

  // Fetch restaurant slug
  useEffect(() => {
    const fetchSlug = async () => {
      if (!effectiveRestaurantId) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("restaurants")
          .select("slug, name")
          .eq("id", effectiveRestaurantId)
          .single();

        if (error) throw error;

        if (data?.slug) {
          setSlug(data.slug);
        } else if (data?.name) {
          // Generate slug from name if not exists
          const generatedSlug = data.name
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, "")
            .replace(/\s+/g, "-");
          setSlug(generatedSlug);

          // Update the restaurant with the slug
          await supabase
            .from("restaurants")
            .update({ slug: generatedSlug })
            .eq("id", effectiveRestaurantId);
        }
      } catch (err) {
        console.error("Error fetching slug:", err);
        toast({
          title: "Error",
          description: "Failed to load enrollment link",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSlug();
  }, [effectiveRestaurantId]);

  // Generate QR code using canvas
  useEffect(() => {
    if (!enrollmentUrl || !canvasRef.current) return;

    const generateQR = async () => {
      try {
        // Using QR Code API
        const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodeURIComponent(
          enrollmentUrl
        )}&bgcolor=ffffff&color=6366f1&format=png&margin=10`;

        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const canvas = canvasRef.current;
          if (!canvas) return;

          const ctx = canvas.getContext("2d");
          if (!ctx) return;

          canvas.width = qrSize;
          canvas.height = qrSize;
          ctx.drawImage(img, 0, 0, qrSize, qrSize);
        };
        img.src = qrApiUrl;
      } catch (err) {
        console.error("Error generating QR code:", err);
      }
    };

    generateQR();
  }, [enrollmentUrl, qrSize]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(enrollmentUrl);
      setIsCopied(true);
      toast({
        title: "Link copied!",
        description: "Enrollment link copied to clipboard",
      });
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Please copy the link manually",
        variant: "destructive",
      });
    }
  };

  const handleDownloadQR = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement("a");
    link.download = `loyalty-qr-code-${slug}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();

    toast({
      title: "QR Code downloaded!",
      description: "Print it and place it on tables, menus, or receipts",
    });
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join Our Loyalty Program",
          text: "Scan this QR code or click the link to join our loyalty program and earn rewards!",
          url: enrollmentUrl,
        });
      } catch (err) {
        // User cancelled share
      }
    } else {
      handleCopyLink();
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 border-indigo-200 dark:border-gray-700">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </CardContent>
      </Card>
    );
  }

  if (!effectiveRestaurantId) {
    return (
      <Card className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
        <CardContent className="py-8 text-center">
          <p className="text-gray-500">No restaurant selected</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 border-indigo-200 dark:border-gray-700 overflow-hidden">
      <CardHeader className="border-b border-indigo-100 dark:border-gray-700">
        <CardTitle className="flex items-center gap-2 text-indigo-900 dark:text-white">
          <QrCode className="h-5 w-5 text-indigo-600" />
          Customer Enrollment QR Code
        </CardTitle>
        <CardDescription className="dark:text-gray-400">
          Customers can scan this QR code to join your loyalty program instantly
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6">
        <div className="grid md:grid-cols-2 gap-8">
          {/* QR Code Display */}
          <div className="flex flex-col items-center">
            <div className="bg-white p-4 rounded-2xl shadow-lg mb-4">
              <canvas
                ref={canvasRef}
                width={qrSize}
                height={qrSize}
                className="rounded-lg"
                style={{ maxWidth: "100%", height: "auto" }}
              />
            </div>

            <div className="flex gap-2 flex-wrap justify-center">
              <Button
                onClick={handleDownloadQR}
                variant="outline"
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
              <Button onClick={handleShare} variant="outline" className="gap-2">
                <Share2 className="h-4 w-4" />
                Share
              </Button>
            </div>
          </div>

          {/* Controls & Info */}
          <div className="space-y-6">
            {/* Enrollment Link */}
            <div className="space-y-2">
              <Label className="text-gray-700 dark:text-gray-300">
                Enrollment Link
              </Label>
              <div className="flex gap-2">
                <Input
                  value={enrollmentUrl}
                  readOnly
                  className="font-mono text-sm bg-white dark:bg-gray-800"
                />
                <Button
                  onClick={handleCopyLink}
                  variant="outline"
                  className="shrink-0 gap-2"
                >
                  {isCopied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Test Link */}
            <Button
              onClick={() => window.open(enrollmentUrl, "_blank")}
              variant="outline"
              className="w-full gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Preview Enrollment Page
            </Button>

            {/* Instructions */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 space-y-3">
              <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-indigo-600" />
                How to Use
              </h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-medium shrink-0">
                    1
                  </span>
                  <span>
                    Print and place QR code on tables, menus, or receipts
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-medium shrink-0">
                    2
                  </span>
                  <span>Customers scan with their phone camera</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-medium shrink-0">
                    3
                  </span>
                  <span>They fill out the quick form (no login needed)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-medium shrink-0">
                    4
                  </span>
                  <span>Instantly enrolled with 50 welcome points!</span>
                </li>
              </ul>
            </div>

            {/* QR Size Selector */}
            <div className="space-y-2">
              <Label className="text-gray-700 dark:text-gray-300">
                QR Code Size
              </Label>
              <div className="flex gap-2">
                {[128, 256, 512].map((size) => (
                  <Button
                    key={size}
                    variant={qrSize === size ? "default" : "outline"}
                    size="sm"
                    onClick={() => setQrSize(size)}
                    className={
                      qrSize === size ? "bg-indigo-600 hover:bg-indigo-700" : ""
                    }
                  >
                    {size}px
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default QRCodeGenerator;
