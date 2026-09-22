import sys

content = open("src/db/sheets.ts").read()
to_replace = """        return obj.table.rows.map((r: any) => r.c.map((cell: any) => cell ? (cell.v === null || cell.v === undefined ? '' : String(cell.v)) : ''));"""
new_replace = """        return obj.table.rows.map((r: any) => r.c.map((cell: any) => cell ? (cell.f ? String(cell.f) : (cell.v === null || cell.v === undefined ? '' : String(cell.v))) : ''));"""

content = content.replace(to_replace, new_replace)
open("src/db/sheets.ts", "w").write(content)
