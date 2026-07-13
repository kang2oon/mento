import { getAccessToken } from '../auth';
import firebaseConfig from '../../firebase-applet-config.json';

export type PlanStatusType = '미작성' | '작성중' | '작성완료' | '확정' | '승인';
export type MatchStatusType = '대기' | '진행 중' | '완료' | '종료';

export interface MentorData {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  detail: string;
}

export interface MenteeData {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  detail: string;
  type: '개인' | '팀';
  teamCode: string[];
}

export interface MatchData {
  id: string;
  mentorId: string;
  menteeId: string;
  field: string;
  baseCount: number;
  extraCount: number;
  planStatus: PlanStatusType;
  status: MatchStatusType;
}

export interface ActivityLog {
  id: string;
  matchId: string;
  plannedDate: string;
  actualDate: string;
  startTime: string;
  endTime: string;
  place: string;
  status: '예정' | '완료';
  inspected: boolean;
  inspectorName: string;
  description: string;
  sessionNum?: string;
}

const SPREADSHEET_KEY = 'MENTOR_MENTEE_SPREADSHEET_ID';

export const getSpreadsheetId = () => localStorage.getItem(SPREADSHEET_KEY);
export const setSpreadsheetId = (id: string) => localStorage.setItem(SPREADSHEET_KEY, id);
export const clearSpreadsheetId = () => localStorage.removeItem(SPREADSHEET_KEY);

const req = async (url: string, options: RequestInit = {}, allowAnonymous = false) => {
  const token = await getAccessToken();
  let finalUrl = url;
  
  const headers: any = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else if (allowAnonymous) {
    const urlObj = new URL(url);
    urlObj.searchParams.append('key', firebaseConfig.apiKey);
    finalUrl = urlObj.toString();
  } else {
    throw new Error('Not authenticated');
  }

  const res = await fetch(finalUrl, { ...options, headers });
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    if (res.status === 401) {
      const err = new Error('인증이 만료되었습니다. 관리자 로그인을 다시 진행해주세요.') as any;
      err.status = 401;
      throw err;
    }
    const msg = errorData?.error?.message || 'API Request Failed';
    let errMessage = msg;
    if (msg.includes('Unable to parse range')) {
      errMessage = '구글 시트 구조 오류: Mentors, Mentees, Matches, ActivityLogs 시트가 없습니다. 새로 시트를 생성해주세요.';
    }
    const err = new Error(errMessage) as any;
    err.status = res.status;
    throw err;
  }
  return res.json();
};

