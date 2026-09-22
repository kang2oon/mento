import sys

content = open("src/auth.ts").read()
to_replace = """  } catch (error: any) {
    console.error('Sign in error:', error);
    if (error?.code === 'auth/popup-closed-by-user' || error?.message?.includes('Cross-Origin-Opener-Policy')) {
      // Fallback to redirect
      await signInWithRedirect(auth, provider);
      return null; // The page will redirect
    }
    isSigningIn = false;
    throw error;
  }"""

new_replace = """  } catch (error: any) {
    console.error('Sign in error:', error);
    isSigningIn = false;
    throw error;
  }"""

content = content.replace(to_replace, new_replace)
open("src/auth.ts", "w").write(content)
