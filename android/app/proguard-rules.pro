# Swadeshi Solutions — ProGuard/R8 Rules
# R8 is enabled for release builds (minifyEnabled true in build.gradle)

# ── Capacitor Core ─────────────────────────────────────────────────────────────
-keep class com.getcapacitor.** { *; }
-keepclassmembers class * extends com.getcapacitor.Plugin {
   @com.getcapacitor.annotation.CapacitorPlugin <methods>;
   @com.getcapacitor.PluginMethod <methods>;
}

# ── WebView JavaScript Interface ───────────────────────────────────────────────
# Required so Capacitor's JS bridge can call into Java from the WebView
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# ── AndroidX / Firebase ────────────────────────────────────────────────────────
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.firebase.**

# ── Bluetooth Serial Plugin (Cordova) ─────────────────────────────────────────
-keep class com.megster.cordova.** { *; }

# ── Debugging stack traces (uncomment for crash reporting) ────────────────────
# -keepattributes SourceFile,LineNumberTable
# -renamesourcefileattribute SourceFile

# ── Suppress warnings for reflection-heavy libraries ──────────────────────────
-dontwarn org.conscrypt.**
-dontwarn org.bouncycastle.**
-dontwarn org.openjsse.**
