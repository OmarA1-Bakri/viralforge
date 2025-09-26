import { Preferences } from '@capacitor/preferences';
import { Device } from '@capacitor/device';

interface StorageInterface {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
}

class CapacitorStorage implements StorageInterface {
  async getItem(key: string): Promise<string | null> {
    try {
      const result = await Preferences.get({ key });
      return result.value;
    } catch (error) {
      console.error('Error getting item from secure storage:', error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      await Preferences.set({ key, value });
    } catch (error) {
      console.error('Error setting item in secure storage:', error);
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      await Preferences.remove({ key });
    } catch (error) {
      console.error('Error removing item from secure storage:', error);
    }
  }

  async clear(): Promise<void> {
    try {
      await Preferences.clear();
    } catch (error) {
      console.error('Error clearing secure storage:', error);
    }
  }
}

class WebStorage implements StorageInterface {
  async getItem(key: string): Promise<string | null> {
    return localStorage.getItem(key);
  }

  async setItem(key: string, value: string): Promise<void> {
    localStorage.setItem(key, value);
  }

  async removeItem(key: string): Promise<void> {
    localStorage.removeItem(key);
  }

  async clear(): Promise<void> {
    localStorage.clear();
  }
}

// Detect if we're running in a mobile environment
let isMobile: boolean | null = null;

async function detectMobile(): Promise<boolean> {
  if (isMobile !== null) return isMobile;
  
  try {
    const info = await Device.getInfo();
    isMobile = info.platform !== 'web';
  } catch (error) {
    // If Device.getInfo() fails, we're probably in a web environment
    isMobile = false;
  }
  
  return isMobile;
}

// Create storage instance based on environment
let storageInstance: StorageInterface | null = null;

async function getStorage(): Promise<StorageInterface> {
  if (storageInstance) return storageInstance;
  
  const mobile = await detectMobile();
  storageInstance = mobile ? new CapacitorStorage() : new WebStorage();
  
  return storageInstance;
}

// Convenience methods for token management
export const secureStorage = {
  async getAuthToken(): Promise<string | null> {
    const storage = await getStorage();
    return storage.getItem('auth_token');
  },

  async setAuthToken(token: string): Promise<void> {
    const storage = await getStorage();
    await storage.setItem('auth_token', token);
  },

  async removeAuthToken(): Promise<void> {
    const storage = await getStorage();
    await storage.removeItem('auth_token');
  },

  async getUserData(): Promise<any> {
    const storage = await getStorage();
    const userData = await storage.getItem('user_data');
    return userData ? JSON.parse(userData) : null;
  },

  async setUserData(userData: any): Promise<void> {
    const storage = await getStorage();
    await storage.setItem('user_data', JSON.stringify(userData));
  },

  async removeUserData(): Promise<void> {
    const storage = await getStorage();
    await storage.removeItem('user_data');
  },

  async clearAll(): Promise<void> {
    const storage = await getStorage();
    await storage.clear();
  },

  async isMobileEnvironment(): Promise<boolean> {
    return detectMobile();
  },

  // Generic storage methods
  async getItem(key: string): Promise<string | null> {
    const storage = await getStorage();
    return storage.getItem(key);
  },

  async setItem(key: string, value: string): Promise<void> {
    const storage = await getStorage();
    await storage.setItem(key, value);
  },

  async removeItem(key: string): Promise<void> {
    const storage = await getStorage();
    await storage.removeItem(key);
  }
};

export default secureStorage;