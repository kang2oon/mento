import sys

content = open("src/App.tsx").read()

to_insert = """  const [showAddActivityForm, setShowAddActivityForm] = useState(false);"""
new_insert = """  const [showAddActivityForm, setShowAddActivityForm] = useState(false);
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [editingActivity, setEditingActivity] = useState<Partial<ActivityLog>>({});"""

if "editingActivityId" not in content:
    content = content.replace(to_insert, new_insert)
    open("src/App.tsx", "w").write(content)
