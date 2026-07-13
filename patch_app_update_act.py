import sys

content = open("src/App.tsx").read()
to_insert = """  const updateMatch = async (id: string, updateFn: (m: MatchData) => MatchData) => {"""
new_insert = """  const updateActivity = async (id: string, updatedLog: ActivityLog) => {
    const sid = getSpreadsheetId();
    if (!sid) {
      showToast("구글 시트 연동이 필요합니다.");
      return;
    }
    const logIndex = activities.findIndex(a => a.id === id);
    if (logIndex === -1) return;
    
    const originalActivities = [...activities];
    const updatedActivities = [...activities];
    updatedActivities[logIndex] = updatedLog;
    setActivities(updatedActivities);
    
    try {
      await updateLogInSheet(sid, logIndex, updatedLog);
      setEditingActivityId(null);
      setEditingActivity({});
    } catch (e) {
      console.error(e);
      showToast("수행일지 업데이트 중 오류가 발생했습니다.");
      setActivities(originalActivities);
    }
  };

  const updateMatch = async (id: string, updateFn: (m: MatchData) => MatchData) => {"""

if "const updateActivity = async" not in content:
    content = content.replace(to_insert, new_insert)
    open("src/App.tsx", "w").write(content)
