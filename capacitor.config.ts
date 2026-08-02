import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.swadeshisolutions.app',
  appName: 'Swadeshi Solutions',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#1a1a2e',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#1a1a2e',
    },
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    // Disable web view debugging in production
    webContentsDebuggingEnabled: false,
  },
};

export default config;

