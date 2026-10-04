import React, { useEffect, useState } from 'react';
import {
  User,
  Disc3,
  Music,
  Play,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext.js';
import { AlbumCard } from '../components/AlbumCard.js';
import { SongRow } from '../components/SongRow.js';
import type { Singer, Song } from '../types.js';
import { fetchSinger, getSingerImageUrl } from '../services/albumaty.js';

interface SingerDetailViewProps {
  singerId: string;
  onBack: () => void;
  onSelectAlbum: (id: string) => void;
  onOpenPlaylistModal: (song: Song) => void;
}

export const SingerDetailView: React.FC<SingerDetailViewProps> = ({
  singerId,
  onBack,
  onSelectAlbum,
  onOpenPlaylistModal,
}) => {
  const { playSong } = usePlayer();
  const [singer, setSinger] = useState<Singer | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadSinger = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchSinger(singerId);
        if (isMounted) setSinger(data);
      } catch (err: any) {
        if (isMounted) setError(err.message || 'خطأ في تحميل بيانات الفنان');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadSinger();
    return () => {
      isMounted = false;
    };
  }, [singerId]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        <p className="text-xs text-zinc-400">جاري تحميل أعمال وألبومات الفنان من ألبوماتي...</p>
      </div>
    );
  }

  if (error || !singer) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 text-center space-y-4">
        <User className="w-12 h-12 text-zinc-700 mx-auto" />
        <h3 className="text-base font-semibold text-zinc-200">تعذر تحميل بيانات الفنان</h3>
        <p className="text-xs text-zinc-500">{error || 'الملف الشخصي غير متوفر'}</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl"
        >
          العودة
        </button>
      </div>
    );
  }

  const albums = singer.albums || [];
  const songs = singer.songs || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-28 space-y-8 select-none">
      
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
      >
        <ChevronRight className="w-4 h-4 rtl:rotate-0" />
        <span>الرجوع</span>
      </button>

      {/* Artist Profile Header */}
      <div className="relative rounded-3xl bg-zinc-900/60 border border-zinc-800/80 p-6 sm:p-8 overflow-hidden shadow-2xl">
        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-end gap-6 sm:gap-8">
          
          {/* Avatar */}
          <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-full overflow-hidden bg-zinc-950 shadow-2xl border-2 border-emerald-500/40 flex-shrink-0 flex items-center justify-center">
            <img
              src={getSingerImageUrl(singer.id, singer.imageUrl)}
              alt={singer.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.src.endsWith('/mijwiz-logo.jpg')) {
                  target.src = './mijwiz-logo.jpg';
                }
              }}
            />
          </div>

          {/* Details */}
          <div className="flex-1 text-center sm:text-right space-y-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              ملف فنان موثق
            </span>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              {singer.name}
            </h1>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs sm:text-sm text-zinc-400 pt-1">
              {singer.albumCount !== undefined && singer.albumCount > 0 && (
                <div className="flex items-center gap-1.5">
                  <Disc3 className="w-4 h-4 text-emerald-400" />
                  <span>{singer.albumCount} ألبوم مسجل</span>
                </div>
              )}

              {singer.songCount !== undefined && singer.songCount > 0 && (
                <div className="flex items-center gap-1.5">
                  <Music className="w-4 h-4 text-teal-400" />
                  <span>{singer.songCount} أغنية متوفرة</span>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Top Songs */}
      {songs.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
            <h2 className="text-lg font-bold text-white tracking-tight">أشهر وأحدث أغاني {singer.name}</h2>
            <button
              onClick={() => playSong(songs[0], songs)}
              className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>تشغيل الكل</span>
            </button>
          </div>

          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-2 divide-y divide-zinc-800/40">
            {songs.map((song, idx) => (
              <SongRow
                key={`${song.id}-${idx}`}
                song={song}
                index={idx}
                playlistContext={songs}
                onSelectAlbum={onSelectAlbum}
                onOpenPlaylistModal={onOpenPlaylistModal}
              />
            ))}
          </div>
        </section>
      )}

      {/* Discography / Albums Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
          <h2 className="text-lg font-bold text-white tracking-tight">ألبومات {singer.name}</h2>
          <span className="text-xs text-zinc-500">{albums.length} ألبوم</span>
        </div>

        {albums.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 text-xs">
            لا توجد ألبومات مسجلة مباشرة لهذا الفنان.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {albums.map((album) => (
              <AlbumCard
                key={album.id}
                album={album}
                onSelect={onSelectAlbum}
              />
            ))}
          </div>
        )}
      </section>

    </div>
  );
};
