import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ClipboardCheck, 
  Settings, 
  User, 
  Building2, 
  Calendar, 
  Send, 
  Trash2, 
  Edit3, 
  Check, 
  X,
  Lock,
  ArrowLeft,
  Loader2
} from "lucide-react";
import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc, getDocFromServer, onSnapshot, query, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

const departmentData: Record<string, string[]> = {
  "외주구매팀": ["조상현"],
  "사업장운영팀": ["김민기", "정주혁", "김민혁"],
  "RS장비PM1팀": ["최낙연", "박강리", "함현규", "조건호", "백재욱", "문준석", "엄아영"],
  "RS장비설계팀": ["김도영", "장다희", "정예린"],
  "제어기술팀": ["강덕완", "김동회", "박동기", "이재민", "이재훈", "류동환", "신동관"],
  "TS장비PM1팀": ["박준우", "우성문", "강동훈", "이준석", "정홍성", "김남희", "권기호", "류현석", "황보찬"],
  "TS장비설계팀": ["이경재", "박지예"],
  "안전보건팀": ["김민규"],
  "물류자동화설계팀": ["김민우", "임원창"],
  "자동화PM1팀": ["이시윤", "임상진", "맹민호", "류병규", "지승민"],
  "자동화PM2팀": ["최영봉", "김재용", "박영선", "홍승우"],
  "조립PM1팀": ["김대성", "박상혁", "이한주", "전종수", "진재우", "채호진", "이인영", "이효준"]
};
const departments = Object.keys(departmentData);

interface ApplicationEntry {
  id: string;
  department: string;
  name: string;
  date: string;
  createdAt: string;
}

