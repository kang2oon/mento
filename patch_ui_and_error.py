import sys

content = open("src/App.tsx").read()

to_replace_1 = """          <div className="space-y-3">
            <input type="text" value={inputSid} onChange={(e) => setInputSid(e.target.value)} placeholder="구글 시트 ID (공유받은 경우 입력)" className="w-full px-4 py-3 border border-slate-300 outline-none focus:border-slate-500 text-sm font-mono text-center mb-4" />
            <button onClick={handleLogin} disabled={isLoggingIn} className="w-full relative flex items-center justify-center gap-3 px-4 py-3 bg-slate-900 text-white font-bold hover:bg-slate-800 transition-all focus:outline-none cursor-pointer">"""

new_replace_1 = """          <div className="space-y-3">
            <input type="hidden" value={inputSid} />
            <button onClick={handleLogin} disabled={isLoggingIn} className="w-full relative flex items-center justify-center gap-3 px-4 py-3 bg-slate-900 text-white font-bold hover:bg-slate-800 transition-all focus:outline-none cursor-pointer">"""

content = content.replace(to_replace_1, new_replace_1)

to_replace_2 = """    } catch (err) {
      console.error("Login error:", err);
      const errMsg = err instanceof Error ? err.message : String(err);
      showToast(`로그인 실패: ${errMsg}`);
    } finally {"""

new_replace_2 = """    } catch (err) {
      console.error("Login error:", err);
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes('popup-closed-by-user')) {
        showToast("로그인 팝업이 닫혔습니다. 브라우저 팝업 차단을 해제하거나 다시 시도해주세요.");
      } else {
        showToast("로그인 실패: 앱 생성 계정으로 로그인하시거나, GCP에서 테스터로 등록해야 합니다.");
      }
    } finally {"""

content = content.replace(to_replace_2, new_replace_2)

open("src/App.tsx", "w").write(content)
