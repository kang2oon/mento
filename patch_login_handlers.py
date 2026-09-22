import sys

content = open("src/App.tsx").read()

to_replace = """  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        let isEditor = true;
        const sid = getSpreadsheetId();
        if (sid) {
          isEditor = await checkEditorAccess(sid);
        }
        if (!isEditor) {
          showToast("편집 권한이 없어 일반 사용자(뷰어)로 접속합니다.");
          setNeedsAuth(false);
          setUserRole('viewer');
          localStorage.setItem(ROLE_KEY, 'viewer');
          loadDatabase(true);
        } else {
          setNeedsAuth(false);
          setUserRole('admin');
          localStorage.setItem(ROLE_KEY, 'admin');
          loadDatabase(false);
        }
      }
    } catch (err) {
      console.error(err);
      showToast("로그인 실패");
    } finally {
      setIsLoggingIn(false);
    }
  };
  
  const handleViewerEnter = () => {
    setNeedsAuth(false);
    setUserRole('viewer');
    localStorage.setItem(ROLE_KEY, 'viewer');
    loadDatabase(true);
  };"""

new_replace = """  const handleLogin = async () => {
    if (inputSid.trim()) setSpreadsheetId(inputSid.trim());
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        let isEditor = true;
        const sid = inputSid.trim() || getSpreadsheetId();
        if (sid) {
          isEditor = await checkEditorAccess(sid);
        }
        if (!isEditor) {
          showToast("편집 권한이 없어 일반 사용자(뷰어)로 접속합니다.");
          setNeedsAuth(false);
          setUserRole('viewer');
          localStorage.setItem(ROLE_KEY, 'viewer');
          loadDatabase(true);
        } else {
          setNeedsAuth(false);
          setUserRole('admin');
          localStorage.setItem(ROLE_KEY, 'admin');
          loadDatabase(false);
        }
      }
    } catch (err) {
      console.error(err);
      showToast("로그인 실패. 구글 클라우드 플랫폼에서 테스터로 등록된 계정인지 확인해주세요.");
    } finally {
      setIsLoggingIn(false);
    }
  };
  
  const handleViewerEnter = () => {
    if (inputSid.trim()) setSpreadsheetId(inputSid.trim());
    setNeedsAuth(false);
    setUserRole('viewer');
    localStorage.setItem(ROLE_KEY, 'viewer');
    loadDatabase(true);
  };"""

content = content.replace(to_replace, new_replace)
open("src/App.tsx", "w").write(content)

