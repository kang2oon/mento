import sys

content = open("src/App.tsx").read()
to_replace = """          <div className="space-y-3">
            <button onClick={handleLogin} disabled={isLoggingIn} className="w-full relative flex items-center justify-center gap-3 px-4 py-3 bg-slate-900 text-white font-bold hover:bg-slate-800 transition-all focus:outline-none cursor-pointer">"""

new_replace = """          <div className="space-y-3">
            <input type="text" value={inputSid} onChange={(e) => setInputSid(e.target.value)} placeholder="구글 시트 ID (공유받은 경우 입력)" className="w-full px-4 py-3 border border-slate-300 outline-none focus:border-slate-500 text-sm font-mono text-center mb-4" />
            <button onClick={handleLogin} disabled={isLoggingIn} className="w-full relative flex items-center justify-center gap-3 px-4 py-3 bg-slate-900 text-white font-bold hover:bg-slate-800 transition-all focus:outline-none cursor-pointer">"""

content = content.replace(to_replace, new_replace)
open("src/App.tsx", "w").write(content)
