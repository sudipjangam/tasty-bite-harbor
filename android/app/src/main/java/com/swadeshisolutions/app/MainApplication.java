package com.swadeshisolutions.app;

import android.app.Application;
import android.util.Log;

public class MainApplication extends Application {
    private static final String TAG = "SwadeshiCrashGuard";

    @Override
    public void onCreate() {
        super.onCreate();

        // Global crash guard to prevent repeated NullPointerException crash loops on Android devices
        final Thread.UncaughtExceptionHandler defaultHandler = Thread.getDefaultUncaughtExceptionHandler();

        Thread.setDefaultUncaughtExceptionHandler((thread, throwable) -> {
            Log.e(TAG, "Caught uncaught exception on thread [" + thread.getName() + "]: " + throwable.getMessage(), throwable);

            if (throwable instanceof NullPointerException) {
                String stack = Log.getStackTraceString(throwable);
                // Intercept known non-fatal null pointer exceptions from plugins, bluetooth, webview, or notification lifecycle
                if (stack.contains("megster") ||
                    stack.contains("bluetooth") ||
                    stack.contains("BluetoothSerial") ||
                    stack.contains("pushnotifications") ||
                    stack.contains("NotificationChannel") ||
                    stack.contains("NotificationManager") ||
                    stack.contains("android.webkit") ||
                    stack.contains("org.chromium") ||
                    stack.contains("Miui") ||
                    stack.contains("android.view.ViewGroup")) {
                    Log.w(TAG, "Safely suppressed non-critical NullPointerException to prevent app crash loop");
                    return;
                }
            }

            // For other fatal errors, delegate to default handler
            if (defaultHandler != null) {
                defaultHandler.uncaughtException(thread, throwable);
            }
        });
    }
}