export const createSpreadsheet = async (): Promise<string> => {
  const data = await req('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    body: JSON.stringify({
      properties: { title: '멘토-멘티 매칭 현황 관리 DB' },
      sheets: [
        {
          properties: { title: 'Mentors' },
          data: [{
            startRow: 0, startColumn: 0, rowData: [{
              values: [
                { userEnteredValue: { stringValue: 'MentorID' } },
                { userEnteredValue: { stringValue: 'Name' } },
                { userEnteredValue: { stringValue: 'Phone' } },
                { userEnteredValue: { stringValue: 'Email' } },
                { userEnteredValue: { stringValue: 'Address' } },
                { userEnteredValue: { stringValue: 'Detail' } }
              ]
            }]
          }]
        },
        {
          properties: { title: 'Mentees' },
          data: [{
            startRow: 0, startColumn: 0, rowData: [{
              values: [
                { userEnteredValue: { stringValue: 'MenteeID' } },
                { userEnteredValue: { stringValue: 'Name' } },
                { userEnteredValue: { stringValue: 'Phone' } },
                { userEnteredValue: { stringValue: 'Email' } },
                { userEnteredValue: { stringValue: 'Address' } },
                { userEnteredValue: { stringValue: 'Detail' } },
                { userEnteredValue: { stringValue: 'Type' } },
                { userEnteredValue: { stringValue: 'TeamCode' } }
              ]
            }]
          }]
        },
        {
          properties: { title: 'Matches' },
          data: [{
            startRow: 0, startColumn: 0, rowData: [{
              values: [
                { userEnteredValue: { stringValue: 'MatchID' } },
                { userEnteredValue: { stringValue: 'MentorID' } },
                { userEnteredValue: { stringValue: 'MenteeID' } },
                { userEnteredValue: { stringValue: 'Field' } },
                { userEnteredValue: { stringValue: 'BaseCount' } },
                { userEnteredValue: { stringValue: 'ExtraCount' } },
                { userEnteredValue: { stringValue: 'PlanStatus' } },
                { userEnteredValue: { stringValue: 'Status' } }
              ]
            }]
          }]
        },
        {
          properties: { title: 'ActivityLogs' },
          data: [{
            startRow: 0, startColumn: 0, rowData: [{
              values: [
                { userEnteredValue: { stringValue: 'LogID' } },
                { userEnteredValue: { stringValue: 'MatchID' } },
                { userEnteredValue: { stringValue: 'PlannedDate' } },
                { userEnteredValue: { stringValue: 'ActualDate' } },
                { userEnteredValue: { stringValue: 'StartTime' } },
                { userEnteredValue: { stringValue: 'EndTime' } },
                { userEnteredValue: { stringValue: 'Place' } },
                { userEnteredValue: { stringValue: 'Status' } },
                { userEnteredValue: { stringValue: 'Inspected' } },
                { userEnteredValue: { stringValue: 'InspectorName' } },
                { userEnteredValue: { stringValue: 'Description' } },
                { userEnteredValue: { stringValue: 'SessionNum' } }
              ]
            }]
          }]
        }
      ]
    })
  });
  const id = data.spreadsheetId;
  setSpreadsheetId(id);
  return id;
};

