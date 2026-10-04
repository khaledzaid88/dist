import React from 'react';
import {
  X,
  ChevronDown,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Heart,
  Music,
  Share2,
  Loader2,
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext.js';

function formatTime(seconds: number): string {
  if (isNaN(seconds) || !isFinite(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

interface FullScreenPlayerProps {
  onSelectSinger?: (id: string) => void;
  onSelectAlbum?: (id: string) => void;
}

export const FullScreenPlayer: React.FC<FullScreenPlayerProps> = ({ onSelectSinger, onSelectAlbum }) => {
  const {
    currentSong,
    isPlaying,
    isLoading,
    progress,
    duration,
    volume,
    isMuted,
    shuffle,
    repeat,
    togglePlay,
    nextTrack,
    prevTrack,
    seekTo,
    setVolumeLevel,
    toggleMute,
    toggleShuffle,
    toggleRepeat,
    toggleFavorite,
    isFavorite,
    isFullScreen,
    setIsFullScreen,
  } = usePlayer();

  if (!isFullScreen || !currentSong) return null;

  const isFav = isFavorite(currentSong.id);
  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(`استمع إلى "${currentSong.title}" - ${currentSong.artist} عبر تطبيق MijWiz`);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-zinc-950 flex flex-col justify-between overflow-hidden text-zinc-100 select-none animate-in fade-in duration-300"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      
      {/* Dynamic Ambient Blur Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
        {currentSong.coverUrl && (
          <img
            src={currentSong.coverUrl}
            alt=""
            className="w-full h-full object-cover scale-150 blur-3xl filter"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/60 via-zinc-950/80 to-zinc-950" />
      </div>

      {/* Top Header */}
      <header className="relative z-10 max-w-5xl w-full mx-auto px-4 sm:px-6 py-3 sm:py-5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg overflow-hidden border border-emerald-500/40 bg-zinc-900 flex-shrink-0 shadow-md">
            <img
              src="./mijwiz-logo.jpg"
              alt="MijWiz"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.src.endsWith('/mijwiz-logo.jpg')) {
                  target.src = '/mijwiz-logo.jpg';
                }
              }}
            />
          </div>
          <span className="text-xs font-bold tracking-wider text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-800/40 font-outfit">
            MijWiz
          </span>
          <span className="text-xs text-zinc-400 hidden sm:inline">
            مشغل الموسيقى العربية
          </span>
        </div>

        <button
          onClick={() => setIsFullScreen(false)}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-zinc-300 hover:text-white transition-all shadow-lg active:scale-95 flex-shrink-0"
          title="تصغير مشغل الموسيقى (Minimize)"
          aria-label="تصغير مشغل الموسيقى"
        >
          <ChevronDown className="w-5 h-5" />
        </button>
      </header>

      {/* Center Body: Big Cover & Meta */}
      <main className="relative z-10 max-w-4xl w-full mx-auto px-4 sm:px-6 py-2 sm:py-4 flex-1 min-h-0 overflow-y-auto flex flex-col lg:flex-row items-center justify-center gap-4 sm:gap-8 lg:gap-12">
        
        {/* Album Artwork */}
        <div className="relative group max-h-[26vh] sm:max-h-[34vh] md:max-h-[38vh] max-w-[200px] sm:max-w-[280px] md:max-w-[340px] w-full aspect-square flex-shrink-0">
          <div className="w-full h-full rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl shadow-black/80 border border-white/10 bg-zinc-900 flex items-center justify-center">
            {currentSong.coverUrl ? (
              <img
                src={currentSong.coverUrl}
                alt={currentSong.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.src.endsWith('/mijwiz-logo.jpg')) {
                    target.src = './mijwiz-logo.jpg';
                  }
                }}
              />
            ) : (
              <Music className="w-16 h-16 sm:w-20 sm:h-20 text-zinc-700" />
            )}
          </div>

          {/* Vinyl reflection ring glow */}
          <div
            className={`absolute -inset-1 rounded-3xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/0 -z-10 blur-xl transition-opacity duration-700 ${
              isPlaying ? 'opacity-100' : 'opacity-20'
            }`}
          />
        </div>

        {/* Info & Details */}
        <div className="flex-1 w-full max-w-md flex flex-col items-center lg:items-start text-center lg:text-right min-w-0">
          <div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2">
            <span className="text-xs font-mono text-zinc-400 bg-zinc-900/80 px-2 py-0.5 rounded border border-zinc-800">
              ID: {currentSong.id}
            </span>
            {currentSong.year && (
              <span className="text-xs text-zinc-400">
                إصدار {currentSong.year}
              </span>
            )}
          </div>

          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-white mb-1.5 sm:mb-2 leading-tight line-clamp-2">
            {currentSong.title}
          </h1>

          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 text-sm sm:text-base text-zinc-300 mb-3 sm:mb-4">
            <span
              onClick={() => {
                if (currentSong.artistId && onSelectSinger) {
                  setIsFullScreen(false);
                  onSelectSinger(currentSong.artistId);
                }
              }}
              className={`hover:text-emerald-400 transition-colors ${currentSong.artistId ? 'cursor-pointer hover:underline' : ''}`}
            >
              {currentSong.artist || 'فنان ألبوماتي'}
            </span>

            {currentSong.albumTitle && (
              <>
                <span className="text-zinc-600">•</span>
                <span
                  onClick={() => {
                    if (currentSong.albumId && onSelectAlbum) {
                      setIsFullScreen(false);
                      onSelectAlbum(currentSong.albumId);
                    }
                  }}
                  className={`text-zinc-400 hover:text-zinc-200 transition-colors ${currentSong.albumId ? 'cursor-pointer hover:underline' : ''}`}
                >
                  {currentSong.albumTitle}
                </span>
              </>
            )}
          </div>

          {/* Action pills */}
          <div className="flex items-center gap-2 mb-2 sm:mb-4">
            <button
              onClick={() => toggleFavorite(currentSong)}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-medium border transition-colors ${
                isFav
                  ? 'bg-rose-500/15 border-rose-500/40 text-rose-400'
                  : 'bg-zinc-900/80 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isFav ? 'fill-current text-rose-500' : ''}`} />
              <span>{isFav ? 'في المفضلة' : 'إضافة للمفضلة'}</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs transition-colors"
              title="نسخ رابط الأغنية"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>مشاركة</span>
            </button>
          </div>

        </div>
      </main>

      {/* Bottom Controls Section - Guaranteed 100% visible & unclipped */}
      <footer
        className="relative z-20 max-w-4xl w-full mx-auto px-4 sm:px-6 pt-2 flex-shrink-0"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.25rem)' }}
      >
        {/* Scrubber */}
        <div className="w-full flex items-center gap-2 sm:gap-3 mb-2 sm:mb-4">
          <span className="text-xs font-mono text-zinc-400 w-10 sm:w-12 text-right">
            {formatTime(progress)}
          </span>

          <div className="relative flex-1 py-2 flex items-center group">
            <div className="w-full h-1.5 group-hover:h-2 bg-zinc-800/90 rounded-full overflow-hidden transition-all relative">
              <div
                className="h-full bg-emerald-500 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <input
              type="range"
              min="0"
              max={duration || 100}
              step="0.5"
              value={progress}
              onChange={(e) => seekTo(parseFloat(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>

          <span className="text-xs font-mono text-zinc-400 w-10 sm:w-12 text-left">
            {formatTime(duration)}
          </span>
        </div>

        {/* Buttons Row */}
        <div className="flex items-center justify-between gap-2 sm:gap-4 w-full">
          
          {/* Left tools: Shuffle & Love */}
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={toggleShuffle}
              className={`p-2.5 sm:p-3 rounded-xl transition-colors flex items-center justify-center ${
                shuffle ? 'bg-emerald-500/15 text-emerald-400' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
              title="تشغيل عشوائي"
            >
              <Shuffle className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              type="button"
              onClick={() => toggleFavorite(currentSong)}
              className={`p-2.5 sm:p-3 rounded-xl transition-colors flex items-center justify-center ${
                isFav ? 'bg-rose-500/15 text-rose-500' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
              title={isFav ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
            >
              <Heart className={`w-4 h-4 sm:w-5 sm:h-5 ${isFav ? 'fill-current text-rose-500' : ''}`} />
            </button>
          </div>

          {/* Center Playback */}
          <div className="flex items-center gap-3 sm:gap-6">
            <button
              type="button"
              onClick={prevTrack}
              className="p-2 sm:p-3 rounded-full text-zinc-300 hover:text-white hover:bg-zinc-900 active:scale-95 transition-all flex items-center justify-center"
              title="السابق"
            >
              <SkipBack className="w-5 h-5 sm:w-7 sm:h-7 rtl:rotate-180" />
            </button>

            <button
              type="button"
              onClick={togglePlay}
              disabled={isLoading}
              className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-white hover:bg-zinc-200 text-zinc-950 flex items-center justify-center shadow-xl shadow-white/10 active:scale-95 transition-all disabled:opacity-80 flex-shrink-0"
              title={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 sm:w-7 sm:h-7 animate-spin text-zinc-900" />
              ) : isPlaying ? (
                <Pause className="w-5 h-5 sm:w-7 sm:h-7 fill-current" />
              ) : (
                <Play className="w-5 h-5 sm:w-7 sm:h-7 fill-current translate-x-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={nextTrack}
              className="p-2 sm:p-3 rounded-full text-zinc-300 hover:text-white hover:bg-zinc-900 active:scale-95 transition-all flex items-center justify-center"
              title="التالي"
            >
              <SkipForward className="w-5 h-5 sm:w-7 sm:h-7 rtl:rotate-180" />
            </button>
          </div>

          {/* Right tools: Repeat & Volume */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            <button
              type="button"
              onClick={toggleRepeat}
              className={`p-2.5 sm:p-3 rounded-xl transition-colors flex items-center justify-center ${
                repeat !== 'off' ? 'bg-emerald-500/15 text-emerald-400' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
              title="التكرار"
            >
              {repeat === 'one' ? <Repeat1 className="w-4 h-4 sm:w-5 sm:h-5" /> : <Repeat className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>

            <div className="hidden sm:flex items-center gap-2">
              <button type="button" onClick={toggleMute} className="text-zinc-400 hover:text-white p-1">
                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" /> : <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolumeLevel(parseFloat(e.target.value))}
                className="w-20 md:w-24 h-1.5 bg-zinc-800 rounded-lg cursor-pointer accent-emerald-500"
              />
            </div>
          </div>

        </div>
      </footer>

    </div>
  );
};
