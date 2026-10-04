import React from 'react';
import { X, Play, Trash2, Music, Disc3, GripVertical, Sparkles, Loader2 } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext.js';
import type { Song } from '../types.js';

export const QueueDrawer: React.FC = () => {
  const {
    queue,
    queueIndex,
    currentSong,
    isPlaying,
    playSong,
    removeFromQueue,
    clearQueue,
    isQueueOpen,
    setIsQueueOpen,
    isLoadingSuggestions,
    suggestionsArtist,
  } = usePlayer();

  if (!isQueueOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div
        className="w-full max-w-md bg-zinc-950 border-r border-zinc-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-left duration-300"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Disc3 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">قائمة التشغيل</h2>
              <p className="text-xs text-zinc-400">{queue.length} مسار في الانتظار</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {queue.length > 0 && (
              <button
                onClick={clearQueue}
                className="text-xs text-zinc-400 hover:text-rose-400 px-2.5 py-1 rounded-lg hover:bg-rose-500/10 transition-colors flex items-center gap-1 border border-zinc-800 hover:border-rose-500/30"
                title="مسح القائمة"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>إفراغ</span>
              </button>
            )}
            <button
              onClick={() => setIsQueueOpen(false)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {/* Currently Playing Card */}
          {currentSong && (
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400 block mb-2">
                يعمل الآن
              </span>
              <div className="p-3 rounded-2xl bg-emerald-950/30 border border-emerald-800/40 flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-zinc-900 overflow-hidden flex-shrink-0 relative">
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
                    <div className="w-full h-full flex items-center justify-center text-zinc-500">
                      <Music className="w-5 h-5" />
                    </div>
                  )}
                  {isPlaying && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-0.5">
                      <span className="w-0.5 h-3 bg-emerald-400 rounded-full animate-bounce" />
                      <span className="w-0.5 h-5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-0.5 h-2.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-white truncate">
                    {currentSong.title}
                  </div>
                  <div className="text-xs text-zinc-400 truncate">
                    {currentSong.artist}
                  </div>
                </div>

                {currentSong.duration && (
                  <span className="text-xs font-mono text-zinc-400 flex-shrink-0">
                    {currentSong.duration}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Up Next List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                التالي في القائمة ({Math.max(0, queue.length - (queueIndex + 1))})
              </span>
            </div>

            {isLoadingSuggestions && (
              <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 rounded-xl px-3 py-2 mb-2.5 animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
                <span>جاري تحضير مقترحات الفنان {suggestionsArtist || currentSong?.artist}...</span>
              </div>
            )}

            {!isLoadingSuggestions && suggestionsArtist && queue.length > 1 && (
              <div className="flex items-center justify-between text-xs text-emerald-400 bg-emerald-950/30 border border-emerald-800/40 rounded-xl px-3 py-2 mb-2.5">
                <span className="flex items-center gap-1.5 font-medium">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  تشغيل متواصل تلقائي لأغاني {suggestionsArtist}
                </span>
                <span className="text-[11px] font-mono text-emerald-400/80 bg-emerald-900/40 px-2 py-0.5 rounded-md">
                  {queue.length - (queueIndex + 1)} قادم
                </span>
              </div>
            )}

            {queue.length === 0 ? (
              <div className="py-12 text-center text-zinc-500 text-xs">
                قائمة الانتظار فارغة. أضف بعض المقاطع للتشغيل التلقائي!
              </div>
            ) : (
              <div className="space-y-1.5">
                {queue.map((song: Song, index: number) => {
                  const isCurrent = index === queueIndex;
                  return (
                    <div
                      key={`${song.id}-${index}`}
                      className={`group flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                        isCurrent
                          ? 'bg-zinc-900/90 border-emerald-500/40 text-emerald-400'
                          : 'bg-zinc-900/40 hover:bg-zinc-900 border-zinc-800/60 text-zinc-300'
                      }`}
                    >
                      <div
                        onClick={() => playSong(song, queue)}
                        className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                      >
                        <span className="text-xs font-mono text-zinc-500 w-5 text-center flex-shrink-0">
                          {index + 1}
                        </span>

                        <div className="w-9 h-9 rounded-lg bg-zinc-800 overflow-hidden flex-shrink-0">
                          {song.coverUrl ? (
                            <img
                              src={song.coverUrl}
                              alt={song.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.currentTarget;
                                if (!target.src.endsWith('/mijwiz-logo.jpg')) {
                                  target.src = './mijwiz-logo.jpg';
                                }
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-600">
                              <Music className="w-4 h-4" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="text-xs sm:text-sm font-medium truncate group-hover:text-emerald-400 transition-colors">
                            {song.title}
                          </div>
                          <div className="text-[11px] text-zinc-500 truncate">
                            {song.artist}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {song.duration && (
                          <span className="text-xs font-mono text-zinc-500">
                            {song.duration}
                          </span>
                        )}
                        <button
                          onClick={() => removeFromQueue(index)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 transition-all"
                          title="حذف من القائمة"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
