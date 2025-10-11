# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Capacitor Core - Essential for JavaScript bridge
-keep class com.getcapacitor.** { *; }
-keep interface com.getcapacitor.** { *; }
-keepclassmembers class * {
    @com.getcapacitor.annotation.CapacitorPlugin *;
    @com.getcapacitor.PluginMethod *;
}

# Cordova - Required for plugin compatibility
-keep class org.apache.cordova.** { *; }

# JavaScript Interface - Critical for WebView communication
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Preserve line numbers for debugging stack traces
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Native methods - Must be preserved
-keepclasseswithmembernames class * {
    native <methods>;
}

# Capacitor Plugins - Preserve all plugin classes
-keep public class * extends com.getcapacitor.Plugin
-keepclassmembers class * extends com.getcapacitor.Plugin {
    public *;
}

# Biometric Auth Plugin
-keep class com.aparajita.capacitor.biometric.** { *; }

# Capacitor WebView classes - Essential for app functionality
-keep class com.getcapacitor.BridgeActivity { *; }
-keep class com.getcapacitor.Bridge { *; }

# Keep annotations
-keepattributes *Annotation*

# Keep generic signature (needed for reflection)
-keepattributes Signature

# Preserve enums
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# Preserve Parcelable classes
-keepclassmembers class * implements android.os.Parcelable {
    public static final android.os.Parcelable$Creator *;
}

# AndroidX and Material Design
-keep class androidx.** { *; }
-keep interface androidx.** { *; }
-dontwarn androidx.**

# Firebase - Essential for Auth and Analytics
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.**

# Firebase Auth - Requires these attributes for reflection
-keepattributes Signature
-keepattributes *Annotation*
-keepattributes EnclosingMethod
-keepattributes InnerClasses
