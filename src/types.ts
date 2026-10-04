export interface Category {
  id: string;
  name: string;
  nameEn?: string;
  description?: string;
  href: string;
  count?: number;
  iconName?: string;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  artistId?: string;
  albumTitle?: string;
  albumId?: string;
  coverUrl?: string;
  audioUrl?: string;
  streamUrl?: string;
  duration?: string; // e.g. "03:45" or raw "PT03M45S"
  durationSeconds?: number;
  href?: string;
  year?: string;
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  artistId?: string;
  year?: string;
  coverUrl?: string;
  href: string;
  trackCount?: number;
  tracks?: Song[];
}

export interface Singer {
  id: string;
  name: string;
  imageUrl?: string;
  href: string;
  albumCount?: number;
  songCount?: number;
  albums?: Album[];
  songs?: Song[];
}

export interface CuratedCollection {
  id: string;
  title: string;
  subtitle: string;
  type: 'album' | 'singer' | 'tag';
  targetId: string;
  coverUrl?: string;
  color?: string;
}

export interface HomeData {
  featuredAlbums: Album[];
  latestAlbums: Album[];
  latestSongs: Song[];
  categories: Category[];
  curatedCollections: CuratedCollection[];
  topSingers: Singer[];
}

export type RepeatMode = 'off' | 'all' | 'one';

export interface PlayerState {
  currentSong: Song | null;
  isPlaying: boolean;
  isLoading: boolean;
  progress: number; // in seconds
  duration: number; // in seconds
  volume: number; // 0 to 1
  isMuted: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  queue: Song[];
  queueIndex: number;
}
