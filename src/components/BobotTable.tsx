import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Plus, Trash2, Undo } from 'lucide-react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface BobotTableProps {
  onBack: () => void;
  pekan: string;
  locationId: string;
  key?: string;
  isPrintMode?: boolean;
}

export default function BobotTable({ onBack, pekan, locationId, isPrintMode }: BobotTableProps) {
  type RowItem = { id: string; type: 'subtitle' | 'data' };

  const [rows, setRows] = useState<RowItem[]>(() => {
    return [
      { id: 'sub-init', type: 'subtitle' },
      ...Array.from({ length: 25 }).map((_, i) => ({ id: `data-init-${i}`, type: 'data' as const }))
    ];
  });
  
  const [history, setHistory] = useState<RowItem[][]>([]);
  const [isDeleteMode, setIsDeleteMode] = useState(false);

  const saveState = useCallback((currentRows: RowItem[]) => {
    const tbody = document.querySelector('tbody');
    if (!tbody || !db) return;
    
    // Save data rows
    const trs = tbody.querySelectorAll('tr[data-id]');
    const values: Record<string, string[]> = {};
    trs.forEach(tr => {
      const id = tr.getAttribute('data-id');
      if (id) {
         const inputs = tr.querySelectorAll('input');
         values[id] = Array.from(inputs).map(inp => (inp as HTMLInputElement).value);
      }
    });

    // Save infoboxes (rows without data-id and their inputs)
    const infoboxes = tbody.querySelectorAll('tr:not([data-id]) input');
    const infoboxValues = Array.from(infoboxes).map(inp => (inp as HTMLInputElement).value);

    // Sync to Firestore instead of localStorage if available, otherwise fallback
    if (db && !!import.meta.env.VITE_FIREBASE_API_KEY) {
      setDoc(doc(db, "bobot_data", `${locationId}_${pekan}`), { rows: currentRows, values, infoboxValues }, { merge: true }).catch(console.error);
    } else {
      localStorage.setItem(`bobot_data_global_${locationId}_${pekan}`, JSON.stringify({ rows: currentRows, values, infoboxValues }));
    }
  }, [locationId, pekan]); // depends on location and pekan

  useEffect(() => {
    const timer = setTimeout(() => {
      saveState(rows);
    }, 500);
    return () => {
      clearTimeout(timer);
      saveState(rows); // Force save on unmount or switch
    };
  }, [rows, saveState]);

  useEffect(() => {
    if (!db || !import.meta.env.VITE_FIREBASE_API_KEY) {
      const saved = localStorage.getItem(`bobot_data_global_${locationId}_${pekan}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.rows && parsed.rows.length) {
            setRows(prev => parsed.rows.length !== prev.length ? parsed.rows : prev);
          }
          setTimeout(() => {
            if (parsed.values) {
              Object.keys(parsed.values).forEach(id => {
                const tr = document.querySelector(`tr[data-id="${id}"]`);
                if (tr) {
                  const inputs = tr.querySelectorAll('input');
                  parsed.values[id].forEach((val: string, idx: number) => {
                    const inp = inputs[idx] as HTMLInputElement;
                    if (inp && inp.value !== val && document.activeElement !== inp) {
                      inp.value = val;
                    }
                  });
                }
              });
            }
            if (parsed.infoboxValues) {
              const tbody = document.querySelector('tbody');
              if (tbody) {
                 const infoboxes = tbody.querySelectorAll('tr:not([data-id]) input');
                 parsed.infoboxValues.forEach((val: string, idx: number) => {
                   const inp = infoboxes[idx] as HTMLInputElement;
                   if (inp && inp.value !== val && document.activeElement !== inp) {
                      inp.value = val;
                   }
                 });
              }
            }
            calculateSubtotals();
          }, 50);
        } catch(e) {}
      }
      return;
    }
    const unsub = onSnapshot(doc(db, "bobot_data", `${locationId}_${pekan}`), (saved) => {
      if (saved.exists()) {
        try {
          const parsed = saved.data();
          if (parsed.rows && parsed.rows.length) {
            setRows(prev => parsed.rows.length !== prev.length ? parsed.rows : prev);
          }
          
          setTimeout(() => {
            if (parsed.values) {
              Object.keys(parsed.values).forEach(id => {
                const tr = document.querySelector(`tr[data-id="${id}"]`);
                if (tr) {
                  const inputs = tr.querySelectorAll('input');
                  parsed.values[id].forEach((val: string, idx: number) => {
                    const inp = inputs[idx] as HTMLInputElement;
                    // Dont overwrite if this element is currently focused!
                    if (inp && inp.value !== val && document.activeElement !== inp) {
                      inp.value = val;
                    }
                  });
                }
              });
            }
            if (parsed.infoboxValues) {
              const tbody = document.querySelector('tbody');
              if (tbody) {
                 const infoboxes = tbody.querySelectorAll('tr:not([data-id]) input');
                 parsed.infoboxValues.forEach((val: string, idx: number) => {
                   const inp = infoboxes[idx] as HTMLInputElement;
                   if (inp && inp.value !== val && document.activeElement !== inp) {
                      inp.value = val;
                   }
                 });
              }
            }
            calculateSubtotals();
          }, 50);
        } catch (e) {}
      }
    });
    return () => unsub();
  }, [locationId, pekan]); // Only run on mount since component is keyed by pekan

  const saveHistory = useCallback((currentRows: RowItem[]) => {
    setHistory(prev => [...prev, currentRows]);
  }, []);

  const handleUndo = () => {
    if (history.length > 0) {
      const prevRows = history[history.length - 1];
      setHistory(prev => prev.slice(0, -1));
      setRows(prevRows);
      
      setTimeout(() => {
        calculateSubtotals();
      }, 0);
    }
  };

  const deleteRow = (id: string) => {
    saveHistory(rows);
    setRows(prev => prev.filter(row => row.id !== id));
  };

  const calculateSubtotals = useCallback(() => {
    const tbody = document.querySelector('tbody');
    if (!tbody) return;
    const trs = tbody.querySelectorAll('tr');
    
    let currentSub: HTMLTableRowElement | null = null;
    let sumBobotPek = 0;
    let sumBobotSd = 0;
    let sumProgress = 0;
    let itemCount = 0;

    const updateSubtitleRow = (subTr: HTMLTableRowElement | null, pek: number, sd: number, prog: number, totalItems: number) => {
      if (!subTr) return;
      const pekInput = subTr.querySelector('.sum-bobot-pek') as HTMLInputElement;
      const sdInput = subTr.querySelector('.sum-bobot-sd') as HTMLInputElement;
      const progInput = subTr.querySelector('.sum-progress') as HTMLInputElement;
      
      const avgProg = totalItems > 0 ? prog / totalItems : 0;

      // Bobot Pek & Bobot S/D pake sum mentah as requested
      if (pekInput) pekInput.value = pek > 0 ? `${Number(pek.toFixed(2))}%` : '';
      if (sdInput) sdInput.value = sd > 0 ? `${Number(sd.toFixed(2))}%` : '';
      // Progress pake average dari semua item
      if (progInput) progInput.value = totalItems > 0 ? `${Number(avgProg.toFixed(2))}%` : '0%';
    };

    trs.forEach((tr) => {
      if (tr.getAttribute('data-type') === 'subtitle') {
        // Catat hasil ke subtitle sebelumnya
        updateSubtitleRow(currentSub, sumBobotPek, sumBobotSd, sumProgress, itemCount);
        
        // Reset state untuk subtitle berikutnya
        currentSub = tr as HTMLTableRowElement;
        sumBobotPek = 0;
        sumBobotSd = 0;
        sumProgress = 0;
        itemCount = 0;
      } else if (tr.getAttribute('data-type') === 'data') {
        const tds = tr.querySelectorAll('td');
        if (tds.length === 9) {
          const volInput = tds[3]?.querySelector('input');
          const bobotPekInput = tds[5]?.querySelector('input');
          const bobotSdInput = tds[7]?.querySelector('input'); // swapped
          const progressInput = tds[8]?.querySelector('input');

          // Validasi apakah baris ini memiliki volume (sebagai item pekerjaan valid)
          let hasVolume = false;
          if (volInput && volInput.value) {
            const vol = parseFloat(volInput.value.replace(/,/g, '.'));
            if (!isNaN(vol) && vol !== 0) {
              hasVolume = true;
            }
          }

          if (hasVolume) {
            itemCount++; // Hitung hanya baris yang punya volume sebagai pembagi
          }

          if (bobotPekInput && bobotPekInput.value) {
            const val = parseFloat(bobotPekInput.value.replace(/,/g, '.').replace('%', ''));
            if (!isNaN(val)) { 
              sumBobotPek += val; 
            }
          }
          if (bobotSdInput && bobotSdInput.value) {
            const val = parseFloat(bobotSdInput.value.replace(/,/g, '.').replace('%', ''));
            if (!isNaN(val)) { 
              sumBobotSd += val; 
            }
          }
          if (progressInput && progressInput.value) {
            const val = parseFloat(progressInput.value.replace(/,/g, '.').replace('%', ''));
            if (!isNaN(val)) { sumProgress += val; }
          }
        }
      }
    });
    
    // Catat hasil ke subtitle paling akhir
    updateSubtitleRow(currentSub, sumBobotPek, sumBobotSd, sumProgress, itemCount);

    // Hitung total progres S/D Hari Ini dari tiap sub judul
    let grandBobotSdSubtitles = 0;
    const subtitleSdInputs = tbody.querySelectorAll('.sum-bobot-sd');
    subtitleSdInputs.forEach((input: Element) => {
      const el = input as HTMLInputElement;
      if (el.value) {
        const val = parseFloat(el.value.replace(/,/g, '.').replace('%', ''));
        if (!isNaN(val)) grandBobotSdSubtitles += val;
      }
    });

    // Update grand totals
    const sdHariIniOutput = document.getElementById('output-hari-ini') as HTMLInputElement;
    const pekanLaluInput = document.getElementById('input-pekan-lalu') as HTMLInputElement;
    const pekanIniOutput = document.getElementById('output-pekan-ini') as HTMLInputElement;

    if (sdHariIniOutput) sdHariIniOutput.value = grandBobotSdSubtitles > 0 ? `${Number(grandBobotSdSubtitles.toFixed(2))}%` : '0%';

    if (pekanLaluInput && pekanIniOutput) {
      // Because calculateSubtotals depends on a synchronous read to get previous pekan values 
      // which is now complex via async firestore, we will still fallback to local storage
      // specifically for the summary totals just for visual subtotal display 
      // (This avoids reading an entire other document synchronously in the middle of this loop)
      const prevPekan = parseInt(pekan, 10) - 1;
      let prevValue = '0%';
      if (prevPekan >= 1) {
         prevValue = localStorage.getItem(`bobot_sd_hari_ini_${locationId}_${prevPekan}`) || '0%';
      }
      pekanLaluInput.value = prevValue;

      const pekanLaluVal = parseFloat(prevValue.replace(/,/g, '.').replace('%', ''));
      const pekanLaluNum = isNaN(pekanLaluVal) ? 0 : pekanLaluVal;
      const pekanIniVal = grandBobotSdSubtitles - pekanLaluNum;
      
      const pekanIniStr = `${Number(pekanIniVal.toFixed(2))}%`;
      pekanIniOutput.value = pekanIniStr;

      // Save to localStorage for cross-page sync
      localStorage.setItem(`bobot_pekan_ini_${locationId}_${pekan}`, pekanIniStr);
      if (sdHariIniOutput) {
        localStorage.setItem(`bobot_sd_hari_ini_${locationId}_${pekan}`, sdHariIniOutput.value);
      }
    }
  }, [pekan]);

  useEffect(() => {
    calculateSubtotals();
    
    const handleRecalculate = () => calculateSubtotals();
    document.addEventListener('forceRecalculate', handleRecalculate);
    
    return () => document.removeEventListener('forceRecalculate', handleRecalculate);
  }, [rows, calculateSubtotals]);

  const addDataRow = () => {
    saveHistory(rows);
    setRows(prev => [...prev, { id: `data-${Date.now()}`, type: 'data' }]);
  };

  const addSubtitleRow = () => {
    saveHistory(rows);
    setRows(prev => [...prev, { id: `sub-${Date.now()}`, type: 'subtitle' }]);
  };

  const recalculateRow = (tr: HTMLTableRowElement) => {
    const tds = tr.querySelectorAll('td');
    if (tds.length === 9) {
      const volInput = tds[3]?.querySelector('input');
      const bobotPekInput = tds[5]?.querySelector('input');
      const volSdInput = tds[6]?.querySelector('input'); // swapped
      const bobotSdInput = tds[7]?.querySelector('input'); // swapped
      const progressInput = tds[8]?.querySelector('input');

      if (!volInput || !bobotPekInput || !bobotSdInput || !volSdInput || !progressInput) return;

      const volStr = volInput.value.replace(/,/g, '.');
      const bobotPekStr = bobotPekInput.value.replace(/,/g, '.').replace('%', '');
      const volSdStr = volSdInput.value.replace(/,/g, '.');
      
      const volume = parseFloat(volStr);
      const bobotPekerjaan = parseFloat(bobotPekStr);
      const volSDHariIni = parseFloat(volSdStr);

      if (!isNaN(volume) && volume !== 0 && !isNaN(volSDHariIni)) {
        // 1. Progress Pekerjaan (%) = (Vol Hari Ini / Volume) * 100
        const progress = (volSDHariIni / volume) * 100;
        progressInput.value = `${Number(progress.toFixed(2))}%`;

        // 2. Bobot S/D Hari Ini = (Vol Hari Ini / Volume) * Bobot Pekerjaan (Atau dianggap 0 jika kosong)
        const bobotRelevan = isNaN(bobotPekerjaan) ? 0 : bobotPekerjaan;
        const bobotSdVal = (volSDHariIni / volume) * bobotRelevan;
        bobotSdInput.value = `${Number(bobotSdVal.toFixed(2))}%`;
      } else {
        bobotSdInput.value = '';
        progressInput.value = '';
      }
      calculateSubtotals();
    }
  };

  const handleInputRow = (e: React.FormEvent<HTMLInputElement>) => {
    const tr = e.currentTarget.closest('tr');
    if (tr) recalculateRow(tr as HTMLTableRowElement);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>, colIndex: number) => {
    const pastedData = e.clipboardData.getData('Text');
    
    if (pastedData.includes('\n') || pastedData.includes('\t')) {
      e.preventDefault();
      
      let rowsList = pastedData.split(/\r\n|\n/).map(l => l.split('\t'));
      if (rowsList.length > 0 && rowsList[rowsList.length - 1].length === 1 && rowsList[rowsList.length - 1][0] === '') {
        rowsList.pop();
      }
      if (rowsList.length === 0) return;

      const currentInput = e.currentTarget;
      const currentTr = currentInput.closest('tr');
      const tbody = currentTr?.closest('tbody');
      if (!tbody || !currentTr) return;

      const allTrs = Array.from(tbody.querySelectorAll('tr')) as HTMLTableRowElement[];
      const startDOMIndex = allTrs.indexOf(currentTr as HTMLTableRowElement);
      
      let j = 0;
      let domIndex = startDOMIndex;
      
      while (domIndex < allTrs.length && j < rowsList.length) {
        const tr = allTrs[domIndex];
        const tds = tr.querySelectorAll('td');
        if (tds.length === 9) { 
           const cellValues = rowsList[j];
           cellValues.forEach((cellText, idx) => {
               const targetCol = colIndex + idx;
               const targetInput = tds[targetCol]?.querySelector('input:not([readonly])') as HTMLInputElement | null;
               if (targetInput) {
                   targetInput.value = cellText.trim();
                   if (targetCol === 1) { // Uraian
                       const val = targetInput.value;
                       if (/^([a-zA-Z][.)]|-|\*)\s/.test(val)) {
                           targetInput.style.paddingLeft = '24px';
                       } else {
                           targetInput.style.paddingLeft = '0px';
                       }
                   }
               }
           });
           
           j++;
           recalculateRow(tr as HTMLTableRowElement);
        }
        domIndex++;
      }
      
      if (j < rowsList.length) {
        const missingLines = rowsList.slice(j);
        setRows(prev => {
          const newRows = Array.from({ length: missingLines.length }).map((_, idx) => ({ 
             id: `data-pasted-${Date.now()}-${idx}`, 
             type: 'data' as const 
          }));
          return [...prev, ...newRows];
        });

        setTimeout(() => {
          const updatedTrs = Array.from(tbody.querySelectorAll('tr')) as HTMLTableRowElement[];
          let remJ = 0;
          let newDomIndex = allTrs.length;
          
          while (newDomIndex < updatedTrs.length && remJ < missingLines.length) {
            const tr = updatedTrs[newDomIndex];
            const tds = tr.querySelectorAll('td');
            if (tds.length === 9 && tr.getAttribute('data-type') === 'data') {
                const cellValues = missingLines[remJ];
                cellValues.forEach((cellText, idx) => {
                    const targetCol = colIndex + idx;
                    const targetInput = tds[targetCol]?.querySelector('input:not([readonly])') as HTMLInputElement | null;
                    if (targetInput) {
                        targetInput.value = cellText.trim();
                        if (targetCol === 1) { // Uraian
                            const val = targetInput.value;
                            if (/^([a-zA-Z][.)]|-|\*)\s/.test(val)) {
                                targetInput.style.paddingLeft = '24px';
                            } else {
                                targetInput.style.paddingLeft = '0px';
                            }
                        }
                    }
                });
                remJ++;
                recalculateRow(tr as HTMLTableRowElement);
            }
            newDomIndex++;
          }
          calculateSubtotals();
        }, 100);
      } else {
          calculateSubtotals();
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5] font-['Helvetica_Neue',Arial,sans-serif] p-4 md:p-8">
      <button 
        onClick={onBack}
        className="mb-6 flex items-center gap-2 text-[#1a1c21] hover:bg-slate-100 transition-colors bg-white px-4 py-2 rounded-xl shadow-[0_4px_10px_rgba(0,0,0,0.05)] border border-[#e1e4e8] font-semibold text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Kembali ke Dashboard
      </button>

      <div className="bg-white overflow-x-auto border-[1.5px] border-black shadow-[0_10px_20px_rgba(0,0,0,0.08)]">
        <table className="w-full border-collapse min-w-[1024px] text-[11px] leading-tight text-black">
          <thead>
            {/* Header Title */}
            <tr>
              <th colSpan={6} className="bg-[#a8c6df] py-3 px-4 text-center text-lg font-bold border-r-[1.5px] border-b-[1.5px] border-black uppercase tracking-wide">
                <div className="flex items-center justify-center gap-2">
                  <input type="text" defaultValue="DETAIL PROGRES PROJECT" className="bg-transparent outline-none text-right font-bold w-full uppercase" />
                  <input type="text" placeholder="(NAMA PROJECT)" className="bg-transparent border-b border-black/30 outline-none text-left placeholder-black/50 w-full uppercase" />
                </div>
              </th>
              <th colSpan={3} className="bg-[#fbbf24] py-3 px-4 text-left font-bold border-b-[1.5px] border-black uppercase tracking-wide text-sm">
                <div className="flex items-center gap-2">
                  <input type="text" defaultValue="PEKAN KE:" className="bg-transparent outline-none font-bold w-24 uppercase" />
                  <input type="text" placeholder="06 - 13 April 2026" className="bg-transparent outline-none placeholder-black/50 w-full uppercase" />
                </div>
              </th>
            </tr>

            {/* Header Subtitle */}
            <tr>
              <th colSpan={6} className="bg-[#c2d7eb] py-1.5 px-4 text-center font-bold border-r-[1.5px] border-b-[1.5px] border-black uppercase text-[12px]">
                <input type="text" defaultValue="LAPORAN PROGRESS HARIAN" className="bg-transparent outline-none text-center font-bold w-full uppercase" />
              </th>
              <th colSpan={3} className="bg-[#c2d7eb] py-1.5 px-4 text-center font-bold border-b-[1.5px] border-black uppercase text-[12px]">
                <input type="text" defaultValue="DATA HARIAN" className="bg-transparent outline-none text-center font-bold w-full uppercase" />
              </th>
            </tr>
          </thead>

          <tbody onInput={() => saveState(rows)}>
            {/* Infobox Rows */}
            <tr className="bg-[#e4eff7]">
              <td colSpan={2} className="py-1 px-3 border-r-[1.5px] border-black align-top border-b border-transparent">
                <div className="flex">
                  <input type="text" defaultValue="KEGIATAN" className="w-24 bg-transparent outline-none font-medium" />
                  <span className="w-4">:</span>
                  <input type="text" className="flex-1 bg-transparent outline-none px-1 border-b border-transparent focus:border-black/20" />
                </div>
              </td>
              <td colSpan={4} className="py-1 px-3 border-r-[1.5px] border-black align-top border-b border-transparent font-bold">
                <input type="text" defaultValue="JUMLAH TENAGA" className="w-full bg-transparent outline-none font-bold" />
              </td>
              <td colSpan={3} className="py-1 px-3 align-top border-b border-transparent">
                <div className="flex">
                  <input type="text" defaultValue="Tanggal" className="w-20 bg-transparent outline-none" />
                  <span className="w-4">:</span>
                  <input type="text" className="flex-1 bg-transparent outline-none px-1 border-b border-transparent focus:border-black/20" />
                </div>
              </td>
            </tr>

            <tr className="bg-[#e4eff7]">
              <td colSpan={2} className="py-1 px-3 border-r-[1.5px] border-black align-top border-b border-transparent">
                <div className="flex">
                  <input type="text" defaultValue="PEKERJAAN" className="w-24 bg-transparent outline-none font-medium" />
                  <span className="w-4">:</span>
                  <input type="text" className="flex-1 bg-transparent outline-none px-1 border-b border-transparent focus:border-black/20" />
                </div>
              </td>
              <td colSpan={4} className="py-1 px-3 border-r-[1.5px] border-black align-top border-b border-transparent">
                <div className="flex items-center">
                  <input type="text" defaultValue="Kepala Tukang" className="w-32 bg-transparent outline-none" />
                  <span className="w-4">:</span>
                  <input type="text" className="w-12 text-center bg-transparent outline-none border-b border-transparent focus:border-black/20" />
                  <span className="ml-2 text-slate-700">(org)</span>
                </div>
              </td>
              <td colSpan={3} className="py-1 px-3 align-top border-b border-transparent">
                <div className="flex">
                  <input type="text" defaultValue="Cuaca" className="w-20 bg-transparent outline-none" />
                  <span className="w-4">:</span>
                  <input type="text" className="flex-1 bg-transparent outline-none px-1 border-b border-transparent focus:border-black/20" />
                </div>
              </td>
            </tr>

            <tr className="bg-[#e4eff7]">
              <td colSpan={2} className="py-1 px-3 border-r-[1.5px] border-black align-top border-b-[1.5px] border-black">
                <div className="flex">
                  <input type="text" defaultValue="LOKASI" className="w-24 bg-transparent outline-none font-medium" />
                  <span className="w-4">:</span>
                  <input type="text" className="flex-1 bg-transparent outline-none px-1 border-b border-transparent focus:border-black/20" />
                </div>
              </td>
              <td colSpan={4} className="py-1 px-3 border-r-[1.5px] border-black align-top border-b-[1.5px] border-black">
                <div className="flex items-center mb-1">
                  <input type="text" defaultValue="Tukang" className="w-32 bg-transparent outline-none" />
                  <span className="w-4">:</span>
                  <input type="text" className="w-12 text-center bg-transparent outline-none border-b border-transparent focus:border-black/20" />
                  <span className="ml-2 text-slate-700">(org)</span>
                </div>
                <div className="flex items-center mb-1">
                  <input type="text" defaultValue="Buruh" className="w-32 bg-transparent outline-none" />
                  <span className="w-4">:</span>
                  <input type="text" className="w-12 text-center bg-transparent outline-none border-b border-transparent focus:border-black/20" />
                  <span className="ml-2 text-slate-700">(org)</span>
                </div>
                <div className="flex items-center">
                  <input type="text" defaultValue="Spesialis" className="w-32 bg-transparent outline-none" />
                  <span className="w-4">:</span>
                  <input type="text" className="w-12 text-center bg-transparent outline-none border-b border-transparent focus:border-black/20" />
                  <span className="ml-2 text-slate-700">(org)</span>
                </div>
              </td>
              <td colSpan={3} className="py-1 px-3 align-top border-b-[1.5px] border-black">
                <div className="flex">
                  <input type="text" defaultValue="Kendala" className="w-20 bg-transparent outline-none" />
                  <span className="w-4">:</span>
                  <input type="text" className="flex-1 bg-transparent outline-none px-1 border-b border-transparent focus:border-black/20" />
                </div>
              </td>
            </tr>
            
            {/* Main Table Headers */}
            <tr className="bg-white text-center font-bold">
              <td className="py-2 px-2 border-r-[1.5px] border-b-[1.5px] border-black w-14 text-[12px]">
                <input type="text" defaultValue="NO" className="w-full bg-transparent outline-none font-bold text-center" />
              </td>
              <td className="py-2 px-4 border-r-[1.5px] border-b-[1.5px] border-black w-[400px] text-[12px]">
                <input type="text" defaultValue="URAIAN PEKERJAAN" className="w-full bg-transparent outline-none font-bold text-center" />
              </td>
              <td className="py-2 px-4 border-r-[1.5px] border-b-[1.5px] border-black w-48 text-[12px]">
                <input type="text" defaultValue="SPESIFIKASI BAHAN" className="w-full bg-transparent outline-none font-bold text-center" />
              </td>
              <td colSpan={2} className="py-2 px-4 border-r-[1.5px] border-b-[1.5px] border-black w-24 text-[12px]">
                <input type="text" defaultValue="VOLUME" className="w-full bg-transparent outline-none font-bold text-center" />
              </td>
              <td className="py-2 px-2 border-r-[1.5px] border-b-[1.5px] border-black w-28 leading-tight text-[12px]">
                <div contentEditable suppressContentEditableWarning className="w-full bg-transparent outline-none font-bold text-center break-words min-h-[1.5em]">
                  BOBOT<br/>PEKERJAAN
                </div>
              </td>
              <td className="py-2 px-2 border-r-[1.5px] border-b-[1.5px] border-black w-28 leading-tight text-[12px]">
                <div contentEditable suppressContentEditableWarning className="w-full bg-transparent outline-none font-bold text-center break-words min-h-[1.5em]">
                  BOBOT S/D<br/>HARI INI
                </div>
              </td>
              <td className="py-2 px-2 border-r-[1.5px] border-b-[1.5px] border-black w-28 leading-tight text-[12px]">
                <div contentEditable suppressContentEditableWarning className="w-full bg-transparent outline-none font-bold text-center break-words min-h-[1.5em]">
                  VOL S/D<br/>HARI INI
                </div>
              </td>
              <td className="py-2 px-2 border-b-[1.5px] border-black w-32 leading-tight text-[12px]">
                <div contentEditable suppressContentEditableWarning className="w-full bg-transparent outline-none font-bold text-center break-words min-h-[1.5em]">
                  PROGRESS<br/>PEKERJAAN
                </div>
              </td>
            </tr>
            
            {/* Sub-headers letters */}
            <tr className="bg-white text-center font-medium">
              <td className="py-0.5 border-r border-b-[1.5px] border-black">
                <input type="text" defaultValue="a" className="w-full bg-transparent outline-none text-center" />
              </td>
              <td className="py-0.5 border-r-[1.5px] border-b-[1.5px] border-black">
                <input type="text" defaultValue="b" className="w-full bg-transparent outline-none text-center" />
              </td>
              <td className="py-0.5 border-r-[1.5px] border-b-[1.5px] border-black">
                <input type="text" defaultValue="c" className="w-full bg-transparent outline-none text-center" />
              </td>
              <td colSpan={2} className="py-0.5 border-r-[1.5px] border-b-[1.5px] border-black">
                <input type="text" defaultValue="d" className="w-full bg-transparent outline-none text-center" />
              </td>
              <td className="py-0.5 border-r-[1.5px] border-b-[1.5px] border-black">
                <input type="text" defaultValue="e" className="w-full bg-transparent outline-none text-center" />
              </td>
              <td className="py-0.5 border-r-[1.5px] border-b-[1.5px] border-black">
                <input type="text" defaultValue="f" className="w-full bg-transparent outline-none text-center" />
              </td>
              <td className="py-0.5 border-r-[1.5px] border-b-[1.5px] border-black">
                <input type="text" defaultValue="g" className="w-full bg-transparent outline-none text-center" />
              </td>
              <td className="py-0.5 border-b-[1.5px] border-black">
                <input type="text" defaultValue="h" className="w-full bg-transparent outline-none text-center" />
              </td>
            </tr>

            {/* Editable Rows */}
            {rows.map((row) => {
              if (row.type === 'subtitle') {
                return (
                  <tr 
                    key={row.id} 
                    data-type="subtitle" 
                    className={`bg-[#c2d7eb] font-bold ${isDeleteMode ? 'bg-red-200/50' : ''}`}
                  >
                    <td className="border-r-[1.5px] border-b-[1.5px] border-black text-center py-1 relative">
                      {isDeleteMode ? (
                        <button
                          onClick={() => deleteRow(row.id)}
                          className="absolute inset-0 m-auto w-[18px] h-[18px] flex items-center justify-center bg-red-100 hover:bg-red-500 hover:text-white text-red-600 rounded-sm transition-colors shadow-sm cursor-pointer z-10"
                          title="Hapus Baris"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      ) : (
                        <input type="text" defaultValue="I" className="w-full bg-transparent outline-none font-bold text-center" />
                      )}
                    </td>
                    <td colSpan={4} className={`border-r-[1.5px] border-b-[1.5px] border-black px-2 py-1 ${isDeleteMode ? 'pointer-events-none' : ''}`}>
                      <input type="text" defaultValue="PEKERJAAN PENDAHULUAN" className="w-full bg-transparent outline-none font-bold text-[12px]" />
                    </td>
                    <td className={`border-r-[1.5px] border-b-[1.5px] border-black px-2 py-1 ${isDeleteMode ? 'pointer-events-none' : ''}`}>
                      <input type="text" readOnly placeholder="" className="w-full bg-transparent outline-none text-center text-[#1e3a8a] font-bold text-[12px] sum-bobot-pek" />
                    </td>
                    <td className={`border-r-[1.5px] border-b-[1.5px] border-black px-2 py-1 bg-[#a3c0d8] ${isDeleteMode ? 'pointer-events-none' : ''}`}>
                    </td>
                    <td className={`border-r-[1.5px] border-b-[1.5px] border-black px-2 py-1 ${isDeleteMode ? 'pointer-events-none' : ''}`}>
                      <input type="text" readOnly placeholder="" className="w-full bg-transparent outline-none text-center text-[#1e3a8a] font-bold text-[12px] sum-bobot-sd" />
                    </td>
                    <td className={`border-b-[1.5px] border-black px-2 py-1 ${isDeleteMode ? 'pointer-events-none' : ''}`}>
                      <input type="text" readOnly placeholder="" className="w-full bg-transparent outline-none text-center text-[#1e3a8a] font-bold text-[12px] sum-progress" />
                    </td>
                  </tr>
                );
              }

              return (
                <tr 
                  key={row.id} 
                  data-type="data" 
                  className={`h-[22px] transition-colors focus-within:bg-blue-50/50 hover:bg-slate-50 ${isDeleteMode ? 'bg-red-50/30' : ''}`}
                >
                  <td style={{ borderRight: '1.5px solid black', borderBottom: '1px dotted #9ca3af' }} className="px-1 relative">
                    {isDeleteMode ? (
                      <button
                        onClick={() => deleteRow(row.id)}
                        className="absolute inset-0 m-auto w-[18px] h-[18px] flex items-center justify-center bg-red-100 hover:bg-red-500 hover:text-white text-red-600 rounded-sm transition-colors shadow-sm cursor-pointer z-10"
                        title="Hapus Baris"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    ) : (
                      <input type="text" onPaste={(e) => handlePaste(e, 0)} className="w-full bg-transparent outline-none text-center text-[12px]" />
                    )}
                  </td>
                  <td style={{ borderRight: '1.5px solid black', borderBottom: '1px dotted #9ca3af' }} className="px-2">
                    <input 
                      type="text" 
                      onPaste={(e) => handlePaste(e, 1)} 
                      className="w-full bg-transparent outline-none text-[12px]"
                      style={{ transition: 'padding 0.2s ease', paddingLeft: '0px' }}
                      onChange={(e) => {
                        const val = e.target.value.trim();
                        // Jika dimulai huruf+titik (a., b.), huruf+kurung (a), b)), atau strip (-), geser lebih ke kanan
                        if (/^([a-zA-Z][.)]|-|\*)\s/.test(val)) {
                          e.target.style.paddingLeft = '24px';
                        } else {
                          // Jika angka (1., 2.) atau teks biasa, tetap menempel ke kiri
                          e.target.style.paddingLeft = '0px';
                        }
                      }}
                    />
                  </td>
                  <td style={{ borderRight: '1.5px solid black', borderBottom: '1px dotted #9ca3af' }} className="px-2">
                    <input type="text" onPaste={(e) => handlePaste(e, 2)} className="w-full bg-transparent outline-none text-[12px]" />
                  </td>
                  <td style={{ borderRight: '1.5px solid black', borderBottom: '1px dotted #9ca3af' }} className="px-2 w-16">
                    <input type="text" onPaste={(e) => handlePaste(e, 3)} onInput={handleInputRow} className="w-full bg-transparent outline-none text-right text-[12px]" />
                  </td>
                  <td style={{ borderRight: '1.5px solid black', borderBottom: '1px dotted #9ca3af' }} className="px-2 w-12">
                    <input type="text" onPaste={(e) => handlePaste(e, 4)} className="w-full bg-transparent outline-none text-center text-[12px]" />
                  </td>
                  <td style={{ borderRight: '1.5px solid black', borderBottom: '1px dotted #9ca3af' }} className="px-2">
                    <input type="text" onPaste={(e) => handlePaste(e, 5)} onInput={handleInputRow} className="w-full bg-transparent outline-none text-center text-green-700 font-medium text-[12px]" />
                  </td>
                  <td style={{ borderRight: '1.5px solid black', borderBottom: '1px dotted #9ca3af' }} className="px-2">
                    <input type="text" onPaste={(e) => handlePaste(e, 6)} onInput={handleInputRow} className="w-full bg-transparent outline-none text-center text-green-700 font-medium text-[12px]" />
                  </td>
                  <td style={{ borderRight: '1.5px solid black', borderBottom: '1px dotted #9ca3af' }} className="px-2">
                    <input type="text" onPaste={(e) => handlePaste(e, 7)} className="w-full bg-transparent outline-none text-center text-blue-700 font-bold text-[12px]" readOnly placeholder="Otomatis" />
                  </td>
                  <td style={{ borderBottom: '1px dotted #9ca3af' }} className="px-2">
                    <input type="text" onPaste={(e) => handlePaste(e, 8)} className="w-full bg-transparent outline-none text-center font-bold text-[12px]" readOnly placeholder="Otomatis" />
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="font-bold text-[12px]">
            {/* Row PEKAN LALU */}
            <tr className="bg-[#bde4f4]">
              <td colSpan={8} className="border-r-[1.5px] border-b-[1.5px] border-black text-left px-4 py-1">Progres Pekerjaan Pekan Lalu</td>
              <td className="border-b-[1.5px] border-black text-center px-1 py-1">
                <input type="text" readOnly className="w-full bg-transparent outline-none text-center font-bold" id="input-pekan-lalu" />
              </td>
            </tr>

            {/* Row S/D HARI INI */}
            <tr className="bg-[#fffab3]">
              <td colSpan={8} className="border-r-[1.5px] border-b-[1.5px] border-black text-left px-4 py-1">Progres Pekerjaan S/D Hari Ini</td>
              <td className="border-b-[1.5px] border-black text-center px-1 py-1">
                <input type="text" readOnly className="w-full bg-transparent outline-none text-center font-bold" id="output-hari-ini" />
              </td>
            </tr>

            {/* Row PEKAN INI */}
            <tr className="bg-[#c4ed3b]">
              <td colSpan={8} className="border-r-[1.5px] border-b-[1.5px] border-black text-left px-4 py-1">Progres Pekerjaan Pekan Ini</td>
              <td className="border-b-[1.5px] border-black text-center px-1 py-1">
                <input type="text" readOnly className="w-full bg-transparent outline-none text-center font-bold" id="output-pekan-ini" />
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mt-4 flex justify-center gap-4">
        <button 
          onClick={handleUndo}
          disabled={history.length === 0}
          className={`flex items-center gap-2 px-6 py-2 bg-white text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors font-medium text-sm shadow-sm ${history.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Undo className="w-4 h-4" />
          Undo
        </button>
        <button 
          onClick={addSubtitleRow}
          className="flex items-center gap-2 px-6 py-2 bg-white text-emerald-600 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors font-medium text-sm shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Tambah Sub Judul
        </button>
        <button 
          onClick={addDataRow}
          className="flex items-center gap-2 px-6 py-2 bg-white text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors font-medium text-sm shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Tambah Baris
        </button>
        <button 
          onClick={() => setIsDeleteMode(!isDeleteMode)}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg transition-colors font-medium text-sm shadow-sm border ${isDeleteMode ? 'bg-red-500 text-white border-red-600 hover:bg-red-600' : 'bg-white text-red-600 border-red-200 hover:bg-red-50'}`}
        >
          <Trash2 className="w-4 h-4" />
          {isDeleteMode ? 'Matikan Mode Hapus' : 'Mode Hapus Baris'}
        </button>
      </div>
    </div>
  );
}

