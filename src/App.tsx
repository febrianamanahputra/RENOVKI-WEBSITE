import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import BobotTable from './components/BobotTable';
import TimeSchedule from './components/TimeSchedule';
import ReportHeader from './components/ReportHeader';
import Sampul from './components/Sampul';
import { signInWithGoogle, logOut, onAuthStateChanged } from './lib/firebase';
import { 
  BookOpen, 
  CalendarDays, 
  TrendingUp, 
  Package, 
  WalletCards, 
  ClipboardList, 
  Camera,
  MapPin,
  ChevronDown,
  Plus,
  LogOut,
  User
} from 'lucide-react';

const menus = [
  {
    title: 'Sampul',
    icon: BookOpen,
    gradient: 'from-[#4158D0] via-[#C850C0] to-[#FFCC70]',
    description: 'Halaman depan & ringkasan proyek',
  },
  {
    title: 'Timeschedule',
    icon: CalendarDays,
    gradient: 'from-[#11998e] to-[#38ef7d]',
    description: 'Jadwal dan tenggat waktu',
  },
  {
    title: 'Bobot',
    icon: TrendingUp,
    gradient: 'from-[#8E2DE2] to-[#4A00E0]',
    description: 'Persentase dan progres fisik',
  },
  {
    title: 'Stock Material',
    icon: Package,
    gradient: 'from-[#f2994a] to-[#f2c94c]',
    description: 'Inventaris dan ketersediaan bahan',
  },
  {
    title: 'Gaji Tukang',
    icon: WalletCards,
    gradient: 'from-[#eb3349] to-[#f45c43]',
    description: 'Penggajian dan kas bon',
  },
  {
    title: 'Laporan Pekanan',
    icon: ClipboardList,
    gradient: 'from-[#00c6ff] to-[#0072ff]',
    description: 'Rekapitulasi progres mingguan',
  },
  {
    title: 'Dokumentasi Pekanan',
    icon: Camera,
    gradient: 'from-[#02aab0] to-[#00cdac]',
    description: 'Foto dan bukti kerja lapangan',
  },
];

