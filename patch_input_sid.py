import sys

content = open("src/App.tsx").read()

to_insert = """  const [isLoggingIn, setIsLoggingIn] = useState(false);"""
new_insert = """  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [inputSid, setInputSid] = useState("");
  
  useEffect(() => {
    const sid = getSpreadsheetId();
    if (sid && !inputSid) setInputSid(sid);
  }, []);"""

if "const [inputSid" not in content:
    content = content.replace(to_insert, new_insert)
    open("src/App.tsx", "w").write(content)
