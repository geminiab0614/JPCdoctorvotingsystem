import React, { useState, useEffect } from 'react';
import { Doctor, Vote, SystemConfig, ROLES, THEMES, ThemeOption } from '../types';
import * as FirebaseService from '../services/firebase';
import { Users, Calendar, Settings, FileText, Trash2, LogOut, AlertTriangle, RefreshCw, Eye } from 'lucide-react';

interface Props {
  config: SystemConfig;
  onLogout: () => void;
  onConfigUpdate: () => void;
}

const AdminDashboard: React.FC<Props> = ({ config, onLogout, onConfigUpdate }) => {
  const [activeTab, setActiveTab] = useState<'results' | 'doctors' | 'settings'>('results');
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(false);

  // History Filter State
  const [viewYear, setViewYear] = useState(config.currentYear);
  const [viewMonth, setViewMonth] = useState(config.currentMonth);

  // Settings State
  const [editYear, setEditYear] = useState(config.currentYear);
  const [editMonth, setEditMonth] = useState(config.currentMonth);
  const [votingStart, setVotingStart] = useState(config.votingStart || { year: config.currentYear, month: config.currentMonth, day: 1 });
  const [votingEnd, setVotingEnd] = useState(config.votingEnd || { year: config.currentYear, month: config.currentMonth, day: 15 });
  const [selectedTheme, setSelectedTheme] = useState<ThemeOption>(config.theme || 'blue');
  const [newPassword, setNewPassword] = useState('');
  
  // Doctor Management State
  const [newDocName, setNewDocName] = useState('');
  const [newDocRole, setNewDocRole] = useState<'attending' | 'resident'>(ROLES.RESIDENT);

  // Delete Confirmation
  const [deleteTarget, setDeleteTarget] = useState<{id: string, name: string, type: 'doctor' | 'vote'} | null>(null);

  useEffect(() => {
    loadData();
  }, [activeTab, viewYear, viewMonth]);

  const loadData = async () => {
    setLoading(true);
    try {
      const docs = await FirebaseService.getDoctors();
      docs.sort((a, b) => a.name.localeCompare(b.name, 'zh-TW'));
      setDoctors(docs);

      if (activeTab === 'results') {
        const vs = await FirebaseService.getVotesByDate(viewYear, viewMonth);
        setVotes(vs);
      }
    } catch (e) {
      console.error(e);
      alert('資料讀取失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDoctor = async () => {
    if (!newDocName.trim()) return;
    if (doctors.some(d => d.name === newDocName && d.role === newDocRole)) {
      alert('該醫師已在名單中');
      return;
    }
    await FirebaseService.addDoctor(newDocName.trim(), newDocRole);
    setNewDocName('');
    loadData();
  };

  const confirmDelete = (id: string, name: string, type: 'doctor' | 'vote') => {
    setDeleteTarget({ id, name, type });
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'doctor') {
        await FirebaseService.deleteDoctor(deleteTarget.id);
      } else {
        await FirebaseService.deleteVote(deleteTarget.id);
      }
      setDeleteTarget(null);
      await loadData();
    } catch (error) {
      console.error("Delete failed:", error);
      alert('刪除失敗，請稍後再試。');
    }
  };

  const handleUpdateSettings = async () => {
    if (editMonth < 1 || editMonth > 12) { alert('投票月份錯誤'); return; }
    if (votingStart.month < 1 || votingStart.month > 12 || votingStart.day < 1 || votingStart.day > 31) { alert('開始日期錯誤'); return; }
    if (votingEnd.month < 1 || votingEnd.month > 12 || votingEnd.day < 1 || votingEnd.day > 31) { alert('結束日期錯誤'); return; }

    const updatedConfig: SystemConfig = {
      ...config,
      currentYear: Number(editYear),
      currentMonth: Number(editMonth),
      theme: selectedTheme,
      votingStart: { year: Number(votingStart.year), month: Number(votingStart.month), day: Number(votingStart.day) },
      votingEnd: { year: Number(votingEnd.year), month: Number(votingEnd.month), day: Number(votingEnd.day) },
    };
    if (newPassword) {
      updatedConfig.adminPassword = newPassword;
    }
    await FirebaseService.updateSystemConfig(updatedConfig);
    alert('設定已更新');
    setNewPassword('');
    onConfigUpdate();
  };

  const handleResetVotes = async () => {
    const confirmMsg = `警告：您確定要清空「民國 ${config.currentYear} 年 ${config.currentMonth} 月」的所有投票紀錄嗎？`;
    if (!confirm(confirmMsg)) return;
    const doubleConfirm = prompt("請輸入「確認清空」以執行此動作");
    if (doubleConfirm !== "確認清空") return;

    setLoading(true);
    try {
        await FirebaseService.resetMonthlyVotes(config.currentYear, config.currentMonth);
        alert(`重置完成。`);
        await loadData();
    } catch (e) {
        alert("重置失敗");
    } finally {
        setLoading(false);
    }
  };

  const calculateResults = (role: 'attending' | 'resident') => {
    const voterRoleFilter = role === ROLES.ATTENDING ? ROLES.RESIDENT : ROLES.ATTENDING;
    const relevantVotes = votes.filter(v => v.voterRole === voterRoleFilter);
    const scores: Record<string, number> = {};
    relevantVotes.forEach(v => {
      v.targetNames.forEach(name => {
        scores[name] = (scores[name] || 0) + 1;
      });
    });
    const results = Object.entries(scores)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
    const uniqueScores = Array.from(new Set(results.map(r => r.count))).sort((a, b) => b - a);
    const top2Scores = uniqueScores.slice(0, 2);
    return results.map(r => ({ ...r, isWinner: top2Scores.includes(r.count) }));
  };

  const renderResults = () => {
    const residentWinners = calculateResults(ROLES.RESIDENT);
    const attendingWinners = calculateResults(ROLES.ATTENDING);

    return (
      <div className="space-y-8">
        {/* History Filter */}
        <div className="bg-gray-50 p-4 rounded-lg flex flex-wrap items-center gap-4 border">
           <span className="font-bold text-gray-700 flex items-center gap-2">
             <Calendar size={18}/> 報表查詢：
           </span>
           <div className="flex items-center gap-2">
             <span>民國</span>
             <input type="number" className="p-1 border rounded w-20" value={viewYear} onChange={e => setViewYear(Number(e.target.value))} />
             <span>年</span>
           </div>
           <div className="flex items-center gap-2">
             <input type="number" min="1" max="12" className="p-1 border rounded w-16" value={viewMonth} onChange={e => setViewMonth(Number(e.target.value))} />
             <span>月</span>
           </div>
           <button onClick={loadData} className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">查詢</button>
        </div>

        <h2 className="text-xl font-bold text-gray-800 text-center">
          民國 {viewYear} 年 {viewMonth} 月 票選結果
        </h2>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white p-4 rounded-lg shadow border border-blue-100">
            <h3 className="text-lg font-bold text-blue-700 mb-4 pb-2 border-b border-blue-200">優良住院醫師 (由主治醫師票選)</h3>
            {residentWinners.length === 0 ? <p className="text-gray-500">尚無資料</p> : (
              <ul className="space-y-2">
                {residentWinners.map((r, idx) => (
                  <li key={idx} className={`flex justify-between items-center p-2 rounded ${r.isWinner ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'}`}>
                    <span className="flex items-center gap-2">{r.isWinner && <span className="text-yellow-500">🏆</span>}<span className={r.isWinner ? 'font-bold text-gray-900' : 'text-gray-700'}>{r.name}</span></span>
                    <span className="font-mono font-bold text-gray-600">{r.count} 票</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="bg-white p-4 rounded-lg shadow border border-green-100">
            <h3 className="text-lg font-bold text-green-700 mb-4 pb-2 border-b border-green-200">優良主治醫師 (由住院醫師票選)</h3>
            {attendingWinners.length === 0 ? <p className="text-gray-500">尚無資料</p> : (
              <ul className="space-y-2">
                {attendingWinners.map((r, idx) => (
                  <li key={idx} className={`flex justify-between items-center p-2 rounded ${r.isWinner ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'}`}>
                     <span className="flex items-center gap-2">{r.isWinner && <span className="text-yellow-500">🏆</span>}<span className={r.isWinner ? 'font-bold text-gray-900' : 'text-gray-700'}>{r.name}</span></span>
                    <span className="font-mono font-bold text-gray-600">{r.count} 票</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="mt-8">
           <h3 className="text-lg font-bold text-gray-700 mb-4">詳細投票紀錄明細 (可單筆刪除)</h3>
           {['ATTENDING', 'RESIDENT'].map((roleKey) => {
             const role = ROLES[roleKey as keyof typeof ROLES];
             const roleVotes = votes.filter(v => v.voterRole === role);
             const title = role === ROLES.ATTENDING ? '主治醫師投票 (投給住院)' : '住院醫師投票 (投給主治)';
             const bgClass = role === ROLES.ATTENDING ? 'bg-blue-50 text-blue-800' : 'bg-green-50 text-green-800';

             return (
                <div key={roleKey} className="mb-6">
                 <h4 className="font-semibold text-gray-600 mb-2 bg-gray-100 p-2 rounded">{title}</h4>
                 <div className="overflow-x-auto">
                   <table className="min-w-full bg-white text-sm">
                     <thead>
                       <tr className={bgClass}>
                         <th className="py-2 px-4 text-left">投票者</th>
                         <th className="py-2 px-4 text-left">投給</th>
                         <th className="py-2 px-4 text-left">時間</th>
                         <th className="py-2 px-4 text-center">操作</th>
                       </tr>
                     </thead>
                     <tbody>
                       {roleVotes.map(v => (
                         <tr key={v.id} className="border-b hover:bg-gray-50">
                           <td className="py-2 px-4 font-medium">{v.voterName}</td>
                           <td className="py-2 px-4">{v.targetNames.join(', ')}</td>
                           <td className="py-2 px-4 text-gray-500">{new Date(v.timestamp).toLocaleString('zh-TW')}</td>
                           <td className="py-2 px-4 text-center">
                             <button onClick={() => confirmDelete(v.id!, `${v.voterName} 的投票`, 'vote')} className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50">
                               <Trash2 size={16} />
                             </button>
                           </td>
                         </tr>
                       ))}
                       {roleVotes.length === 0 && <tr><td colSpan={4} className="py-4 text-center text-gray-500">尚無資料</td></tr>}
                     </tbody>
                   </table>
                 </div>
               </div>
             )
           })}
        </div>
      </div>
    );
  };

  const renderDoctorsManager = () => {
    return (
      <div className="space-y-6">
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h3 className="font-bold text-gray-700 mb-3">新增醫師 (預設密碼 0000)</h3>
          <div className="flex flex-col md:flex-row gap-3">
            <select className="p-2 border rounded" value={newDocRole} onChange={(e) => setNewDocRole(e.target.value as any)}>
              <option value={ROLES.RESIDENT}>住院醫師</option>
              <option value={ROLES.ATTENDING}>主治醫師</option>
            </select>
            <input type="text" placeholder="請輸入姓名" className="p-2 border rounded flex-grow" value={newDocName} onChange={(e) => setNewDocName(e.target.value)}/>
            <button onClick={handleAddDoctor} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">新增</button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {[ROLES.RESIDENT, ROLES.ATTENDING].map(role => {
            const list = doctors.filter(d => d.role === role);
            const title = role === ROLES.RESIDENT ? '住院醫師' : '主治醫師';
            const color = role === ROLES.RESIDENT ? 'text-blue-700 border-blue-200' : 'text-green-700 border-green-200';
            return (
              <div key={role}>
                <h3 className={`font-bold ${color} mb-2 border-b pb-1`}>{title} ({list.length})</h3>
                <ul className="bg-white border rounded divide-y max-h-96 overflow-y-auto shadow-sm">
                  {list.map(d => (
                    <li key={d.id} className="p-3 flex justify-between items-center hover:bg-gray-50 relative">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-800">{d.name}</span>
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Eye size={10}/> {d.password || '0000'}
                        </span>
                      </div>
                      <button onClick={() => confirmDelete(d.id, d.name, 'doctor')} className="text-red-400 hover:text-red-600 p-2 rounded hover:bg-red-50 z-10"><Trash2 size={18} /></button>
                    </li>
                  ))}
                  {list.length === 0 && <li className="p-3 text-gray-400 text-center">暫無名單</li>}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white min-h-screen relative">
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 animate-fade-in">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 animate-scale-in">
            <div className="flex items-center gap-3 text-red-600 mb-4"><AlertTriangle size={24} /><h3 className="text-lg font-bold">確認刪除</h3></div>
            <p className="text-gray-600 mb-6">確定要刪除 <span className="font-bold text-gray-800">{deleteTarget.name}</span> 嗎？<br/><span className="text-xs text-red-500">此動作無法復原。</span></p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 rounded border">取消</button>
              <button onClick={executeDelete} className="px-4 py-2 rounded bg-red-600 text-white">刪除</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-slate-800 text-white p-4 sticky top-0 z-10 shadow-md flex justify-between items-center">
        <h1 className="font-bold text-lg flex items-center gap-2"><Settings size={20} /> 後台管理</h1>
        <button onClick={onLogout} className="text-sm bg-slate-700 px-3 py-1 rounded hover:bg-slate-600 flex items-center gap-1"><LogOut size={14} /> 登出</button>
      </div>

      <div className="max-w-6xl mx-auto p-4 md:p-6">
        <div className="flex border-b mb-6 overflow-x-auto">
          {[{id: 'results', label: '結果與紀錄', icon: FileText}, {id: 'doctors', label: '名單與密碼', icon: Users}, {id: 'settings', label: '系統設定', icon: Calendar}].map(tab => (
            <button key={tab.id} className={`px-4 py-2 flex items-center gap-2 whitespace-nowrap ${activeTab === tab.id ? 'border-b-2 border-blue-600 text-blue-600 font-bold' : 'text-gray-500'}`} onClick={() => setActiveTab(tab.id as any)}>
              <tab.icon size={18} /> {tab.label}
            </button>
          ))}
        </div>

        {loading ? <div className="text-center py-10 text-gray-500">載入中...</div> : (
          <div>
            {activeTab === 'results' && renderResults()}
            {activeTab === 'doctors' && renderDoctorsManager()}
            {activeTab === 'settings' && (
              <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-lg shadow border">
                  <h3 className="text-lg font-bold mb-4 text-blue-800 border-b pb-2">1. 票選時間設定 (民國)</h3>
                  
                  <div className="mb-4">
                    <label className="block text-gray-700 font-bold mb-2">當前票選年度/月份</label>
                    <div className="flex gap-2">
                        <div className="flex-1 flex items-center border rounded px-2"><span className="text-gray-500 text-sm">民國</span><input type="number" value={editYear} onChange={e => setEditYear(Number(e.target.value))} className="w-full p-2 outline-none"/></div>
                        <div className="flex-1 flex items-center border rounded px-2"><input type="number" min="1" max="12" value={editMonth} onChange={e => setEditMonth(Number(e.target.value))} className="w-full p-2 outline-none"/><span className="text-gray-500 text-sm">月</span></div>
                    </div>
                  </div>

                  <div className="mb-4">
                      <label className="block text-gray-700 font-bold mb-2">開放填寫期間 (YYYY/MM/DD)</label>
                      <div className="grid grid-cols-1 gap-2 text-sm">
                          <div className="flex items-center gap-1 bg-gray-50 p-2 rounded">
                             <span className="w-10 font-bold">開始</span>
                             民國 <input type="number" className="w-24 border p-1 rounded" value={votingStart.year} onChange={e=>setVotingStart({...votingStart, year:Number(e.target.value)})}/> 年
                             <input type="number" className="w-20 border p-1 rounded" value={votingStart.month} onChange={e=>setVotingStart({...votingStart, month:Number(e.target.value)})}/> 月
                             <input type="number" className="w-20 border p-1 rounded" value={votingStart.day} onChange={e=>setVotingStart({...votingStart, day:Number(e.target.value)})}/> 日
                          </div>
                          <div className="flex items-center gap-1 bg-gray-50 p-2 rounded">
                             <span className="w-10 font-bold">結束</span>
                             民國 <input type="number" className="w-24 border p-1 rounded" value={votingEnd.year} onChange={e=>setVotingEnd({...votingEnd, year:Number(e.target.value)})}/> 年
                             <input type="number" className="w-20 border p-1 rounded" value={votingEnd.month} onChange={e=>setVotingEnd({...votingEnd, month:Number(e.target.value)})}/> 月
                             <input type="number" className="w-20 border p-1 rounded" value={votingEnd.day} onChange={e=>setVotingEnd({...votingEnd, day:Number(e.target.value)})}/> 日
                          </div>
                      </div>
                  </div>

                  <button onClick={handleUpdateSettings} className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 font-bold mt-2">儲存所有設定</button>
                </div>

                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-lg shadow border">
                        <h3 className="text-lg font-bold mb-4 text-purple-800 border-b pb-2">2. 版面風格</h3>
                        <div className="grid grid-cols-3 gap-4">
                            {Object.entries(THEMES).map(([key, theme]) => (
                                <button 
                                    key={key}
                                    onClick={() => setSelectedTheme(key as ThemeOption)}
                                    className={`
                                      relative h-16 rounded-xl border-2 transition-all duration-300 transform hover:scale-105 hover:shadow-lg flex flex-col items-center justify-center overflow-hidden
                                      ${selectedTheme === key ? 'border-blue-500 ring-2 ring-blue-200 scale-105 shadow-md' : 'border-gray-100 hover:border-gray-300'}
                                    `}
                                >
                                    <div className={`absolute inset-0 bg-gradient-to-br ${theme.bgGradient} opacity-50`}></div>
                                    <div className={`absolute inset-0 ${theme.primary} opacity-20`}></div>
                                    <span className={`relative z-10 font-bold text-sm ${theme.text}`}>{theme.name}</span>
                                    {selectedTheme === key && <div className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full"></div>}
                                </button>
                            ))}
                        </div>
                        <p className="text-center text-sm text-gray-500 mt-4 bg-gray-50 py-1 rounded">目前選擇：{THEMES[selectedTheme].name}</p>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow border">
                        <h3 className="text-lg font-bold mb-4 text-gray-800 border-b pb-2">3. 管理員密碼</h3>
                        <input type="password" placeholder="輸入新密碼 (若不修改請留空)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full p-2 border rounded mb-2"/>
                    </div>

                    <div className="bg-red-50 p-6 rounded-lg shadow border border-red-200">
                        <h3 className="text-lg font-bold text-red-800 mb-2 flex items-center gap-2"><AlertTriangle size={20} /> 危險區域</h3>
                        <button onClick={handleResetVotes} className="w-full bg-red-600 text-white py-2 rounded font-bold hover:bg-red-700 flex items-center justify-center gap-2"><RefreshCw size={18} /> 清空本月所有資料</button>
                    </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
