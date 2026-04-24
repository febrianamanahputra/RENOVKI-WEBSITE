import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ArrowLeft, Plus, Trash2, Undo } from 'lucide-react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface LaporanPekananProps {
  onBack: () => void;
  pekan: string;
  locationId: string;
  startDate: string;
  key?: string;
  isPrintMode?: boolean;
}

export default function LaporanPekanan({ onBack, pekan, locationId, startDate, isPrintMode }: LaporanPekananProps) {
  // We'll manage states here.
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [sampulUraian, setSampulUraian] = useState('');

  // 1. Uraian Sync from Sampul
  useEffect(() => {
    if (!db || !import.meta.env.VITE_FIREBASE_API_KEY) {
      const savedSampul = localStorage.getItem(`sampul_${locationId}_${pekan}`);
      if (savedSampul) {
        try {
          const data = JSON.parse(savedSampul);
          if (data.rowsProgres) setSampulUraian(data.rowsProgres.map((r:any) => `• ${r.pekerjaan}`).filter((p:string) => p !== '• ').join('\n\n'));
        } catch(e){}
      }
      return;
    }
    const unsub = onSnapshot(doc(db, "sampul", `${locationId}_${pekan}`), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.rowsProgres) setSampulUraian(data.rowsProgres.map((r:any) => `• ${r.pekerjaan}`).filter((p:string) => p !== '• ').join('\n\n'));
      }
    });
    return () => unsub();
  }, [locationId, pekan]);

  useEffect(() => {
    if (sampulUraian) {
      setFormData(prev => ({...prev, uraian: sampulUraian}));
    }
  }, [sampulUraian]);

  // 2. Tenaga Kerja Dynamic Array
  const tenagaKerjaData = useMemo(() => {
    const raw = formData.tenagaKerja;
    if (raw) {
      try { return JSON.parse(raw); } catch(e){}
    }
    return [
      { id: 1, name:'Kepala Tukang', val:'1'},
      { id: 2, name:'Tukang Batu', val:'4'},
      { id: 3, name:'Tukang Kayu', val:''},
      { id: 4, name:'Tukang Besi', val:''},
      { id: 5, name:'Tukang Cat', val:'1'},
      { id: 6, name:'Tukang Listrik', val:''},
      { id: 7, name:'Buruh', val:'4'}
    ];
  }, [formData.tenagaKerja]);

  const handleTkerjaChange = (id: number, field: string, value: string) => {
    const newData = tenagaKerjaData.map((item: any) => item.id === id ? { ...item, [field]: value } : item);
    handleInputChange('tenagaKerja', JSON.stringify(newData));
  };
  
  const addTkerja = () => {
    const newId = tenagaKerjaData.length > 0 ? Math.max(...tenagaKerjaData.map((d:any) => d.id)) + 1 : 1;
    const newData = [...tenagaKerjaData, { id: newId, name: '', val: '' }];
    handleInputChange('tenagaKerja', JSON.stringify(newData));
  };
  
  const removeTkerja = (id: number) => {
    const newData = tenagaKerjaData.filter((item: any) => item.id !== id);
    handleInputChange('tenagaKerja', JSON.stringify(newData));
  };

  // 3. Date formatted
  const getFormattedTanggal = () => {
    if (!startDate) return '';
    try {
      const start = new Date(startDate);
      const end = new Date(start);
      end.setDate(start.getDate() + 5);
      if (start.getMonth() === end.getMonth()) {
        return `${start.getDate()} - ${end.getDate()} ${end.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`;
      } else {
        return `${start.getDate()} ${start.toLocaleDateString('id-ID', { month: 'short' })} - ${end.getDate()} ${end.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`;
      }
    } catch (e) { return ''; }
  };
  const defaultTanggalStr = getFormattedTanggal();

  const handleInputChange = (field: string, value: string) => {
     setFormData(prev => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!db || Object.keys(formData).length === 0) return;
      if (!!import.meta.env.VITE_FIREBASE_API_KEY) {
         setDoc(doc(db, "laporan_harian", `${locationId}_${pekan}`), formData, { merge: true }).catch(console.error);
      } else {
         localStorage.setItem(`laporan_harian_${locationId}_${pekan}`, JSON.stringify(formData));
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [formData, locationId, pekan]);

  useEffect(() => {
    if (!db || !import.meta.env.VITE_FIREBASE_API_KEY) {
      const saved = localStorage.getItem(`laporan_harian_${locationId}_${pekan}`);
      if (saved) {
         try { setFormData(JSON.parse(saved)); } catch(e){}
      }
      return;
    }
    const unsub = onSnapshot(doc(db, "laporan_harian", `${locationId}_${pekan}`), (snap) => {
      if (snap.exists()) {
        setFormData(snap.data() as Record<string, string>);
      }
    });
    return () => unsub();
  }, [locationId, pekan]);

  const getValue = (key: string, defLine: string = '') => {
    return formData[key] !== undefined ? formData[key] : defLine;
  };

  return (
    <div className={`min-h-screen bg-[#f0f2f5] font-['Helvetica_Neue',Arial,sans-serif] ${isPrintMode ? 'p-0 bg-white' : 'p-4 md:p-8'}`}>
      {!isPrintMode && (
        <button 
          onClick={onBack}
          className="mb-6 flex items-center gap-2 text-[#1a1c21] hover:bg-slate-100 transition-colors bg-white px-4 py-2 rounded-xl shadow-[0_4px_10px_rgba(0,0,0,0.05)] border border-[#e1e4e8] font-semibold text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Dashboard
        </button>
      )}

      <div className={`bg-white mx-auto border border-black ${isPrintMode ? 'w-max h-auto overflow-visible shadow-none' : 'max-w-[1200px] shadow-[0_10px_20px_rgba(0,0,0,0.08)] overflow-x-auto overflow-hidden'}`}>
        <table className={`w-max border-collapse ${isPrintMode ? 'text-[8.5px]' : 'text-[12px] min-w-[1000px]'} leading-tight text-black`}>
          <tbody>
            {/* Header / Title */}
            <tr>
              <td colSpan={10} className="py-4 border-b border-black text-center">
                <div className="bg-[#4b82c3] text-white py-1 px-8 inline-block font-bold text-lg min-w-[300px]">
                  REKAP LAPORAN HARIAN
                </div>
              </td>
            </tr>
            {/* Identitas Proyek */}
            <tr>
               <td colSpan={3} className="border-r border-black align-top p-0 w-[25%] h-[210px]">
                  <div className="flex flex-col w-full h-full text-center">
                     <div className="bg-[#c2d7eb] border-b border-black font-bold uppercase text-[11px] h-[24px] flex items-center justify-center">PEMILIK</div>
                     <div className="border-b border-black font-bold uppercase h-[46px] flex items-center justify-center px-1">
                        <input type="text" value={getValue('pemilik', 'BU TITA')} onChange={(e) => handleInputChange('pemilik', e.target.value)} className="w-full text-center outline-none bg-transparent font-bold"/>
                     </div>
                     <div className="bg-[#c2d7eb] border-b border-black font-bold uppercase text-[11px] h-[24px] flex items-center justify-center">Manajemen Konstruksi</div>
                     <div className="border-b border-black font-bold uppercase text-[14px] underline h-[46px] flex items-center justify-center px-1">
                        <input type="text" value={getValue('mk', 'RENOVKI.COM')} onChange={(e) => handleInputChange('mk', e.target.value)} className="w-full text-center outline-none bg-transparent font-bold"/>
                     </div>
                     <div className="bg-[#c2d7eb] border-b border-black font-bold uppercase text-[11px] h-[24px] flex items-center justify-center">Kontraktor Pelaksana</div>
                     <div className="font-bold text-[12px] leading-tight text-center h-[46px] flex flex-col items-center justify-center px-1">
                        <input type="text" value={getValue('kp1', 'PT. Renovasi')} onChange={(e) => handleInputChange('kp1', e.target.value)} className="w-full text-center outline-none bg-transparent font-bold"/>
                        <input type="text" value={getValue('kp2', 'Konstruksi Indonesia')} onChange={(e) => handleInputChange('kp2', e.target.value)} className="w-full text-center outline-none bg-transparent font-bold"/>
                     </div>
                  </div>
               </td>

               <td colSpan={4} className="border-r border-black align-top p-0 w-[50%] h-[210px]">
                  <div className="flex flex-col w-full h-full text-center">
                     <div className="bg-[#fbbf24] border-b border-black font-bold uppercase h-[24px] flex items-center justify-center">NAMA PROYEK:</div>
                     <div className="border-b border-black font-bold leading-tight align-middle h-[116px] flex flex-col items-center justify-center px-2 gap-1 pb-1">
                        <input type="text" value={getValue('namaproyek1', 'RENOVASI BANGUNAN')} onChange={(e) => handleInputChange('namaproyek1', e.target.value)} className="w-full text-center outline-none bg-transparent font-bold text-[13px]"/>
                        <input type="text" value={getValue('namaproyek2', 'JL A. PETTARANI KOMP. IDI')} onChange={(e) => handleInputChange('namaproyek2', e.target.value)} className="w-full text-center outline-none bg-transparent font-bold text-[13px]"/>
                     </div>
                     <div className="bg-[#c2d7eb] border-b border-black font-bold uppercase text-[11px] h-[24px] flex items-center justify-center">Keadaan Cuaca Hari Ini</div>
                     <div className="px-4 flex flex-col justify-center h-[46px]">
                        <div className="flex justify-between items-center text-[11px] mb-1 font-normal">
                           <span>Cerah</span>
                           <span>Mendung</span>
                           <span>Gerimis</span>
                           <span>Hujan</span>
                        </div>
                        <div className="flex justify-between items-center gap-2">
                           <input type="text" value={getValue('cuaca1', '........................')} onChange={(e) => handleInputChange('cuaca1', e.target.value)} className="w-[20%] text-center outline-none bg-transparent" />
                           <input type="text" value={getValue('cuaca2', '..............')} onChange={(e) => handleInputChange('cuaca2', e.target.value)} className="w-[20%] text-center outline-none bg-transparent" />
                           <input type="text" value={getValue('cuaca3', '................')} onChange={(e) => handleInputChange('cuaca3', e.target.value)} className="w-[20%] text-center outline-none bg-transparent" />
                           <input type="text" value={getValue('cuaca4', '.......................')} onChange={(e) => handleInputChange('cuaca4', e.target.value)} className="w-[20%] text-center outline-none bg-transparent" />
                        </div>
                     </div>
                  </div>
               </td>

               <td colSpan={3} className="align-top p-0 w-[25%] bg-[#ecf3f8] h-[210px]">
                  <div className="flex flex-col w-full h-full text-center">
                     <div className="flex h-[46px] border-b border-transparent">
                        <div className="w-[45%] flex items-center px-1 ps-2 font-bold text-[11px] text-left leading-tight">Laporan<br/>Pekan Ke</div>
                        <div className="w-[55%] flex items-center justify-center px-1 font-bold pt-1">
                           <input type="text" value={pekan} readOnly className="w-full text-center outline-none bg-transparent font-bold text-3xl"/>
                        </div>
                     </div>
                     <div className="flex h-[47px] border-b border-transparent">
                        <div className="w-[45%] flex items-center justify-center px-1 text-[11px]">Hari</div>
                        <div className="w-[55%] flex items-center justify-center px-1 font-bold text-[12px]">
                           <input type="text" value={getValue('hari', 'Sabtu')} onChange={(e) => handleInputChange('hari', e.target.value)} className="w-full text-center outline-none bg-transparent font-bold"/>
                        </div>
                     </div>
                     <div className="flex h-[47px] border-b border-black">
                        <div className="w-[40%] flex items-center justify-center px-1 text-[11px]">Tanggal</div>
                        <div className="w-[60%] flex items-center justify-center px-1 font-bold text-[11px]">
                           <input type="text" value={getValue('tanggal', defaultTanggalStr)} onChange={(e) => handleInputChange('tanggal', e.target.value)} className="w-full text-center outline-none bg-transparent"/>
                        </div>
                     </div>

                     <div className="bg-[#c2d7eb] border-b border-black font-bold uppercase text-[11px] h-[24px] flex items-center justify-center">Jam Kerja</div>
                     
                     <div className="flex h-[23px] border-b border-transparent">
                        <div className="w-[40%] flex items-center px-2 text-left text-[11px] font-normal">Normal</div>
                        <div className="w-[60%] flex items-center justify-center px-1 font-bold text-[11px]">
                           <input type="text" value={getValue('jamnormal', '08.00-17.00')} onChange={(e) => handleInputChange('jamnormal', e.target.value)} className="w-full text-center outline-none bg-transparent font-bold"/>
                        </div>
                     </div>
                     <div className="flex h-[23px]">
                        <div className="w-[40%] flex items-center px-2 text-left text-[11px] font-normal">Lembur</div>
                        <div className="w-[60%] flex items-center justify-center px-1 font-bold text-[11px]">
                           <input type="text" value={getValue('jamlembur', '........................')} onChange={(e) => handleInputChange('jamlembur', e.target.value)} className="w-full text-center outline-none bg-transparent font-bold"/>
                        </div>
                     </div>
                  </div>
               </td>
            </tr>

            {/* Uraian Kegiatan */}
            <tr>
               <td colSpan={10} className="bg-[#c2d7eb] text-center font-bold py-1 border-b border-black text-[12px]">URAIAN KEGIATAN</td>
            </tr>
            <tr className="bg-[#e4eff7]">
               <td colSpan={10} className="border-b border-black align-top p-0 h-[180px]">
                  <textarea 
                     className="w-full h-full bg-transparent p-2 resize-none outline-none leading-relaxed text-[12px]"
                     value={getValue('uraian', sampulUraian)}
                     onChange={(e) => handleInputChange('uraian', e.target.value)}
                  ></textarea>
               </td>
            </tr>

            {/* Bottom Split */}
            <tr>
               <td colSpan={5} className="border-r border-black p-0 w-[50%] align-top">
                  <table className="w-full text-center border-collapse">
                     <thead>
                        <tr>
                           <th className="border-r border-b border-black py-1 w-10 text-[11px]">NO.</th>
                           <th className="border-r border-b border-black py-1 text-[11px]">JENIS TENAGA KERJA</th>
                           <th className="border-b border-black py-1 w-24 text-[11px]" colSpan={2}>JUMLAH</th>
                        </tr>
                     </thead>
                     <tbody className="text-left relative">
                        {tenagaKerjaData.map((row: any, idx: number) => (
                           <tr key={row.id} className="group relative">
                              <td className="border-r border-b border-black text-center py-1 font-bold">{idx + 1}</td>
                              <td className="border-r border-b border-black py-1 px-2">
                                 <input type="text" value={row.name} onChange={(e) => handleTkerjaChange(row.id, 'name', e.target.value)} className="w-full outline-none bg-transparent" />
                              </td>
                              <td className="border-r border-b border-black py-1 w-12 text-center bg-[#fce4d6]">
                                 <input type="text" value={row.val} onChange={(e) => handleTkerjaChange(row.id, 'val', e.target.value)} className="w-full text-center outline-none bg-transparent font-bold" />
                              </td>
                              <td className="border-b border-black py-1 w-12 text-center relative">
                                 org
                                 {!isPrintMode && (
                                    <button 
                                       onClick={() => removeTkerja(row.id)}
                                       className="absolute right-[-24px] top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-50 rounded"
                                       title="Hapus Baris"
                                    >
                                       <Trash2 className="w-4 h-4" />
                                    </button>
                                 )}
                              </td>
                           </tr>
                        ))}
                        {!isPrintMode && (
                           <tr>
                              <td colSpan={4} className="border-b border-black text-center py-2 h-[34px]">
                                 <button onClick={addTkerja} className="flex items-center justify-center gap-1 mx-auto text-blue-600 hover:text-blue-800 text-xs font-bold transition-colors">
                                    <Plus className="w-3 h-3" /> Tambah Tenaga Kerja
                                 </button>
                              </td>
                           </tr>
                        )}
                     </tbody>
                  </table>
               </td>
               <td colSpan={5} className="p-0 w-[50%] align-top border-b border-black relative">
                  <div className="flex flex-col h-full absolute inset-0">
                     <div className="bg-[#e4eff7] text-center font-bold py-1 border-b border-transparent flex flex-col items-center justify-center leading-tight">
                        <span className="text-[11px]">CATATAN MANAJEMEN KONSTRUKSI /</span>
                        <span className="text-[11px]">PROJECT MANAGER</span>
                     </div>
                     <textarea value={getValue('catatan', '')} onChange={(e) => handleInputChange('catatan', e.target.value)} className="flex-1 w-full bg-transparent p-2 resize-none outline-none leading-relaxed text-[12px]"></textarea>
                  </div>
               </td>
            </tr>

            {/* Signature Area */}
            <tr>
               <td colSpan={5} className="text-center py-4 border-r border-black border-b border-transparent w-[50%]">
                  <div className="mb-20 text-[12px]">Dilaporkan Oleh</div>
                  <div>
                     <input type="text" value={getValue('sig1_name', 'Febrian Amanah Putra, S.T.')} onChange={(e) => handleInputChange('sig1_name', e.target.value)} className="w-full text-center outline-none bg-transparent font-bold text-[12px]"/>
                     <div className="text-[12px]"><input type="text" value={getValue('sig1_title', 'Pelaksana Lapangan')} onChange={(e) => handleInputChange('sig1_title', e.target.value)} className="w-full text-center outline-none bg-transparent text-[12px]" /></div>
                  </div>
               </td>
               <td colSpan={5} className="text-center py-4 w-[50%] align-top">
                  <div className="mb-20 text-[12px]">Diperiksa Oleh</div>
                  <div>
                     <input type="text" value={getValue('sig2_name', 'Adi Sutrisman Abidin, S.T')} onChange={(e) => handleInputChange('sig2_name', e.target.value)} className="w-full text-center outline-none bg-transparent font-bold text-[12px]"/>
                     <div className="text-[12px]"><input type="text" value={getValue('sig2_title', 'Project Manager')} onChange={(e) => handleInputChange('sig2_title', e.target.value)} className="w-full text-center outline-none bg-transparent text-[12px]" /></div>
                  </div>
               </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
