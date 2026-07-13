import React, { useState, useEffect, useMemo } from "react";
import {
  Search, Users, Plus, X, MapPin, Phone, Mail, RefreshCw, LogOut, CheckCircle2, LogIn, Download, Upload
} from "lucide-react";
import Papa from "papaparse";
import { initAuth, googleSignIn, logout } from "./auth";
import { 
  getSpreadsheetId, createSpreadsheet, fetchAllData, 
  addMentorToSheet, addMenteeToSheet, addMatchToSheet, addLogToSheet, addLogsToSheet, 
  addMentorsToSheet, addMenteesToSheet, addMatchesToSheet,
  updateMatchInSheet, updateMentorInSheet, updateMenteeInSheet, deleteMatchFromSheet, updateLogInSheet,
  checkEditorAccess, MentorData, MenteeData, MatchData, ActivityLog, PlanStatusType, MatchStatusType 
} from "./db/sheets";

const ROLE_KEY = 'MENTOR_MENTEE_USER_ROLE';

export default function App() {
  const [needsAuth, setNeedsAuth] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  const [toastMsg, setToastMsg] = useState("");
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 5000);
  };

  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  
  const [userRole, setUserRole] = useState<'admin' | 'viewer'>(
    (localStorage.getItem(ROLE_KEY) as 'admin' | 'viewer') || 'admin'
  );

  const [mentors, setMentors] = useState<MentorData[]>([]);
  const [mentees, setMentees] = useState<MenteeData[]>([]);
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);

  const [selectedMatchId, setSelectedMatchId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("전체");
  const [planStatusFilter, setPlanStatusFilter] = useState<string[]>([]);
  const [applyToTeam, setApplyToTeam] = useState(true);

  const getPlanStatusColor = (status: string) => {
    switch(status) {
      case "미작성": return "bg-slate-50 border-slate-200 text-slate-500";
      case "작성중": return "bg-amber-50 border-amber-200 text-amber-700";
      case "작성완료": return "bg-blue-50 border-blue-200 text-blue-700";
      case "확정": return "bg-purple-50 border-purple-200 text-purple-700";
      case "승인": return "bg-emerald-50 border-emerald-200 text-emerald-700";
      default: return "bg-slate-100 border-slate-200 text-slate-700";
    }
  };

  const getMatchStatusColor = (status: string) => {
    switch(status) {
      case "대기": return "bg-slate-50 border-slate-200 text-slate-500";
      case "진행 중": return "bg-indigo-50 border-indigo-200 text-indigo-700";
      case "완료": return "bg-emerald-50 border-emerald-200 text-emerald-700";
      case "종료": return "bg-rose-50 border-rose-200 text-rose-700";
      default: return "bg-slate-100 border-slate-200 text-slate-700";
    }
  };

  const togglePlanStatusFilter = (status: string) => {
    setPlanStatusFilter(prev => 
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const [fieldFilter, setFieldFilter] = useState<string>("전체");
  
  const [showAddActivityForm, setShowAddActivityForm] = useState(false);
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [editingActivity, setEditingActivity] = useState<Partial<ActivityLog>>({});
  const [newActSessionNum, setNewActSessionNum] = useState<string>('');
  const [newActPlannedDate, setNewActPlannedDate] = useState("");
  const [newActActualDate, setNewActActualDate] = useState("");
  const [newActStartTime, setNewActStartTime] = useState("");
  const [newActEndTime, setNewActEndTime] = useState("");
  const [newActPlace, setNewActPlace] = useState("");
  const [newActDesc, setNewActDesc] = useState("");
  const [newActInspected, setNewActInspected] = useState(false);
  const [newActInspectorName, setNewActInspectorName] = useState("");
  const [newActStatus, setNewActStatus] = useState<'예정' | '완료'>("예정");

  const [showAddMatchModal, setShowAddMatchModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [newMatchField, setNewMatchField] = useState("창업준비");
  const [newMatchBaseCount, setNewMatchBaseCount] = useState<number>(3);
  const [newMatchExtraCount, setNewMatchExtraCount] = useState<number>(0);
  
  const [newMentorName, setNewMentorName] = useState("");
  const [newMentorPhone, setNewMentorPhone] = useState("");
  const [newMenteeType, setNewMenteeType] = useState<'개인' | '팀'>('개인');
  const [newMentees, setNewMentees] = useState<{name: string, phone: string}[]>([{name: '', phone: ''}]);

  const [editingMentorDetail, setEditingMentorDetail] = useState("");
  const [editingMenteeDetail, setEditingMenteeDetail] = useState("");
  const [isEditingMentorDetail, setIsEditingMentorDetail] = useState(false);
  const [isEditingMenteeDetail, setIsEditingMenteeDetail] = useState(false);

  const planStatuses: PlanStatusType[] = ["미작성", "작성중", "작성완료", "확정", "승인"];
  const matchStatuses: MatchStatusType[] = ["대기", "진행 중", "완료", "종료"];
  const allFields = ["전체", "창업준비", "영농기술", "농촌생활", "경영관리"];

  useEffect(() => {
    const unsubscribe = initAuth(
      async (user, token) => {
        setNeedsAuth(false);
        const savedRole = localStorage.getItem(ROLE_KEY) as 'admin' | 'viewer';
        let finalRole = savedRole;
        if (savedRole === 'admin') {
          const sid = getSpreadsheetId();
          if (sid) {
            const isEditor = await checkEditorAccess(sid);
            if (!isEditor) {
              showToast("편집 권한이 없어 일반 사용자(뷰어)로 전환되었습니다.");
              finalRole = 'viewer';
              localStorage.setItem(ROLE_KEY, 'viewer');
            }
          }
        }
        if (finalRole) setUserRole(finalRole);
        loadDatabase(finalRole === 'viewer');
      },
      () => {
        const savedRole = localStorage.getItem(ROLE_KEY) as 'admin' | 'viewer';
        if (savedRole === 'viewer') {
          setNeedsAuth(false);
          setUserRole('viewer');
          loadDatabase(true);
        } else {
          setNeedsAuth(true);
        }
      }
    );
    return () => unsubscribe();
  }, []);

  const loadDatabase = async (isViewer = false) => {
    setLoading(true);
    setLoadingMsg("데이터베이스 연결 중...");
    try {
      let sid = getSpreadsheetId();
      if (!sid) {
        if (isViewer) {
          showToast("아직 생성된 구글 시트가 없습니다. 관리자가 먼저 로그인하여 생성해야 합니다.");
          setNeedsAuth(true);
          return;
        }
        setLoadingMsg("새로운 구글 시트 DB 생성 중...");
        sid = await createSpreadsheet();
      }
      setLoadingMsg("데이터 불러오는 중...");
      const dbData = await fetchAllData(sid, isViewer);
      
      setMentors(dbData.mentors.filter(m => m.id !== 'MentorID' && m.id !== ''));
      setMentees(dbData.mentees.filter(m => m.id !== 'MenteeID' && m.id !== ''));
      const cleanMatches = dbData.matches.filter(m => m.id !== 'MatchID' && m.id !== '');
      setMatches(cleanMatches);
      setActivities(dbData.logs.filter(l => l.id !== 'LogID' && l.id !== ''));
      
      if (!cleanMatches.find(m => m.id === selectedMatchId)) {
        if (cleanMatches.length > 0) {
          setSelectedMatchId(cleanMatches[0].id);
        } else {
          setSelectedMatchId("");
        }
      }
    } catch (e: any) {
      console.error(e);
      if (isViewer) {
        showToast("데이터를 조회할 수 없습니다. 관리자가 구글 시트의 공유 설정을 '링크가 있는 모든 사용자(뷰어)'로 변경했는지 확인해주세요.");
      } else {
        showToast("데이터를 불러오는 중 오류가 발생했습니다: " + e.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setIsEditingMentorDetail(false);
    setIsEditingMenteeDetail(false);
  }, [selectedMatchId]);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        let isEditor = true;
        const sid = getSpreadsheetId();
        if (sid) {
          isEditor = await checkEditorAccess(sid);
        }
        if (!isEditor) {
          showToast("편집 권한이 없어 일반 사용자(뷰어)로 접속합니다.");
          setNeedsAuth(false);
          setUserRole('viewer');
          localStorage.setItem(ROLE_KEY, 'viewer');
          loadDatabase(true);
        } else {
          setNeedsAuth(false);
          setUserRole('admin');
          localStorage.setItem(ROLE_KEY, 'admin');
          loadDatabase(false);
        }
      }
    } catch (err) {
      console.error(err);
      showToast("로그인 실패");
    } finally {
      setIsLoggingIn(false);
    }
  };
  
  const handleViewerEnter = () => {
    setNeedsAuth(false);
    setUserRole('viewer');
    localStorage.setItem(ROLE_KEY, 'viewer');
    loadDatabase(true);
  };

  const handleLogout = async () => {
    localStorage.removeItem(ROLE_KEY);
    try {
      await logout();
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setMentors([]); setMentees([]); setMatches([]); setActivities([]);
      setSelectedMatchId("");
      setNeedsAuth(true);
    }
  };

  const handleAdminLoginFromViewer = async () => {
    try {
      setIsLoggingIn(true);
      const result = await googleSignIn();
      if (result) {
        let isEditor = true;
        const sid = getSpreadsheetId();
        if (sid) {
          isEditor = await checkEditorAccess(sid);
        }
        if (!isEditor) {
          showToast("구글 시트에 대한 편집 권한이 없어 관리자로 로그인할 수 없습니다.");
          return;
        }
        setNeedsAuth(false);
        setUserRole('admin');
        localStorage.setItem(ROLE_KEY, 'admin');
        loadDatabase(false);
      }
    } catch (err) {
      console.error(err);
      showToast("로그인에 실패했습니다.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleDownloadSampleCSV = () => {
    const csvContent = "매칭분야,멘토이름,멘토연락처,멘티구분(개인/팀),팀코드(팀일경우동일코드부여),멘티이름,멘티연락처,기본배정횟수,추가요청횟수\n창업준비,김멘토,010-1234-5678,팀,TEAM-1,이멘티,010-1111-2222,5,3\n창업준비,김멘토,010-1234-5678,팀,TEAM-1,박멘티,010-3333-4444,5,3\n영농기술,최멘토,010-9999-8888,개인,,정멘티,010-7777-6666,5,3";
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '매칭일괄업로드_양식.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const sid = getSpreadsheetId();
    if (!sid) {
      showToast("구글 시트 연동이 필요합니다.");
      e.target.value = '';
      return;
    }

    setLoading(true);
    setLoadingMsg("CSV 파일 파싱 및 업로드 중...");

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = results.data as any[];
          const newMentors: MentorData[] = [];
          const newMentees: MenteeData[] = [];
          const newMatches: MatchData[] = [];
          
          let mIdCounter = Date.now();
          
          for (const row of rows) {
            const field = row['매칭분야']?.trim();
            const mentorName = row['멘토이름']?.trim();
            const mentorPhone = row['멘토연락처']?.trim();
            const typeStr = row['멘티구분(개인/팀)']?.trim();
            const teamCodeStr = row['팀코드(팀일경우동일코드부여)']?.trim() || '';
            const menteeName = row['멘티이름']?.trim();
            const menteePhone = row['멘티연락처']?.trim();
            const baseStr = row['기본배정횟수']?.trim();
            const extraStr = row['추가요청횟수']?.trim();

            if (!field || !mentorName || !mentorPhone || !typeStr || !menteeName || !menteePhone) {
              continue;
            }
            
            let mentor = [...mentors, ...newMentors].find(m => m.name === mentorName && m.phone === mentorPhone);
            if (!mentor) {
              mentor = { id: `MTR-${mIdCounter++}`, name: mentorName, phone: mentorPhone, email: '', address: '', detail: '' };
              newMentors.push(mentor);
            }
            
            let mentee = [...mentees, ...newMentees].find(m => m.name === menteeName && m.phone === menteePhone);
            const parsedTeamCodes = typeStr === '팀' ? (teamCodeStr ? teamCodeStr.split(',').map(s=>s.trim()).filter(Boolean) : [`TEAM-${mIdCounter++}`]) : [];
            
            if (!mentee) {
              mentee = { 
                id: `MTE-${mIdCounter++}`, name: menteeName, phone: menteePhone, email: '', address: '', detail: '',
                type: typeStr === '팀' ? '팀' : '개인', teamCode: parsedTeamCodes
              };
              newMentees.push(mentee);
            } else {
              if (typeStr === '팀') {
                mentee.type = '팀';
                mentee.teamCode = Array.from(new Set([...(mentee.teamCode || []), ...parsedTeamCodes]));
              }
            }
            
            const allMentorMatches = [...matches, ...newMatches].filter(m => m.mentorId === mentor!.id);
            const mentorMentees = new Set(allMentorMatches.map(m => m.menteeId));
            mentorMentees.add(mentee.id);
            
            const matchExists = [...matches, ...newMatches].some(m => m.mentorId === mentor!.id && m.menteeId === mentee!.id && m.field === field);
            if (!matchExists) {
              const newMatch: MatchData = {
                id: `T_${mIdCounter++}`, mentorId: mentor.id, menteeId: mentee.id, field,
                baseCount: isNaN(parseInt(baseStr)) ? 5 : parseInt(baseStr), extraCount: isNaN(parseInt(extraStr)) ? 3 : parseInt(extraStr),
                planStatus: "미작성", status: "대기"
              };
              newMatches.push(newMatch);
            }
          }
          
          await addMentorsToSheet(sid, newMentors);
          await addMenteesToSheet(sid, newMentees);
          await addMatchesToSheet(sid, newMatches);
          
          if (newMentors.length > 0) setMentors(prev => [...prev, ...newMentors]);
          if (newMentees.length > 0) setMentees(prev => [...prev, ...newMentees]);
          if (newMatches.length > 0) setMatches(prev => [...prev, ...newMatches]);
          
          showToast(`업로드 완료! (멘토 ${newMentors.length}명, 멘티 ${newMentees.length}명, 매칭 ${newMatches.length}건 추가됨)`);
        } catch (err: any) {
          console.error(err);
          showToast("일괄 업로드 실패: " + (err.message || String(err)));
        } finally {
          setLoading(false);
          e.target.value = '';
        }
      }
    });
  };

  const handleDownloadActivitySampleCSV = () => {
    const csvContent = "회차,예정일,실시일,시작시간,종료시간,장소,상태,현장점검(O/X),담당자명,활동내용\n1-1,2023-01-01,2023-01-01,10:00,12:00,서울,완료,O,김담당,멘토링 오리엔테이션 진행\n1-2,2023-01-15,,,,경기,예정,X,,현장 방문 예정";
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '수행일지일괄업로드_양식.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleActivityFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!selectedMatchId) {
      showToast("매칭을 먼저 선택해주세요.");
      e.target.value = '';
      return;
    }

    const sid = getSpreadsheetId();
    if (!sid) {
      showToast("구글 시트 연동이 필요합니다.");
      e.target.value = '';
      return;
    }

    const targetMatch = matches.find(m => m.id === selectedMatchId);
    let targetMatchIds = [selectedMatchId];
    if (applyToTeam && targetMatch) {
      const mentee = mentees.find(m => m.id === targetMatch.menteeId);
      if (mentee?.teamCode && mentee.teamCode.length > 0) {
        const teamMentees = mentees.filter(m => m.teamCode && m.teamCode.some(tc => mentee.teamCode.includes(tc))).map(m => m.id);
        targetMatchIds = matches
          .filter(m => m.mentorId === targetMatch.mentorId && m.field === targetMatch.field && teamMentees.includes(m.menteeId))
          .map(m => m.id);
      }
    }

    setLoading(true);
    setLoadingMsg("CSV 파일 파싱 및 업로드 중...");

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = results.data as any[];
          const newLogs: ActivityLog[] = [];
          
          let logIdCounter = Date.now();
          
          for (const row of rows) {
            const sessionNumStr = row['회차']?.trim() || '';
            const sessionNum = sessionNumStr || undefined;
            const plannedDate = row['예정일']?.trim() || '';
            const actualDate = row['실시일']?.trim() || '';
            const startTime = row['시작시간']?.trim() || '';
            const endTime = row['종료시간']?.trim() || '';
            const place = row['장소']?.trim() || '';
            const statusStr = row['상태']?.trim() || '';
            const status = statusStr === '완료' ? '완료' : '예정';
            const inspectedStr = row['현장점검(O/X)']?.trim() || '';
            const inspected = inspectedStr.toUpperCase() === 'O';
            const inspectorName = row['담당자명']?.trim() || '';
            const description = row['활동내용']?.trim() || '';

            if (!plannedDate || !place || !description) {
              continue; 
            }

            for (const mId of targetMatchIds) {
              newLogs.push({
                id: `ACT-${logIdCounter++}`, matchId: mId, plannedDate, actualDate,
                startTime, endTime, place, status, inspected, inspectorName, description, sessionNum
              });
            }
          }

          if (newLogs.length === 0) {
             showToast("업로드할 유효한 수행일지 데이터가 없습니다. (예정일, 장소, 활동내용 필수)");
             setLoading(false);
             e.target.value = '';
             return;
          }
          
          await addLogsToSheet(sid, newLogs);
          setActivities(prev => [...prev, ...newLogs]);
          showToast(`총 ${rows.length}건의 일지(매칭기준 ${newLogs.length}건)가 추가되었습니다.`);
        } catch (err: any) {
          console.error(err);
          showToast("일괄 업로드 실패: " + (err.message || String(err)));
        } finally {
          setLoading(false);
          e.target.value = '';
        }
      }
    });
  };

  const handleCreateMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    const validMentees = newMenteeType === '개인' ? [newMentees[0]] : newMentees.filter(m => m.name.trim() !== '' && m.phone.trim() !== '');
    if (!newMentorName || !newMentorPhone || validMentees.length === 0 || validMentees.some(m => !m.name || !m.phone)) {
      showToast("멘토와 멘티의 이름/연락처는 필수입니다.");
      return;
    }
    const sid = getSpreadsheetId();
    if (!sid) {
      showToast("구글 시트 연동이 필요합니다.");
      return;
    }
    
    let mentor = mentors.find(m => m.name === newMentorName && m.phone === newMentorPhone);
    const mentorId = mentor ? mentor.id : `MTR-${Date.now()}`;

    const existingMentorMatches = matches.filter(m => m.mentorId === mentorId);
    const uniqueMenteesForMentor = new Set(existingMentorMatches.map(m => m.menteeId));

    const resolvedMentees = validMentees.map(vm => {
      let m = mentees.find(existing => existing.name === vm.name && existing.phone === vm.phone);
      return m ? { mentee: m, isNew: false } : { mentee: { id: `MTE-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`, name: vm.name, phone: vm.phone, email: '', address: '', detail: '', type: newMenteeType, teamCode: [] }, isNew: true };
    });

    const newMenteeIds = resolvedMentees.map(r => r.mentee.id);
    const allMenteesForMentor = new Set([...Array.from(uniqueMenteesForMentor), ...newMenteeIds]);

    for (const r of resolvedMentees) {
      const menteeId = r.mentee.id;
      const existingMenteeMatches = matches.filter(m => m.menteeId === menteeId);
      const uniqueMentorsForMentee = new Set(existingMenteeMatches.map(m => m.mentorId));
      const isDuplicate = matches.some(m => m.mentorId === mentorId && m.menteeId === menteeId && m.field === newMatchField);
      if (isDuplicate) {
        showToast(`멘티 '${r.mentee.name}'님과 멘토는 이 분야에 이미 매칭되어 있습니다.`);
        return;
      }
    }

    setLoading(true);
    setLoadingMsg("매칭 정보 저장 중...");
    
    try {
      if (!mentor) {
        mentor = { id: mentorId, name: newMentorName, phone: newMentorPhone, email: '', address: '', detail: '' };
        await addMentorToSheet(sid, mentor);
        setMentors(prev => [...prev, mentor!]);
      }
      
      const teamCodes = newMenteeType === '팀' ? [`TEAM-${Date.now()}`] : [];
      const createdMatches: MatchData[] = [];
      const newMenteesToSave: MenteeData[] = [];

      for (let i = 0; i < resolvedMentees.length; i++) {
        const r = resolvedMentees[i];
        if (r.isNew) {
           r.mentee.teamCode = teamCodes;
           newMenteesToSave.push(r.mentee);
        }
        
        const newMatchId = `T_${Date.now()}_${i}`;
        const newMatch: MatchData = {
          id: newMatchId, mentorId, menteeId: r.mentee.id, field: newMatchField,
          baseCount: newMatchBaseCount, extraCount: newMatchExtraCount,
          planStatus: "미작성", status: "대기"
        };
        createdMatches.push(newMatch);
      }

      await addMenteesToSheet(sid, newMenteesToSave);
      await addMatchesToSheet(sid, createdMatches);

      if (newMenteesToSave.length > 0) {
        setMentees(prev => [...prev, ...newMenteesToSave]);
      }
      setMatches(prev => [...prev, ...createdMatches]);
      if (createdMatches.length > 0) {
        setSelectedMatchId(createdMatches[0].id);
      }

      setShowAddMatchModal(false);
      setNewMentorName(""); setNewMentorPhone(""); 
      setNewMenteeType('개인'); 
      setNewMentees([{name: '', phone: ''}]);
    } catch (err: any) {
      console.error(err);
      showToast("매칭 저장 실패: " + (err.message || String(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMatchId || !newActPlannedDate || !newActPlace || !newActDesc) {
      showToast("모든 필수 항목을 입력해주세요.");
      return;
    }
    const sid = getSpreadsheetId();
    if (!sid) {
      showToast("구글 시트 연동이 필요합니다.");
      return;
    }
    setLoadingMsg("활동 일지 저장 중...");
    
    const targetMatch = matches.find(m => m.id === selectedMatchId);
    let targetMatchIds = [selectedMatchId];
    if (applyToTeam && targetMatch) {
      const mentee = mentees.find(m => m.id === targetMatch.menteeId);
      if (mentee?.teamCode && mentee.teamCode.length > 0) {
        const teamMentees = mentees.filter(m => m.teamCode && m.teamCode.some(tc => mentee.teamCode.includes(tc))).map(m => m.id);
        targetMatchIds = matches
          .filter(m => m.mentorId === targetMatch.mentorId && m.field === targetMatch.field && teamMentees.includes(m.menteeId))
          .map(m => m.id);
      }
    }

    const newLogs: ActivityLog[] = targetMatchIds.map((mId, idx) => ({
      id: `ACT-${Date.now()}-${idx}`, matchId: mId, plannedDate: newActPlannedDate, actualDate: newActActualDate,
      startTime: newActStartTime, endTime: newActEndTime, place: newActPlace,
      status: newActStatus, inspected: newActInspected, inspectorName: newActInspectorName, description: newActDesc,
      sessionNum: newActSessionNum !== '' ? newActSessionNum : undefined
    }));

    try {
      await addLogsToSheet(sid, newLogs);
      setActivities(prev => [...prev, ...newLogs]);
      setShowAddActivityForm(false);
      setNewActPlannedDate(""); setNewActActualDate(""); setNewActStartTime(""); setNewActEndTime("");
      setNewActPlace(""); setNewActDesc(""); setNewActInspected(false); setNewActInspectorName(""); setNewActStatus("예정"); setNewActSessionNum('');
    } catch (err: any) {
      console.error(err);
      showToast("활동일지 저장 실패: " + (err.message || String(err)));
    } finally {
      setLoading(false);
    }
  };

  const updateMentorDetail = async (mentorId: string, newDetail: string) => {
    const sid = getSpreadsheetId();
    if (!sid) {
      showToast("구글 시트 연동이 필요합니다.");
      return;
    }
    const mIndex = mentors.findIndex(m => m.id === mentorId);
    if (mIndex === -1) return;
    const updatedMentor = { ...mentors[mIndex], detail: newDetail };
    const updatedMentors = [...mentors];
    updatedMentors[mIndex] = updatedMentor;
    setMentors(updatedMentors);
    try {
      await updateMentorInSheet(sid, mIndex, updatedMentor);
      showToast("멘토 특이사항이 저장되었습니다.");
    } catch (err: any) {
      console.error(err);
      showToast("저장 실패: " + (err.message || String(err)));
    }
  };

  const updateMenteeDetail = async (menteeId: string, newDetail: string) => {
    const sid = getSpreadsheetId();
    if (!sid) {
      showToast("구글 시트 연동이 필요합니다.");
      return;
    }
    const mIndex = mentees.findIndex(m => m.id === menteeId);
    if (mIndex === -1) return;
    const updatedMentee = { ...mentees[mIndex], detail: newDetail };
    const updatedMentees = [...mentees];
    updatedMentees[mIndex] = updatedMentee;
    setMentees(updatedMentees);
    try {
      await updateMenteeInSheet(sid, mIndex, updatedMentee);
      showToast("멘티 특이사항이 저장되었습니다.");
    } catch (err: any) {
      console.error(err);
      showToast("저장 실패: " + (err.message || String(err)));
    }
  };

  const updateActivity = async (id: string, updatedLog: ActivityLog) => {
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

  const updateMatch = async (id: string, updateFn: (m: MatchData) => MatchData) => {
    const sid = getSpreadsheetId();
    if (!sid) {
      showToast("구글 시트 연동이 필요합니다.");
      return;
    }
    const matchIndex = matches.findIndex(m => m.id === id);
    if (matchIndex === -1) return;
    
    const targetMatch = matches[matchIndex];
    const mentee = mentees.find(m => m.id === targetMatch.menteeId);

    let relatedMatchIndices = [matchIndex];
    if (applyToTeam && mentee?.teamCode && mentee.teamCode.length > 0) {
      const teamMentees = mentees.filter(m => m.teamCode && m.teamCode.some(tc => mentee.teamCode.includes(tc))).map(m => m.id);
      matches.forEach((m, idx) => {
        if (idx !== matchIndex && m.mentorId === targetMatch.mentorId && m.field === targetMatch.field && teamMentees.includes(m.menteeId)) {
          relatedMatchIndices.push(idx);
        }
      });
    }

    const originalMatches = [...matches];
    const updatedMatches = [...matches];
    const updatesToSave: {index: number, match: MatchData}[] = [];

    relatedMatchIndices.forEach(idx => {
      const updated = updateFn(matches[idx]);
      updatedMatches[idx] = updated;
      updatesToSave.push({ index: idx, match: updated });
    });

    setMatches(updatedMatches);

    try {
      await Promise.all(updatesToSave.map(u => updateMatchInSheet(sid, u.index, u.match)));
    } catch (e) {
      console.error(e);
      showToast("업데이트 실패");
      setMatches(originalMatches);
    }
  };

  const handleDeleteMatch = async (id: string) => {
    const sid = getSpreadsheetId();
    if (!sid) {
      showToast("구글 시트 연동이 필요합니다.");
      return;
    }

    const matchIndex = matches.findIndex(m => m.id === id);
    if (matchIndex === -1) return;

    const targetMatch = matches[matchIndex];
    const mentee = mentees.find(m => m.id === targetMatch.menteeId);

    let relatedMatchIndices = [matchIndex];
    if (applyToTeam && mentee?.teamCode && mentee.teamCode.length > 0) {
      const teamMentees = mentees.filter(m => m.teamCode && m.teamCode.some(tc => mentee.teamCode.includes(tc))).map(m => m.id);
      matches.forEach((m, idx) => {
        if (idx !== matchIndex && m.mentorId === targetMatch.mentorId && m.field === targetMatch.field && teamMentees.includes(m.menteeId)) {
          relatedMatchIndices.push(idx);
        }
      });
    }

    // Sort descending so deletion doesn't shift earlier indices
    relatedMatchIndices.sort((a, b) => b - a);

    try {
      setLoading(true);
      setLoadingMsg("매칭 데이터 삭제 중...");

      for (const idx of relatedMatchIndices) {
        await deleteMatchFromSheet(sid, idx);
      }

      setMatches(prev => prev.filter((_, i) => !relatedMatchIndices.includes(i)));
      setSelectedMatchId("");
      showToast("매칭이 삭제되었습니다.");
    } catch (e) {
      console.error(e);
      showToast("매칭 삭제 실패: " + (e.message || String(e)));
    } finally {
      setLoading(false);
    }
  };

  const getMatchMentor = (mId: string) => mentors.find(m => m.id === mId) || { name: '알수없음', phone: '', email: '', address: '', detail: '' };
  const getMatchMentee = (mId: string) => mentees.find(m => m.id === mId) || { name: '알수없음', phone: '', email: '', address: '', detail: '', type: '개인', teamCode: [] as string[] };

  const enrichedMatches = useMemo(() => {
    return matches.map(m => ({
      ...m,
      mentor: getMatchMentor(m.mentorId),
      mentee: getMatchMentee(m.menteeId),
      actCount: activities.filter(a => a.matchId === m.id).length
    }));
  }, [matches, mentors, mentees, activities]);

  const planStatusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    planStatuses.forEach(s => counts[s] = 0);
    
    enrichedMatches.filter(match => {
      const searchStr = `${match.mentor.name} ${match.mentee.name} ${match.field} ${match.id}`.toLowerCase();
      return searchStr.includes(searchTerm.toLowerCase()) && 
             (statusFilter === "전체" || match.status === statusFilter) &&
             (fieldFilter === "전체" || match.field === fieldFilter);
    }).forEach(match => {
      if (counts[match.planStatus] !== undefined) counts[match.planStatus]++;
    });
    return counts;
  }, [enrichedMatches, searchTerm, statusFilter, fieldFilter]);

  const filteredMatches = useMemo(() => {
    return enrichedMatches.filter(match => {
      const searchStr = `${match.mentor.name} ${match.mentee.name} ${match.field} ${match.id}`.toLowerCase();
      const matchesSearch = searchStr.includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "전체" || match.status === statusFilter;
      const matchesField = fieldFilter === "전체" || match.field === fieldFilter;
      const matchesPlanStatus = planStatusFilter.length === 0 || planStatusFilter.includes(match.planStatus);
      return matchesSearch && matchesStatus && matchesField && matchesPlanStatus;
    });
  }, [enrichedMatches, searchTerm, statusFilter, fieldFilter, planStatusFilter]);

  const selectedMatch = useMemo(() => enrichedMatches.find(m => m.id === selectedMatchId) || null, [enrichedMatches, selectedMatchId]);
  const selectedMatchActivities = useMemo(() => activities.filter(a => a.matchId === selectedMatchId).reverse(), [activities, selectedMatchId]);

  if (needsAuth) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 border border-slate-200 shadow-sm max-w-md w-full text-center space-y-6">
          <div className="w-12 h-12 bg-slate-900 mx-auto flex items-center justify-center transform rotate-45">
            <Users className="w-6 h-6 text-white transform -rotate-45" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">멘토-멘티 매칭 관리 DB</h1>
            <p className="text-sm text-slate-500 mt-2">
              다대다 매칭 및 분야별 중복 매칭을 지원하는 통합 관리 시스템입니다.
            </p>
          </div>
          <div className="space-y-3">
            <button onClick={handleLogin} disabled={isLoggingIn} className="w-full relative flex items-center justify-center gap-3 px-4 py-3 bg-slate-900 text-white font-bold hover:bg-slate-800 transition-all focus:outline-none cursor-pointer">
              {isLoggingIn ? <RefreshCw className="w-5 h-5 animate-spin text-slate-400" /> : <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5 bg-white rounded-full p-0.5" alt="google" />}
              <span>관리자 로그인 (데이터 수정)</span>
            </button>
            <button onClick={handleViewerEnter} disabled={isLoggingIn} className="w-full relative flex items-center justify-center gap-3 px-4 py-3 bg-white border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition-all focus:outline-none cursor-pointer">
              <span>일반 사용자 입장 (조회 전용)</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 antialiased font-sans flex flex-col relative">
      {toastMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] bg-slate-900 text-white px-6 py-3 rounded shadow-2xl flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-bold">{toastMsg}</span>
          <button onClick={() => setToastMsg("")} className="text-slate-400 hover:text-white ml-2"><X className="w-4 h-4" /></button>
        </div>
      )}
      {loading && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[100] flex flex-col items-center justify-center">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
          <p className="text-sm font-bold text-slate-700">{loadingMsg}</p>
        </div>
      )}

      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 px-4 py-4 shadow-xs sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-900 flex items-center justify-center transform rotate-45">
              <Users className="w-4.5 h-4.5 text-white transform -rotate-45" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">멘토-멘티 매칭 현황</h1>
              <div className="text-[10px] font-bold text-slate-500 mt-0.5">
                권한: <span className={userRole === 'admin' ? "text-indigo-600" : "text-emerald-600"}>{userRole === 'admin' ? '관리자 (수정 가능)' : '일반 사용자 (조회 전용)'}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {userRole === 'admin' && (
              <button onClick={() => {
                import('./db/sheets').then(({ clearSpreadsheetId }) => {
                  clearSpreadsheetId();
                  window.location.reload();
                });
              }} className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1.5 px-3 py-1.5 border border-red-200 bg-red-50 cursor-pointer">
                시트 연결 해제
              </button>
            )}
            <button onClick={() => loadDatabase(userRole === 'viewer')} className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 bg-white cursor-pointer">
              <RefreshCw className="w-3.5 h-3.5" /> 동기화
            </button>
            <button onClick={userRole === 'admin' ? handleLogout : handleAdminLoginFromViewer} className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 bg-white cursor-pointer">
              {userRole === 'admin' ? (
                <><LogOut className="w-3.5 h-3.5" /> 로그아웃</>
              ) : (
                <><LogIn className="w-3.5 h-3.5" /> 관리자 로그인</>
              )}
            </button>
          </div>
        </div>
      </nav>

      {userRole === 'admin' && (
        <div className="bg-indigo-50 border-b border-indigo-100 px-4 py-2 text-center">
          <p className="text-[11px] font-bold text-indigo-700 max-w-7xl mx-auto flex items-center justify-center gap-2">
            <span className="bg-indigo-600 text-white px-1.5 py-0.5 rounded-sm">안내</span>
            일반 사용자가 로그인 없이 데이터를 조회하려면 구글 시트의 공유 설정을 '링크가 있는 모든 사용자(뷰어)'로 변경해주세요. (현재 시트 ID: {getSpreadsheetId()})
          </p>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900">매칭 현황판 (Google Sheets 연동)</h2>
            <p className="text-xs text-slate-500 mt-1">1:3 매칭 및 다중 분야 멘토링 현황을 체계적으로 관리합니다.</p>
          </div>
          {userRole === 'admin' && (
            <div className="flex gap-2">
              <button onClick={handleDownloadSampleCSV} className="inline-flex items-center gap-1 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 px-3 py-2 text-sm font-bold shadow-xs cursor-pointer">
                <Download className="w-3.5 h-3.5" /> 샘플 양식
              </button>
              <label className="inline-flex items-center gap-1 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 px-3 py-2 text-sm font-bold shadow-xs cursor-pointer">
                <Upload className="w-3.5 h-3.5" /> 일괄 업로드
                <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
              </label>
              <button onClick={() => setShowAddMatchModal(true)} className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 text-sm font-bold shadow-xs cursor-pointer">
                <Plus className="w-4 h-4 stroke-[3]" /> 신규 매칭 등록
              </button>
            </div>
          )}
        </div>

        {/* Stats */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 border border-slate-200 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-slate-900"></div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">총 매칭 건수</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1.5 font-mono">{matches.length}<span className="text-sm font-bold text-slate-400 ml-1">건</span></p>
          </div>
          <div className="bg-white p-4 border border-slate-200 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-600"></div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">진행 중 멘토링</p>
            <p className="text-2xl font-extrabold text-indigo-600 mt-1.5 font-mono">{matches.filter(m => m.status === '진행 중').length}<span className="text-xs text-slate-400 ml-1">진행</span></p>
          </div>
          <div className="bg-white p-4 border border-slate-200 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">활동 기록 수</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1.5 font-mono">{activities.length}<span className="text-xs text-slate-400 ml-1">회</span></p>
          </div>
          <div className="bg-white p-4 border border-slate-200 relative overflow-hidden flex flex-col justify-center">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest font-mono">등록 현황</p>
            <div className="text-sm font-bold text-slate-700 mt-1">멘토: {mentors.length}명 / 멘티: {mentees.length}명</div>
          </div>
        </section>

        {/* Filters */}
        <section className="bg-white p-4 border border-slate-200 mb-6 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
            <div className="flex-1 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Search className="w-4 h-4" />
                </span>
                <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="이름, 매칭분야 검색..." className="w-full pl-9 pr-4 py-2 border border-slate-200 text-sm bg-slate-50 focus:bg-white outline-none" />
              </div>
              <select value={fieldFilter} onChange={(e) => setFieldFilter(e.target.value)} className="w-full sm:w-52 px-3 py-2 border border-slate-200 text-sm bg-white outline-none cursor-pointer">
                {allFields.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div className="flex gap-1 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
              {["전체", ...matchStatuses].map(status => (
                <button key={status} onClick={() => setStatusFilter(status)} className={`px-3 py-1.5 text-sm font-bold transition-all border cursor-pointer ${statusFilter === status ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'}`}>
                  {status}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-2 items-start md:items-center border-t border-slate-100 pt-3">
            <span className="text-xs font-bold text-slate-500 min-w-[80px]">계획서 상태</span>
            <div className="flex flex-wrap gap-1">
              {planStatuses.map(status => {
                const isActive = planStatusFilter.includes(status);
                return (
                  <button key={status} onClick={() => togglePlanStatusFilter(status)} className={`px-3 py-1 text-xs font-bold transition-all border cursor-pointer ${isActive ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'}`}>
                    {status} ({planStatusCounts[status]})
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <section className="lg:col-span-5 bg-white border border-slate-200">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <h3 className="text-sm font-extrabold uppercase tracking-widest text-slate-400">매칭 목록 ({filteredMatches.length})</h3>
            </div>
            <div className="divide-y divide-slate-100 max-h-[700px] overflow-y-auto">
              {filteredMatches.map(match => (
                <div key={match.id} onClick={() => setSelectedMatchId(match.id)} className={`px-4 py-4 cursor-pointer hover:bg-slate-50 transition-all ${match.id === selectedMatchId ? 'bg-indigo-50/50 border-l-2 border-l-indigo-600 pl-[14px]' : ''}`}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-mono text-sm font-bold text-slate-500">{match.id} <span className="text-[10px] bg-slate-100 px-1 py-0.5 ml-1">{match.field}</span></span>
                    <div className="flex gap-1">
                      <span className={`text-[11px] font-extrabold border px-1.5 py-0.5 ${getPlanStatusColor(match.planStatus)}`}>{match.planStatus}</span>
                      <span className={`text-[11px] font-extrabold border px-1.5 py-0.5 ${getMatchStatusColor(match.status)}`}>{match.status}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm font-bold">
                    <div className="text-indigo-700">멘토: {match.mentor.name}</div>
                    <div className="text-emerald-700">멘티: {match.mentee.name} {match.mentee.type === '팀' && <span className="text-xs bg-emerald-100 text-emerald-800 px-1 py-0.5 ml-1">팀</span>}</div>
                  </div>
                  <div className="mt-2 text-xs text-[#969696] font-mono">기본: {match.baseCount}회 | 추가: {match.extraCount}회 | 진행: {match.actCount}회</div>
                </div>
              ))}
              {filteredMatches.length === 0 && <div className="p-8 text-center text-sm text-slate-400">매칭 데이터가 없습니다.</div>}
            </div>
          </section>

          <section className="lg:col-span-7 flex flex-col gap-6">
            {selectedMatch ? (
              <div className="space-y-6">
                <div className="bg-slate-900 text-white p-5">
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs font-mono font-bold tracking-widest text-indigo-400">{selectedMatch.id} - {selectedMatch.field}</span>
                    <div className="flex items-center gap-2">
                      {selectedMatch.mentee.type === '팀' && (
                        <label className="flex items-center gap-1.5 text-xs font-bold text-slate-300 cursor-pointer bg-slate-800 px-2 py-1">
                          <input type="checkbox" checked={applyToTeam} onChange={(e) => setApplyToTeam(e.target.checked)} className="cursor-pointer" />
                          팀 전체 동시 적용
                        </label>
                      )}
                      {userRole === 'admin' && (
                        <button onClick={() => setShowDeleteConfirmModal(true)} className="text-xs font-bold bg-rose-900/50 text-rose-300 hover:bg-rose-900 px-2 py-1 transition-colors">
                          매칭 삭제
                        </button>
                      )}
                    </div>
                  </div>
                  <h3 className="text-lg font-extrabold mt-1">상세 현황 및 관리</h3>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs mt-4">
                    <div>
                      <label className="block text-[11px] text-slate-400 uppercase font-mono mb-1">매칭 상태</label>
                      {userRole === 'admin' ? (
                        <select value={selectedMatch.status} onChange={(e) => updateMatch(selectedMatch.id, m => ({ ...m, status: e.target.value as MatchStatusType }))} className="w-full bg-slate-800 border border-slate-700 text-white px-2 py-1.5 outline-none font-bold text-sm">
                          {matchStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      ) : (
                        <div className="w-full bg-slate-800 border border-slate-700 text-white px-2 py-1.5 font-bold text-sm">{selectedMatch.status}</div>
                      )}
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 uppercase font-mono mb-1">계획서 상태</label>
                      {userRole === 'admin' ? (
                        <select value={selectedMatch.planStatus} onChange={(e) => updateMatch(selectedMatch.id, m => ({ ...m, planStatus: e.target.value as PlanStatusType }))} className="w-full bg-indigo-900 border border-indigo-700 text-indigo-100 px-2 py-1.5 outline-none font-bold text-sm">
                          {planStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      ) : (
                        <div className="w-full bg-indigo-900 border border-indigo-700 text-indigo-100 px-2 py-1.5 font-bold text-sm">{selectedMatch.planStatus}</div>
                      )}
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 uppercase font-mono mb-1">기본 배정</label>
                      {userRole === 'admin' ? (
                        <input type="number" value={selectedMatch.baseCount} onChange={(e) => updateMatch(selectedMatch.id, m => ({ ...m, baseCount: parseInt(e.target.value) || 0 }))} className="w-full bg-slate-800 border border-slate-700 text-white px-2 py-1.5 outline-none font-bold text-sm" />
                      ) : (
                        <div className="w-full bg-slate-800 border border-slate-700 text-white px-2 py-1.5 font-bold text-sm">{selectedMatch.baseCount}회</div>
                      )}
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 uppercase font-mono mb-1">개인 추가 배정</label>
                      {userRole === 'admin' ? (
                        <input type="number" value={selectedMatch.extraCount} onChange={(e) => updateMatch(selectedMatch.id, m => ({ ...m, extraCount: parseInt(e.target.value) || 0 }))} className="w-full bg-slate-800 border border-slate-700 text-white px-2 py-1.5 outline-none font-bold text-sm" />
                      ) : (
                        <div className="w-full bg-slate-800 border border-slate-700 text-white px-2 py-1.5 font-bold text-sm">{selectedMatch.extraCount}회</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 p-5">
                  <h4 className="text-sm font-extrabold uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-2 mb-3">인적 사항</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5 border-l-2 border-indigo-200 pl-3">
                      <div className="text-sm font-bold text-indigo-700">멘토: {selectedMatch.mentor.name}</div>
                      <div className="text-xs text-slate-600 font-mono"><Phone className="inline w-3 h-3 mr-1" />{selectedMatch.mentor.phone}</div>
                    </div>
                    <div className="space-y-1.5 border-l-2 border-emerald-200 pl-3">
                      <div className="text-sm font-bold text-emerald-700">멘티: {selectedMatch.mentee.name} {selectedMatch.mentee.type === '팀' && <span className="text-xs bg-emerald-100 text-emerald-800 px-1 py-0.5 ml-1">팀</span>}</div>
                      <div className="text-xs text-slate-600 font-mono"><Phone className="inline w-3 h-3 mr-1" />{selectedMatch.mentee.phone}</div>
                      {selectedMatch.mentee.type === '팀' && selectedMatch.mentee.teamCode && selectedMatch.mentee.teamCode.length > 0 && (
                        <div className="mt-2 text-xs text-slate-500 border-t border-emerald-100 pt-1">
                          <div className="font-bold mb-1">같은 팀 구성원</div>
                          {mentees.filter(m => m.teamCode && m.teamCode.some(tc => selectedMatch.mentee.teamCode.includes(tc)) && m.id !== selectedMatch.mentee.id).map((m, idx) => (
                            <div key={idx} className="flex gap-2">
                              <span className="text-sm">- {m.name}</span>
                              <span className="font-mono text-xs">{m.phone}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 p-5">
                  <h4 className="text-sm font-extrabold uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-2 mb-3">특이사항 및 CS 내역 (VOC)</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-sm font-bold text-indigo-700">멘토 ({selectedMatch.mentor.name}) 특이사항</label>
                        {userRole === 'admin' && (
                          <button 
                            onClick={() => {
                              if (isEditingMentorDetail) {
                                updateMentorDetail(selectedMatch.mentor.id, editingMentorDetail);
                                setIsEditingMentorDetail(false);
                              } else {
                                setEditingMentorDetail(selectedMatch.mentor.detail);
                                setIsEditingMentorDetail(true);
                              }
                            }}
                            className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800"
                          >
                            {isEditingMentorDetail ? '저장' : '편집'}
                          </button>
                        )}
                      </div>
                      {isEditingMentorDetail ? (
                        <textarea 
                          value={editingMentorDetail}
                          onChange={(e) => setEditingMentorDetail(e.target.value)}
                          placeholder="특이사항, 이슈, CS 내역을 입력하세요."
                          className="w-full border border-slate-200 p-2 text-sm bg-slate-50 focus:bg-white outline-none min-h-[80px]"
                        />
                      ) : (
                        <div className="w-full border border-slate-100 bg-slate-50 p-2 text-sm text-slate-700 min-h-[80px] whitespace-pre-wrap">
                          {selectedMatch.mentor.detail || "등록된 특이사항이 없습니다."}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-sm font-bold text-emerald-700">멘티 ({selectedMatch.mentee.name}) 특이사항</label>
                        {userRole === 'admin' && (
                          <button 
                            onClick={() => {
                              if (isEditingMenteeDetail) {
                                updateMenteeDetail(selectedMatch.mentee.id, editingMenteeDetail);
                                setIsEditingMenteeDetail(false);
                              } else {
                                setEditingMenteeDetail(selectedMatch.mentee.detail);
                                setIsEditingMenteeDetail(true);
                              }
                            }}
                            className="text-[11px] font-bold text-emerald-600 hover:text-emerald-800"
                          >
                            {isEditingMenteeDetail ? '저장' : '편집'}
                          </button>
                        )}
                      </div>
                      {isEditingMenteeDetail ? (
                        <textarea 
                          value={editingMenteeDetail}
                          onChange={(e) => setEditingMenteeDetail(e.target.value)}
                          placeholder="특이사항, 이슈, CS 내역을 입력하세요."
                          className="w-full border border-slate-200 p-2 text-sm bg-slate-50 focus:bg-white outline-none min-h-[80px]"
                        />
                      ) : (
                        <div className="w-full border border-slate-100 bg-slate-50 p-2 text-sm text-slate-700 min-h-[80px] whitespace-pre-wrap">
                          {selectedMatch.mentee.detail || "등록된 특이사항이 없습니다."}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 p-5">
                  <h4 className="text-sm font-extrabold uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-2 mb-3 flex justify-between items-center">
                    <span>수행일지 ({selectedMatchActivities.length}건)</span>
                    {userRole === 'admin' && (
                      <div className="flex gap-2 items-center">
                        {selectedMatch.mentee.type === '팀' && (
                          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 mr-2 cursor-pointer bg-slate-100 px-2 py-1">
                            <input type="checkbox" checked={applyToTeam} onChange={(e) => setApplyToTeam(e.target.checked)} className="cursor-pointer" />
                            팀 전체 동시 적용
                          </label>
                        )}
                        <button onClick={handleDownloadActivitySampleCSV} className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-700 cursor-pointer text-xs font-medium">
                          <Download className="w-3 h-3" /> 샘플
                        </button>
                        <label className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-700 cursor-pointer text-xs font-medium">
                          <Upload className="w-3 h-3" /> 일괄업로드
                          <input type="file" accept=".csv" className="hidden" onChange={handleActivityFileUpload} />
                        </label>
                        <button onClick={() => setShowAddActivityForm(!showAddActivityForm)} className="text-indigo-600 hover:text-indigo-800 cursor-pointer text-sm font-bold ml-2">
                          {showAddActivityForm ? "취소" : "작성"}
                        </button>
                      </div>
                    )}
                  </h4>
                  
                  {showAddActivityForm && (
                    <form onSubmit={handleAddActivity} className="mb-4 p-4 border border-slate-200 bg-slate-50 space-y-3">
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-sm font-bold text-slate-500 mb-1">회차 (선택)</label>
                          <input type="text" value={newActSessionNum} onChange={(e) => setNewActSessionNum(e.target.value)} placeholder="예: 1, 1-1" className="w-full px-2 py-1.5 text-sm border border-slate-300 bg-white" />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-500 mb-1">예정일</label>
                          <input type="date" required value={newActPlannedDate} onChange={(e) => setNewActPlannedDate(e.target.value)} className="w-full px-2 py-1.5 text-sm border border-slate-300 bg-white" />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-500 mb-1">실시일</label>
                          <input type="date" value={newActActualDate} onChange={(e) => setNewActActualDate(e.target.value)} className="w-full px-2 py-1.5 text-sm border border-slate-300 bg-white" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <label className="block text-sm font-bold text-slate-500 mb-1">시작 시간</label>
                            <input type="time" value={newActStartTime} onChange={(e) => setNewActStartTime(e.target.value)} className="w-full px-2 py-1.5 text-sm border border-slate-300 bg-white" />
                          </div>
                          <div className="flex-1">
                            <label className="block text-sm font-bold text-slate-500 mb-1">종료 시간</label>
                            <input type="time" value={newActEndTime} onChange={(e) => setNewActEndTime(e.target.value)} className="w-full px-2 py-1.5 text-sm border border-slate-300 bg-white" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-500 mb-1">장소</label>
                          <input type="text" required value={newActPlace} onChange={(e) => setNewActPlace(e.target.value)} placeholder="장소" className="w-full px-2 py-1.5 text-sm border border-slate-300 bg-white" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-bold text-slate-500 mb-1">상태</label>
                          <select value={newActStatus} onChange={(e) => setNewActStatus(e.target.value as '예정' | '완료')} className="w-full px-2 py-1.5 text-sm border border-slate-300 bg-white">
                            <option value="예정">예정</option>
                            <option value="완료">완료</option>
                          </select>
                        </div>
                        <div className="flex flex-col justify-end">
                          <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer h-[34px]">
                            <input type="checkbox" checked={newActInspected} onChange={(e) => setNewActInspected(e.target.checked)} className="w-4 h-4 text-indigo-600 cursor-pointer" />
                            현장 점검 완료
                          </label>
                        </div>
                      </div>
                      {newActInspected && (
                        <div>
                          <label className="block text-sm font-bold text-slate-500 mb-1">현장 점검 담당자</label>
                          <input type="text" value={newActInspectorName} onChange={(e) => setNewActInspectorName(e.target.value)} placeholder="담당자 이름" className="w-full px-2 py-1.5 text-sm border border-slate-300 bg-white" />
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-bold text-slate-500 mb-1">활동 내용</label>
                        <textarea rows={2} required value={newActDesc} onChange={(e) => setNewActDesc(e.target.value)} placeholder="활동 내용" className="w-full px-2 py-1.5 text-sm border border-slate-300 bg-white"></textarea>
                      </div>
                      <div className="flex justify-end pt-2">
                        <button type="submit" className="px-4 py-1.5 text-sm font-bold bg-slate-900 text-white cursor-pointer hover:bg-slate-800">저장</button>
                      </div>
                    </form>
                  )}

                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {selectedMatchActivities.length === 0 && <div className="text-center py-4 text-sm text-slate-400">일지가 없습니다.</div>}
                    {selectedMatchActivities.map(act => (
                      <div key={act.id} className="p-3 border border-slate-100 bg-slate-50 text-sm">
                        {editingActivityId === act.id && userRole === 'admin' ? (
                          <div className="space-y-3 bg-white p-3 border border-indigo-200">
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <label className="block text-[11px] font-bold text-slate-500 mb-1">회차</label>
                                <input type="text" value={editingActivity.sessionNum || ''} onChange={(e) => setEditingActivity({...editingActivity, sessionNum: e.target.value})} className="w-full px-2 py-1 text-xs border border-slate-300" />
                              </div>
                              <div>
                                <label className="block text-[11px] font-bold text-slate-500 mb-1">예정일</label>
                                <input type="date" value={editingActivity.plannedDate || ''} onChange={(e) => setEditingActivity({...editingActivity, plannedDate: e.target.value})} className="w-full px-2 py-1 text-xs border border-slate-300" />
                              </div>
                              <div>
                                <label className="block text-[11px] font-bold text-slate-500 mb-1">실시일</label>
                                <input type="date" value={editingActivity.actualDate || ''} onChange={(e) => setEditingActivity({...editingActivity, actualDate: e.target.value})} className="w-full px-2 py-1 text-xs border border-slate-300" />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="flex gap-2">
                                <div className="flex-1">
                                  <label className="block text-[11px] font-bold text-slate-500 mb-1">시작</label>
                                  <input type="time" value={editingActivity.startTime || ''} onChange={(e) => setEditingActivity({...editingActivity, startTime: e.target.value})} className="w-full px-2 py-1 text-xs border border-slate-300" />
                                </div>
                                <div className="flex-1">
                                  <label className="block text-[11px] font-bold text-slate-500 mb-1">종료</label>
                                  <input type="time" value={editingActivity.endTime || ''} onChange={(e) => setEditingActivity({...editingActivity, endTime: e.target.value})} className="w-full px-2 py-1 text-xs border border-slate-300" />
                                </div>
                              </div>
                              <div>
                                <label className="block text-[11px] font-bold text-slate-500 mb-1">장소</label>
                                <input type="text" value={editingActivity.place || ''} onChange={(e) => setEditingActivity({...editingActivity, place: e.target.value})} className="w-full px-2 py-1 text-xs border border-slate-300" />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[11px] font-bold text-slate-500 mb-1">상태</label>
                                <select value={editingActivity.status || '예정'} onChange={(e) => setEditingActivity({...editingActivity, status: e.target.value as '예정' | '완료'})} className="w-full px-2 py-1 text-xs border border-slate-300">
                                  <option value="예정">예정</option>
                                  <option value="완료">완료</option>
                                </select>
                              </div>
                              <div className="flex gap-2">
                                <label className="flex items-center gap-1 text-[11px] font-bold text-slate-500 mt-5 cursor-pointer">
                                  <input type="checkbox" checked={editingActivity.inspected || false} onChange={(e) => setEditingActivity({...editingActivity, inspected: e.target.checked})} className="cursor-pointer" />
                                  현장점검
                                </label>
                                <div className="flex-1">
                                  <label className="block text-[11px] font-bold text-slate-500 mb-1">점검자</label>
                                  <input type="text" value={editingActivity.inspectorName || ''} onChange={(e) => setEditingActivity({...editingActivity, inspectorName: e.target.value})} className="w-full px-2 py-1 text-xs border border-slate-300" disabled={!editingActivity.inspected} />
                                </div>
                              </div>
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-500 mb-1">활동 내용</label>
                              <textarea value={editingActivity.description || ''} onChange={(e) => setEditingActivity({...editingActivity, description: e.target.value})} className="w-full px-2 py-1 text-xs border border-slate-300 min-h-[60px]" />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                              <button onClick={() => setEditingActivityId(null)} className="px-3 py-1 text-xs font-bold text-slate-600 border border-slate-300 bg-white hover:bg-slate-50">취소</button>
                              <button onClick={() => updateActivity(act.id, { ...act, ...editingActivity } as ActivityLog)} className="px-3 py-1 text-xs font-bold text-white bg-indigo-600 border border-indigo-700 hover:bg-indigo-700">저장</button>
                            </div>
                          </div>
                        ) : (
                          <div 
                            className={userRole === 'admin' ? "cursor-pointer hover:bg-slate-100 p-1 -m-1 transition-colors rounded" : ""}
                            onClick={() => {
                              if (userRole === 'admin') {
                                setEditingActivityId(act.id);
                                setEditingActivity({...act});
                              }
                            }}
                          >
                            <div className="flex justify-between font-bold mb-2">
                              <div className="flex items-center gap-2">
                                <span className={`px-1.5 py-0.5 text-[10px] border ${act.status === '완료' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-slate-200 text-slate-600 border-slate-300'}`}>{act.status}</span>
                                {act.sessionNum !== undefined && <span className="px-1.5 py-0.5 text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-200">{act.sessionNum}회차</span>}
                                <span className="font-mono text-slate-700 text-[12px]">예정: {act.plannedDate || '미정'}</span>
                                {act.actualDate && <span className="font-mono text-indigo-600 border-l border-slate-300 pl-2 text-[12px]">실시: {act.actualDate}</span>}
                              </div>
                              {act.inspected && <span className="text-[11px] bg-amber-100 text-amber-800 px-1 border border-amber-200" title={act.inspectorName ? `담당자: ${act.inspectorName}` : ''}>현장점검 {act.inspectorName && `(${act.inspectorName})`}</span>}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-600 mb-2">
                              {(act.startTime || act.endTime) && (
                                <span className="font-mono bg-white px-1 border border-slate-200 rounded text-[13px]">
                                  {act.startTime || '?'} ~ {act.endTime || '?'}
                                </span>
                              )}
                              <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-400" /> {act.place}</span>
                            </div>
                            <p className="text-slate-800 bg-white p-2 border border-slate-100 whitespace-pre-wrap">{act.description}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 p-8 text-center text-slate-400 text-sm">좌측 목록에서 매칭을 선택하세요.</div>
            )}
          </section>
        </div>
      </main>

      {/* Delete Match Confirm Modal */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-2">매칭 삭제</h3>
            <p className="text-sm text-slate-600 mb-6">
              이 매칭을 정말 삭제하시겠습니까?<br/>
              (팀 단위 적용시 동일 팀 매칭도 함께 삭제됩니다)
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowDeleteConfirmModal(false)} className="px-4 py-2 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer">
                취소
              </button>
              <button onClick={() => {
                setShowDeleteConfirmModal(false);
                handleDeleteMatch(selectedMatchId);
              }} className="px-4 py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 cursor-pointer shadow-sm shadow-rose-900/20">
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Match Modal */}
      {showAddMatchModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-2xl w-full relative shadow-2xl">
            <button onClick={() => setShowAddMatchModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 cursor-pointer"><X className="w-5 h-5" /></button>
            <div className="p-5 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-extrabold text-slate-900">신규 매칭 등록</h3>
            </div>
            <form onSubmit={handleCreateMatch} className="p-5 space-y-5 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">매칭 분야</label>
                <div className="grid grid-cols-4 gap-2">
                  {allFields.filter(f => f !== "전체").map(f => (
                    <label key={f} className={`text-center py-2 border-2 cursor-pointer text-xs font-bold ${newMatchField === f ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-600'}`}>
                      <input type="radio" name="field" value={f} checked={newMatchField === f} onChange={(e) => setNewMatchField(e.target.value)} className="sr-only" />
                      {f}
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="text-xs font-extrabold text-indigo-600">멘토 정보</h4>
                  <input type="text" required value={newMentorName} onChange={e => setNewMentorName(e.target.value)} placeholder="이름 *" className="w-full px-3 py-2 border border-slate-300 outline-none focus:border-indigo-500 text-xs" />
                  <input type="text" required value={newMentorPhone} onChange={e => setNewMentorPhone(e.target.value)} placeholder="연락처 *" className="w-full px-3 py-2 border border-slate-300 outline-none focus:border-indigo-500 text-xs" />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-extrabold text-emerald-600">멘티 정보</h4>
                    <div className="flex gap-2">
                      <label className="text-[10px] font-bold text-slate-600 flex items-center gap-1 cursor-pointer">
                        <input type="radio" checked={newMenteeType === '개인'} onChange={() => {
                          setNewMenteeType('개인');
                          setNewMentees([newMentees[0]]);
                        }} className="cursor-pointer" /> 개인
                      </label>
                      <label className="text-[10px] font-bold text-slate-600 flex items-center gap-1 cursor-pointer">
                        <input type="radio" checked={newMenteeType === '팀'} onChange={() => setNewMenteeType('팀')} className="cursor-pointer" /> 팀
                      </label>
                    </div>
                  </div>
                  {newMentees.map((mentee, idx) => (
                    <div key={idx} className="space-y-2 relative border border-slate-200 bg-slate-50 p-3">
                      {newMenteeType === '팀' && (
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] font-bold text-slate-500">팀원 {idx + 1}</span>
                          {idx > 0 && (
                            <button type="button" onClick={() => setNewMentees(newMentees.filter((_, i) => i !== idx))} className="text-slate-400 hover:text-red-500"><X className="w-3 h-3" /></button>
                          )}
                        </div>
                      )}
                      <input type="text" required={idx === 0} value={mentee.name} onChange={e => {
                        const newM = [...newMentees]; newM[idx].name = e.target.value; setNewMentees(newM);
                      }} placeholder="이름 *" className="w-full px-3 py-2 border border-slate-300 outline-none focus:border-emerald-500 text-xs bg-white" />
                      <input type="text" required={idx === 0} value={mentee.phone} onChange={e => {
                        const newM = [...newMentees]; newM[idx].phone = e.target.value; setNewMentees(newM);
                      }} placeholder="연락처 *" className="w-full px-3 py-2 border border-slate-300 outline-none focus:border-emerald-500 text-xs bg-white" />
                    </div>
                  ))}
                  {newMenteeType === '팀' && newMentees.length < 10 && (
                    <button type="button" onClick={() => setNewMentees([...newMentees, {name: '', phone: ''}])} className="w-full py-2 border border-dashed border-slate-300 text-slate-500 text-xs font-bold hover:bg-slate-50 hover:text-emerald-600 transition-colors">
                      + 팀원 추가
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">기본 배정 횟수</label>
                  <input type="number" required value={newMatchBaseCount} onChange={e => setNewMatchBaseCount(parseInt(e.target.value) || 0)} className="w-full px-3 py-2 border border-slate-300 outline-none text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">추가 요청 횟수</label>
                  <input type="number" required value={newMatchExtraCount} onChange={e => setNewMatchExtraCount(parseInt(e.target.value) || 0)} className="w-full px-3 py-2 border border-slate-300 outline-none text-xs" />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => setShowAddMatchModal(false)} className="px-4 py-2 text-xs font-bold bg-slate-100 text-slate-600 cursor-pointer hover:bg-slate-200">취소</button>
                <button type="submit" className="px-4 py-2 text-xs font-bold bg-slate-900 text-white cursor-pointer hover:bg-slate-800">저장 및 매칭 추가</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
