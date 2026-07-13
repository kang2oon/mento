const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
const toInsert = `  const handleDeleteMatch = async (id: string) => {
    if (!window.confirm("이 매칭을 정말 삭제하시겠습니까? (팀 단위 적용시 동일 팀 매칭도 함께 삭제됩니다)")) return;

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
      showToast("매칭 삭제 실패");
    } finally {
      setLoading(false);
    }
  };
`;
code = code.replace("  const getMatchMentor =", toInsert + "\n  const getMatchMentor =");
fs.writeFileSync('src/App.tsx', code);
