import React, { useEffect, useState } from 'react';
import { Search, Music, Disc3, User, Loader2 } from 'lucide-react';
import { SongRow } from '../components/SongRow.js';
import { AlbumCard } from '../components/AlbumCard.js';
import { SingerCard } from '../components/SingerCard.js';
import type { Album, Singer, Song } from '../types.js';
import { searchAlbumaty } from '../services/albumaty.js';

interface SearchViewProps {
  query: string;
  onSelectAlbum: (id: string) => void;
  onSelectSinger: (id: string) => void;
  onOpenPlaylistModal: (song: Song) => void;
}

export const SearchView: React.FC<SearchViewProps> = ({
  query,
  onSelectAlbum,
  onSelectSinger,
  onOpenPlaylistModal,
}) => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [singers, setSingers] = useState<Singer[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'songs' | 'albums' | 'singers'>('all');

  useEffect(() => {
    if (!query.trim()) {
      setSongs([]);
      setAlbums([]);
      setSingers([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const data = await searchAlbumaty(query.trim());
        setSongs(data.songs || []);
        setAlbums(data.albums || []);
        setSingers(data.singers || []);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const totalResults = songs.length + albums.length + singers.length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-28 space-y-8 select-none">
      
      {/* Header */}
      <div className="space-y-3 border-b border-zinc-800 pb-6">
        <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
          <Search className="w-4 h-4" />
          <span>نتائج البحث المباشر</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          البحث عن: &quot;{query}&quot;
        </h1>
        <p className="text-xs text-zinc-400">
          تم العثور على {totalResults} نتيجة مطابقة في مكتبة MijWiz
        </p>

        {/* Filter Tabs */}
        {totalResults > 0 && (
          <div className="flex items-center gap-2 pt-2">
            {[
              { id: 'all', label: `الكل (${totalResults})` },
              { id: 'songs', label: `الأغاني (${songs.length})` },
              { id: 'albums', label: `الألبومات (${albums.length})` },
              { id: 'singers', label: `الفنانين (${singers.length})` },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                  activeFilter === tab.id
                    ? 'bg-emerald-500 text-zinc-950 font-bold'
                    : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          <p className="text-xs text-zinc-400">جاري البحث في قاعدة بيانات MijWiz...</p>
        </div>
      ) : totalResults === 0 ? (
        <div className="text-center py-20 space-y-3">
          <Search className="w-12 h-12 text-zinc-700 mx-auto" />
          <h3 className="text-base font-semibold text-zinc-300">لم نعثر على نتائج</h3>
          <p className="text-xs text-zinc-500">جرب كتابة اسم الفنان أو جزء من عنوان الألبوم للبحث</p>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* Songs Section */}
          {(activeFilter === 'all' || activeFilter === 'songs') && songs.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Music className="w-4 h-4 text-emerald-400" />
                <span>الأغاني ({songs.length})</span>
              </h2>
              <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-2 divide-y divide-zinc-800/40">
                {songs.map((song, idx) => (
                  <SongRow
                    key={`${song.id}-${idx}`}
                    song={song}
                    index={idx}
                    playlistContext={songs}
                    onSelectSinger={onSelectSinger}
                    onSelectAlbum={onSelectAlbum}
                    onOpenPlaylistModal={onOpenPlaylistModal}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Albums Section */}
          {(activeFilter === 'all' || activeFilter === 'albums') && albums.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Disc3 className="w-4 h-4 text-teal-400" />
                <span>الألبومات ({albums.length})</span>
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {albums.map(album => (
                  <AlbumCard
                    key={album.id}
                    album={album}
                    onSelect={onSelectAlbum}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Singers Section */}
          {(activeFilter === 'all' || activeFilter === 'singers') && singers.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <User className="w-4 h-4 text-purple-400" />
                <span>المطربون والفنانون ({singers.length})</span>
              </h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-3">
                {singers.map(singer => (
                  <SingerCard
                    key={singer.id}
                    singer={singer}
                    onSelect={onSelectSinger}
                  />
                ))}
              </div>
            </section>
          )}

        </div>
      )}

    </div>
  );
};
