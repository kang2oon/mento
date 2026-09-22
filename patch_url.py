import sys

content = open("src/App.tsx").read()
to_replace = """  useEffect(() => {
    const unsubscribe = initAuth("""

new_replace = """  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlSid = urlParams.get('sid');
    if (urlSid) {
      setSpreadsheetId(urlSid);
    }
    
    const unsubscribe = initAuth("""

content = content.replace(to_replace, new_replace)
open("src/App.tsx", "w").write(content)

