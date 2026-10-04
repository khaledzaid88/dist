import React, { useEffect, useState } from 'react';
import {
  Play,
  Shuffle,
  Disc3,
  Calendar,
  User,
  Music,
  ChevronRight,
  Share2,
  Loader2,
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext.js';
import { SongRow } from '../components/SongRow.js';
import type { Album, Song } from '../types.js';
import { fetchAlbum } from '../services/albumaty.js';

interface AlbumDetailViewProps {
  albumId: string;
  onBack: () => void;
  onSelectSinger: (id: string) => void;
  onOpenPlaylistModal: (song: Song) => void;
}

export const AlbumDetailView: React.FC<AlbumDetailViewProps> = ({
  albumId,
  onBack,
  onSelectSinger,
  onOpenPlaylistModal,
}) => {
  const { playAlbumTracks, playSong, shuffle, toggleShuffle } = usePlayer();
  const [album, setAlbum] = useState<Album | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadAlbum = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchAlbum(albumId);
        if (isMounted) setAlbum(data);
      } catch (err: any) {
        if (isMounted) setError(err.message || 'خطأ في جلب بيانات الألبوم');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadAlbum();
    return () => {
      isMounted = false;
    };
  }, [albumId]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        <p className="text-xs text-zinc-400">جاري تحميل تفاصيل ومسارات الألبوم من ألبوماتي...</p>
      </div>
    );
  }

  if (error || !album) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 text-center space-y-4">
        <Disc3 className="w-12 h-12 text-zinc-700 mx-auto" />
        <h3 className="text-base font-semibold text-zinc-200">تعذر تحميل بيانات الألبوم</h3>
        <p className="text-xs text-zinc-500">{error || 'الألبوم غير متوفر حالياً'}</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl"
        >
          العودة
        </button>
      </div>
    );
  }

  const tracks = album.tracks || [];

  const handlePlayAll = () => {
    if (tracks.length > 0) {
      playAlbumTracks(tracks, 0);
    }
  };

  const handleShufflePlay = () => {
    if (tracks.length > 0) {
      if (!shuffle) toggleShuffle();
      const randomIdx = Math.floor(Math.random() * tracks.length);
      playAlbumTracks(tracks, randomIdx);
    }
  };

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(`استمع إلى ألبوم "${album.title}" - ${album.artist} عبر تطبيق MijWiz`);
    }
  };

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

      {/* Album Header Banner */}
      <div className="relative rounded-3xl bg-zinc-900/60 border border-zinc-800/80 p-6 sm:p-8 overflow-hidden shadow-2xl">
        {/* Ambient Blur */}
        {album.coverUrl && (
          <div className="absolute left-0 top-0 bottom-0 w-2/3 opacity-15 overflow-hidden pointer-events-none">
            <img src={album.coverUrl} alt="" className="w-full h-full object-cover blur-3xl" />
          </div>
        )}

        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-end gap-6 sm:gap-8">
          
          {/* Cover Art */}
          <div className="w-44 h-44 sm:w-56 sm:h-56 rounded-2xl overflow-hidden bg-zinc-950 shadow-2xl border border-white/10 flex-shrink-0 flex items-center justify-center">
            {album.coverUrl ? (
              <img
                src={album.coverUrl}
                alt={album.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.src.endsWith('/mijwiz-logo.jpg')) {
                    target.src = './mijwiz-logo.jpg';
                  }
                }}
              />
            ) : (
              <Disc3 className="w-16 h-16 text-zinc-700" />
            )}
          </div>

          {/* Details */}
          <div className="flex-1 text-center md:text-right space-y-3">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                ألبوم رسمي
              </span>
              {album.year && (
                <span className="text-xs font-mono text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded-full border border-zinc-700">
                  {album.year}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              {album.title}
            </h1>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-sm text-zinc-300">
              <div
                onClick={() => album.artistId && onSelectSinger(album.artistId)}
                className={`flex items-center gap-1.5 ${album.artistId ? 'hover:text-emerald-400 cursor-pointer underline' : ''}`}
              >
                <User className="w-4 h-4 text-zinc-400" />
                <span className="font-semibold">{album.artist || 'فنان ألبوماتي'}</span>
              </div>

              <span className="text-zinc-600">•</span>
              <div className="flex items-center gap-1 text-zinc-400">
                <Music className="w-4 h-4" />
                <span>{tracks.length} أغنية ومسار</span>
              </div>
            </div>

            {/* Play controls */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-3">
              <button
                onClick={handlePlayAll}
                disabled={tracks.length === 0}
                className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-95 transition-all disabled:opacity-50"
              >
                <Play className="w-4 h-4 fill-current translate-x-0.5" />
                <span>تشغيل الألبوم كاملاً</span>
              </button>

              <button
                onClick={handleShufflePlay}
                disabled={tracks.length === 0}
                className="px-5 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-semibold flex items-center gap-2 border border-zinc-700 active:scale-95 transition-all disabled:opacity-50"
              >
                <Shuffle className="w-4 h-4" />
                <span>تشغيل عشوائي</span>
              </button>

              <button
                onClick={handleCopyLink}
                className="p-3 rounded-xl bg-zinc-800/60 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700/60 transition-colors"
                title="مشاركة رابط الألبوم"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* Tracks List */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
          <h2 className="text-lg font-bold text-white tracking-tight">مسارات وأغاني الألبوم</h2>
          <span className="text-xs text-zinc-500">{tracks.length} مسار متوفر</span>
        </div>

        {tracks.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 text-xs">
            لا توجد مسارات مسجلة لهذا الألبوم حالياً.
          </div>
        ) : (
          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-2 divide-y divide-zinc-800/40">
            {tracks.map((track, idx) => (
              <SongRow
                key={`${track.id}-${idx}`}
                song={{
                  ...track,
                  coverUrl: track.coverUrl || album.coverUrl,
                  albumTitle: album.title,
                  albumId: album.id,
                }}
                index={idx}
                playlistContext={tracks.map(t => ({
                  ...t,
                  coverUrl: t.coverUrl || album.coverUrl,
                  albumTitle: album.title,
                  albumId: album.id,
                }))}
                onSelectSinger={onSelectSinger}
                onOpenPlaylistModal={onOpenPlaylistModal}
              />
            ))}
          </div>
        )}
      </section>

    </div>
  );
};
