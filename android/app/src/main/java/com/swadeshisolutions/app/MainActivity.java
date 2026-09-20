package com.swadeshisolutions.app;

import android.os.Bundle;
import android.util.Log;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "MainActivity";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        try {
            // Register custom TCP printer plugin before bridge initialises
            registerPlugin(TcpPrinterPlugin.class);
        } catch (Exception e) {
            Log.e(TAG, "Failed to register custom plugins", e);
        }

        try {
            super.onCreate(savedInstanceState);
        } catch (Exception e) {
            Log.e(TAG, "Exception during super.onCreate", e);
        }
    }

    @Override
    public void onTrimMemory(int level) {
        try {
            super.onTrimMemory(level);
            if (level >= TRIM_MEMORY_RUNNING_LOW) {
                if (getBridge() != null && getBridge().getWebView() != null) {
                    getBridge().getWebView().clearCache(true);
                }
                System.gc();
            }
        } catch (Exception ignored) {
        }
    }
}
