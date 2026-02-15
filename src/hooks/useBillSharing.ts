/**
 * useBillSharing Hook
 * Provides methods to share bills via WhatsApp (wa.me links),
 * SMS (sms: URI), Email (mailto:), and Web Share API.
 * 100% free — uses device-native sharing.
 * Detects desktop vs mobile to show appropriate options.
 */

import { useCallback, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  formatBillText,
  generateWhatsAppUrl,
  generateSmsUrl,
  generateBillUrl,
  type BillFormatParams,
} from "@/utils/billFormatter";

export function useBillSharing() {
  const { toast } = useToast();

  /** Detect if the device is mobile/tablet */
  const isMobileDevice = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  }, []);

  /** Whether the browser supports Web Share API */
  const isWebShareSupported = useMemo(
    () => typeof navigator !== "undefined" && !!navigator.share,
    []
  );

  /** Format bill from order data */
  const getBillText = useCallback((params: BillFormatParams) => {
    return formatBillText(params);
  }, []);

  /** Share bill via WhatsApp (opens wa.me link — works on both mobile AND desktop via WhatsApp Web) */
  const shareViaWhatsApp = useCallback(
    (phone: string, billText: string) => {
      try {
        const url = generateWhatsAppUrl(phone, billText);
        window.open(url, "_blank", "noopener,noreferrer");
        toast({
          title: isMobileDevice
            ? "WhatsApp Opened"
            : "WhatsApp Web Opening",
          description: isMobileDevice
            ? `Bill ready to send to ${phone} via WhatsApp.`
            : `Opening WhatsApp Web to send bill to ${phone}. Make sure you're logged into WhatsApp Web.`,
        });
        return true;
      } catch (error) {
        console.error("Error opening WhatsApp:", error);
        toast({
          title: "WhatsApp Error",
          description: "Could not open WhatsApp. Please try again.",
          variant: "destructive",
        });
        return false;
      }
    },
    [toast, isMobileDevice]
  );

  /** Share bill via SMS (opens device messaging app — mobile only) */
  const shareViaSms = useCallback(
    (phone: string, billText: string) => {
      try {
        const url = generateSmsUrl(phone, billText);
        window.open(url, "_self");
        toast({
          title: "SMS App Opened",
          description: `Bill ready to send to ${phone} via SMS.`,
        });
        return true;
      } catch (error) {
        console.error("Error opening SMS:", error);
        toast({
          title: "SMS Error",
          description: "Could not open SMS app. Please try again.",
          variant: "destructive",
        });
        return false;
      }
    },
    [toast]
  );

  /** Share bill via Email (mailto: link — works great on desktop) */
  const shareViaEmail = useCallback(
    (email: string, billText: string, restaurantName: string) => {
      try {
        const subject = encodeURIComponent(
          `Your Bill from ${restaurantName}`
        );
        // Convert bill text line breaks to %0A for mailto body
        const body = encodeURIComponent(billText);
        const mailtoUrl = `mailto:${email}?subject=${subject}&body=${body}`;
        window.open(mailtoUrl, "_self");
        toast({
          title: "Email App Opened",
          description: `Email with bill ready to send to ${email}.`,
        });
        return true;
      } catch (error) {
        console.error("Error opening email:", error);
        toast({
          title: "Email Error",
          description: "Could not open email app. Please try again.",
          variant: "destructive",
        });
        return false;
      }
    },
    [toast]
  );

  /** Share bill via Web Share API (shows native share dialog) or copy to clipboard */
  const shareViaWebShareAPI = useCallback(
    async (billText: string, restaurantName: string) => {
      if (isWebShareSupported) {
        try {
          await navigator.share({
            title: `Bill from ${restaurantName}`,
            text: billText,
          });
          toast({
            title: "Bill Shared",
            description: "Bill shared successfully!",
          });
          return true;
        } catch (error) {
          // User cancelled the share dialog - not a real error
          if ((error as Error).name === "AbortError") {
            return false;
          }
          console.error("Web Share API error:", error);
        }
      }

      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(billText);
        toast({
          title: "Bill Copied!",
          description:
            "Bill text copied to clipboard. You can paste it in WhatsApp Web, Email, or any messaging app.",
        });
        return true;
      } catch (error) {
        console.error("Clipboard error:", error);
        toast({
          title: "Could Not Copy",
          description: "Please try sharing via WhatsApp or Email instead.",
          variant: "destructive",
        });
        return false;
      }
    },
    [isWebShareSupported, toast]
  );

  /** Share bill via a shareable link (short WhatsApp message + bill URL) */
  const shareViaLink = useCallback(
    (phone: string, billParams: BillFormatParams) => {
      try {
        const billUrl = generateBillUrl(billParams);
        const restaurantName = billParams.restaurantName;
        const shortMessage = `🧾 Thanks for dining at *${restaurantName}*! 🍽️\n\nView your bill here:\n${billUrl}`;
        const waUrl = generateWhatsAppUrl(phone, shortMessage);
        window.open(waUrl, "_blank", "noopener,noreferrer");
        toast({
          title: isMobileDevice ? "WhatsApp Opened" : "WhatsApp Web Opening",
          description: `Bill link ready to send to ${phone}.`,
        });
        return billUrl;
      } catch (error) {
        console.error("Error sharing bill link:", error);
        toast({
          title: "Share Error",
          description: "Could not generate bill link.",
          variant: "destructive",
        });
        return null;
      }
    },
    [toast, isMobileDevice]
  );

  /** Generate a shareable bill URL (for copy/display) */
  const getBillUrl = useCallback((billParams: BillFormatParams) => {
    return generateBillUrl(billParams);
  }, []);

  return {
    isMobileDevice,
    isWebShareSupported,
    getBillText,
    getBillUrl,
    shareViaWhatsApp,
    shareViaSms,
    shareViaEmail,
    shareViaLink,
    shareViaWebShareAPI,
  };
}
