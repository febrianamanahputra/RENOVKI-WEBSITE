import React, { useState, useEffect } from 'react';
import { ArrowLeft, Camera, Upload, Search, X } from 'lucide-react';

interface SampulProps {
  pekan: string;
  startDate?: string;
  locationId: string;
  onBack: () => void;
  key?: string;
}

export default function Sampul({ pekan, startDate, locationId, onBack }: SampulProps) {
  const [data, setData] = useState(() => {
    const saved = localStorage.getItem(`sampul_data_global_${locationId}`);
    if (saved) return JSON.parse(saved);
    return {
      klien: 'Ibu Tita',
      judul1: 'LAPORAN PROGRES',
      judul2: 'PEKANAN',
      judul3: 'KOMPLEKS IDI',
      namaProyek: 'RENOVASI BANGUNAN\nKompleks IDI.',
      pic: 'PIC PROJECT :\nSite Manager : Febrian Amanah Putra, S.T',
      rab: 'RAB: RP 539.800.000,00',
      waktu: 'WAKTU PEKERJAAN\n18 Pekan (Desember 2025 – April 2026)',
      pekerjaanLalu: [
        { text: '- Pek. Galian Pondasi Footplat (FP3)', progress: '(Progress 100%)' },
        { text: '- Pek. Galian Sloof 20 x 30 (S1)', progress: '(Progress 100%)' },
        { text: '- Pek. Lantai Kerja', progress: '(Progress 100%)' },
        { text: '- Pek. Pengurugan Tanah Kembali', progress: '(Progress 100%)' },
        { text: '- Pek. Pondasi Rollag', progress: '(Progress 100%)' },
        { text: '- Pek. Pondasi Footplat 90x90 (FP3)', progress: '(Progress 100%)' },
        { text: '- Pek. SPC Kamar Orang tua', progress: '(Progress 100%)' },
        { text: '- Pek. Modifikasi dan Pemasangan Kembali Kanopi Belakang', progress: '(Progress 90%)' }
      ],
      pekerjaanDepan: [
        { text: '- Pek. Kolom 40 x 40 (K1)', progress: '(Target 100%)' },
        { text: '- Pek. Kolom 20 x 40 (K2)', progress: '(Target 100%)' },
        { text: '- Pek. Balok 30 x 60 (B1)', progress: '(Target 30%)' },
        { text: '- Pek. Modifikasi dan Pemasangan Kembali Kanopi Belakang', progress: '(Target 100%)' },
        { text: '- Pek. Balok 20 x 40 (B2)', progress: '(Target 30%)' },
        { text: '- Pek. Pengecatan Eksterior', progress: '(Target 20%)' }
      ],
      imageUrl: ''
    };
  });

  const [stats, setStats] = useState({
    kumulatifPekanLalu: '0,00%',
    pekanIni: '0,00%',
    kumulatifRencana: '0,00%',
    kumulatifRealisasi: '0,00%',
    deviasi: '0,00%',
    targetMingguDepan: '0,00%',
    targetTSRencanaPekanDepan: '0,00%',
    targetTSSelisihPekanDepan: '0,00%'
  });

  const [uraianList, setUraianList] = useState<string[]>([]);
  const [popupTarget, setPopupTarget] = useState<{ type: 'lalu' | 'depan', index: number } | null>(null);
  const [searchUraian, setSearchUraian] = useState('');

  useEffect(() => {
    localStorage.setItem(`sampul_data_global_${locationId}`, JSON.stringify(data));
  }, [data, locationId]);

  useEffect(() => {
    const pNum = parseInt(pekan) || 1;
    const prevPekan = pNum > 1 ? pNum - 1 : 1;
    const pLalu = localStorage.getItem(`bobot_sd_hari_ini_${locationId}_${prevPekan}`) || '0,00%';
    const pIni = localStorage.getItem(`bobot_pekan_ini_${locationId}_${pNum}`) || '0,00%';
    
    // dari TS global
    const tsGlobalStr = localStorage.getItem(`ts_data_global_${locationId}`);
    let kRencana = '0,00%';
    let kRealisasi = pIni; // fallback to pIni if not present
    let deviasi = '0,00%';
    
    let targetDepan = '0,00%';
    let tsDepan = '0,00%';

    if (tsGlobalStr) {
      try {
        const tsGlobal = JSON.parse(tsGlobalStr);
        if (tsGlobal.footerValues) {
          kRencana = tsGlobal.footerValues[`kum-rencana-out-${pNum}`] || '0,00%';
          const valReal = tsGlobal.footerValues[`kum-realisasi-in-${pNum}`];
          if(valReal) kRealisasi = valReal;
          deviasi = tsGlobal.footerValues[`deviasi-out-${pNum}`] || '0,00%';
          
          tsDepan = tsGlobal.footerValues[`kum-rencana-out-${pNum + 1}`] || '0,00%';
        }
      } catch (e) {}
    }
    
    setStats({
      ...stats,
      kumulatifPekanLalu: pLalu,
      pekanIni: pIni,
      kumulatifRencana: kRencana,
      kumulatifRealisasi: kRealisasi,
      deviasi: deviasi,
      targetTSRencanaPekanDepan: tsDepan, 
    });

    // Ambil daftar Uraian Pekerjaan (Kolom B dari Bobot)
    const bobotGlobalStr = localStorage.getItem(`bobot_data_global_${locationId}`);
    if (bobotGlobalStr) {
      try {
        const bobotGlobal = JSON.parse(bobotGlobalStr);
        if (bobotGlobal.rows && bobotGlobal.values) {
          const uraian: string[] = [];
          bobotGlobal.rows.forEach(((row: any) => {
            if (row.type === 'data') {
              const vals = bobotGlobal.values[row.id];
              // Di BobotTable, cell index 1 adalah URAIAN PEKERJAAN
              if (vals && vals[1] && typeof vals[1] === 'string' && vals[1].trim() !== '') {
                uraian.push(vals[1].trim());
              }
            }
          }));
          setUraianList(uraian);
        }
      } catch (e) {}
    }

  }, [pekan]);

  const handleChange = (field: string, value: any) => {
    setData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handleChange('imageUrl', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const updatePekerjaanLalu = (index: number, key: string, value: string) => {
    const updated = [...data.pekerjaanLalu];
    updated[index][key] = value;
    handleChange('pekerjaanLalu', updated);
  };

  const addPekerjaanLalu = () => {
    handleChange('pekerjaanLalu', [...data.pekerjaanLalu, { text: '- ', progress: '(Progress 0%)' }]);
  };

  const updatePekerjaanDepan = (index: number, key: string, value: string) => {
    const updated = [...data.pekerjaanDepan];
    updated[index][key] = value;
    handleChange('pekerjaanDepan', updated);
  };

  const addPekerjaanDepan = () => {
    handleChange('pekerjaanDepan', [...data.pekerjaanDepan, { text: '- ', progress: '(Target 0%)' }]);
  };

  const renderStatsDeviasi = () => {
    const devNum = parseFloat(stats.deviasi.replace(',', '.'));
    const isNegative = devNum < 0;
    return (
      <span className={isNegative ? 'text-red-600' : 'text-green-600'}>
        {stats.deviasi}
      </span>
    );
  }

  const computedDateRange = React.useMemo(() => {
    if (!startDate) return '13 - 18 April 2026';
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + 5);

    const formatOptions: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
    
    // Check if same month and year
    if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
      return `${start.getDate()} - ${end.getDate()} ${end.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`;
    }
    return `${start.toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })} - ${end.toLocaleDateString('id-ID', formatOptions)}`;
  }, [startDate]);

  return (
    <div className="flex flex-col p-4 sm:p-8 w-full max-w-5xl mx-auto font-sans bg-white min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors font-semibold"
        >
          <ArrowLeft className="w-5 h-5" />
          Kembali ke Dashboard
        </button>
      </div>

      <div className="border-[1.5px] border-black bg-white shadow-xl">
        {/* Header Block */}
        <div className="flex border-b-[1.5px] border-black">
          {/* Top Left */}
          <div className="w-[25%] p-4 flex flex-col items-center justify-center text-center font-bold text-sm bg-[#c2d7eb]">
            <span>KLIEN</span>
            <input 
              className="w-full text-center bg-transparent outline-none mt-1 font-bold" 
              value={data.klien}
              onChange={(e) => handleChange('klien', e.target.value)}
            />
          </div>
          {/* Top Center */}
          <div className="w-[45%] flex flex-col items-center justify-center text-center font-bold bg-[#ffc000] border-l-[1.5px] border-r-[1.5px] border-black p-2">
            <input 
              className="w-full text-center bg-transparent outline-none uppercase font-bold" 
              value={data.judul1}
              onChange={(e) => handleChange('judul1', e.target.value)}
            />
            <input 
              className="w-full text-center bg-transparent outline-none uppercase font-bold" 
              value={data.judul2}
              onChange={(e) => handleChange('judul2', e.target.value)}
            />
            <input 
              className="w-full text-center bg-transparent outline-none uppercase font-bold" 
              value={data.judul3}
              onChange={(e) => handleChange('judul3', e.target.value)}
            />
          </div>
          {/* Top Right */}
          <div className="w-[30%] p-4 flex flex-col items-center justify-center text-center font-bold bg-[#c2d7eb]">
            <div className="flex items-center gap-2 text-lg">
              <span>PEKAN KE:</span>
              <span className="text-2xl">{pekan}</span>
            </div>
            <div className="text-sm mt-1">{computedDateRange}</div>
          </div>
        </div>

        {/* Content Block 1 */}
        <div className="flex">
          {/* Left Description Column */}
          <div className="w-[60%] flex flex-col border-r-[1.5px] border-black text-[13px] font-bold">
            <div className="p-4 text-center">
              <textarea 
                className="w-full text-center bg-transparent outline-none resize-none overflow-hidden h-10 font-bold" 
                value={data.namaProyek}
                onChange={(e) => handleChange('namaProyek', e.target.value)}
              />
              
              <textarea 
                className="w-full text-center bg-transparent outline-none resize-none overflow-hidden h-10 mt-4 font-bold" 
                value={data.pic}
                onChange={(e) => handleChange('pic', e.target.value)}
              />

              <div className="mt-4 flex flex-col items-center">
                <input 
                  className="w-full text-center bg-transparent outline-none font-bold" 
                  value={data.rab}
                  onChange={(e) => handleChange('rab', e.target.value)}
                />
                <textarea 
                  className="w-full text-center bg-transparent outline-none resize-none overflow-hidden h-10 font-bold" 
                  value={data.waktu}
                  onChange={(e) => handleChange('waktu', e.target.value)}
                />
              </div>
            </div>

            {/* Stats Block */}
            <div className="bg-[#ffc000] p-4 flex-1 flex flex-col justify-center">
              <div className="flex justify-between items-center mb-1">
                <span className="uppercase">KUMULATIF PEKAN LALU:</span>
                <input 
                  className="w-24 text-right bg-transparent outline-none font-bold" 
                  value={stats.kumulatifPekanLalu} 
                  onChange={(e) => setStats({...stats, kumulatifPekanLalu: e.target.value})}
                />
              </div>
              <div className="flex justify-between items-center mb-1">
                <span className="uppercase">PEKAN INI :</span>
                <input 
                  className="w-24 text-right bg-transparent outline-none font-bold" 
                  value={stats.pekanIni} 
                  onChange={(e) => setStats({...stats, pekanIni: e.target.value})}
                />
              </div>
              <div className="flex justify-between items-center mb-1">
                <span className="uppercase">KUMULATIF RENCANA :</span>
                <input 
                  className="w-24 text-right bg-transparent outline-none font-bold" 
                  value={stats.kumulatifRencana} 
                  onChange={(e) => setStats({...stats, kumulatifRencana: e.target.value})}
                />
              </div>
              <div className="flex justify-between items-center mb-1">
                <span className="uppercase">KUMULATIF REALISASI:</span>
                <input 
                  className="w-24 text-right bg-transparent outline-none font-bold" 
                  value={stats.kumulatifRealisasi} 
                  onChange={(e) => setStats({...stats, kumulatifRealisasi: e.target.value})}
                />
              </div>
              <div className="flex justify-between items-center text-red-600">
                <span className="uppercase text-black">DEVIASI :</span>
                <input 
                  className="w-24 text-right bg-transparent outline-none font-bold" 
                  value={stats.deviasi} 
                  onChange={(e) => setStats({...stats, deviasi: e.target.value})}
                />
              </div>
            </div>
          </div>
          
          {/* Right Image Column */}
          <div className="w-[40%] relative flex items-center justify-center bg-gray-100 overflow-hidden">
            {data.imageUrl ? (
              <img src={data.imageUrl} alt="Prospek Lapangan" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="text-gray-400 flex flex-col items-center p-4">
                <Camera className="w-12 h-12 mb-2 opacity-50" />
                <span className="text-sm font-medium text-center">Klik untuk upload foto</span>
              </div>
            )}
            <input 
              type="file" 
              accept="image/*" 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
              onChange={handleImageUpload}
              title="Upload Foto Sampul"
            />
          </div>
        </div>

        {/* PROGRES PEKERJAAN PEKAN INI */}
        <div className="bg-[#0070c0] text-white text-center font-bold py-1 border-y-[1.5px] border-black text-[13px]">
          PROGRES PEKERJAAN PEKAN INI
        </div>
        <div className="flex border-b-[1.5px] border-black min-h-[200px] text-[13px]">
          <div className="w-[75%] p-4 bg-white border-r-[1.5px] border-black flex flex-col">
            {data.pekerjaanLalu.map((item: any, idx: number) => (
              <div key={idx} className="flex justify-between font-medium hover:bg-slate-50 transition-colors group">
                <div 
                  className="flex-1 bg-transparent py-1 cursor-pointer border-b border-dashed border-transparent hover:border-blue-400 truncate pr-4 text-slate-700"
                  onClick={() => {
                    setPopupTarget({ type: 'lalu', index: idx });
                    setSearchUraian('');
                  }}
                >
                  {item.text || "Klik untuk pilih pekerjaan..."}
                </div>

                <input 
                  className="w-32 bg-transparent outline-none text-right py-1 group-hover:bg-slate-50" 
                  value={item.progress}
                  onChange={(e) => updatePekerjaanLalu(idx, 'progress', e.target.value)}
                />
              </div>
            ))}
            <button onClick={addPekerjaanLalu} className="mt-2 text-blue-600 text-xs font-semibold self-start hover:underline">+ Tambah Pekerjaan</button>
          </div>
          <div className="w-[25%] bg-[#ffc000] p-4 flex flex-col items-center justify-center font-bold text-center">
            <span className="mb-1">Progres Pekan Ini:</span>
            <input 
              className="w-full text-center bg-transparent outline-none text-lg mb-4" 
              value={stats.pekanIni}
              onChange={(e) => setStats({...stats, pekanIni: e.target.value})}
            />
            
            <span className="mb-1">Dari Target TS</span>
            <input 
              className="w-full text-center bg-transparent outline-none text-base" 
              value={stats.kumulatifRencana} // usually "target TS" correlates here?
              onChange={(e) => setStats({...stats, kumulatifRencana: e.target.value})}
            />
          </div>
        </div>

        {/* RENCANA PEKERJAAN PEKAN DEPAN */}
        <div className="bg-[#0070c0] text-white text-center font-bold py-1 text-[13px] border-b-[1.5px] border-black">
          RENCANA PEKERJAAN PEKAN DEPAN
        </div>
        <div className="flex min-h-[200px] text-[13px]">
          <div className="w-[75%] p-4 bg-white border-r-[1.5px] border-black flex flex-col">
            {data.pekerjaanDepan.map((item: any, idx: number) => (
              <div key={idx} className="flex justify-between font-medium hover:bg-slate-50 transition-colors group">
                <div 
                  className="flex-1 bg-transparent py-1 cursor-pointer border-b border-dashed border-transparent hover:border-blue-400 truncate pr-4 text-slate-700"
                  onClick={() => {
                    setPopupTarget({ type: 'depan', index: idx });
                    setSearchUraian('');
                  }}
                >
                  {item.text || "Klik untuk pilih pekerjaan..."}
                </div>

                <input 
                  className="w-32 bg-transparent outline-none text-right py-1 group-hover:bg-slate-50" 
                  value={item.progress}
                  onChange={(e) => updatePekerjaanDepan(idx, 'progress', e.target.value)}
                />
              </div>
            ))}
            <button onClick={addPekerjaanDepan} className="mt-2 text-blue-600 text-xs font-semibold self-start hover:underline">+ Tambah Rencana</button>
          </div>
          <div className="w-[25%] bg-[#ffc000] p-4 flex flex-col items-center justify-center font-bold text-center">
            <span className="mb-1">Target<br/>Pekan Depan:</span>
            <input 
              className="w-full text-center bg-transparent outline-none text-lg mb-4" 
              value={stats.targetMingguDepan}
              onChange={(e) => setStats({...stats, targetMingguDepan: e.target.value})}
            />
            
            <span className="mb-1">Dari Target TS:</span>
            <input 
              className="w-full text-center bg-transparent outline-none text-base text-red-600" 
              value={stats.targetTSSelisihPekanDepan}
              onChange={(e) => setStats({...stats, targetTSSelisihPekanDepan: e.target.value})}
            />
          </div>
        </div>
      </div>

      {/* Modal Popup Uraian Pekerjaan */}
      {popupTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden max-h-[85vh] animate-in fade-in zoom-in duration-200">
            <div className="p-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold flex justify-between items-center">
              <span>Pilih Uraian Pekerjaan</span>
              <button 
                onClick={() => setPopupTarget(null)} 
                className="text-white hover:text-red-200 transition-colors p-1"
              >
                 <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-3 border-b bg-gray-50 relative">
              <Search className="w-5 h-5 absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Cari nama pekerjaan..." 
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                value={searchUraian}
                onChange={(e) => setSearchUraian(e.target.value)}
                autoFocus
              />
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 bg-slate-50/50">
              {uraianList.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  Data pekerjaan kosong. Silakan isi terlebih dahulu di Page Bobot.
                </div>
              ) : (
                uraianList
                  .filter(u => u.toLowerCase().includes(searchUraian.toLowerCase()))
                  .map((uraian, uIdx) => (
                    <button 
                      key={uIdx}
                      className="w-full text-left px-4 py-3 hover:bg-blue-100/50 rounded-lg transition-colors text-[13px] font-medium border-b border-slate-100 last:border-0 truncate flex items-center group"
                      onClick={() => {
                          if (popupTarget.type === 'lalu') {
                              updatePekerjaanLalu(popupTarget.index, 'text', `- ${uraian}`);
                          } else {
                              updatePekerjaanDepan(popupTarget.index, 'text', `- ${uraian}`);
                          }
                          setPopupTarget(null);
                          setSearchUraian('');
                      }}
                    >
                      <span className="w-2 h-2 rounded-full bg-blue-400 mr-3 group-hover:bg-blue-600 transition-colors flex-shrink-0"></span>
                      <span className="truncate">{uraian}</span>
                    </button>
                  ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
