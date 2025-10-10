import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { Capacitor } from '@capacitor/core';

/**
 * Firebase Client SDK Configuration
 *
 * Handles:
 * - Firebase initialization (web uses manual config, native uses google-services.json/GoogleService-Info.plist)
 * - Google/YouTube OAuth sign-in
 * - Authentication state management
 */

// TODO: For native platforms, need to use @capacitor-firebase/authentication plugin
// For now, OAuth is disabled on native (Android/iOS) - web only
// See: https://github.com/capawesome-team/capacitor-firebase/tree/main/packages/authentication

let app: FirebaseApp | { name: string };
let auth: Auth | null;

if (Capacitor.isNativePlatform()) {
  // Native platforms: OAuth disabled for now
  // TODO: Install @capacitor-firebase/authentication and use native auth
  console.warn('[Firebase] Native OAuth not yet implemented - use web version');
  // Create a dummy app to prevent crashes
  app = { name: '[NATIVE-DISABLED]' } as any;
  auth = null as any;
} else {
  // Web platform: Use Firebase Web SDK
  const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };
  app = initializeApp(firebaseConfig);
  auth = getAuth(app as FirebaseApp);
}

export { auth };

/**
 * Sign in with Google/YouTube OAuth
 * Requests YouTube readonly scope
 * NOTE: Currently web-only, native platforms need @capacitor-firebase/authentication
 */
export async function signInWithYouTube() {
  if (Capacitor.isNativePlatform()) {
    throw new Error('OAuth not available on native platforms yet. Please use web version.');
  }

  const provider = new GoogleAuthProvider();

  // Request YouTube Data API access
  provider.addScope('https://www.googleapis.com/auth/youtube.readonly');

  // Generate CSRF token for OAuth state parameter
  const csrfToken = crypto.randomUUID();
  sessionStorage.setItem('oauth_state', csrfToken);

  // Force account selection (allows switching accounts)
  provider.setCustomParameters({
    prompt: 'select_account',
    state: csrfToken, // CSRF protection
  });

  try {
    const result = await signInWithPopup(auth!, provider);

    // Verify CSRF token (state parameter) - Firebase handles this automatically
    // but we verify it was set correctly
    const storedState = sessionStorage.getItem('oauth_state');
    if (storedState) {
      sessionStorage.removeItem('oauth_state'); // Clean up
    }

    // Get the OAuth access token from Google
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const accessToken = credential?.accessToken;
    const idToken = await result.user.getIdToken();

    if (!accessToken) {
      throw new Error('No access token received from Google');
    }

    return {
      user: result.user,
      accessToken, // YouTube API access token
      idToken, // Firebase ID token (for backend auth)
    };
  } catch (error: any) {
    console.error('YouTube sign-in error:', error);

    // Handle specific error cases
    if (error.code === 'auth/popup-closed-by-user') {
      throw new Error('Sign-in cancelled');
    }

    if (error.code === 'auth/popup-blocked') {
      throw new Error('Pop-up blocked. Please allow pop-ups for this site.');
    }

    throw new Error(error.message || 'Failed to sign in with YouTube');
  }
}

/**
 * Sign out from Firebase
 */
export async function signOut() {
  if (!auth) throw new Error('Auth not initialized');
  try {
    await firebaseSignOut(auth);
  } catch (error: any) {
    console.error('Sign out error:', error);
    throw new Error('Failed to sign out');
  }
}

/**
 * Get current user's Firebase ID token
 * Used for authenticating with backend
 */
export async function getIdToken(): Promise<string | null> {
  if (!auth) return null;
  const user = auth.currentUser;
  if (!user) return null;

  try {
    return await user.getIdToken();
  } catch (error) {
    console.error('Failed to get ID token:', error);
    return null;
  }
}

/**
 * Listen to authentication state changes
 */
export function onAuthStateChange(callback: (user: User | null) => void) {
  if (!auth) return () => {};
  return onAuthStateChanged(auth, callback);
}

/**
 * Get current authenticated user
 */
export function getCurrentUser(): User | null {
  if (!auth) return null;
  return auth.currentUser;
}