export default function App() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [activeView, setActiveView] = useState<'dashboard' | 'bobot' | 'timeschedule' | 'sampul'>('dashboard');
  
  const [user, setUser] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(user => {
      setUser(user);
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    setAuthError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setAuthError(err?.message || "Failed to sign in with Google.");
    }
  };

  const handleLogout = async () => {
    try {
      await logOut();
    } catch (err) {
      console.error(err);
    }
  };

  const [locations, setLocations] = useState<{id: string, name: string}[]>(() => {
    const saved = localStorage.getItem('renovki_locations');
    return saved ? JSON.parse(saved) : [{ id: '1', name: 'Proyek Utama' }];
  });
  
  const [activeLocationId, setActiveLocationId] = useState(() => {
    return localStorage.getItem('renovki_active_location') || '1';
  });

  const activeLocation = locations.find(l => l.id === activeLocationId) || locations[0];

  const handleAddLocation = () => {
    const name = window.prompt("Nama Lokasi Baru:");
    if (name?.trim()) {
      const newLoc = { id: Date.now().toString(), name: name.trim() };
      const newLocations = [...locations, newLoc];
      setLocations(newLocations);
      setActiveLocationId(newLoc.id);
      localStorage.setItem('renovki_locations', JSON.stringify(newLocations));
      localStorage.setItem('renovki_active_location', newLoc.id);
    }
  };

  const handleLocationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '__ADD__') {
       handleAddLocation();
    } else {
       setActiveLocationId(val);
       localStorage.setItem('renovki_active_location', val);
    }
  };

  // The below state must be tied to the current location ideally, but for now we prefix them.
  const [pekan, setPekan] = useState(localStorage.getItem(`global_pekan_${activeLocationId}`) || '1');
  const [baseStartDate, setBaseStartDate] = useState(localStorage.getItem(`global_base_start_date_${activeLocationId}`) || '');
  
  // Update state when location changes
  useEffect(() => {
    setPekan(localStorage.getItem(`global_pekan_${activeLocationId}`) || '1');
    setBaseStartDate(localStorage.getItem(`global_base_start_date_${activeLocationId}`) || '');
  }, [activeLocationId]);

  const [pekanList, setPekanList] = useState<number[]>(() => {
    const saved = localStorage.getItem(`renovki_pekan_list_${activeLocationId}`);
    return saved ? JSON.parse(saved) : Array.from({length: 26}, (_, i) => i + 1);
  });

  useEffect(() => {
     const saved = localStorage.getItem(`renovki_pekan_list_${activeLocationId}`);
     setPekanList(saved ? JSON.parse(saved) : Array.from({length: 26}, (_, i) => i + 1));
  }, [activeLocationId]);

  const handleAddPekan = () => {
     const next = (pekanList[pekanList.length - 1] || 0) + 1;
     const newList = [...pekanList, next];
     setPekanList(newList);
     setPekan(String(next));
     localStorage.setItem(`renovki_pekan_list_${activeLocationId}`, JSON.stringify(newList));
  };

  const computedStartDate = React.useMemo(() => {
    if (!baseStartDate) return '';
    const d = new Date(baseStartDate);
    const pekanNum = parseInt(pekan, 10);
    if (!isNaN(pekanNum) && pekanNum > 0) {
      d.setDate(d.getDate() + (pekanNum - 1) * 7);
    }
    return d.toISOString().split('T')[0];
  }, [baseStartDate, pekan]);

  const handleSetStartDate = (val: string) => {
    if (!val) {
      setBaseStartDate('');
      return;
    }
    const d = new Date(val);
    const pekanNum = parseInt(pekan, 10);
    if (!isNaN(pekanNum) && pekanNum > 0) {
      d.setDate(d.getDate() - (pekanNum - 1) * 7);
    }
    setBaseStartDate(d.toISOString().split('T')[0]);
  };

  useEffect(() => {
    localStorage.setItem(`global_pekan_${activeLocationId}`, pekan);
  }, [pekan, activeLocationId]);

  useEffect(() => {
    if (baseStartDate) {
      localStorage.setItem(`global_base_start_date_${activeLocationId}`, baseStartDate);
    } else {
      localStorage.removeItem(`global_base_start_date_${activeLocationId}`);
    }
  }, [baseStartDate, activeLocationId]);

  if (loadingAuth) {
    return (
       <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
          Loading...
       </div>
    );
  }

  const isFirebaseConfigured = !!import.meta.env.VITE_FIREBASE_API_KEY;

  if (!isFirebaseConfigured) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-xl border border-red-500/50 p-8 rounded-3xl max-w-2xl w-full text-white shadow-2xl">
          <h2 className="text-2xl font-bold text-red-400 mb-4 flex items-center gap-2">
            ⚠️ Firebase Configuration Missing
          </h2>
          <p className="mb-4 text-white/80">
            Aplikasi ini membutuhkan Firebase untuk Autentikasi dan Database. Untuk mendeploy ke Vercel atau menjalankannya lokal, Anda harus mengisi environment variables berikut di <code className="bg-black/30 px-1 py-0.5 rounded">.env</code> atau dashboard Vercel.
          </p>
          <ul className="list-disc pl-5 mb-6 space-y-2 font-mono text-sm text-white/90 bg-black/20 p-4 rounded-xl">
            <li>VITE_FIREBASE_API_KEY</li>
            <li>VITE_FIREBASE_AUTH_DOMAIN</li>
            <li>VITE_FIREBASE_PROJECT_ID</li>
            <li>VITE_FIREBASE_STORAGE_BUCKET</li>
            <li>VITE_FIREBASE_MESSAGING_SENDER_ID</li>
            <li>VITE_FIREBASE_APP_ID</li>
          </ul>
          <p className="text-sm text-white/60">
            Pastikan Anda menggunakan Firestore dan metode SignInWithPopup Google (aktifkan provider Google Auth di console Firebase).
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center relative overflow-hidden">
         {/* Background with watermark Glass */}
         <div className="fixed inset-0 z-0 flex items-center justify-center opacity-[0.04] pointer-events-none overflow-hidden">
           <h1 className="text-[12vw] font-black text-white whitespace-nowrap rotate-[-15deg] select-none tracking-tighter mix-blend-overlay">
             RENOVKI
           </h1>
         </div>
         {/* Gradient ambient */}
         <div className="fixed inset-0 z-0 bg-[radial-gradient(circle_at_top_right,rgba(100,150,255,0.15),transparent_50%),radial-gradient(circle_at_bottom_left,rgba(255,100,200,0.15),transparent_50%))] mix-blend-screen pointer-events-none" />
         
         <motion.div 
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           className="relative z-10 bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl"
         >
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6 backdrop-blur-sm shadow-inner border border-white/30">
               <BookOpen className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl font-extrabold text-white mb-2 tracking-tight">Login</h2>
            <p className="text-white/70 mb-8 text-sm">Masuk untuk mengakses dashboard Renovki Manajemen Proyek.</p>
            
            {authError && (
              <div className="bg-red-500/20 border border-red-500/50 text-red-100 text-sm p-3 rounded-lg mb-6">
                {authError}
              </div>
            )}

            <button 
              onClick={handleLogin}
              className="w-full bg-white text-slate-900 font-bold hover:bg-slate-100 py-3 px-4 rounded-xl transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Masuk dengan Google
            </button>
         </motion.div>
      </div>
    );
  }

  if (activeView === 'bobot') {
    return (
      <div className="flex flex-col min-h-screen bg-[#f0f2f5]">
        <ReportHeader pekan={pekan} setPekan={setPekan} startDate={computedStartDate} setStartDate={handleSetStartDate} />
        <BobotTable key={`bobot-${activeLocationId}`} pekan={pekan} locationId={activeLocationId} onBack={() => setActiveView('dashboard')} />
      </div>
    );
  }

  if (activeView === 'timeschedule') {
    return (
      <div className="flex flex-col min-h-screen bg-[#f0f2f5]">
        <ReportHeader pekan={pekan} setPekan={setPekan} startDate={computedStartDate} setStartDate={handleSetStartDate} />
        <TimeSchedule key={`ts-${activeLocationId}`} pekan={pekan} locationId={activeLocationId} onBack={() => setActiveView('dashboard')} />
      </div>
    );
  }

  if (activeView === 'sampul') {
    return (
      <div className="flex flex-col min-h-screen bg-[#f0f2f5]">
        <ReportHeader pekan={pekan} setPekan={setPekan} startDate={computedStartDate} setStartDate={handleSetStartDate} />
        <Sampul key={`sampul-${activeLocationId}`} pekan={pekan} startDate={computedStartDate} locationId={activeLocationId} onBack={() => setActiveView('dashboard')} />
      </div>
    );
  }

  return (
    <div className="min-h-screen font-['Helvetica_Neue',Arial,sans-serif] overflow-hidden flex flex-col relative w-full bg-slate-900">
      {/* Background with watermark Glass */}
      <div className="fixed inset-0 z-0 flex items-center justify-center opacity-[0.04] pointer-events-none overflow-hidden">
        <h1 className="text-[12vw] font-black text-white whitespace-nowrap rotate-[-15deg] select-none tracking-tighter mix-blend-overlay">
          DASHBOARD - RENOVKI
        </h1>
      </div>
      {/* Gradient ambient */}
      <div className="fixed inset-0 z-0 bg-[radial-gradient(circle_at_top_right,rgba(100,150,255,0.15),transparent_50%),radial-gradient(circle_at_bottom_left,rgba(255,100,200,0.15),transparent_50%))] mix-blend-screen pointer-events-none" />
      {/* Glass overlay */}
      <div className="fixed inset-0 z-0 backdrop-blur-[40px] bg-white/10 pointer-events-none border-t border-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]" />

      <main className="max-w-7xl mx-auto px-[20px] sm:px-[40px] py-[40px] relative z-10 w-full flex-1 flex flex-col">
        {/* Header - User Info & Logout */}
        <div className="flex justify-between items-center mb-8 relative z-20">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-white/20 border border-white/30 overflow-hidden flex items-center justify-center shadow-lg">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="User profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <User className="w-5 h-5 text-white" />
                )}
             </div>
             <div className="text-left hidden sm:block">
                <p className="text-white font-bold text-sm leading-tight drop-shadow-md">{user?.displayName || 'User'}</p>
                <p className="text-white/70 text-xs">{user?.email}</p>
             </div>
          </div>
          <button 
             onClick={handleLogout}
             className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/40 text-red-100 border border-red-500/30 rounded-xl transition-all shadow-sm text-sm font-semibold"
          >
             <LogOut className="w-4 h-4" />
             <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-8 lg:mb-12"
        >
          {/* Lokasi Selection */}
          <div className="flex items-center gap-2 mb-6 text-white/80">
             <MapPin className="w-5 h-5" />
             <span className="text-sm font-medium tracking-wider uppercase">Lokasi Area Kerja:</span>
             <div className="relative ml-2 group">
                <select 
                   value={activeLocationId}
                   onChange={handleLocationChange}
                   className="appearance-none bg-white/10 backdrop-blur-md border border-white/20 text-white pl-4 pr-10 py-1.5 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-white/50 cursor-pointer shadow-sm transition-all hover:bg-white/20"
                >
                   {locations.map(loc => (
                       <option key={loc.id} value={loc.id} className="text-black">{loc.name}</option>
                   ))}
                   <option value="__ADD__" className="text-indigo-600 font-bold">+ Tambah Lokasi Baru</option>
                </select>
                <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none transition-transform group-hover:translate-y-[-30%]" />
             </div>
          </div>

          <div className="flex flex-col gap-1 mb-2">
             <div className="flex items-center gap-3">
                 <h2 className="text-[32px] md:text-[42px] font-[800] text-white tracking-tight drop-shadow-md">
                   Pekan Ke
                 </h2>
                 <div className="relative inline-flex items-center shadow-lg rounded-xl overflow-hidden backdrop-blur-md border border-white/30 bg-black/20">
                    <select 
                        value={pekan}
                        onChange={(e) => setPekan(e.target.value)}
                        className="appearance-none bg-transparent text-white text-[28px] md:text-[36px] font-[800] pl-6 pr-12 py-1 focus:outline-none cursor-pointer text-center min-w-[100px]"
                    >
                        {pekanList.map(p => (
                            <option key={p} value={p} className="text-black text-xl">{p}</option>
                        ))}
                    </select>
                    <ChevronDown className="w-6 h-6 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/70" />
                 </div>
                 <button 
                    onClick={handleAddPekan}
                    className="p-2 ml-2 bg-white/10 hover:bg-white/30 transition-colors rounded-full border border-white/20 text-white shadow-sm flex items-center justify-center group"
                    title="Tambah Pekan"
                 >
                    <Plus className="w-6 h-6 transition-transform group-hover:scale-110" />
                 </button>
             </div>
          </div>
          
          {/* Tanggal Picker */}
          <div className="flex items-center gap-3 mt-4 bg-black/20 backdrop-blur-md border border-white/20 rounded-xl px-4 py-2.5 max-w-fit shadow-lg inline-flex text-white">
            <span className="text-sm font-semibold tracking-wider text-white/90">Mulai:</span>
            <input 
              type="date"
              value={baseStartDate}
              onChange={(e) => setBaseStartDate(e.target.value)}
              className="bg-transparent border-none text-white text-sm font-medium focus:outline-none focus:ring-0 [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert cursor-pointer"
            />
            <span className="text-white/40 mx-1">|</span>
            <span className="text-sm font-semibold tracking-wider text-white/90">Selesai:</span>
            <span className="text-sm font-bold text-white bg-white/20 px-3 py-1 rounded-md">
               {computedStartDate ? (() => {
                  const start = new Date(computedStartDate);
                  const end = new Date(start);
                  end.setDate(start.getDate() + 5);
                  return `${end.getDate().toString().padStart(2, '0')}/${(end.getMonth()+1).toString().padStart(2,'0')}/${end.getFullYear()}`;
               })() : '-'}
            </span>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[24px] relative z-10 w-full mt-4">
          {menus.map((menu, index) => {
            const Icon = menu.icon;
            const isHovered = hoveredIndex === index;
            
            return (
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ 
                  delay: index * 0.08, 
                  duration: 0.5, 
                  ease: [0.21, 0.47, 0.32, 0.98] 
                }}
                key={index} 
                className="relative overflow-hidden rounded-[24px] p-[25px] cursor-pointer transition-all duration-300 hover:-translate-y-2 group shadow-[0_10px_30px_rgba(0,0,0,0.15)] border border-white/20 flex flex-col justify-between min-h-[200px]"
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                onClick={() => {
                  if (menu.title === 'Bobot') {
                    setActiveView('bobot');
                  } else if (menu.title === 'Timeschedule') {
                    setActiveView('timeschedule');
                  } else if (menu.title === 'Sampul') {
                    setActiveView('sampul');
                  }
                }}
              >
                {/* Glass card background */}
                <div className={`absolute inset-0 bg-gradient-to-br ${menu.gradient} opacity-80 backdrop-blur-xl mix-blend-multiply z-0`} />
                <div className="absolute inset-0 bg-white/10 z-0"></div>
                
                {/* Large Watermark Icon */}
                <motion.div 
                  initial={false}
                  animate={{ 
                    scale: isHovered ? 1.2 : 1,
                    rotate: isHovered ? -15 : -5,
                    opacity: isHovered ? 0.3 : 0.15
                  }}
                  transition={{ duration: 0.4 }}
                  className="absolute -right-4 -bottom-6 pointer-events-none z-0"
                >
                  <Icon className="w-44 h-44 text-white mix-blend-overlay" strokeWidth={1} />
                </motion.div>
                
                {/* Card Content */}
                <div className="relative z-10 flex flex-col items-start justify-between h-full">
                  <div className="w-[56px] h-[56px] bg-white/25 rounded-[16px] backdrop-blur-[8px] border border-white/40 flex items-center justify-center transition-transform duration-300 group-hover:scale-110 mb-6 shadow-sm">
                    <Icon className="w-7 h-7 text-white drop-shadow-md" strokeWidth={2.5} />
                  </div>
                  
                  <div className="mt-auto w-full">
                    <h3 className="text-[20px] font-[800] text-white mb-[8px] drop-shadow-md tracking-tight">
                      {menu.title}
                    </h3>
                    <p className="text-[13px] text-white/90 leading-[1.4] drop-shadow-sm font-medium">
                      {menu.description}
                    </p>
                    
                    {/* Hover indicator line */}
                    <div className="h-1.5 w-0 bg-white/80 mt-5 rounded-full transition-all duration-500 group-hover:w-full shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
