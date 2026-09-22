import sys

content = open("src/App.tsx").read()
to_replace = """      console.error(err);
      showToast("로그인 실패. 구글 클라우드 플랫폼에서 테스터로 등록된 계정인지 확인해주세요.");"""

new_replace = """      console.error("Login error:", err);
      const errMsg = err instanceof Error ? err.message : String(err);
      showToast(`로그인 실패: ${errMsg}`);"""

content = content.replace(to_replace, new_replace)
open("src/App.tsx", "w").write(content)

