import sys

content = open("src/auth.ts").read()
to_replace = """export const initAuth = (  onAuthSuccess?: (user: User, token: string) => void,  onAuthFailure?: () => void) => {
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

new_replace = """export const initAuth = (  onAuthSuccess?: (user: User, token: string) => void,  onAuthFailure?: () => void) => {
  let isCheckingRedirect = true;
  
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
  }).finally(() => {
    isCheckingRedirect = false;
    // If auth state is already known and we have a user, we can now safely report success or failure
    const user = auth.currentUser;
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else {
        if (onAuthFailure) onAuthFailure();
      }
    }
  });

  return onAuthStateChanged(auth, async (user: User | null) => {
    if (isCheckingRedirect) return; // Will be handled in finally block
    
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else {
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};"""

content = content.replace(to_replace, new_replace)
open("src/auth.ts", "w").write(content)
