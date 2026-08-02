import { Capacitor } from '@capacitor/core';

/** True when running inside native Capacitor app (Android/iOS) */
export const isNativeApp = (): boolean => Capacitor.isNativePlatform();

/** True when running on Android native */
export const isAndroid = (): boolean => Capacitor.getPlatform() === 'android';

/** True when running in a regular web browser */
export const isWeb = (): boolean => Capacitor.getPlatform() === 'web';
