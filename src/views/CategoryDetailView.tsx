import React, { useEffect, useState } from 'react';
import {
  Layers,
  Search,
  User,
  Disc3,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { SingerCard } from '../components/SingerCard.js';
import { AlbumCard } from '../components/AlbumCard.js';
import type { Category, Singer, Album } from '../types.js';
import { fetchCategory } from '../services/albumaty.js';

interface CategoryDetailViewProps {
  categoryId: string;
  onBack: () => void;
  onSelectSinger: (id: string) => void;
  onSelectAlbum: (id: string) => void;
}

export const CategoryDetailView: React.FC<CategoryDetailViewProps> = ({
  categoryId,
  onBack,
  onSelectSinger,
  onSelectAlbum,
}) => {
  const [category, setCategory] = useState<Category | null>(null);
  const [singers, setSingers] = useState<Singer[]>([]);
  const [featuredAlbums, setFeaturedAlbums] = useState<Album[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchFilter, setSearchFilter] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    const loadCategory = async () => {
      setIsLoading(true);
      try {
        const data = await fetchCategory(categoryId);
        if (isMounted) {
          setCategory(data.category);
          setSingers(data.singers || []);
          setFeaturedAlbums(data.featuredAlbums || []);
        }
      } catch (err) {
        console.error('Failed to load category', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadCategory();
    return () => {
      isMounted = false;
    };
  }, [categoryId]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        <p className="text-xs text-zinc-400">جاري تحميل فناني وتصنيف ألبوماتي...</p>
      </div>
    );
  }

  const filteredSingers = singers.filter(s =>
    !searchFilter.trim() || s.name.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-28 space-y-8 select-none">
      
      {/* Back breadcrumb */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
      >
        <ChevronRight className="w-4 h-4 rtl:rotate-0" />
        <span>الرجوع</span>
      </button>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Layers className="w-4 h-4" />
            <span>تصنيف موسيقي</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {category?.name || 'تصنيف ألبوماتي'}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            {singers.length} فنان ومطرب مسجل في هذا القسم
          </p>
        </div>

        {/* Filter Input */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-zinc-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="بحث عن مطرب داخل القسم..."
            className="w-full bg-zinc-900 text-xs text-zinc-100 placeholder:text-zinc-500 rounded-xl pr-9 pl-3 py-2 border border-zinc-800 focus:border-emerald-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Featured Albums in this category (if any) */}
      {featuredAlbums.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-white tracking-tight">ألبومات مميزة في هذا القسم</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {featuredAlbums.map(album => (
              <AlbumCard
                key={album.id}
                album={album}
                onSelect={onSelectAlbum}
              />
            ))}
          </div>
        </section>
      )}

      {/* Singers Directory */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white tracking-tight">فنانو ومطربو القسم</h2>
          <span className="text-xs text-zinc-500">{filteredSingers.length} مطرب</span>
        </div>

        {filteredSingers.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 text-xs">
            لم يتم العثور على فنانين يطابقون كلمة البحث.
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-3">
            {filteredSingers.map(singer => (
              <SingerCard
                key={singer.id}
                singer={singer}
                onSelect={onSelectSinger}
              />
            ))}
          </div>
        )}
      </section>

    </div>
  );
};
