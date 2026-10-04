import React, { useState } from 'react';
import { X, Plus, Music, Check } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext.js';
import type { Song } from '../types.js';

interface AddToPlaylistModalProps {
  song: Song | null;
  onClose: () => void;
}

export const AddToPlaylistModal: React.FC<AddToPlaylistModalProps> = ({ song, onClose }) => {
  const { playlists, createPlaylist, addToPlaylist } = usePlayer();
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [addedIds, setAddedIds] = useState<string[]>([]);

  if (!song) return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPlaylistName.trim()) {
      const newId = createPlaylist(newPlaylistName.trim());
      addToPlaylist(newId, song);
      setAddedIds(prev => [...prev, newId]);
      setNewPlaylistName('');
    }
  };

  const handleToggle = (playlistId: string) => {
    addToPlaylist(playlistId, song);
    setAddedIds(prev => [...prev, playlistId]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-base text-white">إضافة إلى قائمة تشغيل</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Target Song Info */}
        <div className="flex items-center gap-3 p-3 bg-zinc-900/60 rounded-xl mb-4 border border-zinc-800/80">
          <div className="w-10 h-10 rounded-lg bg-zinc-800 overflow-hidden flex-shrink-0">
            {song.coverUrl ? (
              <img src={song.coverUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <Music className="w-5 h-5 text-zinc-600 m-2.5" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-zinc-100 truncate">{song.title}</p>
            <p className="text-[11px] text-zinc-400 truncate">{song.artist}</p>
          </div>
        </div>

        {/* Existing Playlists */}
        <div className="space-y-1.5 max-h-48 overflow-y-auto mb-4">
          {playlists.map((pl) => {
            const isAdded = addedIds.includes(pl.id) || pl.tracks.some(t => t.id === song.id);
            return (
              <button
                key={pl.id}
                onClick={() => handleToggle(pl.id)}
                disabled={isAdded}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs font-medium transition-colors ${
                  isAdded
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-zinc-900 hover:bg-zinc-800/80 border-zinc-800 text-zinc-300'
                }`}
              >
                <span>{pl.name}</span>
                {isAdded ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Plus className="w-4 h-4 text-zinc-500" />
                )}
              </button>
            );
          })}
        </div>

        {/* New Playlist Form */}
        <form onSubmit={handleCreate} className="flex gap-2">
          <input
            type="text"
            value={newPlaylistName}
            onChange={(e) => setNewPlaylistName(e.target.value)}
            placeholder="اسم قائمة جديدة..."
            className="flex-1 bg-zinc-900 text-xs text-zinc-100 placeholder:text-zinc-500 rounded-xl px-3 py-2 border border-zinc-800 focus:border-emerald-500 focus:outline-none"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-semibold rounded-xl transition-colors"
          >
            إنشاء
          </button>
        </form>

      </div>
    </div>
  );
};
