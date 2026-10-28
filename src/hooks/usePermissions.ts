import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

export const usePermissions = () => {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let timer: NodeJS.Timeout;

    const requestAllPermissions = async () => {
      try {
        // 1. Request Local Notification Permissions safely if needed
        try {
          const status = await LocalNotifications.checkPermissions();
          if (status.display === 'prompt') {
            await LocalNotifications.requestPermissions();
          }
        } catch (e) {
          console.warn("LocalNotifications permission check failed", e);
        }

        // 2. Request Bluetooth Permissions (Android 12+) via cordova plugin safely after a short pause
        setTimeout(() => {
          if (Capacitor.getPlatform() === 'android') {
            const perms = (window as any).cordova?.plugins?.permissions;
            if (perms) {
              const PERMISSIONS = [
                perms.BLUETOOTH_CONNECT,
                perms.BLUETOOTH_SCAN,
                perms.ACCESS_FINE_LOCATION // For older Androids to scan Bluetooth
              ].filter(Boolean);

              if (PERMISSIONS.length > 0) {
                perms.requestPermissions(
                  PERMISSIONS,
                  (_status: any) => {},
                  (err: any) => console.warn('Bluetooth permissions request note:', err)
                );
              }
            }
          }
        }, 1500);
      } catch (err) {
        console.warn('Error requesting permissions:', err);
      }
    };

    // Stagger after splash screen and initial UI mount (3.5s) to prevent collision with push auth
    timer = setTimeout(requestAllPermissions, 3500);

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);
};
