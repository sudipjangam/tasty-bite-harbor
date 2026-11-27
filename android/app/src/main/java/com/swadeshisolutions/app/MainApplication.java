package com.swadeshisolutions.app;

import android.app.Application;
import android.util.Log;
import com.posthog.android.PostHogAndroid;
import com.posthog.android.PostHogAndroidConfig;

public class MainApplication extends Application {
    private static final String TAG = "SwadeshiCrashGuard";

    @Override
    public void onCreate() {
        super.onCreate();

        // Global crash guard to prevent repeated NullPointerException crash loops on Android devices
        final Thread.UncaughtExceptionHandler defaultHandler = Thread.getDefaultUncaughtExceptionHandler();

        Thread.setDefaultUncaughtExceptionHandler((thread, throwable) -> {
            Log.e(TAG, "Caught uncaught exception on thread [" + thread.getName() + "]: " + throwable.getMessage(), throwable);

            String stack = Log.getStackTraceString(throwable);
            // Intercept known non-fatal exceptions from background plugins, bluetooth, webview, or notification lifecycle
            if (stack.contains("megster") ||
                stack.contains("bluetooth") ||
                stack.contains("BluetoothSerial") ||
                stack.contains("pushnotifications") ||
                stack.contains("localnotifications") ||
                stack.contains("NotificationChannel") ||
                stack.contains("NotificationManager") ||
                stack.contains("android.webkit") ||
                stack.contains("org.chromium") ||
                stack.contains("Miui") ||
                stack.contains("android.view.ViewGroup")) {
                Log.w(TAG, "Safely suppressed plugin/system exception to prevent app crash loop: " + throwable.getClass().getName());
                return;
            }

            // For other fatal errors, delegate to default handler
            if (defaultHandler != null) {
                defaultHandler.uncaughtException(thread, throwable);
            }
        });

        // Set up after the existing handler so PostHog autocapture wraps it.
        initializePostHog();
    }

    private void initializePostHog() {
        if (BuildConfig.POSTHOG_PROJECT_TOKEN.trim().isEmpty()) {
            if (BuildConfig.DEBUG) {
                throw new IllegalStateException("POSTHOG_PROJECT_TOKEN variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once POSTHOG_PROJECT_TOKEN is configured");
            }
            return;
        }

        if (BuildConfig.POSTHOG_HOST.trim().isEmpty()) {
            if (BuildConfig.DEBUG) {
                throw new IllegalStateException("POSTHOG_HOST variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once POSTHOG_HOST is configured");
            }
            return;
        }

        PostHogAndroidConfig config = new PostHogAndroidConfig(
            BuildConfig.POSTHOG_PROJECT_TOKEN,
            BuildConfig.POSTHOG_HOST
        );
        config.setDebug(BuildConfig.DEBUG);
        config.getErrorTrackingConfig().setAutoCapture(true);
        config.getLogs().setServiceName(getPackageName());
        config.getLogs().setEnvironment(BuildConfig.DEBUG ? "debug" : "production");
        PostHogAndroid.setup(this, config);
    }
}
