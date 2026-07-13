import sys

content = open("src/App.tsx").read()
to_replace = """                    {selectedMatchActivities.map(act => (
                      <div key={act.id} className="p-3 border border-slate-100 bg-slate-50 text-sm">
                        <div className="flex justify-between font-bold mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`px-1.5 py-0.5 text-[10px] border ${act.status === '완료' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-slate-200 text-slate-600 border-slate-300'}`}>{act.status}</span>
                            {act.sessionNum !== undefined && <span className="px-1.5 py-0.5 text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-200">{act.sessionNum}회차</span>}
                            <span className="font-mono text-slate-700">예정: {act.plannedDate || '미정'}</span>
                            {act.actualDate && <span className="font-mono text-indigo-600 border-l border-slate-300 pl-2">실시: {act.actualDate}</span>}
                          </div>
                          {act.inspected && <span className="text-[11px] bg-amber-100 text-amber-800 px-1 border border-amber-200" title={act.inspectorName ? `담당자: ${act.inspectorName}` : ''}>현장점검 {act.inspectorName && `(${act.inspectorName})`}</span>}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-600 mb-2">
                          {(act.startTime || act.endTime) && (
                            <span className="font-mono bg-white px-1 border border-slate-200 rounded">
                              {act.startTime || '?'} ~ {act.endTime || '?'}
                            </span>
                          )}
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-400" /> {act.place}</span>
                        </div>
                        <p className="text-slate-800 bg-white p-2 border border-slate-100 whitespace-pre-wrap">{act.description}</p>
                      </div>
                    ))}"""

new_replace = """                    {selectedMatchActivities.map(act => (
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
                    ))}"""

if "editingActivityId === act.id" not in content:
    content = content.replace(to_replace, new_replace)
    open("src/App.tsx", "w").write(content)

