import React, { useState, useEffect } from 'react';
import { Disc3, Calendar, Search, Loader2 } from 'lucide-react';
import { AlbumCard } from '../components/AlbumCard.js';
import type { Album } from '../types.js';
import { fetchAlbums } from '../services/albumaty.js';

interface AlbumsViewProps {
  onSelectAlbum: (id: string) => void;
}

export const AlbumsView: React.FC<AlbumsViewProps> = ({ onSelectAlbum }) => {
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [albums, setAlbums] = useState<Album[]>([]);
  const [years, setYears] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchFilter, setSearchFilter] = useState<string>('');

  const fetchAlbumsForYear = async (year: string) => {
    setIsLoading(true);
    try {
      const data = await fetchAlbums(year);
      setAlbums(data.albums || []);
      if (data.years && data.years.length > 0) {
        setYears(data.years);
      }
    } catch (e) {
      console.error('Failed to load albums for year', year, e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAlbumsForYear(selectedYear);
  }, [selectedYear]);

  // Fallback years if API doesn't return full list immediately
  const availableYears = years.length > 0 ? years : ['2026', '2025', '2024', '2023', '2022', '2021', '2020', '2019', '2018', '2017'];

  const filteredAlbums = albums.filter((a) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      a.title.toLowerCase().includes(q) ||
      (a.artist && a.artist.toLowerCase().includes(q))
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-28 space-y-8 select-none">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Disc3 className="w-4 h-4" />
            <span>أرشيف ألبومات MijWiz</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            استكشف ألبومات عام {selectedYear}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            تصفح أحدث الألبومات الغنائية والموسيقية الصادرة حسب سنة الإصدار
          </p>
        </div>

        {/* Filter Input */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-zinc-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="تصفية بالاسم أو الفنان..."
            className="w-full bg-zinc-900 text-xs text-zinc-100 placeholder:text-zinc-500 rounded-xl pr-9 pl-3 py-2 border border-zinc-800 focus:border-emerald-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Year Selector Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <span className="text-xs text-zinc-500 flex items-center gap-1 pl-2 flex-shrink-0">
          <Calendar className="w-3.5 h-3.5" />
          <span>السنة:</span>
        </span>
        {availableYears.map((yr) => {
          const isSelected = selectedYear === yr;
          return (
            <button
              key={yr}
              onClick={() => setSelectedYear(yr)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex-shrink-0 ${
                isSelected
                  ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20'
                  : 'bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800/80'
              }`}
            >
              {yr}
            </button>
          );
        })}
      </div>

      {/* Grid of Albums */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="h-64 rounded-2xl bg-zinc-900 border border-zinc-800 animate-pulse" />
          ))}
        </div>
      ) : filteredAlbums.length === 0 ? (
        <div className="text-center py-20 space-y-3">
          <Disc3 className="w-12 h-12 text-zinc-700 mx-auto" />
          <h3 className="text-base font-semibold text-zinc-300">لم يتم العثور على ألبومات</h3>
          <p className="text-xs text-zinc-500">جرب اختيار سنة أخرى أو تعديل كلمة البحث</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filteredAlbums.map((album) => (
            <AlbumCard
              key={album.id}
              album={album}
              onSelect={onSelectAlbum}
            />
          ))}
        </div>
      )}

    </div>
  );
};
