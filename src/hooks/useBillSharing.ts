/**
 * useBillSharing Hook
 * Provides methods to share bills via WhatsApp (wa.me links),
 * SMS (sms: URI), and Web Share API.
 * 100% free — uses device-native sharing.
 */

import { useCallback, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  formatBillText,
  generateWhatsAppUrl,
  generateSmsUrl,
  type BillFormatParams,
} from "@/utils/billFormatter";

export function useBillSharing() {
  const { toast } = useToast();

  /** Whether the browser supports Web Share API */
  const isWebShareSupported = useMemo(
    () => typeof navigator !== "undefined" && !!navigator.share,
    []
  );

  /** Format bill from order data */
  const getBillText = useCallback((params: BillFormatParams) => {
    return formatBillText(params);
  }, []);

  /** Share bill via WhatsApp (opens wa.me link in new tab) */
  const shareViaWhatsApp = useCallback(
    (phone: string, billText: string) => {
      try {
        const url = generateWhatsAppUrl(phone, billText);
        window.open(url, "_blank", "noopener,noreferrer");
        toast({
          title: "WhatsApp Opened",
          description: `Bill ready to send to ${phone} via WhatsApp.`,
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
    [toast]
  );

  /** Share bill via SMS (opens device messaging app) */
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

  /** Share bill via Web Share API (shows native share dialog) */
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
            "Bill text copied to clipboard. You can paste it in any messaging app.",
        });
        return true;
      } catch (error) {
        console.error("Clipboard error:", error);
        toast({
          title: "Could Not Copy",
          description: "Please try sharing via WhatsApp or SMS instead.",
          variant: "destructive",
        });
        return false;
      }
    },
    [isWebShareSupported, toast]
  );

  return {
    isWebShareSupported,
    getBillText,
    shareViaWhatsApp,
    shareViaSms,
    shareViaWebShareAPI,
  };
}
