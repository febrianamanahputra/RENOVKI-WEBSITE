import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, Undo } from 'lucide-react';

interface TimeScheduleProps {
  onBack: () => void;
  pekan: string;
  locationId: string;
  key?: string;
}

type RowType = 'title' | 'subtitle' | 'data';

// Represents an initial 27 weeks (0 to 26) as per image
const INITIAL_WEEKS = Array.from({ length: 27 }, (_, i) => i);

interface ScheduleRow {
  id: string;
  type: RowType;
}

export default function TimeSchedule({ onBack, pekan, locationId }: TimeScheduleProps) {
  const [rows, setRows] = useState<ScheduleRow[]>(() => {
    const saved = localStorage.getItem(`ts_data_global_${locationId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.rows && parsed.rows.length) return parsed.rows;
      } catch (e) {}
    }
    return [
      { id: 't1', type: 'title' },
      { id: 's1', type: 'subtitle' },
      { id: 'd1', type: 'data' },
      { id: 'd2', type: 'data' },
      { id: 'd3', type: 'data' },
    ];
  });

  const [weeks, setWeeks] = useState<number[]>(INITIAL_WEEKS);
  
  // History for undo
  const [history, setHistory] = useState<ScheduleRow[][]>([]);
  const [isDeleteMode, setIsDeleteMode] = useState(false);

  // Column resizing state
  const [colWidths, setColWidths] = useState(() => {
    const saved = localStorage.getItem(`ts_data_global_${locationId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.colWidths) return parsed.colWidths;
      } catch (e) {}
    }
    return {
      no: 40,
      uraian: 350,
      bobot: 60,
      week0: 40,
      week: 60
    };
  });

  const resizingRef = useRef<{ id: keyof typeof colWidths; startX: number; startW: number } | null>(null);

  const saveState = useCallback((currentRows: ScheduleRow[], cols: typeof colWidths) => {
    const tbody = document.querySelector('tbody');
    const tfoot = document.querySelector('tfoot');
    const values: Record<string, string[]> = {};
    
    if (tbody) {
      const trs = tbody.querySelectorAll('tr[data-id]');
      trs.forEach(tr => {
        const id = tr.getAttribute('data-id');
        if (id) {
           const inputs = tr.querySelectorAll('input');
           values[id] = Array.from(inputs).map(inp => (inp as HTMLInputElement).value);
        }
      });
    }

    const footerValues: Record<string, string> = {};
    if (tfoot) {
       const inputs = tfoot.querySelectorAll('input');
       inputs.forEach(inp => {
           if (inp.id) footerValues[inp.id] = inp.value;
       });
    }

    localStorage.setItem(`ts_data_global_${locationId}`, JSON.stringify({ rows: currentRows, values, footerValues, colWidths: cols }));
  }, [locationId]);

  const syncAllFromBobot = useCallback(() => {
    let changed = false;
    for (let w = 1; w <= 26; w++) {
      let pIni = localStorage.getItem(`bobot_pekan_ini_${locationId}_${w}`) || '';
      let sdIni = localStorage.getItem(`bobot_sd_hari_ini_${locationId}_${w}`) || '';
      
      if (pIni === '0%' || pIni === '0,00%' || pIni === '0') pIni = '';
      if (sdIni === '0%' || sdIni === '0,00%' || sdIni === '0') sdIni = '';
      
      const realisasiInp = document.getElementById(`realisasi-in-${w}`) as HTMLInputElement;
      const kumRealisasiInp = document.getElementById(`kum-realisasi-in-${w}`) as HTMLInputElement;
      
      if (realisasiInp && realisasiInp.value !== pIni) {
        realisasiInp.value = pIni;
        changed = true;
      }
      if (kumRealisasiInp && kumRealisasiInp.value !== sdIni) {
        kumRealisasiInp.value = sdIni;
        changed = true;
      }
      calculateDeviasi(w);
    }
    return changed;
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      saveState(rows, colWidths);
    }, 500);
    return () => {
      clearTimeout(timer);
      saveState(rows, colWidths); // Force save on unmount or switch
    };
  }, [rows, colWidths, saveState]);

  useEffect(() => {
    const saved = localStorage.getItem(`ts_data_global_${locationId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setTimeout(() => {
          if (parsed.values) {
            Object.keys(parsed.values).forEach(id => {
              const tr = document.querySelector(`tr[data-id="${id}"]`);
              if (tr) {
                const inputs = tr.querySelectorAll('input');
                parsed.values[id].forEach((val: string, idx: number) => {
                  if (inputs[idx]) {
                    let cleanedVal = val;
                    if (inputs[idx].classList.contains('week-data-input')) {
                        const noSpaceVal = cleanedVal.replace(/\s/g, '');
                        if (['0,00%', '0%', '0,00', '0.00%', '0.00', '0'].includes(noSpaceVal)) {
                            cleanedVal = '';
                        }
                    }
                    if (inputs[idx].value !== cleanedVal) {
                        inputs[idx].value = cleanedVal;
                    }
                    if(inputs[idx].classList.contains('week-data-input')) {
                        if (cleanedVal.trim() !== '') {
                            inputs[idx].parentElement!.style.backgroundColor = '#f8cb9c';
                        } else {
                            inputs[idx].parentElement!.style.backgroundColor = 'transparent';
                        }
                    }
                  }
                });
              }
            });
          }
          if (parsed.footerValues) {
            Object.keys(parsed.footerValues).forEach(id => {
              const inp = document.getElementById(id) as HTMLInputElement;
              if (inp && inp.value !== parsed.footerValues[id]) {
                inp.value = parsed.footerValues[id];
              }
            });
          }
          calculateFooter();
          syncAllFromBobot();
        }, 50);
      } catch (e) {
        setTimeout(() => {
          calculateFooter();
          syncAllFromBobot();
        }, 50);
      }
    } else {
        setTimeout(() => {
          calculateFooter();
          syncAllFromBobot();
        }, 50);
    }
  }, []); // Only runs on mount

  const startResize = (e: React.MouseEvent, id: keyof typeof colWidths) => {
    e.preventDefault();
    resizingRef.current = { id, startX: e.clientX, startW: colWidths[id] };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!resizingRef.current) return;
    const { id, startX, startW } = resizingRef.current;
    const delta = e.clientX - startX;
    let newW = startW + delta;
    if (newW < 20) newW = 20; // Minimum width limit
    setColWidths(prev => ({ ...prev, [id]: newW }));
  }, []);

  const handleMouseUp = useCallback(() => {
    resizingRef.current = null;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);

  const saveHistory = (currentRows: ScheduleRow[]) => {
    setHistory(prev => [...prev, currentRows]);
  };

  const handleUndo = () => {
    if (history.length > 0) {
      const prevRows = history[history.length - 1];
      setRows(prevRows);
      setHistory(prev => prev.slice(0, -1));
    }
  };

  const deleteRow = (id: string) => {
    saveHistory(rows);
    setRows(prev => prev.filter(row => row.id !== id));
  };

  const addDataRow = () => {
    saveHistory(rows);
    setRows(prev => [...prev, { id: `data-${Date.now()}`, type: 'data' }]);
  };

  const addSubtitleRow = () => {
    saveHistory(rows);
    setRows(prev => [...prev, { id: `sub-${Date.now()}`, type: 'subtitle' }]);
  };

  const addTitleRow = () => {
    saveHistory(rows);
    setRows(prev => [...prev, { id: `tit-${Date.now()}`, type: 'title' }]);
  };

  const calculateFooter = useCallback(() => {
    const tableInfo: Record<number, number> = {};
    const inputs = document.querySelectorAll('.week-data-input');
    inputs.forEach(input => {
      const el = input as HTMLInputElement;
      const weekStr = el.getAttribute('data-week');
      if (weekStr && el.value) {
        const w = parseInt(weekStr, 10);
        const val = parseFloat(el.value.replace(/,/g, '.').replace('%', ''));
        if (!isNaN(val)) {
          tableInfo[w] = (tableInfo[w] || 0) + val;
        }
      }
    });

    let cumulativeSum = 0;
    
    // Process week 1 to 26 (week 0 is Persiapan)
    for(let i = 1; i <= 26; i++) {
      const rencanaVal = tableInfo[i] || 0;
      cumulativeSum += rencanaVal;

      const rencanaOut = document.getElementById(`rencana-out-${i}`) as HTMLInputElement;
      const kumRencanaOut = document.getElementById(`kum-rencana-out-${i}`) as HTMLInputElement;

      if (rencanaOut) rencanaOut.value = rencanaVal > 0 ? `${Number(rencanaVal.toFixed(2))}%` : '';
      if (kumRencanaOut) kumRencanaOut.value = cumulativeSum > 0 ? `${Number(cumulativeSum.toFixed(2))}%` : '';
      
      // Hitung deviasi
      calculateDeviasi(i);
    }
  }, []);

  const calculateDeviasi = (week: number) => {
    const kumKencanaInp = document.getElementById(`kum-rencana-out-${week}`) as HTMLInputElement;
    const kumRealisasiInp = document.getElementById(`kum-realisasi-in-${week}`) as HTMLInputElement;
    const deviasiOut = document.getElementById(`deviasi-out-${week}`) as HTMLInputElement;

    if (kumKencanaInp && kumRealisasiInp && deviasiOut) {
      const rencana = parseFloat(kumKencanaInp.value.replace(/,/g, '.').replace('%', '')) || 0;
      const realisasi = parseFloat(kumRealisasiInp.value.replace(/,/g, '.').replace('%', '')) || 0;
      
      // We only compute deviasi if realisasi exists and is not empty or 0 to keep it clean, or always compute diff?
      // "nilai 0,00 otomatis di hilangkan" -> apply to deviasi as well.
      if (kumKencanaInp.value.trim() === '' && kumRealisasiInp.value.trim() === '') {
        deviasiOut.value = '';
      } else {
        const diff = realisasi - rencana;
        deviasiOut.value = diff === 0 ? '' : `${Number(diff.toFixed(2))}%`;
      }
    }
  };

  const handleInputDataRow = () => {
    calculateFooter();
  };

  useEffect(() => {
    calculateFooter();
  }, [rows, calculateFooter]);

  const handlePaste = (e: React.ClipboardEvent<HTMLTableSectionElement>) => {
    const targetInput = e.target as HTMLInputElement;
    if (targetInput.tagName !== 'INPUT') return;

    const text = e.clipboardData.getData('text');
    if (!text) return;
    
    // Intercept if there's a newline or tab (grid data)
    if (!text.includes('\n') && !text.includes('\t')) return;
    
    e.preventDefault();
    const pastedRows = text.split(/\r\n|\n/).map(row => row.split('\t'));
    // remove empty trailing row
    if (pastedRows.length > 0 && pastedRows[pastedRows.length - 1].length === 1 && pastedRows[pastedRows.length - 1][0] === '') {
        pastedRows.pop();
    }

    const tbody = e.currentTarget as HTMLTableSectionElement;
    const trs = Array.from(tbody.querySelectorAll('tr[data-id]'));
    
    const targetTr = targetInput.closest('tr');
    if (!targetTr) return;
    
    const currentRowIdx = trs.indexOf(targetTr as HTMLTableRowElement);
    if (currentRowIdx === -1) return;

    const currentTrInputs = Array.from(targetTr.querySelectorAll('input:not([readonly])'));
    const startCellIdx = currentTrInputs.indexOf(targetInput);
    if (startCellIdx === -1) return;

    pastedRows.forEach((pastedRowText, rIdx) => {
      const tr = trs[currentRowIdx + rIdx];
      if (!tr) return;

      const inputs = Array.from(tr.querySelectorAll('input:not([readonly])')) as HTMLInputElement[];
      
      pastedRowText.forEach((cellText, cIdx) => {
        const inp = inputs[startCellIdx + cIdx];
        if (inp) {
           let val = cellText.trim();
           // Specific logic for week inputs: change background color and remove zeros
           if (inp.classList.contains('week-data-input')) {
             const cleanVal = val.replace(/\s/g, '');
             if (['0,00%', '0%', '0,00', '0', '0.00%', '0.00'].includes(cleanVal)) {
                 val = '';
             }
             inp.value = val;
             if(val !== '') {
                 inp.parentElement!.style.backgroundColor = '#f8cb9c';
             } else {
                 inp.parentElement!.style.backgroundColor = 'transparent';
             }
           } else {
             inp.value = val;
           }
        }
      });
    });

    calculateFooter();
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5] p-2 sm:p-4 font-['Helvetica_Neue',Arial,sans-serif]">
      {/* Header Area */}
      <div className="max-w-[100vw] mx-auto bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Time Schedule</h1>
            <p className="text-sm text-slate-500">Jadwal Pelaksanaan Pekerjaan</p>
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div 
        className="w-full bg-white border-2 border-black overflow-auto shadow-xl custom-scrollbar" 
        style={{ height: 'calc(100vh - 180px)' }}
      >
        <table className="w-max min-w-full border-collapse text-[#000000] sticky-header-table select-none" style={{ tableLayout: 'fixed' }} onInput={() => saveState(rows, colWidths)}>
          <colgroup>
            <col style={{ width: colWidths.no, minWidth: colWidths.no }} />
            <col style={{ width: colWidths.uraian, minWidth: colWidths.uraian }} />
            <col style={{ width: colWidths.bobot, minWidth: colWidths.bobot }} />
            {weeks.map(week => (
              <col key={`col-${week}`} style={{ width: week === 0 ? colWidths.week0 : colWidths.week, minWidth: week === 0 ? colWidths.week0 : colWidths.week }} />
            ))}
          </colgroup>
          <thead className="bg-white text-[12px] font-bold z-10 sticky top-0 shadow-sm">
            {/* 1. Main Header Addendum... */}
            <tr>
              <th colSpan={3} className="bg-[#8faadc] border-b-[2px] border-black h-[50px]"></th>
              <th colSpan={weeks.length} className="bg-[#ffc000] border-b-[2px] border-black border-l-[2px] px-2 py-4 text-left text-[16px] uppercase">
                <input type="text" defaultValue="ADDENDUM PEKERJAAN PROJECT PT HOUSE-KOMPLEKS IDI (IBU TITA)" className="w-full bg-transparent outline-none uppercase pb-1" />
              </th>
            </tr>
            
            {/* 2. Column Headers */}
            <tr className="bg-[#f2f2f2]">
              <th rowSpan={2} className="relative border-r-[1.5px] border-b-[1.5px] border-l-[1.5px] border-black px-2 text-center align-middle">
                NO
                <div className="absolute right-[-2px] inset-y-0 w-[4px] cursor-col-resize hover:bg-blue-500 z-20 touch-none transition-colors" onMouseDown={(e) => startResize(e, 'no')} title="Geser untuk mengubah ukuran" />
              </th>
              <th rowSpan={2} className="relative border-r-[1.5px] border-b-[1.5px] border-black px-2 text-center align-middle">
                URAIAN PEKERJAAN
                <div className="absolute right-[-2px] inset-y-0 w-[4px] cursor-col-resize hover:bg-blue-500 z-20 touch-none transition-colors" onMouseDown={(e) => startResize(e, 'uraian')} title="Geser untuk mengubah ukuran" />
              </th>
              <th rowSpan={2} className="relative border-r-[1.5px] border-b-[1.5px] border-black px-2 text-center align-middle">
                BOBOT
                <div className="absolute right-[-2px] inset-y-0 w-[4px] cursor-col-resize hover:bg-blue-500 z-20 touch-none transition-colors" onMouseDown={(e) => startResize(e, 'bobot')} title="Geser untuk mengubah ukuran" />
              </th>
              <th colSpan={weeks.length} className="border-b-[1.5px] border-black px-2 py-1 text-center bg-[#f2f2f2]">
                <input type="text" defaultValue="PEKAN PEKERJAAN" className="w-full bg-transparent outline-none text-center font-bold" />
              </th>
            </tr>
            <tr className="bg-white">
              {weeks.map(week => (
                <th key={`week-${week}`} className="relative border-r-[1.5px] border-b-[1.5px] border-black px-1 text-center font-normal">
                  <input type="text" defaultValue={week.toString()} className="w-full bg-transparent outline-none text-center font-bold" />
                  <div className="absolute right-[-2px] inset-y-0 w-[4px] cursor-col-resize hover:bg-blue-500 z-20 touch-none transition-colors" onMouseDown={(e) => startResize(e, week === 0 ? 'week0' : 'week')} title={week === 0 ? "Geser untuk mengubah ukuran kolom 0" : "Geser untuk mengubah ukuran semua kolom pekan"} />
                </th>
              ))}
            </tr>
            <tr className="bg-white">
              <th colSpan={3} className="border-r-[1.5px] border-b-[2px] border-black h-5"></th>
              {weeks.map(week => (
                <th key={`date-${week}`} className="border-r-[1.5px] border-b-[2px] border-black px-1 text-center font-normal text-[10px]">
                  <input type="text" defaultValue={week === 0 ? "20-Dec-25" : ""} className="w-full bg-transparent outline-none text-center" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody onPaste={handlePaste}>
            {rows.map((row, rIndex) => {
              
              if (row.type === 'title') {
                return (
                  <tr key={row.id} data-id={row.id} data-type="title" className={`bg-[#d0cece] font-bold ${isDeleteMode ? 'bg-red-200/50' : ''}`}>
                    <td colSpan={2} className="border-r-[1.5px] border-b-[1.5px] border-black px-2 py-1 text-center relative overflow-hidden">
                      {isDeleteMode && (
                        <button
                          onClick={() => deleteRow(row.id)}
                          className="absolute left-1 top-0 bottom-0 m-auto w-[18px] h-[18px] flex items-center justify-center bg-red-100 hover:bg-red-500 hover:text-white text-red-600 rounded-sm transition-colors shadow-sm cursor-pointer z-10"
                          title="Hapus Baris"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                      <input type="text" defaultValue="PEKERJAAN RAB AWAL" className="w-full bg-transparent outline-none font-bold text-center pl-6" />
                    </td>
                    <td className="border-r-[1.5px] border-b-[1.5px] border-black px-2 py-1 overflow-hidden">
                      <input type="text" defaultValue="68,68%" className="w-full bg-transparent outline-none font-bold text-center" />
                    </td>
                    {rIndex === 0 && (
                      <td rowSpan={rows.length} className="border-r-[1.5px] border-b-[1.5px] border-black bg-[#f8cb9c] align-middle text-center overflow-hidden">
                         <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }} className="mx-auto font-bold text-[11px] uppercase tracking-widest w-full text-black">
                            Persiapan
                         </div>
                      </td>
                    )}
                    <td colSpan={weeks.length - 1} className="border-b-[1.5px] border-black bg-transparent">
                    </td>
                  </tr>
                );
              }

              if (row.type === 'subtitle') {
                return (
                  <tr key={row.id} data-id={row.id} data-type="subtitle" className={`bg-white font-bold ${isDeleteMode ? 'bg-red-200/50' : ''}`}>
                    <td className="border-r-[1.5px] border-b-[1.5px] border-black px-2 py-1 text-center relative overflow-hidden">
                       {isDeleteMode ? (
                        <button
                          onClick={() => deleteRow(row.id)}
                          className="absolute inset-0 m-auto w-[18px] h-[18px] flex items-center justify-center bg-red-100 hover:bg-red-500 hover:text-white text-red-600 rounded-sm transition-colors shadow-sm cursor-pointer z-10"
                          title="Hapus Baris"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      ) : (
                        <input type="text" defaultValue="I" className="w-full bg-transparent outline-none font-bold text-center pl-1 text-[11px]" />
                      )}
                    </td>
                    <td className="border-r-[1.5px] border-b-[1.5px] border-black px-2 py-1 overflow-hidden">
                      <input type="text" defaultValue="PEKERJAAN PENDAHULUAN" className="w-full bg-transparent outline-none font-bold text-[11px]" />
                    </td>
                    <td className="border-r-[1.5px] border-b-[1.5px] border-black px-2 py-1 overflow-hidden">
                      <input type="text" defaultValue="4,48%" className="w-full bg-transparent outline-none text-center font-bold text-[11px]" />
                    </td>
                    {/* First column of weeks has bg-[#f8cb9c] */}
                    {rIndex === 0 && (
                      <td rowSpan={rows.length} className="border-r-[1.5px] border-b-[1.5px] border-black bg-[#f8cb9c] align-middle text-center overflow-hidden">
                         <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }} className="mx-auto font-bold text-[11px] uppercase tracking-widest w-full text-black">
                            Persiapan
                         </div>
                      </td>
                    )}
                    
                    {/* Remaining week columns */}
                    {weeks.slice(1).map((week, idx) => (
                      <td key={week} className="border-r-[1.5px] border-b-[1.5px] border-black px-1 overflow-hidden">
                         <input 
                           type="text" 
                           className="w-full week-data-input bg-transparent outline-none text-center font-semibold text-[11px]" 
                           onChange={(e) => {
                             let val = e.target.value.trim();
                             const cleanVal = val.replace(/\s/g, '');
                             if (['0,00%', '0%', '0,00', '0', '0.00%', '0.00'].includes(cleanVal)) {
                                 val = '';
                                 e.target.value = '';
                             }
                             if(val !== '') {
                               e.target.parentElement!.style.backgroundColor = '#f8cb9c';
                             } else {
                               e.target.parentElement!.style.backgroundColor = 'transparent';
                             }
                           }}
                         />
                      </td>
                    ))}
                  </tr>
                );
              }

              // Data Row
              return (
                 <tr key={row.id} data-id={row.id} data-type="data" className={`bg-white ${isDeleteMode ? 'bg-red-200/50' : ''}`}>
                    <td className="border-r-[1.5px] border-b-[1.5px] border-black px-2 py-1 text-center relative overflow-hidden">
                       {isDeleteMode ? (
                        <button
                          onClick={() => deleteRow(row.id)}
                          className="absolute inset-0 m-auto w-[18px] h-[18px] flex items-center justify-center bg-red-100 hover:bg-red-500 hover:text-white text-red-600 rounded-sm transition-colors shadow-sm cursor-pointer z-10"
                          title="Hapus Baris"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      ) : (
                        <input type="text" className="w-full bg-transparent outline-none font-bold text-center pl-1 text-[11px]" />
                      )}
                    </td>
                    <td className="border-r-[1.5px] border-b-[1.5px] border-black px-2 py-1 overflow-hidden">
                      <input type="text" className="w-full bg-transparent outline-none font-bold text-[11px]" />
                    </td>
                    <td className="border-r-[1.5px] border-b-[1.5px] border-black px-2 py-1 overflow-hidden">
                      <input type="text" className="w-full bg-transparent outline-none text-center font-bold text-[11px]" />
                    </td>
                    {/* First column of weeks has bg-[#f8cb9c] */}
                    {rIndex === 0 && (
                      <td rowSpan={rows.length} className="border-r-[1.5px] border-b-[1.5px] border-black bg-[#f8cb9c] align-middle text-center overflow-hidden">
                         <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }} className="mx-auto font-bold text-[11px] uppercase tracking-widest w-full text-black">
                            Persiapan
                         </div>
                      </td>
                    )}
                    
                    {weeks.slice(1).map((week, idx) => (
                      <td key={week} className="border-r-[1.5px] border-b-[1.5px] border-black px-1 overflow-hidden">
                         <input 
                           type="text" 
                           data-week={week}
                           onInput={handleInputDataRow}
                           className="w-full week-data-input bg-transparent outline-none text-center font-semibold text-[11px]" 
                           onChange={(e) => {
                             let val = e.target.value.trim();
                             const cleanVal = val.replace(/\s/g, '');
                             if (['0,00%', '0%', '0,00', '0', '0.00%', '0.00'].includes(cleanVal)) {
                                 val = '';
                                 e.target.value = '';
                             }
                             if(val !== '') {
                               e.target.parentElement!.style.backgroundColor = '#f8cb9c';
                             } else {
                               e.target.parentElement!.style.backgroundColor = 'transparent';
                             }
                           }}
                         />
                      </td>
                    ))}
                  </tr>
              );
            })}
          </tbody>
          <tfoot className="time-schedule-tfoot bg-white">
            {/* 1. BOBOT RENCANA */}
            <tr className="font-bold">
              <td colSpan={3} className="border-r-[1.5px] border-b-[1.5px] border-l-[1.5px] border-black px-2 py-1 text-right text-[11px]">BOBOT RENCANA</td>
              <td className="border-r-[1.5px] border-b-[1.5px] border-black"></td>
              {weeks.slice(1).map(week => (
                <td key={week} className="border-r-[1.5px] border-b-[1.5px] border-black px-1">
                  <input readOnly id={`rencana-out-${week}`} className="w-full bg-transparent outline-none text-center text-[10px]" />
                </td>
              ))}
            </tr>
            {/* 2. KUMULATIF BOBOT RENCANA */}
            <tr className="font-bold">
              <td colSpan={3} className="border-r-[1.5px] border-b-[1.5px] border-l-[1.5px] border-black px-2 py-1 text-right text-[11px]">KUMULATIF BOBOT RENCANA</td>
              <td className="border-r-[1.5px] border-b-[1.5px] border-black bg-transparent"></td>
              {weeks.slice(1).map(week => (
                <td key={week} className="border-r-[1.5px] border-b-[1.5px] border-black px-1">
                  <input readOnly id={`kum-rencana-out-${week}`} className="w-full bg-transparent outline-none text-center text-[10px]" />
                </td>
              ))}
            </tr>
            {/* 3. BOBOT REALISASI */}
            <tr className="font-bold bg-[#ffe699]">
              <td colSpan={3} className="border-r-[1.5px] border-b-[1.5px] border-l-[1.5px] border-black px-2 py-1 text-right text-[11px]">BOBOT REALISASI</td>
              <td className="border-r-[1.5px] border-b-[1.5px] border-black bg-transparent"></td>
              {weeks.slice(1).map(week => (
                <td key={week} className="border-r-[1.5px] border-b-[1.5px] border-black px-1 relative">
                  <input readOnly id={`realisasi-in-${week}`} className="w-full bg-transparent outline-none text-center text-[10px]" />
                </td>
              ))}
            </tr>
            {/* 4. KUMULATIF BOBOT REALISASI */}
            <tr className="font-bold bg-[#a9d08e]">
               <td colSpan={3} className="border-r-[1.5px] border-b-[1.5px] border-l-[1.5px] border-black px-2 py-1 text-right text-[11px] relative">
                 KUMULATIF BOBOT REALISASI
               </td>
               <td className="border-r-[1.5px] border-b-[1.5px] border-black bg-transparent"></td>
               {weeks.slice(1).map(week => (
                 <td key={week} className="border-r-[1.5px] border-b-[1.5px] border-black px-1 relative transition-colors" title="Otomatis diambil dari Page Bobot">
                   <input 
                     id={`kum-realisasi-in-${week}`} 
                     className="w-full bg-transparent outline-none text-center text-[10px]" 
                     readOnly
                   />
                 </td>
               ))}
            </tr>
            {/* 5. DEVIASI */}
            <tr className="font-bold bg-[#9dc3e6]">
               <td colSpan={3} className="border-r-[1.5px] border-b-[1.5px] border-l-[1.5px] border-black px-2 py-1 text-right text-[11px]">DEVIASI</td>
               <td className="border-r-[1.5px] border-b-[1.5px] border-black bg-transparent"></td>
               {weeks.slice(1).map(week => (
                 <td key={week} className="border-r-[1.5px] border-b-[1.5px] border-black px-1">
                   <input readOnly id={`deviasi-out-${week}`} className="w-full bg-transparent outline-none text-center text-[10px]" />
                 </td>
               ))}
            </tr>
          </tfoot>
        </table>
      </div>

       <div className="mt-4 flex flex-wrap justify-center gap-4">
        {/* Sync Component helper deleted */}
        <button 
          onClick={handleUndo}
          disabled={history.length === 0}
          className={`flex items-center gap-2 px-6 py-2 bg-white text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors font-medium text-sm shadow-sm ${history.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Undo className="w-4 h-4" />
          Undo
        </button>
        <button 
          onClick={addTitleRow}
          className="flex items-center gap-2 px-6 py-2 bg-white text-purple-600 border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors font-medium text-sm shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Tambah Judul Utama
        </button>
        <button 
          onClick={addSubtitleRow}
          className="flex items-center gap-2 px-6 py-2 bg-white text-emerald-600 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors font-medium text-sm shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Tambah Baris Utama
        </button>
        <button 
          onClick={addDataRow}
          className="flex items-center gap-2 px-6 py-2 bg-white text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors font-medium text-sm shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Tambah Sub Baris
        </button>
        <button 
          onClick={() => setIsDeleteMode(!isDeleteMode)}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg transition-colors font-medium text-sm shadow-sm border ${isDeleteMode ? 'bg-red-500 text-white border-red-600 hover:bg-red-600' : 'bg-white text-red-600 border-red-200 hover:bg-red-50'}`}
        >
          <Trash2 className="w-4 h-4" />
          {isDeleteMode ? 'Matikan Mode Hapus' : 'Mode Hapus Baris'}
        </button>
      </div>

      <style>{`
        .sticky-header-table thead th {
          position: sticky;
          top: 0;
          z-index: 10;
        }
        .sticky-header-table thead tr:nth-child(1) th { top: 0; z-index: 11; }
        .sticky-header-table thead tr:nth-child(2) th { top: 52px; z-index: 11; }
        .sticky-header-table thead tr:nth-child(3) th { top: 83px; z-index: 11; }
        .sticky-header-table thead tr:nth-child(4) th { top: 111px; z-index: 11; }

        /* Custom Scrollbar */
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 12px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
}
