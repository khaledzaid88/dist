import React, { useState } from 'react';
import {
  Heart,
  ListMusic,
  Clock,
  Play,
  Trash2,
  Plus,
  Music,
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext.js';
import { SongRow } from '../components/SongRow.js';
import type { Song } from '../types.js';

interface LibraryViewProps {
  onSelectAlbum: (id: string) => void;
  onSelectSinger: (id: string) => void;
  onOpenPlaylistModal: (song: Song) => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  onSelectAlbum,
  onSelectSinger,
  onOpenPlaylistModal,
}) => {
  const {
    favorites,
    recentlyPlayed,
    playlists,
    createPlaylist,
    deletePlaylist,
    playAlbumTracks,
  } = usePlayer();

  const [activeTab, setActiveTab] = useState<'favorites' | 'playlists' | 'recent'>('favorites');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const selectedPlaylist = playlists.find(p => p.id === selectedPlaylistId) || null;

  const handleCreatePlaylist = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPlaylistName.trim()) {
      const id = createPlaylist(newPlaylistName.trim());
      setNewPlaylistName('');
      setIsCreating(false);
      setSelectedPlaylistId(id);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-28 space-y-8 select-none">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            مكتبتي الموسيقية
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            أغانيك المفضلة، قوائمك المخصصة، والمقاطع التي استمعت إليها مؤخراً
          </p>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center gap-1.5 bg-zinc-900/80 p-1.5 rounded-2xl border border-zinc-800 self-start sm:self-auto">
          <button
            onClick={() => {
              setActiveTab('favorites');
              setSelectedPlaylistId(null);
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'favorites'
                ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Heart className="w-3.5 h-3.5 fill-current" />
            <span>المفضلة ({favorites.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('playlists')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'playlists'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ListMusic className="w-3.5 h-3.5" />
            <span>القوائم ({playlists.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('recent');
              setSelectedPlaylistId(null);
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'recent'
                ? 'bg-teal-500/15 text-teal-400 border border-teal-500/30'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>المؤخرة ({recentlyPlayed.length})</span>
          </button>
        </div>
      </div>

      {/* Favorites View */}
      {activeTab === 'favorites' && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white tracking-tight">أغانيك المفضلة</h2>
            {favorites.length > 0 && (
              <button
                onClick={() => playAlbumTracks(favorites, 0)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold shadow-md shadow-emerald-500/20 transition-all"
              >
                <Play className="w-4 h-4 fill-current translate-x-0.5" />
                <span>تشغيل المفضلة</span>
              </button>
            )}
          </div>

          {favorites.length === 0 ? (
            <div className="text-center py-20 space-y-3">
              <Heart className="w-12 h-12 text-zinc-700 mx-auto" />
              <h3 className="text-base font-semibold text-zinc-300">لا توجد أغانٍ في المفضلة بعد</h3>
              <p className="text-xs text-zinc-500">انقر على رمز القلب في أي أغنية لإضافتها إلى قائمة مفضلتك</p>
            </div>
          ) : (
            <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-2 divide-y divide-zinc-800/40">
              {favorites.map((song, idx) => (
                <SongRow
                  key={`${song.id}-${idx}`}
                  song={song}
                  index={idx}
                  playlistContext={favorites}
                  onSelectAlbum={onSelectAlbum}
                  onSelectSinger={onSelectSinger}
                  onOpenPlaylistModal={onOpenPlaylistModal}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Playlists View */}
      {activeTab === 'playlists' && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white tracking-tight">قوائم التشغيل الخاصة بك</h2>
            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-semibold hover:bg-emerald-500/20 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>قائمة جديدة</span>
            </button>
          </div>

          {isCreating && (
            <form onSubmit={handleCreatePlaylist} className="flex gap-2 max-w-md">
              <input
                type="text"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="اسم القائمة الجديدة..."
                className="flex-1 bg-zinc-900 text-xs text-zinc-100 placeholder:text-zinc-500 rounded-xl px-3 py-2 border border-zinc-800 focus:border-emerald-500 focus:outline-none"
                autoFocus
              />
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-500 text-zinc-950 text-xs font-bold rounded-xl"
              >
                حفظ
              </button>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-3 py-2 bg-zinc-800 text-zinc-400 text-xs rounded-xl"
              >
                إلغاء
              </button>
            </form>
          )}

          {/* Playlist Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {playlists.map((pl) => {
              const isSelected = selectedPlaylistId === pl.id;
              return (
                <div
                  key={pl.id}
                  onClick={() => setSelectedPlaylistId(isSelected ? null : pl.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-zinc-900 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                      : 'bg-zinc-900/50 hover:bg-zinc-900 border-zinc-800/80 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center text-emerald-400 flex-shrink-0">
                      <ListMusic className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-zinc-100 line-clamp-1">{pl.name}</h4>
                      <p className="text-xs text-zinc-500">{pl.tracks.length} أغنية</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {pl.tracks.length > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          playAlbumTracks(pl.tracks, 0);
                        }}
                        className="p-2 rounded-xl bg-emerald-500 text-zinc-950 hover:bg-emerald-400 transition-colors"
                        title="تشغيل القائمة"
                      >
                        <Play className="w-3.5 h-3.5 fill-current translate-x-0.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePlaylist(pl.id);
                        if (selectedPlaylistId === pl.id) setSelectedPlaylistId(null);
                      }}
                      className="p-2 rounded-xl text-zinc-500 hover:text-rose-400 transition-colors"
                      title="حذف القائمة"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Playlist Tracks */}
          {selectedPlaylist && (
            <div className="pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white">مسارات {selectedPlaylist.name}</h3>
                {selectedPlaylist.tracks.length > 0 && (
                  <button
                    onClick={() => playAlbumTracks(selectedPlaylist.tracks, 0)}
                    className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>تشغيل الكل</span>
                  </button>
                )}
              </div>

              {selectedPlaylist.tracks.length === 0 ? (
                <div className="text-center py-12 text-zinc-500 text-xs">
                  هذه القائمة فارغة. انقر على أيقونة (+) بجانب أي أغنية لإضافتها هنا.
                </div>
              ) : (
                <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-2 divide-y divide-zinc-800/40">
                  {selectedPlaylist.tracks.map((song, idx) => (
                    <SongRow
                      key={`${song.id}-${idx}`}
                      song={song}
                      index={idx}
                      playlistContext={selectedPlaylist.tracks}
                      onSelectAlbum={onSelectAlbum}
                      onSelectSinger={onSelectSinger}
                      onOpenPlaylistModal={onOpenPlaylistModal}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* Recently Played */}
      {activeTab === 'recent' && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white tracking-tight">سجل الاستماع الأخير</h2>
            {recentlyPlayed.length > 0 && (
              <button
                onClick={() => playAlbumTracks(recentlyPlayed, 0)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-semibold"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>إعادة تشغيل الكل</span>
              </button>
            )}
          </div>

          {recentlyPlayed.length === 0 ? (
            <div className="text-center py-20 space-y-3">
              <Clock className="w-12 h-12 text-zinc-700 mx-auto" />
              <h3 className="text-base font-semibold text-zinc-300">لا يوجد سجل استماع بعد</h3>
              <p className="text-xs text-zinc-500">الأغاني التي تستمع إليها ستظهر هنا تلقائياً لسهولة العودة إليها</p>
            </div>
          ) : (
            <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-2 divide-y divide-zinc-800/40">
              {recentlyPlayed.map((song, idx) => (
                <SongRow
                  key={`${song.id}-${idx}`}
                  song={song}
                  index={idx}
                  playlistContext={recentlyPlayed}
                  onSelectAlbum={onSelectAlbum}
                  onSelectSinger={onSelectSinger}
                  onOpenPlaylistModal={onOpenPlaylistModal}
                />
              ))}
            </div>
          )}
        </section>
      )}

    </div>
  );
};
