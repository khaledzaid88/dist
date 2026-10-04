import React, { useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  Volume1,
  VolumeX,
  Heart,
  ListMusic,
  Maximize2,
  Loader2,
  Music,
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext.js';

function formatTime(seconds: number): string {
  if (isNaN(seconds) || !isFinite(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

interface PlayerBarProps {
  onSelectSinger?: (id: string) => void;
  onSelectAlbum?: (id: string) => void;
}

export const PlayerBar: React.FC<PlayerBarProps> = ({ onSelectSinger, onSelectAlbum }) => {
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
    favorites,
    toggleFavorite,
    isFavorite,
    isFullScreen,
    setIsFullScreen,
    setIsQueueOpen,
    isQueueOpen,
  } = usePlayer();

  const [isHoveringBar, setIsHoveringBar] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);

  if (!currentSong) {
    return (
      <footer
        className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-800/80 px-4 py-2.5"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.6rem)' }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded overflow-hidden border border-emerald-500/30 bg-black flex-shrink-0">
              <img src="./mijwiz-logo.jpg" alt="MijWiz" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <span className="text-zinc-400">اختر ألبوماً أو أغنية للبدء في الاستماع عبر MijWiz</span>
          </div>
          <div className="text-emerald-400 font-sans text-[11px] font-medium">MijWiz Ready</div>
        </div>
      </footer>
    );
  }

  const isFav = isFavorite(currentSong.id);
  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;

  if (isFullScreen) {
    return null;
  }

  const handleScrubChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    seekTo(val);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    // In RTL, left is end and right is start
    const ratio = document.dir === 'rtl' ? (1 - pos) : pos;
    setHoverTime(Math.max(0, Math.min(duration, ratio * duration)));
  };

  return (
    <footer
      className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-950/95 backdrop-blur-2xl border-t border-zinc-800/90 shadow-2xl px-3 sm:px-6 pt-2 transition-all"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.5rem)' }}
    >
      <div className="max-w-7xl mx-auto flex flex-col gap-1.5">
        
        {/* Main Control Row */}
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          
          {/* Section 1: Track Info + Love Button */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 sm:flex-initial sm:max-w-[32%]">
            <div
              onClick={() => setIsFullScreen(true)}
              className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex-shrink-0 overflow-hidden cursor-pointer group shadow-md"
            >
              {currentSong.coverUrl ? (
                <img
                  src={currentSong.coverUrl}
                  alt={currentSong.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (!target.src.endsWith('/mijwiz-logo.jpg')) {
                      target.src = './mijwiz-logo.jpg';
                    }
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-400">
                  <Music className="w-5 h-5" />
                </div>
              )}
              {/* Animated playing bars indicator */}
              {isPlaying && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-0.5 pointer-events-none">
                  <span className="w-0.5 h-2.5 sm:h-3 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-0.5 h-4 sm:h-5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-0.5 h-2 sm:h-2.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              )}
            </div>

            {/* Song Meta (Title & Artist in clean centered stack) */}
            <div className="min-w-0 flex-1 flex flex-col justify-center">
              <span
                onClick={() => setIsFullScreen(true)}
                className="text-xs sm:text-sm font-semibold text-zinc-100 truncate hover:text-emerald-400 cursor-pointer transition-colors leading-tight"
                title={currentSong.title}
              >
                {currentSong.title}
              </span>

              <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-zinc-400 truncate mt-0.5">
                <span
                  onClick={() => currentSong.artistId && onSelectSinger && onSelectSinger(currentSong.artistId)}
                  className={`truncate ${currentSong.artistId ? 'hover:text-zinc-200 hover:underline cursor-pointer' : ''}`}
                >
                  {currentSong.artist || 'فنان ألبوماتي'}
                </span>
                {currentSong.albumTitle && (
                  <>
                    <span className="text-zinc-600">•</span>
                    <span
                      onClick={() => currentSong.albumId && onSelectAlbum && onSelectAlbum(currentSong.albumId)}
                      className={`truncate text-zinc-500 ${currentSong.albumId ? 'hover:text-zinc-300 hover:underline cursor-pointer' : ''}`}
                    >
                      {currentSong.albumTitle}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Love Button: Aligned vertically with exact same metrics as Shuffle */}
            <button
              type="button"
              onClick={() => toggleFavorite(currentSong)}
              className={`p-2 rounded-xl transition-all flex-shrink-0 flex items-center justify-center ${
                isFav
                  ? 'text-rose-500 hover:text-rose-400 bg-rose-500/10'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
              }`}
              title={isFav ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
            >
              <Heart className={`w-4 h-4 ${isFav ? 'fill-current text-rose-500' : ''}`} />
            </button>
          </div>

          {/* Section 2: Playback Buttons */}
          <div className="flex items-center justify-center gap-1 sm:gap-2 flex-shrink-0">
            {/* Shuffle */}
            <button
              type="button"
              onClick={toggleShuffle}
              className={`p-2 rounded-xl text-xs transition-colors relative flex items-center justify-center flex-shrink-0 ${
                shuffle ? 'text-emerald-400 bg-emerald-500/10' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
              title={shuffle ? 'إلغاء الترتيب العشوائي' : 'تشغيل عشوائي'}
            >
              <Shuffle className="w-4 h-4" />
              {shuffle && <span className="absolute bottom-1 right-1/2 translate-x-1/2 w-1 h-1 rounded-full bg-emerald-400" />}
            </button>

            {/* Prev */}
            <button
              type="button"
              onClick={prevTrack}
              className="p-2 rounded-xl text-zinc-300 hover:text-white hover:bg-zinc-800/60 active:scale-95 transition-all flex items-center justify-center flex-shrink-0"
              title="السابق"
            >
              <SkipBack className="w-4 h-4 sm:w-5 sm:h-5 rtl:rotate-180" />
            </button>

            {/* Play / Pause / Loading */}
            <button
              type="button"
              onClick={togglePlay}
              disabled={isLoading}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white hover:bg-zinc-200 text-zinc-950 flex items-center justify-center shadow-lg shadow-white/10 active:scale-95 transition-all disabled:opacity-80 flex-shrink-0"
              title={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-zinc-900" />
              ) : isPlaying ? (
                <Pause className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
              ) : (
                <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current translate-x-0.5" />
              )}
            </button>

            {/* Next */}
            <button
              type="button"
              onClick={nextTrack}
              className="p-2 rounded-xl text-zinc-300 hover:text-white hover:bg-zinc-800/60 active:scale-95 transition-all flex items-center justify-center flex-shrink-0"
              title="التالي"
            >
              <SkipForward className="w-4 h-4 sm:w-5 sm:h-5 rtl:rotate-180" />
            </button>

            {/* Repeat */}
            <button
              type="button"
              onClick={toggleRepeat}
              className={`p-2 rounded-xl text-xs transition-colors relative flex items-center justify-center flex-shrink-0 ${
                repeat !== 'off' ? 'text-emerald-400 bg-emerald-500/10' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
              title={`التكرار: ${repeat === 'off' ? 'معطل' : repeat === 'all' ? 'الكل' : 'أغنية واحدة'}`}
            >
              {repeat === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
              {repeat !== 'off' && (
                <span className="absolute bottom-1 right-1/2 translate-x-1/2 w-1 h-1 rounded-full bg-emerald-400" />
              )}
            </button>
          </div>

          {/* Section 3: Tools & Volume */}
          <div className="flex items-center justify-end gap-1.5 sm:gap-3 flex-shrink-0">
            
            {/* Volume */}
            <div className="hidden md:flex items-center gap-2 group">
              <button
                type="button"
                onClick={toggleMute}
                className="p-1.5 text-zinc-400 hover:text-white transition-colors"
                title={isMuted ? 'إلغاء الكتم' : 'كتم'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-zinc-500" />
                ) : volume < 0.5 ? (
                  <Volume1 className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolumeLevel(parseFloat(e.target.value))}
                className="w-18 lg:w-24 h-1 bg-zinc-800 rounded-lg cursor-pointer accent-emerald-500 hover:accent-emerald-400 transition-all"
              />
            </div>

            {/* Queue Toggle */}
            <button
              type="button"
              onClick={() => setIsQueueOpen(!isQueueOpen)}
              className={`p-2 rounded-xl border transition-colors flex items-center justify-center flex-shrink-0 ${
                isQueueOpen
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
              }`}
              title="قائمة التشغيل الحالية"
            >
              <ListMusic className="w-4 h-4" />
            </button>

            {/* Fullscreen Player */}
            <button
              type="button"
              onClick={() => setIsFullScreen(true)}
              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition-colors flex items-center justify-center flex-shrink-0"
              title="تكبير المشغل"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrubber Progress Bar Row */}
        <div className="w-full flex items-center gap-3 px-1">
          <span className="text-[11px] font-mono text-zinc-400 w-10 text-right select-none">
            {formatTime(progress)}
          </span>

          <div
            className="relative flex-1 group py-1.5 flex items-center cursor-pointer"
            onMouseEnter={() => setIsHoveringBar(true)}
            onMouseLeave={() => {
              setIsHoveringBar(false);
              setHoverTime(null);
            }}
            onMouseMove={handleMouseMove}
          >
            {/* Visual background track */}
            <div className="w-full h-1 group-hover:h-1.5 bg-zinc-800 rounded-full overflow-hidden transition-all relative">
              <div
                className="h-full bg-emerald-500 rounded-full relative"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Hidden native input for accessible drag/scrub */}
            <input
              type="range"
              min="0"
              max={duration || 100}
              step="0.5"
              value={progress}
              onChange={handleScrubChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />

            {/* Hover timestamp tooltip */}
            {isHoveringBar && hoverTime !== null && (
              <div
                className="absolute -top-7 text-[10px] font-mono bg-zinc-800 text-zinc-200 px-1.5 py-0.5 rounded shadow border border-zinc-700 pointer-events-none -translate-x-1/2"
                style={{
                  left: document.dir === 'rtl'
                    ? `${100 - (hoverTime / (duration || 1)) * 100}%`
                    : `${(hoverTime / (duration || 1)) * 100}%`,
                }}
              >
                {formatTime(hoverTime)}
              </div>
            )}
          </div>

          <span className="text-[11px] font-mono text-zinc-500 w-10 text-left select-none">
            {formatTime(duration)}
          </span>
        </div>

      </div>
    </footer>
  );
};
