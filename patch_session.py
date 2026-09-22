import sys

content = open("src/db/sheets.ts").read()
to_replace = """      sessionNum: r[11] || undefined"""
new_replace = """      sessionNum: (r[11] && r[11].match(/^\\d{4}-(\\d{2})-(\\d{2})$/)) ? r[11].replace(/^\\d{4}-0?(\\d+)-0?(\\d+)$/, '$1-$2') : (r[11] || undefined)"""
content = content.replace(to_replace, new_replace)
open("src/db/sheets.ts", "w").write(content)