export const checkEditorAccess = async (spreadsheetId: string): Promise<boolean> => {
  try {
    await req(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Matches!Z1000:Z1000:clear`, {
      method: 'POST'
    });
    return true;
  } catch (err: any) {
    if (err.status === 403 || err.status === 401) {
      return false;
    }
    // If it fails with 400 (e.g. invalid range, sheet not found), 
    // it means authorization passed (not 403), so the user has edit access.
    return true;
  }
};

export const fetchAllData = async (spreadsheetId: string, isViewer: boolean = false) => {
  let mentorValues: any[][] = [];
  let menteeValues: any[][] = [];
  let matchValues: any[][] = [];
  let logValues: any[][] = [];

  if (isViewer) {
    try {
      const fetchSheetGviz = async (sheetName: string) => {
        const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=${sheetName}&headers=1`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch ${sheetName}`);
        const text = await res.text();
        const obj = JSON.parse(text.substring(47, text.length - 2));
        if (!obj.table || !obj.table.rows) return [];
        return obj.table.rows.map((r: any) => r.c.map((cell: any) => cell ? (cell.v === null || cell.v === undefined ? '' : String(cell.v)) : ''));
      };
      [mentorValues, menteeValues, matchValues, logValues] = await Promise.all([
        fetchSheetGviz('Mentors'),
        fetchSheetGviz('Mentees'),
        fetchSheetGviz('Matches'),
        fetchSheetGviz('ActivityLogs')
      ]);
    } catch (err: any) {
      throw new Error("데이터를 조회할 수 없습니다. 관리자가 구글 시트의 공유 설정을 '링크가 있는 모든 사용자(뷰어)'로 변경했는지 확인해주세요.");
    }
  } else {
    const data = await req(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?ranges=Mentors!A2:F&ranges=Mentees!A2:H&ranges=Matches!A2:H&ranges=ActivityLogs!A2:L`, {}, isViewer);
    mentorValues = data.valueRanges[0].values || [];
    menteeValues = data.valueRanges[1].values || [];
    matchValues = data.valueRanges[2].values || [];
    logValues = data.valueRanges[3].values || [];

    // Migrate old sheets to have SessionNum header
    req(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/ActivityLogs!L1?valueInputOption=USER_ENTERED`, {
      method: 'PUT',
      body: JSON.stringify({ values: [['SessionNum']] })
    }).catch(e => console.warn('Failed to update SessionNum header:', e));
  }
  
  const mentors: MentorData[] = mentorValues.map((r: any) => ({
    id: r[0]||'', name: r[1]||'', phone: r[2]||'', email: r[3]||'', address: r[4]||'', detail: r[5]||''
  }));
  const mentees: MenteeData[] = menteeValues.map((r: any) => {
    let parsedTeamCode: string[] = [];
    try {
      parsedTeamCode = JSON.parse(r[7] || '[]');
      if (!Array.isArray(parsedTeamCode)) parsedTeamCode = [r[7] || ''];
    } catch {
      parsedTeamCode = r[7] ? [r[7]] : [];
    }
    return {
      id: r[0]||'', name: r[1]||'', phone: r[2]||'', email: r[3]||'', address: r[4]||'', detail: r[5]||'',
      type: (r[6] === '팀' ? '팀' : '개인'), teamCode: parsedTeamCode
    };
  });
  const matches: MatchData[] = matchValues.map((r: any) => ({
    id: r[0]||'', mentorId: r[1]||'', menteeId: r[2]||'', field: r[3]||'', 
    baseCount: parseInt(r[4]||'0', 10), extraCount: parseInt(r[5]||'0', 10), 
    planStatus: (r[6]||'미작성') as PlanStatusType, status: (r[7]||'대기') as MatchStatusType
  }));
  const logs: ActivityLog[] = logValues.map((r: any) => {
    if (r.length <= 7) {
      // Handle legacy format: id, matchId, date, place, status, inspected, description
      return {
        id: r[0]||'', matchId: r[1]||'', plannedDate: r[2]||'', actualDate: '',
        startTime: '', endTime: '', place: r[3]||'',
        status: (r[4] === '완료' ? '완료' : '예정'), inspected: r[5] === 'TRUE',
        inspectorName: '', description: r[6]||''
      };
    }
    // New format
    return {
      id: r[0]||'', matchId: r[1]||'', plannedDate: r[2]||'', actualDate: r[3]||'',
      startTime: r[4]||'', endTime: r[5]||'', place: r[6]||'', 
      status: (r[7] === '완료' ? '완료' : '예정'), inspected: r[8] === 'TRUE',
      inspectorName: r[9]||'', description: r[10]||'',
      sessionNum: r[11] || undefined
    };
  });

  return { mentors, mentees, matches, logs };
};

export const addMentorToSheet = async (spreadsheetId: string, mentor: MentorData) => {
  const values = [mentor.id, mentor.name, mentor.phone, mentor.email, mentor.address, mentor.detail];
  await req(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Mentors!A:F:append?valueInputOption=USER_ENTERED`, {
    method: 'POST', body: JSON.stringify({ values: [values] })
  });
};

export const addMentorsToSheet = async (spreadsheetId: string, mentors: MentorData[]) => {
  if (mentors.length === 0) return;
  const values = mentors.map(mentor => [mentor.id, mentor.name, mentor.phone, mentor.email, mentor.address, mentor.detail]);
  await req(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Mentors!A:F:append?valueInputOption=USER_ENTERED`, {
    method: 'POST', body: JSON.stringify({ values })
  });
};

export const addMenteeToSheet = async (spreadsheetId: string, mentee: MenteeData) => {
  const values = [mentee.id, mentee.name, mentee.phone, mentee.email, mentee.address, mentee.detail, mentee.type, JSON.stringify(mentee.teamCode || [])];
  await req(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Mentees!A:H:append?valueInputOption=USER_ENTERED`, {
    method: 'POST', body: JSON.stringify({ values: [values] })
  });
};

export const addMenteesToSheet = async (spreadsheetId: string, mentees: MenteeData[]) => {
  if (mentees.length === 0) return;
  const values = mentees.map(mentee => [mentee.id, mentee.name, mentee.phone, mentee.email, mentee.address, mentee.detail, mentee.type, JSON.stringify(mentee.teamCode || [])]);
  await req(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Mentees!A:H:append?valueInputOption=USER_ENTERED`, {
    method: 'POST', body: JSON.stringify({ values })
  });
};

export const addMatchToSheet = async (spreadsheetId: string, match: MatchData) => {
  const values = [match.id, match.mentorId, match.menteeId, match.field, match.baseCount, match.extraCount, match.planStatus, match.status];
  await req(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Matches!A:H:append?valueInputOption=USER_ENTERED`, {
    method: 'POST', body: JSON.stringify({ values: [values] })
  });
};

export const addMatchesToSheet = async (spreadsheetId: string, matches: MatchData[]) => {
  if (matches.length === 0) return;
  const values = matches.map(match => [match.id, match.mentorId, match.menteeId, match.field, match.baseCount, match.extraCount, match.planStatus, match.status]);
  await req(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Matches!A:H:append?valueInputOption=USER_ENTERED`, {
    method: 'POST', body: JSON.stringify({ values })
  });
};

export const addLogToSheet = async (spreadsheetId: string, log: ActivityLog) => {
  const values = [log.id, log.matchId, log.plannedDate, log.actualDate, log.startTime, log.endTime, log.place, log.status, log.inspected ? 'TRUE' : 'FALSE', log.inspectorName, log.description, log.sessionNum?.toString() || ''];
  await req(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/ActivityLogs!A:L:append?valueInputOption=USER_ENTERED`, {
    method: 'POST', body: JSON.stringify({ values: [values] })
  });
};

export const addLogsToSheet = async (spreadsheetId: string, logs: ActivityLog[]) => {
  if (logs.length === 0) return;
  const values = logs.map(log => [
    log.id, log.matchId, log.plannedDate, log.actualDate, log.startTime, log.endTime, log.place, log.status, log.inspected ? 'TRUE' : 'FALSE', log.inspectorName, log.description, log.sessionNum?.toString() || ''
  ]);
  await req(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/ActivityLogs!A:L:append?valueInputOption=USER_ENTERED`, {
    method: 'POST', body: JSON.stringify({ values })
  });
};

export const updateMatchInSheet = async (spreadsheetId: string, rowIndex: number, match: MatchData) => {
  const values = [match.id, match.mentorId, match.menteeId, match.field, match.baseCount, match.extraCount, match.planStatus, match.status];
  const sheetRow = rowIndex + 2;
  await req(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Matches!A${sheetRow}:H${sheetRow}?valueInputOption=USER_ENTERED`, {
    method: 'PUT', body: JSON.stringify({ values: [values] })
  });
};

export const deleteMatchFromSheet = async (spreadsheetId: string, rowIndex: number) => {
  const meta = await req(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`);
  const sheet = meta.sheets.find((s: any) => s.properties.title === 'Matches');
  if (!sheet) throw new Error("Matches sheet not found");
  
  const sheetId = sheet.properties.sheetId;
  const sheetRowIndex = rowIndex + 1; // 0-indexed: header is index 0, first data is index 1

  await req(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: sheetId,
              dimension: 'ROWS',
              startIndex: sheetRowIndex,
              endIndex: sheetRowIndex + 1
            }
          }
        }
      ]
    })
  });
};

export const updateMentorInSheet = async (spreadsheetId: string, rowIndex: number, mentor: MentorData) => {
  const values = [mentor.id, mentor.name, mentor.phone, mentor.email, mentor.address, mentor.detail];
  const sheetRow = rowIndex + 2;
  await req(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Mentors!A${sheetRow}:F${sheetRow}?valueInputOption=USER_ENTERED`, {
    method: 'PUT', body: JSON.stringify({ values: [values] })
  });
};

export const updateMenteeInSheet = async (spreadsheetId: string, rowIndex: number, mentee: MenteeData) => {
  const values = [mentee.id, mentee.name, mentee.phone, mentee.email, mentee.address, mentee.detail, mentee.type, JSON.stringify(mentee.teamCode || [])];
  const sheetRow = rowIndex + 2;
  await req(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Mentees!A${sheetRow}:H${sheetRow}?valueInputOption=USER_ENTERED`, {
    method: 'PUT', body: JSON.stringify({ values: [values] })
  });
};


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
