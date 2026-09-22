import sys

content = open("src/App.tsx").read()
content = content.replace(
    'showToast("오류: Firebase Console(Authentication > Settings > Authorized domains)에 현재 도메인을 추가해주세요.");',
    'showToast("오류: console.firebase.google.com 에 접속해 Authentication > 설정 > 승인된 도메인에 위 주소창의 도메인을 추가하세요.");'
)
open("src/App.tsx", "w").write(content)
