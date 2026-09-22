import sys

content = open("src/db/sheets.ts").read()
to_replace = """  const logs: ActivityLog[] = logValues.map((r: any) => {
    if (r.length <= 7) {
      // Handle legacy format: id, matchId, date, place, status, inspected, description
      return {
        id: r[0]||'', matchId: r[1]||'', plannedDate: r[2]||'', actualDate: '',
        startTime: '', endTime: '', place: r[3]||'',
        status: (r[4] === '완료' ? '완료' : '예정'), inspected: String(r[5]).toUpperCase() === 'TRUE',
        inspectorName: '', description: r[6]||''
      };
    }
    // New format
    return {
      id: r[0]||'', matchId: r[1]||'', plannedDate: r[2]||'', actualDate: r[3]||'',
      startTime: r[4]||'', endTime: r[5]||'', place: r[6]||'', 
      status: (r[7] === '완료' ? '완료' : '예정'), inspected: String(r[8]).toUpperCase() === 'TRUE',
      inspectorName: r[9]||'', description: r[10]||'',
      sessionNum: r[11] || undefined
    };
  });"""

new_replace = """  const logs: ActivityLog[] = logValues.map((r: any) => {
    return {
      id: r[0]||'', matchId: r[1]||'', plannedDate: r[2]||'', actualDate: r[3]||'',
      startTime: r[4]||'', endTime: r[5]||'', place: r[6]||'', 
      status: (r[7] === '완료' ? '완료' : '예정'), inspected: String(r[8]).toUpperCase() === 'TRUE',
      inspectorName: r[9]||'', description: r[10]||'',
      sessionNum: r[11] || undefined
    };
  });"""

content = content.replace(to_replace, new_replace)
open("src/db/sheets.ts", "w").write(content)
