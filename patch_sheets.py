import sys

content = open("src/db/sheets.ts").read()

if "updateLogInSheet" not in content:
    update_func = """
export const updateLogInSheet = async (spreadsheetId: string, rowIndex: number, log: ActivityLog) => {
  const values = [
    log.id, log.matchId, log.plannedDate, log.actualDate, log.startTime, log.endTime, log.place,
    log.status, log.inspected ? 'TRUE' : 'FALSE', log.inspectorName, log.description, log.sessionNum || ''
  ];
  const sheetRow = rowIndex + 2;
  await req(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/ActivityLogs!A${sheetRow}:L${sheetRow}?valueInputOption=USER_ENTERED`, {
    method: 'PUT', body: JSON.stringify({ values: [values] })
  });
};
"""
    content += update_func
    open("src/db/sheets.ts", "w").write(content)
