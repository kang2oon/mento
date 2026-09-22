import sys

content = open("src/auth.ts").read()
to_replace = """import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';"""
new_replace = """import { getAuth, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';"""
content = content.replace(to_replace, new_replace)

to_replace2 = """export const initAuth = (  onAuthSuccess?: (user: User, token: string) => void,  onAuthFailure?: () => void) => {  return onAuthStateChanged(auth, async (user: User | null) => {    if (user) {      if (cachedAccessToken) {        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);      } else if (!isSigningIn) {        cachedAccessToken = null;        if (onAuthFailure) onAuthFailure();      }    } else {      cachedAccessToken = null;      if (onAuthFailure) onAuthFailure();    }  });};"""

new_replace2 = """export const initAuth = (  onAuthSuccess?: (user: User, token: string) => void,  onAuthFailure?: () => void) => {
  // Check redirect result on initialization
  getRedirectResult(auth).then((result) => {
    if (result) {
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        cachedAccessToken = credential.accessToken;
      }
    }
  }).catch((error) => {
    console.error('Redirect sign-in error:', error);
  });

  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      // If we got access token from redirect, it will be in cachedAccessToken
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else {
        // Without access token, we can't do Google Sheets API. Need to sign in again.
        // Or we might have a session but no token. 
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};"""

content = content.replace(to_replace2, new_replace2)

to_replace3 = """  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Firebase Auth');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }"""

new_replace3 = """  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Firebase Auth');
    }
    cachedAccessToken = credential.accessToken;
    isSigningIn = false;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    if (error?.code === 'auth/popup-closed-by-user' || error?.message?.includes('Cross-Origin-Opener-Policy')) {
      // Fallback to redirect
      await signInWithRedirect(auth, provider);
      return null; // The page will redirect
    }
    isSigningIn = false;
    throw error;
  }"""

content = content.replace(to_replace3, new_replace3)

open("src/auth.ts", "w").write(content)
