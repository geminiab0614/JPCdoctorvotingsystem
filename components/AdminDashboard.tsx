import React, { useState, useEffect } from 'react';
import { Doctor, Vote, SystemConfig, ROLES, ROLE_LABELS } from '../types';
import * as FirebaseService from '../services/firebase';
import { Users, Calendar, Settings, FileText, Trash2, LogOut, AlertTriangle, X } from 'lucide-react';

interface Props {
  config: SystemConfig;
  onLogout: () => void;
  onConfigUpdate: () => void; // Trigger app refresh
}

const AdminDashboard: React.FC<Props> = ({ config, onLogout, onConfigUpdate }) => {
  const [activeTab, setActiveTab] = useState<'results' | 'doctors' | 'settings'>('results');
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(false);

  // Settings State
  const [editYear, setEditYear] = useState(config.currentYear);
  const [editMonth, setEditMonth] = useState(config.currentMonth);
  const [newPassword, setNewPassword] = useState('');
  
  // Doctor Management State
  const [newDocName, setNewDocName] = useState('');
  const [newDocRole, setNewDocRole] = useState<'attending' | 'resident'>(ROLES.RESIDENT);

  // Delete Confirmation State (Custom Modal)
  const [deleteTarget, setDeleteTarget] = useState<{id: string, name: string} | null>(null);

  useEffect(() => {
    loadData();
  }, [config, activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const docs = await FirebaseService.getDoctors();
      // Sort by stroke count (using zh-TW locale)
      docs.sort((a, b) => a.name.localeCompare(b.name, 'zh-TW'));
      setDoctors(docs);

      if (activeTab === 'results') {
        const vs = await FirebaseService.getVotesByDate(config.currentYear, config.currentMonth);
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

  // Trigger the custom modal
  const confirmDelete = (id: string, name: string) => {
    setDeleteTarget({ id, name });
  };

  // Actually execute delete
  const executeDelete = async () => {
    if (!deleteTarget) return;
    try {
      await FirebaseService.deleteDoctor(deleteTarget.id);
      setDeleteTarget(null); // Close modal
      await loadData(); // Refresh list
    } catch (error) {
      console.error("Delete failed:", error);
      alert('刪除失敗，請稍後再試。');
    }
  };

  const handleUpdateSettings = async () => {
    const updatedConfig: SystemConfig = {
      ...config,
      currentYear: Number(editYear),
      currentMonth: Number(editMonth),
    };
    if (newPassword) {
      updatedConfig.adminPassword = newPassword;
    }
    await FirebaseService.updateSystemConfig(updatedConfig);
    alert('設定已更新');
    setNewPassword('');
    onConfigUpdate();
  };

  // --- Calculation Logic ---
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

    return results.map(r => ({
      ...r,
      isWinner: top2Scores.includes(r.count)
    }));
  };

  const renderResults = () => {
    const residentWinners = calculateResults(ROLES.RESIDENT);
    const attendingWinners = calculateResults(ROLES.ATTENDING);

    return (
      <div className="space-y-8">
        <h2 className="text-xl font-bold text-gray-800 text-center">
          {config.currentYear}年 {config.currentMonth}月 票選結果統計
        </h2>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white p-4 rounded-lg shadow border border-blue-100">
            <h3 className="text-lg font-bold text-blue-700 mb-4 pb-2 border-b border-blue-200">
              優良住院醫師 (由主治醫師票選)
            </h3>
            {residentWinners.length === 0 ? <p className="text-gray-500">尚無投票資料</p> : (
              <ul className="space-y-2">
                {residentWinners.map((r, idx) => (
                  <li key={idx} className={`flex justify-between items-center p-2 rounded ${r.isWinner ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'}`}>
                    <span className="flex items-center gap-2">
                      {r.isWinner && <span className="text-yellow-500">🏆</span>}
                      <span className={r.isWinner ? 'font-bold text-gray-900' : 'text-gray-700'}>{r.name}</span>
                    </span>
                    <span className="font-mono font-bold text-gray-600">{r.count} 票</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-white p-4 rounded-lg shadow border border-green-100">
            <h3 className="text-lg font-bold text-green-700 mb-4 pb-2 border-b border-green-200">
              優良主治醫師 (由住院醫師票選)
            </h3>
            {attendingWinners.length === 0 ? <p className="text-gray-500">尚無投票資料</p> : (
              <ul className="space-y-2">
                {attendingWinners.map((r, idx) => (
                  <li key={idx} className={`flex justify-between items-center p-2 rounded ${r.isWinner ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'}`}>
                     <span className="flex items-center gap-2">
                      {r.isWinner && <span className="text-yellow-500">🏆</span>}
                      <span className={r.isWinner ? 'font-bold text-gray-900' : 'text-gray-700'}>{r.name}</span>
                    </span>
                    <span className="font-mono font-bold text-gray-600">{r.count} 票</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="mt-8">
           <h3 className="text-lg font-bold text-gray-700 mb-4">詳細投票紀錄明細</h3>
           <div className="mb-6">
             <h4 className="font-semibold text-gray-600 mb-2 bg-gray-100 p-2 rounded">主治醫師投票明細 (投給住院醫師)</h4>
             <div className="overflow-x-auto">
               <table className="min-w-full bg-white text-sm">
                 <thead>
                   <tr className="bg-blue-50 text-blue-800">
                     <th className="py-2 px-4 text-left">投票者 (主治醫師)</th>
                     <th className="py-2 px-4 text-left">投給 (優良住院醫師)</th>
                     <th className="py-2 px-4 text-left">時間</th>
                   </tr>
                 </thead>
                 <tbody>
                   {votes.filter(v => v.voterRole === ROLES.ATTENDING).map(v => (
                     <tr key={v.id} className="border-b hover:bg-gray-50">
                       <td className="py-2 px-4 font-medium">{v.voterName}</td>
                       <td className="py-2 px-4">{v.targetNames.join(', ') || '未選擇'}</td>
                       <td className="py-2 px-4 text-gray-500">{new Date(v.timestamp).toLocaleString('zh-TW')}</td>
                     </tr>
                   ))}
                   {votes.filter(v => v.voterRole === ROLES.ATTENDING).length === 0 && (
                     <tr><td colSpan={3} className="py-4 text-center text-gray-500">尚無資料</td></tr>
                   )}
                 </tbody>
               </table>
             </div>
           </div>

           <div>
             <h4 className="font-semibold text-gray-600 mb-2 bg-gray-100 p-2 rounded">住院醫師投票明細 (投給主治醫師)</h4>
             <div className="overflow-x-auto">
               <table className="min-w-full bg-white text-sm">
                 <thead>
                   <tr className="bg-green-50 text-green-800">
                     <th className="py-2 px-4 text-left">投票者 (住院醫師)</th>
                     <th className="py-2 px-4 text-left">投給 (優良主治醫師)</th>
                     <th className="py-2 px-4 text-left">時間</th>
                   </tr>
                 </thead>
                 <tbody>
                   {votes.filter(v => v.voterRole === ROLES.RESIDENT).map(v => (
                     <tr key={v.id} className="border-b hover:bg-gray-50">
                       <td className="py-2 px-4 font-medium">{v.voterName}</td>
                       <td className="py-2 px-4">{v.targetNames.join(', ') || '未選擇'}</td>
                       <td className="py-2 px-4 text-gray-500">{new Date(v.timestamp).toLocaleString('zh-TW')}</td>
                     </tr>
                   ))}
                   {votes.filter(v => v.voterRole === ROLES.RESIDENT).length === 0 && (
                     <tr><td colSpan={3} className="py-4 text-center text-gray-500">尚無資料</td></tr>
                   )}
                 </tbody>
               </table>
             </div>
           </div>
        </div>
      </div>
    );
  };

  const renderDoctorsManager = () => {
    const residents = doctors.filter(d => d.role === ROLES.RESIDENT);
    const attendings = doctors.filter(d => d.role === ROLES.ATTENDING);

    return (
      <div className="space-y-6">
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h3 className="font-bold text-gray-700 mb-3">新增醫師</h3>
          <div className="flex flex-col md:flex-row gap-3">
            <select 
              className="p-2 border rounded" 
              value={newDocRole} 
              onChange={(e) => setNewDocRole(e.target.value as any)}
            >
              <option value={ROLES.RESIDENT}>住院醫師</option>
              <option value={ROLES.ATTENDING}>主治醫師</option>
            </select>
            <input 
              type="text" 
              placeholder="請輸入姓名" 
              className="p-2 border rounded flex-grow"
              value={newDocName}
              onChange={(e) => setNewDocName(e.target.value)}
            />
            <button 
              onClick={handleAddDoctor}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              新增至名單
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-bold text-blue-700 mb-2 border-b border-blue-200 pb-1">住院醫師名單 ({residents.length})</h3>
            <ul className="bg-white border rounded divide-y max-h-96 overflow-y-auto shadow-sm">
              {residents.map(d => (
                <li key={d.id} className="p-3 flex justify-between items-center hover:bg-gray-50 transition-colors relative">
                  <span className="font-medium text-gray-800">{d.name}</span>
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      confirmDelete(d.id, d.name);
                    }} 
                    className="text-red-400 hover:text-red-600 p-2 rounded hover:bg-red-50 transition-all cursor-pointer z-10"
                    title="刪除"
                  >
                    <Trash2 size={18} />
                  </button>
                </li>
              ))}
              {residents.length === 0 && <li className="p-3 text-gray-400 text-center text-sm">暫無名單</li>}
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-green-700 mb-2 border-b border-green-200 pb-1">主治醫師名單 ({attendings.length})</h3>
            <ul className="bg-white border rounded divide-y max-h-96 overflow-y-auto shadow-sm">
              {attendings.map(d => (
                <li key={d.id} className="p-3 flex justify-between items-center hover:bg-gray-50 transition-colors relative">
                  <span className="font-medium text-gray-800">{d.name}</span>
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      confirmDelete(d.id, d.name);
                    }} 
                    className="text-red-400 hover:text-red-600 p-2 rounded hover:bg-red-50 transition-all cursor-pointer z-10"
                    title="刪除"
                  >
                    <Trash2 size={18} />
                  </button>
                </li>
              ))}
              {attendings.length === 0 && <li className="p-3 text-gray-400 text-center text-sm">暫無名單</li>}
            </ul>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white min-h-screen relative">
      {/* Custom Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 animate-fade-in">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 animate-scale-in">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <AlertTriangle size={24} />
              <h3 className="text-lg font-bold">確認刪除</h3>
            </div>
            <p className="text-gray-600 mb-6">
              您確定要從名單中移除 <span className="font-bold text-gray-800">{deleteTarget.name}</span> 嗎？<br/>
              <span className="text-xs text-red-500">此動作無法復原。</span>
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded border border-gray-300 text-gray-600 hover:bg-gray-50 font-medium"
              >
                取消
              </button>
              <button 
                onClick={executeDelete}
                className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 font-medium shadow-sm"
              >
                確認刪除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-slate-800 text-white p-4 sticky top-0 z-10 shadow-md flex justify-between items-center">
        <h1 className="font-bold text-lg flex items-center gap-2">
          <Settings size={20} /> 後台管理系統
        </h1>
        <button onClick={onLogout} className="text-sm bg-slate-700 px-3 py-1 rounded hover:bg-slate-600 flex items-center gap-1">
          <LogOut size={14} /> 登出
        </button>
      </div>

      <div className="max-w-6xl mx-auto p-4 md:p-6">
        {/* Tabs */}
        <div className="flex border-b mb-6 overflow-x-auto">
          <button 
            className={`px-4 py-2 flex items-center gap-2 whitespace-nowrap ${activeTab === 'results' ? 'border-b-2 border-blue-600 text-blue-600 font-bold' : 'text-gray-500'}`}
            onClick={() => setActiveTab('results')}
          >
            <FileText size={18} /> 投票結果與紀錄
          </button>
          <button 
            className={`px-4 py-2 flex items-center gap-2 whitespace-nowrap ${activeTab === 'doctors' ? 'border-b-2 border-blue-600 text-blue-600 font-bold' : 'text-gray-500'}`}
            onClick={() => setActiveTab('doctors')}
          >
            <Users size={18} /> 名單管理
          </button>
          <button 
            className={`px-4 py-2 flex items-center gap-2 whitespace-nowrap ${activeTab === 'settings' ? 'border-b-2 border-blue-600 text-blue-600 font-bold' : 'text-gray-500'}`}
            onClick={() => setActiveTab('settings')}
          >
            <Calendar size={18} /> 系統設定
          </button>
        </div>

        {loading ? (
          <div className="text-center py-10 text-gray-500">載入中...</div>
        ) : (
          <div>
            {activeTab === 'results' && renderResults()}
            {activeTab === 'doctors' && renderDoctorsManager()}
            {activeTab === 'settings' && (
              <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow border">
                <h3 className="text-lg font-bold mb-4">系統參數設定</h3>
                
                <div className="mb-4">
                  <label className="block text-gray-700 mb-2">當前投票年份</label>
                  <input 
                    type="number" 
                    value={editYear} 
                    onChange={(e) => setEditYear(Number(e.target.value))}
                    className="w-full p-2 border rounded"
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-gray-700 mb-2">當前投票月份</label>
                  <input 
                    type="number" 
                    min="1" max="12"
                    value={editMonth} 
                    onChange={(e) => setEditMonth(Number(e.target.value))}
                    className="w-full p-2 border rounded"
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-gray-700 mb-2">變更管理員密碼 (若不修改請留空)</label>
                  <input 
                    type="password" 
                    placeholder="輸入新密碼"
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full p-2 border rounded"
                  />
                </div>

                <button 
                  onClick={handleUpdateSettings}
                  className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 font-bold"
                >
                  儲存設定
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
