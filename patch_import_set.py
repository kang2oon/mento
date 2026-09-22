import sys

content = open("src/App.tsx").read()
to_replace = """  getSpreadsheetId, createSpreadsheet, fetchAllData,"""
new_replace = """  getSpreadsheetId, setSpreadsheetId, createSpreadsheet, fetchAllData,"""

if "setSpreadsheetId," not in content:
    content = content.replace(to_replace, new_replace)
    open("src/App.tsx", "w").write(content)

