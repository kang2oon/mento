import sys

content = open("src/db/sheets.ts").read()
to_replace = """        status: (r[4] === '완료' ? '완료' : '예정'), inspected: r[5] === 'TRUE',"""
new_replace = """        status: (r[4] === '완료' ? '완료' : '예정'), inspected: String(r[5]).toUpperCase() === 'TRUE',"""
content = content.replace(to_replace, new_replace)

to_replace2 = """      status: (r[7] === '완료' ? '완료' : '예정'), inspected: r[8] === 'TRUE',"""
new_replace2 = """      status: (r[7] === '완료' ? '완료' : '예정'), inspected: String(r[8]).toUpperCase() === 'TRUE',"""
content = content.replace(to_replace2, new_replace2)

open("src/db/sheets.ts", "w").write(content)
