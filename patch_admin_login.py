import sys

content = open("src/App.tsx").read()
to_replace = """    } catch (err) {
      console.error(err);
      showToast("로그인에 실패했습니다.");
    } finally {"""
new_replace = """    } catch (err: any) {
      console.error("Login error:", err);
      const errCode = err?.code || '';
      const errMsg = err?.message || String(err);
      if (errCode === 'auth/unauthorized-domain' || errMsg.includes('unauthorized-domain')) {
        showToast("오류: Firebase Console(Authentication > Settings > Authorized domains)에 현재 도메인을 추가해주세요.");
      } else if (errCode === 'auth/popup-closed-by-user' || errMsg.includes('popup-closed-by-user')) {
        showToast("오류: 로그인 팝업이 닫혔습니다. 팝업 차단을 해제하고 브라우저 새 탭에서 열어주세요.");
      } else {
        showToast(`로그인 실패: ${errCode || errMsg}`);
      }
    } finally {"""
content = content.replace(to_replace, new_replace)
open("src/App.tsx", "w").write(content)
