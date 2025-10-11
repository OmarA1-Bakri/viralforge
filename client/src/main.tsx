import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { PostHogProvider } from "posthog-js/react";
import App from "./App";
import "./index.css";
import "./styles/main.scss"; // Sass color system (parallel with Tailwind)
import { revenueCat } from "./lib/revenueCat";
import { applyStatusBarHeightCSS, setupStatusBarHeightListener } from "./lib/statusBarHeight";

// ⚠️ RevenueCat initialization DISABLED for testing
// RevenueCat requires Google Play billing which doesn't work on emulators
// and requires app to be published. Will be enabled after Play Store submission.
// revenueCat.initialize().catch(console.error);

// Initialize status bar height detection for Android
applyStatusBarHeightCSS().then(() => {
  setupStatusBarHeightListener();
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PostHogProvider
      apiKey={import.meta.env.VITE_PUBLIC_POSTHOG_KEY}
      options={{
        api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
        defaults: '2025-05-24',
        capture_exceptions: true,
        debug: import.meta.env.MODE === "development",
      }}
    >
      <App />
    </PostHogProvider>
  </StrictMode>
);