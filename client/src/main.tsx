import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { PostHogProvider } from "posthog-js/react";
import App from "./App";
import "./index.css";
import "./styles/main.scss"; // Sass color system (parallel with Tailwind)
import { revenueCat } from "./lib/revenueCat";
import { applyStatusBarHeightCSS, setupStatusBarHeightListener } from "./lib/statusBarHeight";

// Initialize RevenueCat on app startup
revenueCat.initialize().catch(console.error);

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