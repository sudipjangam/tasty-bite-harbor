import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { App as CapacitorApp } from "@capacitor/app";
import { isNativeApp } from "@/utils/platform";
import { toast } from "@/components/ui/use-toast";

/**
 * Global Android Physical/Gesture Back Button Handler
 *
 * 1. Closes open modal/dialog/sheet/drawer if present
 * 2. Navigates backward in React Router history if on sub-route
 * 3. Shows "Press back again to exit" with 2-second timeout if on root route
 */
export const useAndroidBackButton = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const lastBackPressRef = useRef<number>(0);

  useEffect(() => {
    if (!isNativeApp()) return;

    let listenerHandle: any = null;

    const setupListener = async () => {
      listenerHandle = await CapacitorApp.addListener("backButton", async () => {
        // 1. Check for open Dialog, Drawer, Sheet, or Popover
        const openDialog = document.querySelector(
          '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"], [data-radix-popper-content-wrapper]'
        );

        if (openDialog) {
          // Dispatch Escape key to gracefully trigger Radix close handlers
          const escapeEvent = new KeyboardEvent("keydown", {
            key: "Escape",
            code: "Escape",
            keyCode: 27,
            bubbles: true,
            cancelable: true,
          });
          document.dispatchEvent(escapeEvent);
          return;
        }

        // Check for More Drawer or other fixed overlay backdrops
        const openBackdrop = document.querySelector(".fixed.inset-0.z-50");
        if (openBackdrop) {
          const closeBtn = openBackdrop.querySelector("button") as HTMLElement | null;
          if (closeBtn) {
            closeBtn.click();
            return;
          }
        }

        // 2. Check if we are on a sub-route (not root dashboard or auth)
        const isRoot = location.pathname === "/" || location.pathname === "/dashboard" || location.pathname === "/auth";

        if (!isRoot && window.history.length > 1) {
          navigate(-1);
          return;
        }

        // 3. Double-tap to exit at root screen
        const now = Date.now();
        if (now - lastBackPressRef.current < 2000) {
          CapacitorApp.exitApp();
        } else {
          lastBackPressRef.current = now;
          toast({
            title: "Swadeshi Solutions",
            description: "Press back again to exit the app",
            duration: 2000,
          });
        }
      });
    };

    setupListener();

    return () => {
      if (listenerHandle?.remove) {
        listenerHandle.remove();
      }
    };
  }, [location.pathname, navigate]);
};
