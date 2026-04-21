import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import BobotTable from './components/BobotTable';
import TimeSchedule from './components/TimeSchedule';
import ReportHeader from './components/ReportHeader';
import Sampul from './components/Sampul';
import { 
  BookOpen, 
  CalendarDays, 
  TrendingUp, 
  Package, 
  WalletCards, 
  ClipboardList, 
  Camera,
  LayoutDashboard,
  Search,
  Bell
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

  const [pekan, setPekan] = useState(localStorage.getItem('global_pekan') || '1');
  const [baseStartDate, setBaseStartDate] = useState(localStorage.getItem('global_base_start_date') || '');

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
    localStorage.setItem('global_pekan', pekan);
  }, [pekan]);

  useEffect(() => {
    if (baseStartDate) {
      localStorage.setItem('global_base_start_date', baseStartDate);
    } else {
      localStorage.removeItem('global_base_start_date');
    }
  }, [baseStartDate]);

  if (activeView === 'bobot') {
    return (
      <div className="flex flex-col min-h-screen bg-[#f0f2f5]">
        <ReportHeader pekan={pekan} setPekan={setPekan} startDate={computedStartDate} setStartDate={handleSetStartDate} />
        <BobotTable pekan={pekan} onBack={() => setActiveView('dashboard')} />
      </div>
    );
  }

  if (activeView === 'timeschedule') {
    return (
      <div className="flex flex-col min-h-screen bg-[#f0f2f5]">
        <ReportHeader pekan={pekan} setPekan={setPekan} startDate={computedStartDate} setStartDate={handleSetStartDate} />
        <TimeSchedule pekan={pekan} onBack={() => setActiveView('dashboard')} />
      </div>
    );
  }

  if (activeView === 'sampul') {
    return (
      <div className="flex flex-col min-h-screen bg-[#f0f2f5]">
        <ReportHeader pekan={pekan} setPekan={setPekan} startDate={computedStartDate} setStartDate={handleSetStartDate} />
        <Sampul pekan={pekan} startDate={computedStartDate} onBack={() => setActiveView('dashboard')} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f2f5] text-[#1a1c21] font-['Helvetica_Neue',Arial,sans-serif] overflow-hidden flex flex-col">
      <ReportHeader pekan={pekan} setPekan={setPekan} startDate={computedStartDate} setStartDate={handleSetStartDate} />
      {/* Header */}
      <header className="bg-white border-b border-[#e1e4e8] sticky top-[57px] z-20">
        <div className="max-w-7xl mx-auto px-[20px] sm:px-[40px] py-[20px] sm:py-[30px]">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-[48px] h-[48px] sm:w-[56px] sm:h-[56px] bg-[#f0f2f5] rounded-[16px] flex items-center justify-center">
                <LayoutDashboard className="w-6 h-6 sm:w-7 sm:h-7 text-[#1a1c21]" />
              </div>
              <h1 className="text-[20px] sm:text-[24px] font-[800] text-[#1a1c21] tracking-[-0.5px] hidden sm:block">
                Dashboard Konstruksi
              </h1>
            </div>

            <div className="flex flex-1 items-center justify-end md:justify-between px-4 md:px-8 lg:px-12">
              <div className="hidden md:flex relative w-full max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Cari menu atau fitur..." 
                  className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-shadow"
                />
              </div>

              <div className="flex items-center gap-4 ml-auto">
                <button className="relative p-2 text-slate-500 hover:text-slate-700 transition-colors">
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                </button>
                <div className="w-9 h-9 relative rounded-full border-2 border-white shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow">
                  <img 
                    src="https://api.dicebear.com/7.x/avataaars/svg?seed=ConstructionManager&backgroundColor=e2e8f0" 
                    alt="User Profile" 
                    className="w-full h-full object-cover" 
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-[20px] sm:px-[40px] py-[30px] relative">
        {/* Background Decorative Blobs */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-purple-400/10 rounded-full blur-3xl pointer-events-none" />

        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-8 lg:mb-10 relative z-10"
        >
          <span className="inline-block px-[10px] py-[4px] mb-[12px] text-[10px] font-[700] text-[#1a1c21] uppercase tracking-[1px] bg-white border border-[#e1e4e8] rounded-[20px] shadow-sm">
            Area Kerja Aktif
          </span>
          <h2 className="text-[28px] md:text-[32px] font-[800] text-[#1a1c21] tracking-tight">
            Menu Proyek
          </h2>
          <p className="text-slate-500 mt-2 text-base md:text-lg max-w-2xl">
            Akses cepat ke semua modul manajemen proyek Anda. Kelola jadwal, keuangan, dan dokumentasi dalam satu tempat.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[20px] relative z-10">
          {menus.map((menu, index) => {
            const Icon = menu.icon;
            const isHovered = hoveredIndex === index;
            
            return (
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ 
                  delay: index * 0.1, 
                  duration: 0.5, 
                  ease: [0.21, 0.47, 0.32, 0.98] 
                }}
                key={index} 
                className="relative overflow-hidden rounded-[24px] p-[25px] cursor-pointer transition-all duration-300 hover:-translate-y-2 group shadow-[0_10px_20px_rgba(0,0,0,0.08)] border border-white/10 flex flex-col justify-between"
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
                {/* Card Background gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${menu.gradient} z-0`} />
                
                {/* Large Watermark Icon */}
                <motion.div 
                  initial={false}
                  animate={{ 
                    scale: isHovered ? 1.2 : 1,
                    rotate: isHovered ? -15 : -5,
                    opacity: isHovered ? 0.2 : 0.12
                  }}
                  transition={{ duration: 0.4 }}
                  className="absolute -right-2 -bottom-5 pointer-events-none z-0"
                >
                  <Icon className="w-40 h-40 text-white" strokeWidth={1} />
                </motion.div>
                
                {/* Card Content */}
                <div className="relative z-10 flex flex-col items-start min-h-[170px] justify-between h-full">
                  <div className="w-[56px] h-[56px] bg-white/25 rounded-[16px] backdrop-blur-[4px] flex items-center justify-center transition-transform duration-300 group-hover:scale-110 mb-6">
                    <Icon className="w-7 h-7 text-white" strokeWidth={2.5} />
                  </div>
                  
                  <div className="mt-auto w-full">
                    <h3 className="text-[18px] font-[700] text-white mb-[6px] drop-shadow-md">
                      {menu.title}
                    </h3>
                    <p className="text-[12px] text-white/90 leading-[1.4] drop-shadow-sm">
                      {menu.description}
                    </p>
                    
                    {/* Hover indicator line */}
                    <div className="h-1 w-0 bg-white/50 mt-4 rounded-full transition-all duration-500 group-hover:w-full" />
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
