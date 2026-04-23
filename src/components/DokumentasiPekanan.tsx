import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, ImagePlus, Trash2, Plus } from 'lucide-react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface DokumentasiProps {
  onBack: () => void;
  pekan: string;
  locationId: string;
  startDate: string;
  key?: string;
  isPrintMode?: boolean;
}

interface PhotoData {
  id: string;
  dataUrl: string | null;
  caption: string;
}

export default function DokumentasiPekanan({ onBack, pekan, locationId, startDate, isPrintMode }: DokumentasiProps) {
  const [photos, setPhotos] = useState<PhotoData[]>(Array.from({ length: 9 }, (_, i) => ({ id: `p${i}`, dataUrl: null, caption: '' })));
  
  // Format Date Range
  const getFormattedTanggal = () => {
    if (!startDate) return '.............';
    try {
      const start = new Date(startDate);
      const end = new Date(start);
      end.setDate(start.getDate() + 5);
      if (start.getMonth() === end.getMonth()) {
        return `${start.getDate()} – ${end.getDate()} ${end.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`;
      } else {
        return `${start.getDate()} ${start.toLocaleDateString('id-ID', { month: 'short' })} – ${end.getDate()} ${end.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`;
      }
    } catch (e) { return '.............'; }
  };
  const dateStr = getFormattedTanggal();

  // Load from DB or LocalStorage
  useEffect(() => {
    if (!db || !import.meta.env.VITE_FIREBASE_API_KEY) {
      const saved = localStorage.getItem(`dokumentasi_${locationId}_${pekan}`);
      if (saved) {
         try { setPhotos(JSON.parse(saved)); } catch(e){}
      }
      return;
    }
    const unsub = onSnapshot(doc(db, "dokumentasi", `${locationId}_${pekan}`), (snap) => {
      if (snap.exists() && snap.data().photos) {
        setPhotos(snap.data().photos);
      }
    });
    return () => unsub();
  }, [locationId, pekan]);

  // Save to DB or LocalStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!db) return;
      // Filter out entirely empty rows to save space, maybe? Or save entirely so they keep their grid layout.
      // Saving full grid.
      if (!!import.meta.env.VITE_FIREBASE_API_KEY) {
         setDoc(doc(db, "dokumentasi", `${locationId}_${pekan}`), { photos }, { merge: true }).catch(console.error);
      } else {
         localStorage.setItem(`dokumentasi_${locationId}_${pekan}`, JSON.stringify(photos));
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [photos, locationId, pekan]);

  const updatePhoto = (id: string, field: 'dataUrl' | 'caption', value: string | null) => {
    setPhotos(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const addRow = () => {
    const newItems = Array.from({ length: 3 }, (_, i) => ({ id: `p${Date.now()}_${i}`, dataUrl: null, caption: '' }));
    setPhotos(prev => [...prev, ...newItems]);
  };

  const handleImageUpload = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // We will resize the image to save bandwidth/storage
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Max dimension 800px to keep file size down for Firestore (1MB limit)
        const MAX = 800;
        if (width > height) {
          if (width > MAX) {
            height *= MAX / width;
            width = MAX;
          }
        } else {
          if (height > MAX) {
            width *= MAX / height;
            height = MAX;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Encode to WebP to save more space 
        const dataUrl = canvas.toDataURL('image/webp', 0.8);
        updatePhoto(id, 'dataUrl', dataUrl);
      };
      if (event.target?.result) img.src = event.target.result as string;
    };
    reader.readAsDataURL(file);
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

      <div className={`bg-white mx-auto border border-black shadow-[0_10px_20px_rgba(0,0,0,0.08)] overflow-hidden ${isPrintMode ? 'w-[794px] h-[1123px] shadow-none' : 'max-w-[794px]'}`}>
        {/* Header Header */}
        <div className="flex border-b border-black">
           <div className="bg-[#b3d4ff] flex-1 border-r border-black p-3 font-bold text-lg text-center flex items-center justify-center">
             Dokumentasi Rekap Harian,
           </div>
           <div className="bg-[#b3d4ff] w-[40%] p-3 font-bold text-lg text-center flex items-center justify-center">
             {dateStr}
           </div>
        </div>

        {/* Photo Grid */}
        <div className="grid grid-cols-3 w-full bg-white">
          {photos.map((photo, i) => (
             <div key={photo.id} className={`flex flex-col border-b border-r border-black ${i % 3 === 2 ? 'border-r-0' : ''}`}>
               {/* Photo Area */}
               <div className="aspect-[4/3] relative bg-gray-50 flex items-center justify-center overflow-hidden group">
                  {photo.dataUrl ? (
                    <>
                      <img src={photo.dataUrl} alt="Dokumentasi" className="w-full h-full object-cover" />
                      {!isPrintMode && (
                        <button 
                          onClick={() => updatePhoto(photo.id, 'dataUrl', null)}
                          className="absolute top-2 right-2 p-2 bg-red-500/80 hover:bg-red-600 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Hapus Foto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </>
                  ) : (
                    !isPrintMode && (
                      <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-gray-100 transition-colors text-gray-400 gap-2">
                         <ImagePlus className="w-8 h-8" />
                         <span className="text-xs font-medium">Klik untuk Upload</span>
                         <input 
                           type="file" 
                           accept="image/*" 
                           className="hidden" 
                           onChange={(e) => handleImageUpload(photo.id, e)} 
                         />
                      </label>
                    )
                  )}
               </div>
               
               {/* Caption Area */}
               <div className="border-t border-black bg-white">
                  <input 
                    type="text" 
                    value={photo.caption}
                    onChange={(e) => updatePhoto(photo.id, 'caption', e.target.value)}
                    placeholder="Keterangan..."
                    className="w-full text-center px-2 py-1 text-sm font-medium outline-none focus:bg-blue-50/50"
                  />
               </div>
             </div>
          ))}
        </div>
      </div>

      {!isPrintMode && (
        <div className="max-w-[794px] mx-auto mt-4 px-2">
           <button onClick={addRow} className="flex items-center gap-2 text-blue-600 bg-white hover:bg-blue-50 transition-colors border border-blue-200 px-4 py-2 rounded-lg font-medium text-sm shadow-sm">
              <Plus className="w-4 h-4" /> Tambah Baris Ekstra
           </button>
        </div>
      )}

    </div>
  );
}
