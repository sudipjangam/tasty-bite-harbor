import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';

export const usePermissions = () => {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const requestAllPermissions = async () => {
      try {
        // 1. Request Notification Permissions
        try {
          await PushNotifications.requestPermissions();
        } catch (e) {
          console.warn("PushNotifications permission request failed", e);
        }
        
        try {
          await LocalNotifications.requestPermissions();
        } catch (e) {
          console.warn("LocalNotifications permission request failed", e);
        }

        // 2. Request Bluetooth Permissions (Android 12+) via cordova plugin
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
                (status: any) => {},
                (err: any) => console.error('Bluetooth permissions err:', err)
              );
            }
          } else {
            console.warn("Cordova permissions plugin not found. Ensure cordova-plugin-android-permissions is synced.");
          }
        }
      } catch (err) {
        console.error('Error requesting permissions:', err);
      }
    };

    // Delay slightly to not overwhelm the user exactly on splash screen dismiss
    setTimeout(requestAllPermissions, 2000);
  }, []);
};
