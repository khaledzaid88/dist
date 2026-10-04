import React from 'react';
import { Play, Pause, Heart, Plus, ListPlus, Music } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext.js';
import type { Song } from '../types.js';

interface SongRowProps {
  song: Song;
  index: number;
  playlistContext?: Song[];
  onSelectSinger?: (id: string) => void;
  onSelectAlbum?: (id: string) => void;
  onOpenPlaylistModal?: (song: Song) => void;
}

export const SongRow: React.FC<SongRowProps> = ({
  song,
  index,
  playlistContext,
  onSelectSinger,
  onSelectAlbum,
  onOpenPlaylistModal,
}) => {
  const { currentSong, isPlaying, playSong, togglePlay, addToQueue, toggleFavorite, isFavorite } = usePlayer();

  const isCurrent = currentSong?.id === song.id;
  const isFav = isFavorite(song.id);

  const handlePlayClick = () => {
    if (isCurrent) {
      togglePlay();
    } else {
      playSong(song, playlistContext || [song]);
    }
  };

  return (
    <div
      className={`group flex items-center justify-between px-3 sm:px-4 py-2.5 rounded-xl transition-all duration-200 ${
        isCurrent
          ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
          : 'hover:bg-zinc-900/80 text-zinc-300 border border-transparent'
      }`}
    >
      {/* Left side: Track # / Animated Equalizer / Play button & Artwork */}
      <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
        
        {/* Track Index / Play Trigger */}
        <div className="w-6 text-center flex-shrink-0 flex items-center justify-center">
          {isCurrent && isPlaying ? (
            <div className="flex items-end justify-center gap-0.5 h-3.5">
              <span className="w-0.5 h-full bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-0.5 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-0.5 h-3 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          ) : (
            <span className="text-xs font-mono text-zinc-500 group-hover:hidden">
              {index + 1}
            </span>
          )}

          <button
            type="button"
            onClick={handlePlayClick}
            className={`hidden group-hover:flex items-center justify-center text-zinc-100 hover:text-emerald-400 transition-colors ${
              isCurrent ? '!flex text-emerald-400' : ''
            }`}
            title={isCurrent && isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
          >
            {isCurrent && isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current" />
            )}
          </button>
        </div>

        {/* Thumbnail Artwork */}
        <div
          onClick={handlePlayClick}
          className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800/80 overflow-hidden flex-shrink-0 relative cursor-pointer"
        >
          {song.coverUrl ? (
            <img
              src={song.coverUrl}
              alt={song.title}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.src.endsWith('/mijwiz-logo.jpg')) {
                  target.src = './mijwiz-logo.jpg';
                }
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-600">
              <Music className="w-4 h-4" />
            </div>
          )}
        </div>

        {/* Title and Artist */}
        <div className="min-w-0 flex-1">
          <div
            onClick={handlePlayClick}
            className={`text-sm font-medium truncate cursor-pointer transition-colors ${
              isCurrent ? 'text-emerald-400 font-semibold' : 'text-zinc-100 group-hover:text-white'
            }`}
          >
            {song.title}
          </div>
          <div className="text-xs text-zinc-400 truncate flex items-center gap-1.5 mt-0.5">
            <span
              onClick={() => song.artistId && onSelectSinger && onSelectSinger(song.artistId)}
              className={`truncate ${song.artistId ? 'hover:text-zinc-200 hover:underline cursor-pointer' : ''}`}
            >
              {song.artist || 'فنان ألبوماتي'}
            </span>
            {song.albumTitle && (
              <>
                <span className="text-zinc-600">•</span>
                <span
                  onClick={() => song.albumId && onSelectAlbum && onSelectAlbum(song.albumId)}
                  className={`hidden sm:inline truncate text-zinc-500 ${song.albumId ? 'hover:text-zinc-300 hover:underline cursor-pointer' : ''}`}
                >
                  {song.albumTitle}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right side: Actions & Duration */}
      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
        
        {/* Favorite */}
        <button
          type="button"
          onClick={() => toggleFavorite(song)}
          className={`p-1.5 rounded-lg transition-colors ${
            isFav
              ? 'text-rose-500 hover:text-rose-400'
              : 'text-zinc-500 hover:text-zinc-300 opacity-0 group-hover:opacity-100'
          }`}
          title={isFav ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
        >
          <Heart className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
        </button>

        {/* Add to Playlist */}
        {onOpenPlaylistModal && (
          <button
            type="button"
            onClick={() => onOpenPlaylistModal(song)}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity"
            title="إضافة إلى قائمة تشغيل"
          >
            <ListPlus className="w-4 h-4" />
          </button>
        )}

        {/* Add to Queue */}
        <button
          type="button"
          onClick={() => addToQueue(song)}
          className="p-1.5 rounded-lg text-zinc-500 hover:text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity"
          title="إضافة إلى قائمة الانتظار"
        >
          <Plus className="w-4 h-4" />
        </button>

        {/* Duration */}
        {song.duration && (
          <span className="text-xs font-mono text-zinc-400 w-12 text-left">
            {song.duration}
          </span>
        )}
      </div>
    </div>
  );
};
