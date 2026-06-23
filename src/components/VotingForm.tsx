import React, { useState, useEffect } from 'react';
import { Doctor, ROLES, SystemConfig, THEMES } from '../types';
import * as FirebaseService from '../services/firebase';
import { CheckCircle2, AlertCircle, KeyRound, Save, X } from 'lucide-react';

interface Props {
  voter: Doctor;
  config: SystemConfig;
  allDoctors: Doctor[];
  onVoteComplete: () => void;
  onLogout: () => void;
}

const VotingForm: React.FC<Props> = ({ voter, config, allDoctors, onVoteComplete, onLogout }) => {
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  // 投票期限檢查
  const [isVotingOpen, setIsVotingOpen] = useState(true);

  const theme = THEMES[config.theme || 'blue'];

  useEffect(() => {
     checkVotingPeriod();
  }, [config]);

  const checkVotingPeriod = () => {
    const now = new Date();
    // 轉換民國年 Config 為西元 Date 物件
    // 起始時間 (當天 00:00:00)
    const startDate = new Date(config.votingStart.year + 1911, config.votingStart.month - 1, config.votingStart.day, 0, 0, 0);
    // 結束時間 (當天 23:59:59)
    const endDate = new Date(config.votingEnd.year + 1911, config.votingEnd.month - 1, config.votingEnd.day, 23, 59, 59);
    
    if (now < startDate || now > endDate) {
        setIsVotingOpen(false);
    } else {
        setIsVotingOpen(true);
    }
  };

  const isVoterResident = voter.role === ROLES.RESIDENT;
  const targetRole = isVoterResident ? ROLES.ATTENDING : ROLES.RESIDENT;
  const targetLabel = isVoterResident ? '優良主治醫師' : '優良住院醫師';
  const maxVotes = isVoterResident ? 3 : 2;

  const candidates = allDoctors
    .filter(d => d.role === targetRole)
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-TW'));

  const toggleSelection = (name: string) => {
    if (selectedTargets.includes(name)) {
      setSelectedTargets(prev => prev.filter(n => n !== name));
    } else {
      if (selectedTargets.length >= maxVotes) {
        alert(`您最多只能選擇 ${maxVotes} 位${targetLabel}`);
        return;
      }
      setSelectedTargets(prev => [...prev, name]);
    }
  };

  const handleSubmit = async () => {
    if (selectedTargets.length === 0) {
      if (!window.confirm('您尚未選擇任何候選人，確定要送出空白選票嗎？')) return;
    }
    
    setSubmitting(true);
    try {
      await FirebaseService.submitVote({
        voterName: voter.name,
        voterRole: voter.role,
        targetNames: selectedTargets,
        year: config.currentYear,
        month: config.currentMonth,
        timestamp: Date.now()
      });
      alert('投票成功！感謝您的參與。');
      onVoteComplete();
    } catch (error) {
      console.error(error);
      alert('投票失敗，請稍後再試或聯繫管理員');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangePassword = async () => {
      if (newPassword.length !== 4 || isNaN(Number(newPassword))) {
          alert("請輸入4位數字密碼");
          return;
      }
      try {
          await FirebaseService.updateDoctorPassword(voter.id, newPassword);
          alert("密碼修改成功");
          setShowPwdModal(false);
      } catch (e) {
          alert("修改失敗");
      }
  };

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden my-6">
      {/* Header */}
      <div className={`bg-gradient-to-r ${theme.bgGradient} p-6 border-b ${theme.border}`}>
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
           <div>
              <h2 className={`text-2xl font-bold mb-1 ${theme.text}`}>民國{config.currentYear}年 {config.currentMonth}月 優良醫師票選</h2>
              <p className="text-gray-600 text-sm">
                歡迎，<span className="font-bold underline">{voter.name}</span> {voter.role === ROLES.RESIDENT ? '住院醫師' : '主治醫師'}
              </p>
           </div>
           <div className="flex gap-2">
             <button onClick={() => setShowPwdModal(true)} className="flex items-center gap-1 text-xs bg-white text-gray-600 px-3 py-1.5 rounded border hover:bg-gray-50 shadow-sm transition-colors">
                 <KeyRound size={14}/> 修改密碼
             </button>
             <button onClick={onLogout} className={`text-xs ${theme.primary} hover:opacity-90 px-3 py-1.5 rounded text-white shadow-sm transition-colors`}>
                 登出
             </button>
           </div>
        </div>
      </div>

      {/* Password Modal */}
      {showPwdModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-sm shadow-2xl animate-scale-in">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-gray-800">修改個人密碼</h3>
                      <button onClick={() => setShowPwdModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                  </div>
                  <input type="text" maxLength={4} placeholder="請輸入新的4位數字" className="w-full border p-2 rounded mb-4 text-center text-lg tracking-widest" value={newPassword} onChange={e => setNewPassword(e.target.value)}/>
                  <button onClick={handleChangePassword} className={`w-full ${theme.primary} text-white py-2 rounded flex items-center justify-center gap-2`}>
                      <Save size={16}/> 儲存變更
                  </button>
              </div>
          </div>
      )}

      <div className="p-6">
        {/* Rules Alert */}
        <div className={`${theme.lightBg} border-l-4 ${theme.border} p-4 mb-6`}>
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className={`h-5 w-5 ${theme.text}`} />
            </div>
            <div className="ml-3">
              <p className={`text-sm ${theme.text} font-bold`}>
                投票規則說明：
              </p>
              <ul className={`list-disc list-inside text-sm ${theme.text} mt-1 space-y-1 opacity-80`}>
                <li>本月將選出<strong>兩位{targetLabel}</strong> (遇同票則並列)。</li>
                <li>您可以投 <strong>0 到 {maxVotes} 位</strong>{targetLabel}。</li>
                <li><strong>填寫期限：</strong>民國{config.votingStart.year}年{config.votingStart.month}月{config.votingStart.day}日 至 {config.votingEnd.year}年{config.votingEnd.month}月{config.votingEnd.day}日</li>
              </ul>
            </div>
          </div>
        </div>

        {!isVotingOpen ? (
            <div className="text-center py-10 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <h3 className="text-xl font-bold text-gray-500">目前非開放投票期間</h3>
                <p className="text-gray-400 mt-2">請於指定期限內進行投票</p>
            </div>
        ) : (
            <>
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                請勾選您心目中的 {targetLabel}
                <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    已選 {selectedTargets.length} / {maxVotes}
                </span>
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
                {candidates.map(candidate => {
                    const isSelected = selectedTargets.includes(candidate.name);
                    return (
                    <div 
                        key={candidate.id}
                        onClick={() => toggleSelection(candidate.name)}
                        className={`
                        cursor-pointer p-3 rounded-lg border-2 transition-all flex items-center justify-between
                        ${isSelected 
                            ? `border-current ${theme.text} ${theme.lightBg} shadow-sm` 
                            : 'border-gray-200 hover:border-gray-300 text-gray-700'}
                        `}
                    >
                        <span className="font-medium">{candidate.name}</span>
                        {isSelected && <CheckCircle2 size={18} className="fill-current" />}
                    </div>
                    );
                })}
                </div>

                <button
                onClick={handleSubmit}
                disabled={submitting}
                className={`
                    w-full py-3 rounded-lg font-bold text-lg shadow-md transition-colors
                    ${submitting 
                    ? 'bg-gray-400 cursor-not-allowed text-white' 
                    : `${theme.primary} ${theme.primaryHover} text-white`}
                `}
                >
                {submitting ? '資料傳送中...' : '確認送出選票'}
                </button>
            </>
        )}
      </div>
    </div>
  );
};

export default VotingForm;
