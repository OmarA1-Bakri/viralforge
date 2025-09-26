import { BiometricAuth, BiometricsError, BiometricsErrorType } from '@aparajita/capacitor-biometric-auth';
import { secureStorage } from './mobileStorage';

export interface BiometricResult {
  success: boolean;
  error?: string;
  fallbackToPassword?: boolean;
}

export const biometricAuth = {
  // Check if biometric authentication is available
  async isAvailable(): Promise<boolean> {
    try {
      const result = await BiometricAuth.checkBiometry();
      return result.isAvailable;
    } catch (error) {
      console.warn('Biometric auth not available:', error);
      return false;
    }
  },

  // Get available biometric types
  async getAvailableBiometrics(): Promise<string[]> {
    try {
      const result = await BiometricAuth.checkBiometry();
      return result.biometryTypes || [];
    } catch (error) {
      console.warn('Could not get biometric types:', error);
      return [];
    }
  },

  // Enable biometric authentication for the current user
  async enableBiometric(username: string): Promise<BiometricResult> {
    try {
      // First check if biometrics are available
      const available = await this.isAvailable();
      if (!available) {
        return {
          success: false,
          error: 'Biometric authentication is not available on this device',
          fallbackToPassword: true
        };
      }

      // Set up biometric authentication
      await secureStorage.setItem('biometric_enabled', 'true');
      await secureStorage.setItem('biometric_username', username);
      
      return { success: true };
    } catch (error) {
      console.error('Error enabling biometric auth:', error);
      return {
        success: false,
        error: 'Failed to enable biometric authentication',
        fallbackToPassword: true
      };
    }
  },

  // Authenticate using biometrics
  async authenticate(reason?: string): Promise<BiometricResult> {
    try {
      // Check if biometric auth is enabled
      const enabled = await secureStorage.getItem('biometric_enabled');
      if (enabled !== 'true') {
        return {
          success: false,
          error: 'Biometric authentication is not enabled',
          fallbackToPassword: true
        };
      }

      // Perform biometric authentication
      const result = await BiometricAuth.authenticate({
        reason: reason || 'Please authenticate to access your account',
        cancelTitle: 'Cancel',
        allowDeviceCredential: true,
        iosFallbackTitle: 'Use Password',
        androidTitle: 'Biometric Authentication',
        androidSubtitle: 'Use your fingerprint or face to authenticate',
        androidDescription: reason || 'Please authenticate to continue',
        androidNegativeText: 'Cancel'
      });

      if (result.isAuthenticated) {
        return { success: true };
      } else {
        return {
          success: false,
          error: 'Authentication failed',
          fallbackToPassword: true
        };
      }
    } catch (error) {
      console.error('Biometric authentication error:', error);
      
      if (error instanceof BiometricsError) {
        switch (error.code) {
          case BiometricsErrorType.userCancel:
            return {
              success: false,
              error: 'Authentication cancelled by user',
              fallbackToPassword: true
            };
          case BiometricsErrorType.userFallback:
            return {
              success: false,
              error: 'User chose to use password',
              fallbackToPassword: true
            };
          case BiometricsErrorType.biometryNotAvailable:
            return {
              success: false,
              error: 'Biometric authentication is not available',
              fallbackToPassword: true
            };
          case BiometricsErrorType.biometryNotEnrolled:
            return {
              success: false,
              error: 'No biometrics enrolled on device',
              fallbackToPassword: true
            };
          case BiometricsErrorType.biometryLockout:
            return {
              success: false,
              error: 'Biometric authentication temporarily locked',
              fallbackToPassword: true
            };
          default:
            return {
              success: false,
              error: 'Biometric authentication failed',
              fallbackToPassword: true
            };
        }
      }

      return {
        success: false,
        error: 'Biometric authentication failed',
        fallbackToPassword: true
      };
    }
  },

  // Disable biometric authentication
  async disableBiometric(): Promise<void> {
    try {
      await secureStorage.removeItem('biometric_enabled');
      await secureStorage.removeItem('biometric_username');
    } catch (error) {
      console.error('Error disabling biometric auth:', error);
    }
  },

  // Check if biometric auth is enabled for the app
  async isBiometricEnabled(): Promise<boolean> {
    try {
      const enabled = await secureStorage.getItem('biometric_enabled');
      return enabled === 'true';
    } catch (error) {
      console.error('Error checking biometric status:', error);
      return false;
    }
  },

  // Get the username associated with biometric auth
  async getBiometricUsername(): Promise<string | null> {
    try {
      return await secureStorage.getItem('biometric_username');
    } catch (error) {
      console.error('Error getting biometric username:', error);
      return null;
    }
  }
};

export default biometricAuth;