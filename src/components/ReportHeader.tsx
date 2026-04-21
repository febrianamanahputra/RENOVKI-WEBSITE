import React, { useEffect, useState } from 'react';
import { Calendar } from 'lucide-react';

interface ReportHeaderProps {
  pekan: string;
  setPekan: (val: string) => void;
  startDate: string;
  setStartDate: (val: string) => void;
}

export default function ReportHeader({ pekan, setPekan, startDate, setStartDate }: ReportHeaderProps) {
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (startDate) {
      const start = new Date(startDate);
      // Setiap pekan ada 6 hari (termasuk hari pertama), jadi tambah 5 hari
      const end = new Date(start);
      end.setDate(start.getDate() + 5);
      
      const dayStart = start.getDate().toString().padStart(2, '0');
      const dayEnd = end.getDate().toString().padStart(2, '0');
      const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
      const monthEnd = monthNames[end.getMonth()];
      const yearEnd = end.getFullYear();

      setEndDate(`${dayStart} - ${dayEnd} ${monthEnd} ${yearEnd}`);
    } else {
      setEndDate('');
    }
  }, [startDate]);

  return (
    <div className="bg-white border-b border-slate-200 py-3 px-4 sm:px-8 flex flex-wrap items-center gap-4 sm:gap-8 sticky top-0 z-40 shadow-sm">
      <div className="flex items-center gap-2">
        <label className="text-sm font-semibold text-slate-700 whitespace-nowrap">Pekan Ke:</label>
        <div className="relative">
          <input 
            type="number" 
            min="1" 
            max="100"
            value={pekan}
            onChange={(e) => setPekan(e.target.value)}
            className="w-20 pl-3 pr-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-2 flex-grow max-w-fit">
        <label className="text-sm font-semibold text-slate-700 whitespace-nowrap">Tanggal:</label>
        <div className="flex items-center gap-2">
          <input 
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-36 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <span className="text-slate-500 text-sm font-medium">s/d</span>
          <div className="min-w-[160px] px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 flex items-center min-h-[34px]">
            {endDate ? endDate : 'Pilih tanggal mulai'}
          </div>
        </div>
      </div>
      
      <div className="ml-auto flex items-center gap-2">
         <span className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full font-medium border border-indigo-100 flex items-center gap-1.5">
           <Calendar className="w-3 h-3" />
           Laporan tersinkronisasi
         </span>
      </div>
    </div>
  );
}
