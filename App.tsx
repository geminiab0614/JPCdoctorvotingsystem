import React, { useState, useEffect } from 'react';
import { Doctor, SystemConfig, ROLES } from './types';
import * as FirebaseService from './services/firebase';
import AdminDashboard from './components/AdminDashboard';
import VotingForm from './components/VotingForm';
import { UserCircle2, Lock, ArrowLeft } from 'lucide-react';

// Main App Component
const App: React.FC = () => {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Auth State
  const [currentUser, setCurrentUser] = useState<Doctor | null>(null); // For regular voters
  const [isAdmin, setIsAdmin] = useState(false);
  
  // UI State for Login
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  
  // Selection State for Login
  const [selectedRole, setSelectedRole] = useState<'attending' | 'resident'>(ROLES.RESIDENT);
  const [selectedVoterId, setSelectedVoterId] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState('');
  
  // Voting Status
  const [votedMap, setVotedMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    initializeData();
  }, []);

  const initializeData = async () => {
    setLoading(true);
    try {
      const sysConfig = await FirebaseService.getSystemConfig();
      setConfig(sysConfig);
      
      const docList = await FirebaseService.getDoctors();
      setDoctors(docList);

      const votes = await FirebaseService.getVotesByDate(sysConfig.currentYear, sysConfig.currentMonth);
      const statusMap: Record<string, boolean> = {};
      votes.forEach(v => {
        statusMap[v.voterName] = true;
      });
      setVotedMap(statusMap);

    } catch (error) {
      console.error("Initialization error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = () => {
    if (config && passwordInput === config.adminPassword) {
      setIsAdmin(true);
      setPasswordInput('');
      setShowAdminLogin(false);
    } else {
      alert('密碼錯誤');
    }
  };

  const handleVoterLogin = () => {
    if (!selectedVoterId) {
      alert('請選擇您的姓名');
      return;
    }
    const doctor = doctors.find(d => d.id === selectedVoterId);
    if (doctor) {
      if (votedMap[doctor.name]) {
        alert('您本月已經完成投票，感謝您的參與！');
        return;
      }
      setCurrentUser(doctor);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsAdmin(false);
    setPasswordInput('');
    setSelectedVoterId('');
    setShowAdminLogin(false);
    initializeData();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-xl text-gray-600 font-bold animate-pulse">系統載入中...</div>
      </div>
    );
  }

  if (!config) return <div className="p-4 text-red-500">系統設定載入失敗，請檢查網路連線。</div>;

  // --- View: Admin Dashboard ---
  if (isAdmin) {
    return (
      <AdminDashboard 
        config={config} 
        onLogout={handleLogout} 
        onConfigUpdate={initializeData} 
      />
    );
  }

  // --- View: Voting Form ---
  if (currentUser) {
    return (
      <div className="min-h-screen bg-gray-100 px-4 py-8">
        <VotingForm 
          voter={currentUser} 
          config={config} 
          allDoctors={doctors}
          onVoteComplete={handleLogout}
          onLogout={handleLogout}
        />
      </div>
    );
  }

  // --- View: Login Screen (Default) ---
  const filteredDoctors = doctors
    .filter(d => d.role === selectedRole)
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-TW')); 

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden relative">
        <div className="bg-blue-600 p-6 text-center text-white">
          <h1 className="text-2xl font-bold mb-2">嘉南療養院</h1>
          <p className="text-blue-100">一般精神科優良醫師票選系統</p>
          <div className="mt-2 text-sm bg-blue-700 inline-block px-3 py-1 rounded-full">
            {config.currentYear} 年 {config.currentMonth} 月
          </div>
        </div>

        <div className="p-8 pb-12">
          {!showAdminLogin ? (
            // --- Doctor Login View ---
            <div className="space-y-6 animate-fade-in">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  請選擇您的身分
                </label>
                <div className="flex bg-gray-100 p-1 rounded-lg mb-4">
                  <button
                    className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${selectedRole === ROLES.RESIDENT ? 'bg-white shadow text-blue-700' : 'text-gray-500'}`}
                    onClick={() => { setSelectedRole(ROLES.RESIDENT); setSelectedVoterId(''); }}
                  >
                    住院醫師
                  </button>
                  <button
                    className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${selectedRole === ROLES.ATTENDING ? 'bg-white shadow text-blue-700' : 'text-gray-500'}`}
                    onClick={() => { setSelectedRole(ROLES.ATTENDING); setSelectedVoterId(''); }}
                  >
                    主治醫師
                  </button>
                </div>

                <label className="block text-sm font-medium text-gray-700 mb-2">
                  請選擇您的姓名 (依姓氏筆畫排列)
                </label>
                <div className="relative">
                  <UserCircle2 className="absolute left-3 top-3 text-gray-400" size={20} />
                  <select
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none bg-white"
                    value={selectedVoterId}
                    onChange={(e) => setSelectedVoterId(e.target.value)}
                  >
                    <option value="" disabled>-- 請下拉選擇 --</option>
                    {filteredDoctors.map(doctor => {
                      const hasVoted = votedMap[doctor.name];
                      return (
                        <option key={doctor.id} value={doctor.id} disabled={hasVoted} className={hasVoted ? 'text-gray-400 bg-gray-50' : ''}>
                          {doctor.name} {hasVoted ? '(已完成投票)' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <button
                  onClick={handleVoterLogin}
                  className="w-full mt-6 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-bold transition-colors shadow-md"
                >
                  進入投票
                </button>
              </div>
            </div>
          ) : (
            // --- Admin Login View ---
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center gap-2 mb-4">
                 <button 
                   onClick={() => setShowAdminLogin(false)}
                   className="p-1 rounded-full hover:bg-gray-100 text-gray-500"
                 >
                   <ArrowLeft size={20} />
                 </button>
                 <h3 className="font-bold text-gray-700">管理員登入</h3>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  請輸入管理密碼
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                  <input
                    type="password"
                    autoFocus
                    placeholder="預設: 0000"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 outline-none"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
                  />
                </div>

                <button 
                  onClick={handleAdminLogin}
                  className="w-full mt-6 bg-gray-800 text-white py-2 rounded-lg hover:bg-gray-900 font-bold transition-colors shadow-md"
                >
                  登入後台
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Subtle Admin Toggle Footer */}
        <div className="bg-gray-50 p-3 flex justify-between items-center text-xs text-gray-400 border-t border-gray-100 absolute bottom-0 w-full">
           <span>© {new Date().getFullYear()} 嘉南療養院</span>
           {!showAdminLogin && (
             <button 
               onClick={() => setShowAdminLogin(true)}
               className="flex items-center gap-1 opacity-50 hover:opacity-100 transition-opacity"
               title="管理員登入"
             >
               <Lock size={12} /> <span className="hidden sm:inline">管理員</span>
             </button>
           )}
        </div>
      </div>
    </div>
  );
};

export default App;
