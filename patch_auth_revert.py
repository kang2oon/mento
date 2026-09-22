import sys

content = open("src/auth.ts").read()
to_replace = """import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, browserPopupRedirectResolver } from 'firebase/auth';"""
new_replace = """import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';"""
content = content.replace(to_replace, new_replace)

to_replace2 = """    const result = await signInWithPopup(auth, provider, browserPopupRedirectResolver);"""
new_replace2 = """    const result = await signInWithPopup(auth, provider);"""
content = content.replace(to_replace2, new_replace2)

open("src/auth.ts", "w").write(content)
