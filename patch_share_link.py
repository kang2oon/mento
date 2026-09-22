import sys

content = open("src/App.tsx").read()
to_replace = """            일반 사용자가 로그인 없이 데이터를 조회하려면 구글 시트의 공유 설정을 '링크가 있는 모든 사용자(뷰어)'로 변경해주세요. (현재 시트 ID: {getSpreadsheetId()})"""
new_replace = """            일반 사용자가 로그인 없이 데이터를 조회하려면 구글 시트의 공유 설정을 '링크가 있는 모든 사용자(뷰어)'로 변경해주세요.
            <button onClick={() => {
              const url = new URL(window.location.href);
              url.searchParams.set('sid', getSpreadsheetId() || '');
              navigator.clipboard.writeText(url.toString());
              showToast("공유 링크가 복사되었습니다.");
            }} className="ml-2 bg-indigo-200 text-indigo-900 px-2 py-0.5 rounded cursor-pointer hover:bg-indigo-300 transition-colors">공유 링크 복사</button>"""

content = content.replace(to_replace, new_replace)
open("src/App.tsx", "w").write(content)

