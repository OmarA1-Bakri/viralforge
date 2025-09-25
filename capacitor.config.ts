import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.viralforge.ai',
  appName: 'ViralForgeAI',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
    // Development server URL - will be set during mobile dev
    // url: 'https://your-tunnel-url.ngrok.io',
    cleartext: true
  },
  plugins: {
    StatusBar: {
      style: 'dark',
      backgroundColor: '#000000'
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
