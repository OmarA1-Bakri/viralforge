import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.viralforge.ai',
  appName: 'ViralForgeAI',
  webDir: 'dist/public',
  server: {
    // Use HTTP for development to avoid mixed content issues with localhost API
    androidScheme: 'http',
    // NOTE: url is commented out so app loads from bundled files
    // Only uncomment for live reload development: url: 'http://10.0.2.2:5000',
    cleartext: true,
    // Allow cleartext (HTTP) traffic for development
    allowNavigation: ['http://10.0.2.2:5000', 'http://localhost:5000']
  },
  plugins: {
    StatusBar: {
      style: 'dark',
      backgroundColor: '#000000',
      overlaysWebView: false  // Changed to false to test if this fixes touch events
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#000000',
      showSpinner: false
    },
    Camera: {
      permissions: ['camera', 'photos']
    }
  }
};

export default config;
