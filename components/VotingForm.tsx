import React, { useState, useEffect } from 'react';
import { Doctor, ROLES, SystemConfig } from '../types';
import * as FirebaseService from '../services/firebase';
import { CheckCircle2, AlertCircle } from 'lucide-react';

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

  // Determine rules based on voter role
  const isVoterResident = voter.role === ROLES.RESIDENT;
  
  // Residents vote for Attendings, Attendings vote for Residents
  const targetRole = isVoterResident ? ROLES.ATTENDING : ROLES.RESIDENT;
  const targetLabel = isVoterResident ? '優良主治醫師' : '優良住院醫師';
  const maxVotes = isVoterResident ? 3 : 2;

  // Filter candidates and sort by stroke
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
      if (!confirm('您尚未選擇任何候選人，確定要送出空白選票嗎？')) return;
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

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden my-6">
      <div className="bg-gradient-to-r from-teal-600 to-teal-700 p-6 text-white">
        <div className="flex justify-between items-start">
           <div>
              <h2 className="text-2xl font-bold mb-1">{config.currentYear}年 {config.currentMonth}月 優良醫師票選</h2>
              <p className="opacity-90 text-sm">
                您好，<span className="font-bold underline text-yellow-300">{voter.name}</span> {voter.role === ROLES.RESIDENT ? '住院醫師' : '主治醫師'}
              </p>
           </div>
           <button onClick={onLogout} className="text-xs bg-teal-800 bg-opacity-50 hover:bg-opacity-100 px-3 py-1 rounded">
             登出
           </button>
        </div>
      </div>

      <div className="p-6">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700 font-bold">
                投票規則說明：
              </p>
              <ul className="list-disc list-inside text-sm text-yellow-700 mt-1 space-y-1">
                <li>本月將選出<strong>兩位{targetLabel}</strong> (遇同票則並列)。</li>
                <li>您可以投 <strong>0 到 {maxVotes} 位</strong>{targetLabel}。</li>
                <li>每人每月限投票一次。</li>
              </ul>
            </div>
          </div>
        </div>

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
                    ? 'border-teal-500 bg-teal-50 text-teal-800 shadow-sm' 
                    : 'border-gray-200 hover:border-teal-200 text-gray-700'}
                `}
              >
                <span className="font-medium">{candidate.name}</span>
                {isSelected && <CheckCircle2 size={18} className="text-teal-600" />}
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
              : 'bg-teal-600 hover:bg-teal-700 text-white'}
          `}
        >
          {submitting ? '資料傳送中...' : '確認送出選票'}
        </button>
      </div>
    </div>
  );
};

export default VotingForm;
