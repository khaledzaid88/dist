import React from 'react';
import {
  Play,
  Disc3,
  Flame,
  Music2,
  Radio,
  Sparkles,
  Globe,
  Disc,
  ArrowLeft,
  ChevronLeft,
  Headphones,
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext.js';
import { AlbumCard } from '../components/AlbumCard.js';
import { SongRow } from '../components/SongRow.js';
import { SingerCard } from '../components/SingerCard.js';
import type { Album, HomeData, Singer, Song } from '../types.js';

interface HomeViewProps {
  data: HomeData | null;
  isLoading: boolean;
  onSelectAlbum: (id: string) => void;
  onSelectSinger: (id: string) => void;
  onSelectCategory: (id: string) => void;
  onSelectCurated: (type: 'album' | 'singer' | 'tag', id: string) => void;
  onViewAllAlbums: () => void;
  onOpenPlaylistModal: (song: Song) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  data,
  isLoading,
  onSelectAlbum,
  onSelectSinger,
  onSelectCategory,
  onSelectCurated,
  onViewAllAlbums,
  onOpenPlaylistModal,
}) => {
  const { playAlbumTracks, playSong } = usePlayer();

  if (isLoading || !data) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-10 animate-pulse">
        {/* Skeleton hero */}
        <div className="h-64 sm:h-80 rounded-3xl bg-zinc-900 border border-zinc-800" />
        {/* Skeleton categories */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-zinc-900 border border-zinc-800" />
          ))}
        </div>
        {/* Skeleton grid */}
        <div className="space-y-4">
          <div className="h-6 w-48 bg-zinc-800 rounded" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-56 rounded-2xl bg-zinc-900 border border-zinc-800" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Hero Spotlight Album (First featured album or fallback)
  const heroAlbum = data.featuredAlbums[0] || null;

  const getCategoryIcon = (iconName?: string) => {
    switch (iconName) {
      case 'Music2':
        return <Music2 className="w-5 h-5 text-emerald-400" />;
      case 'Disc':
        return <Disc className="w-5 h-5 text-amber-400" />;
      case 'Sparkles':
        return <Sparkles className="w-5 h-5 text-purple-400" />;
      case 'Radio':
        return <Radio className="w-5 h-5 text-blue-400" />;
      case 'Flame':
        return <Flame className="w-5 h-5 text-rose-400" />;
      case 'Globe':
        return <Globe className="w-5 h-5 text-teal-400" />;
      default:
        return <Headphones className="w-5 h-5 text-emerald-400" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-28 space-y-12 select-none">
      
      {/* Hero Featured Release Spotlight */}
      {heroAlbum && (
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-zinc-950 border border-zinc-800 p-6 sm:p-8 md:p-10 shadow-2xl">
          {/* Subtle blurred backdrop artwork */}
          {heroAlbum.coverUrl && (
            <div className="absolute left-0 top-0 bottom-0 w-1/2 opacity-15 overflow-hidden pointer-events-none">
              <img src={heroAlbum.coverUrl} alt="" className="w-full h-full object-cover blur-2xl" />
            </div>
          )}

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-10">
            <div className="flex-1 space-y-4 text-center md:text-right">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>ألبوم الأسبوع المميز • أحدث الإصدارات {heroAlbum.year}</span>
              </div>

              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
                {heroAlbum.title}
              </h1>

              <p className="text-zinc-400 text-sm sm:text-base max-w-xl">
                بصوت الفنان المتألق <span className="text-zinc-200 font-semibold">{heroAlbum.artist}</span>. استمع للألبوم كاملاً بجودة صوت استوديو نقية عبر تطبيق MijWiz.
              </p>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
                <button
                  onClick={() => onSelectAlbum(heroAlbum.id)}
                  className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-95 transition-all"
                >
                  <Play className="w-4 h-4 fill-current translate-x-0.5" />
                  <span>استمع للألبوم الآن</span>
                </button>

                <button
                  onClick={() => onSelectAlbum(heroAlbum.id)}
                  className="px-5 py-3 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 text-zinc-200 text-sm font-semibold border border-zinc-700/60 active:scale-95 transition-all"
                >
                  قائمة الأغاني
                </button>
              </div>
            </div>

            {/* Artwork Showcase */}
            <div
              onClick={() => onSelectAlbum(heroAlbum.id)}
              className="w-48 sm:w-56 md:w-64 aspect-square rounded-2xl overflow-hidden bg-zinc-950 shadow-2xl border border-white/10 flex-shrink-0 cursor-pointer group relative"
            >
              {heroAlbum.coverUrl ? (
                <img
                  src={heroAlbum.coverUrl}
                  alt={heroAlbum.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (!target.src.endsWith('/mijwiz-logo.jpg')) {
                      target.src = './mijwiz-logo.jpg';
                    }
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-600">
                  <Disc3 className="w-16 h-16" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500 text-zinc-950 flex items-center justify-center shadow-lg">
                  <Play className="w-5 h-5 fill-current translate-x-0.5" />
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Main Categories Navigation Chips */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">تصنيفات الموسيقى</h2>
            <p className="text-xs text-zinc-400">تصفح مكتبة MijWiz الموسيقية حسب الأنواع واللهجات</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {data.categories.map((cat) => (
            <div
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className="group p-4 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/80 hover:border-emerald-500/40 transition-all duration-300 cursor-pointer flex flex-col justify-between"
            >
              <div className="w-9 h-9 rounded-xl bg-zinc-800/80 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                {getCategoryIcon(cat.iconName)}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-200 group-hover:text-emerald-400 transition-colors line-clamp-1">
                  {cat.name}
                </h3>
                {cat.nameEn && (
                  <p className="text-[11px] font-sans text-zinc-500 tracking-wider">
                    {cat.nameEn}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured / Trending Albums Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">أحدث وأقوى الألبومات</h2>
            <p className="text-xs text-zinc-400">إصدارات جديدة وحصرية متوفرة للاستماع والتحميل</p>
          </div>
          <button
            onClick={onViewAllAlbums}
            className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-semibold transition-colors"
          >
            <span>عرض كل الألبومات</span>
            <ChevronLeft className="w-4 h-4 rtl:rotate-0" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {data.featuredAlbums.slice(1, 13).map((album) => (
            <AlbumCard
              key={album.id}
              album={album}
              onSelect={onSelectAlbum}
            />
          ))}
        </div>
      </section>

      {/* Latest Song Drops & Top Artists Split Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Latest Tracks (2 cols on large) */}
        <section className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">أحدث الأغاني المضافة</h2>
              <p className="text-xs text-zinc-400">المقاطع الصوتية الأكثر رواجاً على MijWiz</p>
            </div>
            {data.latestSongs.length > 0 && (
              <button
                onClick={() => playSong(data.latestSongs[0], data.latestSongs)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-semibold hover:bg-emerald-500/20 transition-all"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>تشغيل الكل</span>
              </button>
            )}
          </div>

          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-2 divide-y divide-zinc-800/40">
            {data.latestSongs.slice(0, 10).map((song, idx) => (
              <SongRow
                key={`${song.id}-${idx}`}
                song={song}
                index={idx}
                playlistContext={data.latestSongs}
                onSelectSinger={onSelectSinger}
                onSelectAlbum={onSelectAlbum}
                onOpenPlaylistModal={onOpenPlaylistModal}
              />
            ))}
          </div>
        </section>

        {/* Curated Themes / Special Playlists */}
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">مجموعات مختارة</h2>
            <p className="text-xs text-zinc-400">نغمات ومناسبات خاصة منتقاة لك</p>
          </div>

          <div className="space-y-2.5">
            {data.curatedCollections.map((col) => (
              <div
                key={col.id}
                onClick={() => onSelectCurated(col.type, col.targetId)}
                className="group p-3.5 rounded-2xl bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800/70 hover:border-zinc-700 flex items-center justify-between cursor-pointer transition-all"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-md flex-shrink-0"
                    style={{ backgroundColor: col.color || '#10b981' }}
                  >
                    <Music2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-zinc-100 group-hover:text-emerald-400 transition-colors">
                      {col.title}
                    </h4>
                    <p className="text-xs text-zinc-400">
                      {col.subtitle}
                    </p>
                  </div>
                </div>

                <div className="w-8 h-8 rounded-full bg-zinc-800 group-hover:bg-emerald-500 text-zinc-400 group-hover:text-zinc-950 flex items-center justify-center transition-colors">
                  <Play className="w-3.5 h-3.5 fill-current translate-x-0.5" />
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>

      {/* Prominent Artists Carousel */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">عمالقة ونجوم الغناء</h2>
            <p className="text-xs text-zinc-400">تصفح أرشيف وألبومات أشهر الفنانين والمطربين</p>
          </div>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-3">
          {data.topSingers.map((singer) => (
            <SingerCard
              key={singer.id}
              singer={singer}
              onSelect={onSelectSinger}
            />
          ))}
        </div>
      </section>

    </div>
  );
};
