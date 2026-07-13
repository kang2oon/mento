import sys

content = open("src/App.tsx").read()
to_replace = """  updateMatchInSheet, updateMentorInSheet, updateMenteeInSheet, deleteMatchFromSheet,"""
new_replace = """  updateMatchInSheet, updateMentorInSheet, updateMenteeInSheet, deleteMatchFromSheet, updateLogInSheet,"""

if "updateLogInSheet," not in content:
    content = content.replace(to_replace, new_replace)
    open("src/App.tsx", "w").write(content)