export default function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [entries, setEntries] = useState<ApplicationEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialFetchDone, setInitialFetchDone] = useState(false);

  const DATE_LIMITS: Record<string, number> = {
    "(1차수) 5월 18일(월) 14시 ~ 16시": 22,
    "(2차수) 6월 4일(목) 14시 ~ 16시": 20,
    "(3차수) 6월 5일(금) 14시 ~ 16시": 14,
  };
  const DATES = Object.keys(DATE_LIMITS);
  
  // Form states
  const [department, setDepartment] = useState("");
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  
  // Edit states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDept, setEditDept] = useState("");
  const [editName, setEditName] = useState("");
  const [editDate, setEditDate] = useState("");

  const fetchEntries = async () => {
    try {
      const q = query(collection(db, "entries"));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ApplicationEntry[];
      setEntries(data);
    } catch (error) {
      console.error("Failed to fetch entries", error);
    }
  };

  useEffect(() => {
    const q = query(collection(db, "entries"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ApplicationEntry[];
      setEntries(data);
    }, (error) => {
      console.error("Firestore onSnapshot Error:", error);
    });

    setInitialFetchDone(true);
    return () => unsubscribe();
  }, []);

  const getRemainingSeats = (targetDate: string) => {
    const limit = DATE_LIMITS[targetDate];
    if (limit === undefined) return 0;
    const current = entries.filter(e => e.date === targetDate).length;
    return Math.max(0, limit - current);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!department || !name || !date) {
      alert("모든 항목을 입력해주세요.");
      return;
    }

    if (getRemainingSeats(date) <= 0) {
      alert("해당 차수는 마감이 완료되었습니다.");
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, "entries"), {
        department,
        name,
        date,
        createdAt: new Date().toISOString()
      });
      alert("신청이 완료되었습니다.");
      setDepartment("");
      setName("");
      setDate("");
    } catch (error) {
      console.error("신청 중 오류가 발생했습니다.", error);
      alert("신청 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword === "2016") {
      setIsAdmin(true);
      setShowAdminLogin(false);
      setAdminPassword("");
    } else {
      alert("비밀번호가 틀렸습니다.");
      setAdminPassword("");
    }
  };

  const handleDelete = async (id: string) => {
    try {
       await deleteDoc(doc(db, "entries", id));
    } catch (error) {
      console.error("삭제 중 오류가 발생했습니다.", error);
    }
  };

  const startEdit = (entry: ApplicationEntry) => {
    setEditingId(entry.id);
    setEditDept(entry.department);
    setEditName(entry.name);
    setEditDate(entry.date);
  };

  const handleUpdate = async (id: string) => {
    // If date changed, check limit again
    const entryToUpdate = entries.find(e => e.id === id);
    if (entryToUpdate && entryToUpdate.date !== editDate) {
      if (getRemainingSeats(editDate) <= 0) {
        alert("해당 차수는 마감이 완료되었습니다.");
        return;
      }
    }

    try {
      await updateDoc(doc(db, "entries", id), {
        department: editDept,
        name: editName,
        date: editDate
      });
      setEditingId(null);
    } catch (error) {
       console.error("수정 중 오류가 발생했습니다.", error);
      alert("수정 중 오류가 발생했습니다.");
    }
  };

  const totalTarget = Object.values(departmentData).flat().length;
  const appliedCount = entries.length;
  const notAppliedCount = Math.max(0, totalTarget - appliedCount);
  const appliedPercentage = totalTarget > 0 ? Math.min(100, Math.round((appliedCount / totalTarget) * 100)) : 0;

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] w-full bg-[#f8f8f8] text-[#111] font-sans selection:bg-[#f97316] selection:text-black overflow-hidden items-stretch">
      {/* Responsive Header / Sidebar */}
      <aside className="w-full md:w-[400px] lg:w-[450px] bg-[#111] text-[#f97316] p-8 md:p-12 lg:p-16 flex flex-col justify-between shrink-0 relative overflow-hidden z-20 shadow-[0_4px_30px_rgba(0,0,0,0.1)] md:shadow-[20px_0_30px_rgba(0,0,0,0.3)]">
        <div className="absolute -right-4 -top-8 md:-right-20 md:top-40 text-[120px] md:text-[180px] font-black leading-none opacity-5 select-none rotate-12 md:rotate-90 whitespace-nowrap pointer-events-none">
          SECURE
        </div>
        
        <div className="flex md:flex-col justify-between items-start relative z-10 h-full">
          <div>
            <div className="text-4xl md:text-7xl lg:text-8xl font-black leading-none mb-4 md:mb-6 tracking-tighter">
              SAFETY<br />FIRST
            </div>
            <div className="h-1.5 md:h-2 w-16 md:w-24 bg-[#f97316] mb-4 md:mb-10"></div>
            <h1 className="text-lg md:text-2xl font-bold tracking-tight text-white leading-snug cursor-default">
              체험형 안전 교육<br className="hidden md:block" />참가 신청 시스템
            </h1>
          </div>

          <div className="flex flex-col items-end md:items-start md:mt-auto gap-3 md:gap-6 shrink-0 mt-2 md:w-full">
            <p className="text-[10px] md:text-xs uppercase tracking-[0.3em] font-black text-zinc-500 md:mb-4">
              Training Hub v3.0
            </p>
            {!isAdmin && !showAdminLogin && (
              <button 
                onClick={() => setShowAdminLogin(true)}
                className="p-3 md:px-6 md:py-4 md:w-full border-2 border-zinc-700 bg-[#111] hover:bg-zinc-800 transition-colors text-white outline-none flex items-center justify-center md:justify-start gap-4 group"
              >
                <Settings className="w-5 h-5 pointer-events-none md:group-hover:rotate-90 transition-transform" />
                <span className="hidden md:block font-black text-xs tracking-widest uppercase">Admin Login</span>
              </button>
            )}
            {isAdmin && (
              <button 
                onClick={() => {
                  setIsAdmin(false);
                  setAdminPassword("");
                }}
                className="p-3 md:px-6 md:py-4 md:w-full border-2 border-zinc-700 bg-[#111] hover:bg-zinc-800 transition-colors text-white outline-none flex items-center justify-center md:justify-start gap-4 group"
              >
                <ArrowLeft className="w-5 h-5 pointer-events-none md:group-hover:-translate-x-2 transition-transform" />
                <span className="hidden md:block font-black text-xs tracking-widest uppercase">Exit Admin</span>
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-y-auto bg-[#f8f8f8]">
          <AnimatePresence mode="wait">
            {!showAdminLogin && !isAdmin && (
              <motion.div 
                key="apply-form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="min-h-full flex flex-col p-6 pb-12 md:p-16 lg:p-24 md:justify-center md:items-center"
              >
                <div className="w-full max-w-lg flex flex-col h-full md:h-auto">
                  <div className="flex items-baseline gap-4 mb-10 mt-4 md:mb-16">
                    <span className="text-5xl md:text-6xl font-black italic tracking-tighter text-[#111]">01</span>
                    <h2 className="text-2xl md:text-4xl font-bold tracking-tighter uppercase">신청서 작성</h2>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-10 flex-1 flex flex-col">
                  <div className="space-y-8 flex-1">
                    {/* Department */}
                    <div className="group border-b-2 border-black pb-3 transition-all focus-within:border-[#f97316]">
                      <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-2 group-focus-within:text-black">
                        01. 부서명
                      </label>
                      <select 
                        value={department}
                        onChange={(e) => {
                          setDepartment(e.target.value);
                          setName(""); // Reset name when department changes
                        }}
                        className="w-full bg-transparent text-xl font-black outline-none appearance-none cursor-pointer text-[#111]"
                      >
                        <option value="" disabled className="text-base font-medium text-zinc-400">부서를 선택하세요</option>
                        {departments.map(dept => (
                          <option key={dept} value={dept} className="text-base font-medium text-zinc-800">{dept}</option>
                        ))}
                      </select>
                    </div>

                    {/* Name */}
                    <div className="group border-b-2 border-black pb-3 transition-all focus-within:border-[#f97316]">
                      <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-2 group-focus-within:text-black">
                        02. 이름
                      </label>
                      <select 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={!department}
                        className="w-full bg-transparent text-xl font-black outline-none appearance-none cursor-pointer text-[#111] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="" disabled className="text-base font-medium text-zinc-400">이름을 선택하세요</option>
                        {department && departmentData[department].map(n => (
                          <option key={n} value={n} className="text-base font-medium text-zinc-800">{n}</option>
                        ))}
                      </select>
                    </div>

                    {/* Date */}
                    <div className="group border-b-2 border-black pb-3 transition-all focus-within:border-[#f97316]">
                      <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-2 group-focus-within:text-black">
                        03. 참석 일자
                      </label>
                      <select 
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full bg-transparent text-lg font-black outline-none cursor-pointer appearance-none text-[#111]"
                      >
                        <option value="" disabled className="text-base font-medium text-zinc-400">참석 일자를 선택하세요</option>
                        {DATES.map(d => {
                          const remaining = getRemainingSeats(d);
                          const isFull = remaining === 0;
                          return (
                            <option key={d} value={d} disabled={isFull} className={`text-base font-medium ${isFull ? 'text-zinc-400' : 'text-zinc-800'}`}>
                              {d}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-full mt-8 bg-[#111] text-[#f97316] py-5 text-xl font-black uppercase tracking-[0.1em] hover:bg-zinc-800 transition-all shadow-[8px_8px_0px_#f97316] active:translate-x-1 active:translate-y-1 active:shadow-[4px_4px_0px_#f97316] disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-4 outline-none"
                  >
                    {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
                    신청서 제출
                  </button>
                </form>
                </div>
              </motion.div>
            )}

            {showAdminLogin && (
              <motion.div 
                key="admin-overlay"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="absolute inset-0 bg-[#111] flex flex-col items-center justify-center p-8 z-50 overflow-y-auto"
              >
                <div className="text-center w-full max-w-sm mt-[-10vh]">
                  <div className="mb-10">
                    <div className="inline-block p-4 bg-[#f97316] mb-6 rounded-full">
                      <Lock className="w-8 h-8 text-black" />
                    </div>
                    <label className="block text-[#f97316] font-black text-xs tracking-[0.3em] mb-4 uppercase">
                      Admin Required
                    </label>
                  </div>

                  <form onSubmit={handleAdminLogin}>
                    <input 
                      type="password" 
                      autoFocus
                      maxLength={4}
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="••••"
                      className="bg-transparent border-b-2 border-[#f97316] text-white text-6xl text-center w-full outline-none font-black tracking-[0.5em] placeholder:text-zinc-800 pb-2"
                    />
                    
                    <div className="mt-12 space-y-4">
                      <button 
                        type="submit"
                        className="w-full py-4 bg-[#f97316] text-black font-black uppercase text-base tracking-widest hover:scale-[1.02] active:scale-95 transition-all outline-none"
                      >
                        Access System
                      </button>
                      <button 
                        type="button"
                        onClick={() => {
                          setShowAdminLogin(false);
                          setAdminPassword("");
                        }}
                        className="text-zinc-500 hover:text-white transition-colors font-bold text-xs uppercase tracking-widest outline-none py-2"
                      >
                        Cancel Entry
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            )}

            {isAdmin && (
              <motion.div 
                key="admin-dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="min-h-full p-6 pb-12 md:p-16 lg:p-24"
              >
                <div className="flex justify-between items-end gap-4 mb-6 md:mb-12 mt-2">
                  <div>
                    <h2 className="text-4xl md:text-6xl font-black tracking-tighter uppercase leading-none">
                      Admin<br />Control
                    </h2>
                    <p className="text-[10px] font-bold text-zinc-400 mt-4 tracking-widest uppercase flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                      System Status
                    </p>
                  </div>
                  <button 
                    onClick={fetchEntries}
                    className="bg-white border-2 border-black p-3 hover:bg-zinc-100 transition-colors outline-none active:translate-y-0.5 active:shadow-none shadow-[2px_2px_0px_rgba(0,0,0,1)]"
                  >
                    <Loader2 className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {/* Progress Bar Container */}
                <div className="mb-8 border-2 border-black p-4 bg-white shadow-[4px_4px_0px_rgba(0,0,0,0.05)]">
                  <div className="flex justify-between items-end mb-3">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Application Progress</span>
                    <span className="text-xl font-black text-[#f97316] leading-none">{appliedPercentage}%</span>
                  </div>
                  <div className="w-full h-3 border border-black bg-zinc-100 overflow-hidden flex">
                    <div className="h-full bg-[#f97316] transition-all duration-1000 ease-out" style={{ width: `${appliedPercentage}%` }}></div>
                  </div>
                  <div className="flex justify-between items-center mt-3 text-[10px] font-black uppercase tracking-[0.1em] text-zinc-500">
                    <div>Applied: <span className="text-black text-sm">{appliedCount}</span></div>
                    <div>Total: <span className="text-black text-sm">{totalTarget}</span></div>
                    <div>Wait: <span className="text-[#f97316] text-sm">{notAppliedCount}</span></div>
                  </div>
                </div>

                <div className="overflow-x-auto border-2 border-black shadow-[8px_8px_0px_rgba(0,0,0,0.05)] bg-white -mx-2 px-2 pb-2">
                  <table className="w-full text-left border-collapse min-w-[500px]">
                    <thead>
                      <tr className="bg-black text-[#f97316]">
                        <th className="px-3 py-4 font-black text-[10px] uppercase tracking-[0.2em] whitespace-nowrap">No.</th>
                        <th className="px-3 py-4 font-black text-[10px] uppercase tracking-[0.2em] whitespace-nowrap">Dept</th>
                        <th className="px-3 py-4 font-black text-[10px] uppercase tracking-[0.2em] whitespace-nowrap">Name</th>
                        <th className="px-3 py-4 font-black text-[10px] uppercase tracking-[0.2em] whitespace-nowrap">Date</th>
                        <th className="px-3 py-4 font-black text-[10px] uppercase tracking-[0.2em] text-right whitespace-nowrap">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black">
                      {entries.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-12 text-center">
                            <p className="text-lg font-black text-zinc-300 italic uppercase">Database Empty</p>
                          </td>
                        </tr>
                      ) : (
                        entries.map((entry, idx) => (
                          <tr key={entry.id} className="group hover:bg-[#f97316]/5 transition-colors">
                            <td className="px-3 py-4 font-mono text-xs text-zinc-400 whitespace-nowrap">
                              {(idx + 1).toString().padStart(3, '0')}
                            </td>
                            <td className="px-3 py-4">
                              {editingId === entry.id ? (
                                <select 
                                  value={editDept}
                                  onChange={(e) => {
                                    setEditDept(e.target.value);
                                    setEditName(""); // Reset name
                                  }}
                                  className="w-full border-b-2 border-black bg-transparent py-1 font-black outline-none appearance-none cursor-pointer text-xs"
                                >
                                  <option value="" disabled className="text-xs font-medium text-zinc-400">부서 선택</option>
                                  {departments.map(dept => (
                                    <option key={dept} value={dept} className="text-xs font-medium text-zinc-800">{dept}</option>
                                  ))}
                                </select>
                              ) : (
                                <span className="text-sm font-black uppercase tracking-tight whitespace-nowrap">{entry.department}</span>
                              )}
                            </td>
                            <td className="px-3 py-4 font-bold text-gray-700 text-sm whitespace-nowrap">
                              {editingId === entry.id ? (
                                <select 
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  disabled={!editDept}
                                  className="w-full border-b-2 border-black bg-transparent py-1 font-black outline-none appearance-none cursor-pointer disabled:opacity-50 text-xs"
                                >
                                  <option value="" disabled className="text-xs font-medium text-zinc-400">이름 선택</option>
                                  {editDept && departmentData[editDept] && departmentData[editDept].map(n => (
                                    <option key={n} value={n} className="text-xs font-medium text-zinc-800">{n}</option>
                                  ))}
                                </select>
                              ) : entry.name}
                            </td>
                            <td className="px-3 py-4 font-mono font-bold tracking-tighter text-xs whitespace-nowrap">
                              {editingId === entry.id ? (
                                <select 
                                  value={editDate}
                                  onChange={(e) => setEditDate(e.target.value)}
                                  className="w-32 border-b-2 border-black bg-transparent py-1 font-black outline-none appearance-none cursor-pointer text-[10px]"
                                >
                                  <option value="" disabled className="text-xs font-medium text-zinc-400">일자 선택</option>
                                  {DATES.map(d => {
                                    const remaining = getRemainingSeats(d);
                                    const isFull = remaining === 0 && d !== entry.date;
                                    return (
                                      <option key={d} value={d} disabled={isFull} className={`text-xs font-medium ${isFull ? 'text-zinc-400' : 'text-zinc-800'}`}>
                                        {d}
                                      </option>
                                    );
                                  })}
                                </select>
                              ) : entry.date}
                            </td>
                            <td className="px-3 py-4">
                              <div className="flex justify-end gap-3">
                                {editingId === entry.id ? (
                                  <>
                                    <button onClick={() => handleUpdate(entry.id)} className="text-green-600 hover:scale-110 transition-transform outline-none">
                                      <Check className="w-5 h-5 border border-green-600 p-0.5" />
                                    </button>
                                    <button onClick={() => setEditingId(null)} className="text-red-600 hover:scale-110 transition-transform outline-none">
                                      <X className="w-5 h-5 border border-red-600 p-0.5" />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button 
                                      onClick={() => startEdit(entry)} 
                                      className="text-[10px] font-black uppercase underline tracking-widest hover:text-blue-600 transition-colors outline-none"
                                    >
                                      Edit
                                    </button>
                                    <button 
                                      onClick={() => handleDelete(entry.id)} 
                                      className="text-[10px] font-black uppercase underline tracking-widest hover:text-red-600 transition-colors outline-none"
                                    >
                                      Del
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
    </div>
  );
}
