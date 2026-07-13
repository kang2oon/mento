import sys

content = open("src/db/sheets.ts").read()

to_replace = """    const errorData = await res.json().catch(() => null);
    if (res.status === 401) {
      throw new Error('인증이 만료되었습니다. 관리자 로그인을 다시 진행해주세요.');
    }
    const msg = errorData?.error?.message || 'API Request Failed';"""

new_replace = """    const errorData = await res.json().catch(() => null);
    if (res.status === 401) {
      const err = new Error('인증이 만료되었습니다. 관리자 로그인을 다시 진행해주세요.') as any;
      err.status = 401;
      throw err;
    }
    const msg = errorData?.error?.message || 'API Request Failed';"""

content = content.replace(to_replace, new_replace)
open("src/db/sheets.ts", "w").write(content)
