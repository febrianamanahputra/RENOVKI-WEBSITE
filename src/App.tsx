import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import BobotTable from './components/BobotTable';
import TimeSchedule from './components/TimeSchedule';
import ReportHeader from './components/ReportHeader';
import Sampul from './components/Sampul';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useCollectionData } from 'react-firebase-hooks/firestore';
import { auth, db, signInWithGoogle, logout, handleFirestoreError } from './firebase';
import { collection, doc, setDoc, query, where, serverTimestamp } from 'firebase/firestore';
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
  Loader2
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

const INITIAL_LOCATION = { id: 'loc-1', name: 'Proyek Utama', workspaceId: 'global', pekanAktif: '1', startDate: '', pekanList: Array.from({length: 26}, (_, i) => i + 1) };

export default function App() {
  const [user, loading] = useAuthState(auth);
  
  if (loading) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><Loader2 className="w-10 h-10 text-white animate-spin" /></div>;
  }
  
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-900 flex flex-col items-center justify-center font-['Helvetica_Neue',Arial,sans-serif] p-4 text-center">
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter mb-4 drop-shadow-lg">RENOVKI DASHBOARD</h1>
        <p className="text-white/80 mb-8 max-w-md">Sistem Laporan Konstruksi Real-Time<br/>Masuk untuk mengakses dan menyinkronkan data proyek Anda.</p>
        <button 
          onClick={signInWithGoogle}
          className="flex items-center gap-3 bg-white text-slate-800 px-6 py-3 rounded-xl shadow-xl font-bold hover:-translate-y-1 hover:shadow-2xl transition-all"
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
          Masuk dengan Google
        </button>
      </div>
    );
  }

  return <Dashboard user={user} />;
}

function Dashboard({ user }: { user: any }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [activeView, setActiveView] = useState<'dashboard' | 'bobot' | 'timeschedule' | 'sampul'>('dashboard');

  const locationsRef = collection(db, 'locations');
  const qLocations = query(locationsRef, where('workspaceId', '==', 'global'));
  
  // Real-time locations listener
  const [locationsData, loadingLocations, errorLocations] = useCollectionData(qLocations);
  // inject id manually since idField is deprecated
  const locations = locationsData && locationsData.length > 0 ? locationsData as any[] : [INITIAL_LOCATION];

  const [activeLocationId, setActiveLocationId] = useState(() => {
    return localStorage.getItem('renovki_active_location') || 'loc-1';
  });

  // Keep location sync with storage
  useEffect(() => {
      if(activeLocationId) {
          localStorage.setItem('renovki_active_location', activeLocationId);
      }
  }, [activeLocationId]);

  const activeLocation = locations.find(l => l.id === activeLocationId) || locations[0];
  const pekan = activeLocation?.pekanAktif || '1';
  const baseStartDate = activeLocation?.startDate || '';
  const pekanList = activeLocation?.pekanList || Array.from({length: 26}, (_, i) => i + 1);

  // Initial dummy doc push if empty
  useEffect(() => {
     if (!loadingLocations && locationsData?.length === 0) {
        setDoc(doc(db, 'locations', 'loc-1'), {
            ...INITIAL_LOCATION,
            createdBy: user.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        }).catch(e => handleFirestoreError(e, 'create', 'locations/loc-1'));
     }
  }, [loadingLocations, locationsData, user]);

  const handleAddLocation = async () => {
    const name = window.prompt("Nama Lokasi Baru:");
    if (name?.trim()) {
      const newLocId = `loc-${Date.now()}`;
      try {
          await setDoc(doc(db, 'locations', newLocId), {
              name: name.trim(),
              workspaceId: 'global',
              pekanAktif: '1',
              startDate: '',
              pekanList: Array.from({length: 26}, (_, i) => i + 1),
              createdBy: user.uid,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
          });
          setActiveLocationId(newLocId);
      } catch (e) {
          handleFirestoreError(e, 'create', `locations/${newLocId}`);
      }
    }
  };

  const handleLocationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '__ADD__') {
       handleAddLocation();
    } else {
       setActiveLocationId(val);
    }
  };

  const updateLocationField = async (field: string, value: any) => {
     if(!activeLocation.id) return;
     try {
         await setDoc(doc(db, 'locations', activeLocation.id), {
             [field]: value,
             updatedAt: serverTimestamp()
         }, { merge: true });
     } catch (e) {
         handleFirestoreError(e, 'update', `locations/${activeLocation.id}`);
     }
  };

  const handleAddPekan = () => {
     const next = (pekanList[pekanList.length - 1] || 0) + 1;
     const newList = [...pekanList, next];
     updateLocationField('pekanList', newList);
     updateLocationField('pekanAktif', String(next));
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
      updateLocationField('startDate', '');
      return;
    }
    const d = new Date(val);
    const pekanNum = parseInt(pekan, 10);
    if (!isNaN(pekanNum) && pekanNum > 0) {
      d.setDate(d.getDate() - (pekanNum - 1) * 7);
    }
    updateLocationField('startDate', d.toISOString().split('T')[0]);
  };

  const setPekanSync = (val: string) => updateLocationField('pekanAktif', val);

  if (activeView === 'bobot') {
    return (
      <div className="flex flex-col min-h-screen bg-[#f0f2f5]">
        <ReportHeader pekan={pekan} setPekan={setPekanSync} startDate={computedStartDate} setStartDate={handleSetStartDate} />
        <BobotTable key={`bobot-${activeLocationId}`} pekan={pekan} locationId={activeLocationId} onBack={() => setActiveView('dashboard')} />
      </div>
    );
  }

  if (activeView === 'timeschedule') {
    return (
      <div className="flex flex-col min-h-screen bg-[#f0f2f5]">
        <ReportHeader pekan={pekan} setPekan={setPekanSync} startDate={computedStartDate} setStartDate={handleSetStartDate} />
        <TimeSchedule key={`ts-${activeLocationId}`} pekan={pekan} locationId={activeLocationId} onBack={() => setActiveView('dashboard')} />
      </div>
    );
  }

  if (activeView === 'sampul') {
    return (
      <div className="flex flex-col min-h-screen bg-[#f0f2f5]">
        <ReportHeader pekan={pekan} setPekan={setPekanSync} startDate={computedStartDate} setStartDate={handleSetStartDate} />
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
                        onChange={(e) => setPekanSync(e.target.value)}
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
              onChange={(e) => handleSetStartDate(e.target.value)}
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
