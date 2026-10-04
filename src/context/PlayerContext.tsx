import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import type { PlayerState, RepeatMode, Song } from '../types.js';
import { fetchSong, fetchSuggestedForArtist, formatDirectAudioUrl } from '../services/albumaty.js';

interface Playlist {
  id: string;
  name: string;
  createdAt: number;
  tracks: Song[];
}

interface PreloadedTrack {
  song: Song;
  url: string;
  index: number;
}

interface PlayerContextType extends PlayerState {
  playSong: (song: Song, newQueue?: Song[]) => Promise<void>;
  togglePlay: () => void;
  pause: () => void;
  resume: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  seekTo: (timeInSeconds: number) => void;
  setVolumeLevel: (volume: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  addToQueue: (song: Song) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  playAlbumTracks: (tracks: Song[], startIndex?: number) => void;
  favorites: Song[];
  isFavorite: (songId: string) => boolean;
  toggleFavorite: (song: Song) => void;
  recentlyPlayed: Song[];
  playlists: Playlist[];
  createPlaylist: (name: string) => string;
  deletePlaylist: (id: string) => void;
  addToPlaylist: (playlistId: string, song: Song) => void;
  removeFromPlaylist: (playlistId: string, songId: string) => void;
  isFullScreen: boolean;
  setIsFullScreen: (val: boolean) => void;
  isQueueOpen: boolean;
  setIsQueueOpen: (val: boolean) => void;
  isLoadingSuggestions: boolean;
  suggestionsArtist: string | null;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

const STORAGE_KEY_FAVS = 'albumaty_favorites_v1';
const STORAGE_KEY_RECENT = 'albumaty_recent_v1';
const STORAGE_KEY_PLAYLISTS = 'albumaty_playlists_v1';

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wakeLockRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0.85);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [shuffle, setShuffle] = useState<boolean>(false);
  const [repeat, setRepeat] = useState<RepeatMode>('off');
  const [queue, setQueue] = useState<Song[]>([]);
  const [queueIndex, setQueueIndex] = useState<number>(-1);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [isQueueOpen, setIsQueueOpen] = useState<boolean>(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState<boolean>(false);
  const [suggestionsArtist, setSuggestionsArtist] = useState<string | null>(null);

  const queueRef = useRef<Song[]>(queue);
  queueRef.current = queue;

  const queueIndexRef = useRef<number>(queueIndex);
  queueIndexRef.current = queueIndex;

  const currentSongRef = useRef<Song | null>(currentSong);
  currentSongRef.current = currentSong;

  const isPlayingRef = useRef<boolean>(isPlaying);
  isPlayingRef.current = isPlaying;

  const repeatRef = useRef<RepeatMode>(repeat);
  repeatRef.current = repeat;

  const shuffleRef = useRef<boolean>(shuffle);
  shuffleRef.current = shuffle;

  const suggestionRequestIdRef = useRef<string | null>(null);

  // Auto-retry & Network recovery tracking
  const retryCountRef = useRef<number>(0);
  const retryTimeoutRef = useRef<any>(null);
  const lastPlaybackPositionRef = useRef<number>(0);

  // Preload ahead cache for background seamless auto-advance
  const nextTrackCacheRef = useRef<PreloadedTrack | null>(null);
  const isPreloadingAheadRef = useRef<boolean>(false);

  // Persistence for user data
  const [favorites, setFavorites] = useState<Song[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FAVS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [recentlyPlayed, setRecentlyPlayed] = useState<Song[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_RECENT);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [playlists, setPlaylists] = useState<Playlist[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PLAYLISTS);
      return saved ? JSON.parse(saved) : [
        { id: 'fav-tarab', name: 'روائع الطرب الأصيل', createdAt: Date.now(), tracks: [] },
        { id: 'fav-hits', name: 'أفضل الأغاني الحديثة', createdAt: Date.now(), tracks: [] },
      ];
    } catch {
      return [];
    }
  });

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_FAVS, JSON.stringify(favorites));
    } catch (e) {
      console.warn('Failed to save favorites to localStorage', e);
    }
  }, [favorites]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_RECENT, JSON.stringify(recentlyPlayed));
    } catch (e) {
      console.warn('Failed to save recently played to localStorage', e);
    }
  }, [recentlyPlayed]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PLAYLISTS, JSON.stringify(playlists));
    } catch (e) {
      console.warn('Failed to save playlists to localStorage', e);
    }
  }, [playlists]);

  // Request & Release Screen Wake Lock for continuous background streaming
  const acquireWakeLock = useCallback(async () => {
    if ('wakeLock' in navigator && !wakeLockRef.current) {
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        wakeLockRef.current.addEventListener('release', () => {
          wakeLockRef.current = null;
        });
      } catch {
        // WakeLock may fail if window not active, ignore gracefully
      }
    }
  }, []);

  const releaseWakeLock = useCallback(() => {
    if (wakeLockRef.current) {
      try {
        wakeLockRef.current.release();
      } catch {
        // ignore
      }
      wakeLockRef.current = null;
    }
  }, []);

  // Update MediaSession API for lockscreen, notifications & car Bluetooth controls
  const updateMediaSession = useCallback((song: Song | null) => {
    if (!('mediaSession' in navigator)) return;

    if (!song) {
      try {
        navigator.mediaSession.playbackState = 'none';
      } catch {
        // ignore
      }
      return;
    }

    // Android System UI Notification requires an absolute HTTPS image URL or high-res thumbnail
    let artUrl = song.coverUrl;
    if (!artUrl || artUrl.startsWith('/') || artUrl.startsWith('file:') || artUrl.includes('localhost')) {
      artUrl = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=512&auto=format&fit=crop&q=80';
    }
    if (artUrl.startsWith('http://')) {
      artUrl = artUrl.replace(/^http:\/\//, 'https://');
    }

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: song.title || 'MijWiz Track',
        artist: song.artist || 'ألبوماتي',
        album: song.albumTitle || 'MijWiz Music',
        artwork: [
          { src: artUrl, sizes: '96x96', type: 'image/jpeg' },
          { src: artUrl, sizes: '128x128', type: 'image/jpeg' },
          { src: artUrl, sizes: '192x192', type: 'image/jpeg' },
          { src: artUrl, sizes: '256x256', type: 'image/jpeg' },
          { src: artUrl, sizes: '384x384', type: 'image/jpeg' },
          { src: artUrl, sizes: '512x512', type: 'image/jpeg' },
        ],
      });
      navigator.mediaSession.playbackState = 'playing';
    } catch (e) {
      console.warn('Failed to update MediaSession metadata', e);
    }
  }, []);

  // Sync position state to MediaSession (scrub bar on lock screen & car dashboards)
  const syncMediaSessionPosition = useCallback(() => {
    if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
      const audio = audioRef.current;
      if (audio && audio.duration && !isNaN(audio.duration) && isFinite(audio.duration) && audio.duration > 0) {
        try {
          navigator.mediaSession.setPositionState({
            duration: audio.duration,
            playbackRate: audio.playbackRate || 1,
            position: Math.min(Math.max(0, audio.currentTime), audio.duration),
          });
        } catch {
          // ignore any transient state errors
        }
      }
    }
  }, []);

  // Forward declarations for player actions
  const resumeRef = useRef<() => void>(() => {});
  const pauseRef = useRef<() => void>(() => {});
  const nextTrackRef = useRef<() => Promise<void>>(async () => {});
  const prevTrackRef = useRef<() => void>(() => {});
  const seekToRef = useRef<(seconds: number) => void>(() => {});

  // Register permanent MediaSession action handlers (play, pause, nexttrack, previoustrack, seekto)
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    const actionMap: [MediaSessionAction, (details: any) => void][] = [
      ['play', () => resumeRef.current()],
      ['pause', () => pauseRef.current()],
      ['previoustrack', () => prevTrackRef.current()],
      ['nexttrack', () => { nextTrackRef.current().catch(console.error); }],
      ['seekto', (details) => {
        if (details.seekTime !== undefined) {
          seekToRef.current(details.seekTime);
        }
      }],
      ['seekbackward', (details) => {
        const cur = audioRef.current?.currentTime || 0;
        const offset = details.seekOffset || 10;
        seekToRef.current(Math.max(0, cur - offset));
      }],
      ['seekforward', (details) => {
        const cur = audioRef.current?.currentTime || 0;
        const dur = audioRef.current?.duration || 0;
        const offset = details.seekOffset || 10;
        seekToRef.current(Math.min(dur, cur + offset));
      }],
      ['stop', () => {
        pauseRef.current();
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
        }
      }],
    ];

    actionMap.forEach(([action, handler]) => {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {
        // Action not supported by this browser version
      }
    });
  }, []);

  // Sync isPlaying state with MediaSession playbackState and wake lock
  useEffect(() => {
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.playbackState = isPlaying ? 'playing' : (currentSong ? 'paused' : 'none');
      } catch {
        // ignore
      }
    }
    if (isPlaying) {
      acquireWakeLock();
    } else {
      releaseWakeLock();
    }
  }, [isPlaying, currentSong, acquireWakeLock, releaseWakeLock]);

  // Update MediaSession metadata whenever currentSong changes
  useEffect(() => {
    updateMediaSession(currentSong);
  }, [currentSong, updateMediaSession]);

  // Resolve direct MP3 audio stream URL (100% Client-Side for APK)
  const resolveSongStreamUrl = async (song: Song): Promise<string> => {
    // 1. If song already has direct audioUrl or streamUrl (starting with http/https)
    let candidate = song.audioUrl || song.streamUrl;
    if (candidate && !candidate.startsWith('/api/stream') && (candidate.startsWith('http://') || candidate.startsWith('https://'))) {
      const formatted = formatDirectAudioUrl(candidate);
      song.audioUrl = formatted;
      song.streamUrl = formatted;
      return formatted;
    }

    // 2. Fetch full song details directly on client
    try {
      const fullSong: Song = await fetchSong(song.id);
      if (fullSong) {
        const directAudio = fullSong.audioUrl || fullSong.streamUrl;
        if (directAudio) {
          const formatted = formatDirectAudioUrl(directAudio);
          song.audioUrl = formatted;
          song.streamUrl = formatted;
        }
        if (fullSong.coverUrl && !song.coverUrl) song.coverUrl = fullSong.coverUrl;
        if (fullSong.durationSeconds && !song.durationSeconds) song.durationSeconds = fullSong.durationSeconds;
        if (fullSong.artistId && !song.artistId) song.artistId = fullSong.artistId;
        if (fullSong.artist && (!song.artist || song.artist === 'فنان' || song.artist === 'فنان ألبوماتي')) {
          song.artist = fullSong.artist;
        }
        if (fullSong.albumId && !song.albumId) song.albumId = fullSong.albumId;
        if (fullSong.albumTitle && !song.albumTitle) song.albumTitle = fullSong.albumTitle;
        if (song.audioUrl) {
          return song.audioUrl;
        }
      }
    } catch (e) {
      console.error('Failed to resolve song details on client:', e);
    }

    // 3. Fallback to formatting whatever is available
    const fallback = formatDirectAudioUrl(song.audioUrl || song.streamUrl);
    if (fallback) {
      song.audioUrl = fallback;
      song.streamUrl = fallback;
      return fallback;
    }

    return '';
  };

  // Pre-resolve direct MP3 audio URLs for upcoming tracks in queue
  // This guarantees that when onended fires in the background, the next track URL is 100% in memory
  // requiring ZERO async network requests or promises that would freeze under Android Doze mode!
  const preResolveQueueLookahead = useCallback(async (currentIndex: number, currentQueue: Song[]) => {
    if (!currentQueue || currentQueue.length === 0) return;

    const indicesToResolve: number[] = [];
    for (let offset = 1; offset <= 3; offset++) {
      let idx = currentIndex + offset;
      if (idx >= currentQueue.length) {
        if (repeatRef.current === 'all') {
          idx = idx % currentQueue.length;
        } else {
          break;
        }
      }
      indicesToResolve.push(idx);
    }

    for (const idx of indicesToResolve) {
      const candidate = currentQueue[idx];
      if (!candidate) continue;

      // If already resolved, skip
      if (candidate.audioUrl && (candidate.audioUrl.startsWith('http://') || candidate.audioUrl.startsWith('https://'))) {
        continue;
      }

      try {
        const full = await fetchSong(candidate.id);
        if (full && (full.audioUrl || full.streamUrl)) {
          const direct = formatDirectAudioUrl(full.audioUrl || full.streamUrl);
          candidate.audioUrl = direct;
          candidate.streamUrl = direct;
          if (full.coverUrl && !candidate.coverUrl) candidate.coverUrl = full.coverUrl;
          if (full.durationSeconds && !candidate.durationSeconds) candidate.durationSeconds = full.durationSeconds;
          if (full.artist && (!candidate.artist || candidate.artist === 'فنان' || candidate.artist === 'فنان ألبوماتي')) {
            candidate.artist = full.artist;
          }
          if (full.albumTitle && !candidate.albumTitle) {
            candidate.albumTitle = full.albumTitle;
          }
        }
      } catch {
        // ignore background prefetch errors
      }
    }
  }, []);

  // Initialize persistent DOM Audio element (attached to Document tree for Android Media Notification support)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.preload = 'auto';
    (audio as any).playsInline = true;
    audio.setAttribute('playsinline', 'true');
    audio.volume = isMuted ? 0 : volume;

    const handlePlay = () => {
      setIsPlaying(true);
      setIsLoading(false);
      retryCountRef.current = 0; // successfully playing, reset retries
      if ('mediaSession' in navigator) {
        try {
          navigator.mediaSession.playbackState = 'playing';
        } catch {
          // ignore
        }
      }
      // Eagerly resolve direct URLs for the upcoming tracks in the queue
      preResolveQueueLookahead(queueIndexRef.current, queueRef.current);
    };

    const handlePause = () => {
      setIsPlaying(false);
      if ('mediaSession' in navigator) {
        try {
          navigator.mediaSession.playbackState = 'paused';
        } catch {
          // ignore
        }
      }
    };

    const handleWaiting = () => {
      setIsLoading(true);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setProgress(audio.currentTime);
      lastPlaybackPositionRef.current = audio.currentTime;
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
      syncMediaSessionPosition();
    };

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
      setIsLoading(false);
      syncMediaSessionPosition();
    };

    const handleSeeked = () => {
      syncMediaSessionPosition();
    };

    // Auto-Retry logic on streaming network drops or transient server errors
    const handleError = async (e: Event) => {
      const curSong = currentSongRef.current;
      if (!curSong || !isPlayingRef.current) return;

      console.warn('Playback error encountered on HTML5 Audio. Attempting auto-recovery...', audio.error);
      
      if (retryCountRef.current < 4) {
        retryCountRef.current += 1;
        setIsLoading(true);
        const resumePos = lastPlaybackPositionRef.current || audio.currentTime || 0;
        const delay = Math.min(1000 * retryCountRef.current, 4000);

        if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = setTimeout(async () => {
          try {
            console.log(`Auto-retry attempt #${retryCountRef.current} resuming from ${resumePos}s`);
            const freshSong = await fetchSong(curSong.id);
            const freshUrl = await resolveSongStreamUrl(freshSong || curSong);
            if (freshUrl && audioRef.current) {
              audioRef.current.src = freshUrl;
              audioRef.current.currentTime = resumePos;
              await audioRef.current.play();
              setIsPlaying(true);
              setIsLoading(false);
              retryCountRef.current = 0;
            }
          } catch (retryErr) {
            console.error('Auto-recovery attempt failed:', retryErr);
          }
        }, delay);
      } else {
        setIsLoading(false);
        setIsPlaying(false);
      }
    };

    // Auto-advance when current track ends (Single persistent audio instance reuse for Android background playback)
    const handleEnded = () => {
      const curRepeat = repeatRef.current;
      const curAudio = audioRef.current;
      if (!curAudio) return;

      if (curRepeat === 'one') {
        curAudio.currentTime = 0;
        curAudio.play().catch(console.error);
        return;
      }

      const curQueue = queueRef.current;
      const curIdx = queueIndexRef.current;
      const curShuffle = shuffleRef.current;

      let nextIdx = curIdx + 1;
      if (curShuffle && curQueue.length > 1) {
        let rand = Math.floor(Math.random() * curQueue.length);
        if (rand === curIdx) rand = (rand + 1) % curQueue.length;
        nextIdx = rand;
      } else if (nextIdx >= curQueue.length) {
        if (curRepeat === 'all' && curQueue.length > 0) {
          nextIdx = 0;
        } else {
          setIsPlaying(false);
          setIsLoading(false);
          if ('mediaSession' in navigator) {
            try {
              navigator.mediaSession.playbackState = 'none';
            } catch {
              // ignore
            }
          }
          return;
        }
      }

      if (nextIdx < curQueue.length && nextIdx >= 0) {
        const nextSong = curQueue[nextIdx];
        setQueueIndex(nextIdx);
        queueIndexRef.current = nextIdx;
        setCurrentSong(nextSong);
        currentSongRef.current = nextSong;

        // Immediate MediaSession update for Android Notification
        updateMediaSession(nextSong);
        if ('mediaSession' in navigator) {
          try {
            navigator.mediaSession.playbackState = 'playing';
          } catch {
            // ignore
          }
        }

        // Direct URL handover without awaiting network
        const directUrl = nextSong.audioUrl || nextSong.streamUrl;
        if (directUrl && (directUrl.startsWith('http://') || directUrl.startsWith('https://'))) {
          curAudio.src = formatDirectAudioUrl(directUrl);
          curAudio.currentTime = 0;
          curAudio.load();
          const p = curAudio.play();
          if (p) p.catch(err => console.warn('Direct next playback failed:', err));
          setIsPlaying(true);
          setIsLoading(false);

          preResolveQueueLookahead(nextIdx, curQueue);
          return;
        }

        // Fallback: fetch and play immediately
        resolveSongStreamUrl(nextSong).then(resolved => {
          if (resolved && curAudio) {
            curAudio.src = resolved;
            curAudio.currentTime = 0;
            curAudio.load();
            curAudio.play().catch(console.error);
            setIsPlaying(true);
            setIsLoading(false);
            preResolveQueueLookahead(nextIdx, curQueue);
          }
        }).catch(err => {
          console.error('Failed to resolve next track on ended:', err);
        });
        return;
      }

      // Fallback standard nextTrack execution
      nextTrackRef.current().catch(console.error);
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('seeked', handleSeeked);
    audio.addEventListener('error', handleError);
    audio.addEventListener('ended', handleEnded);

    // Online network reconnect listener: automatically resume if disconnected
    const handleOnline = () => {
      if (isPlayingRef.current && audio.paused && audio.src) {
        audio.play().catch(console.error);
      }
    };
    window.addEventListener('online', handleOnline);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('seeked', handleSeeked);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('ended', handleEnded);
      window.removeEventListener('online', handleOnline);
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      releaseWakeLock();
    };
  }, [syncMediaSessionPosition, updateMediaSession, preResolveQueueLookahead, releaseWakeLock, volume, isMuted]);

  // Volume & Mute listener
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Fetch suggested tracks from the same artist to keep music playing seamlessly
  const fetchArtistSuggestions = async (song: Song): Promise<Song[]> => {
    try {
      const data = await fetchSuggestedForArtist(song.id, song.artistId, song.artist);
      if (Array.isArray(data.songs) && data.songs.length > 0) {
        if (data.artist && (!song.artist || song.artist === 'فنان' || song.artist === 'فنان ألبوماتي')) {
          song.artist = data.artist;
        }
        if (data.artistId && !song.artistId) {
          song.artistId = data.artistId;
        }
        return data.songs;
      }
    } catch (err) {
      console.warn('Could not fetch artist suggestions:', err);
    }
    return [];
  };

  const playSong = async (song: Song, newQueue?: Song[]) => {
    const audio = audioRef.current;
    if (!audio) return;

    setIsLoading(true);
    setCurrentSong(song);
    retryCountRef.current = 0;
    lastPlaybackPositionRef.current = 0;
    nextTrackCacheRef.current = null; // reset preload cache for new track

    const isSingleTrack = !newQueue || newQueue.length <= 1;
    let targetQueue = newQueue || queue;
    let targetIndex = 0;

    // Update queue if provided
    if (newQueue && newQueue.length > 0) {
      setQueue(newQueue);
      const idx = newQueue.findIndex(s => s.id === song.id);
      targetIndex = idx !== -1 ? idx : 0;
      setQueueIndex(targetIndex);
    } else {
      setQueue(prev => {
        const exists = prev.findIndex(s => s.id === song.id);
        if (exists === -1) {
          targetIndex = prev.length;
          setQueueIndex(targetIndex);
          targetQueue = [...prev, song];
          return targetQueue;
        } else {
          targetIndex = exists;
          setQueueIndex(exists);
          targetQueue = prev;
          return prev;
        }
      });
    }

    // Add to recently played
    setRecentlyPlayed(prev => {
      const filtered = prev.filter(s => s.id !== song.id);
      return [song, ...filtered].slice(0, 30);
    });

    // Start playback
    try {
      const directAudioUrl = await resolveSongStreamUrl(song);
      if (!directAudioUrl) {
        throw new Error(`No audio stream source found for song: ${song.title} (${song.id})`);
      }
      
      // Update MediaSession metadata and playbackState immediately for Android Media Player recognition
      updateMediaSession(song);
      if ('mediaSession' in navigator) {
        try {
          navigator.mediaSession.playbackState = 'playing';
        } catch {
          // ignore
        }
      }

      audio.src = directAudioUrl;
      audio.currentTime = 0;
      audio.load();

      await audio.play();
      setIsPlaying(true);
      setIsLoading(false);

      // Trigger lookahead pre-resolving for upcoming tracks immediately
      preResolveQueueLookahead(targetIndex, targetQueue);
    } catch (error) {
      console.error('Error starting direct audio playback:', error);
      setIsLoading(false);
      setIsPlaying(false);
    }

    // If single track, fetch suggestions in parallel to populate future queue
    if (isSingleTrack) {
      const reqId = `${song.id}-${Date.now()}`;
      suggestionRequestIdRef.current = reqId;
      setIsLoadingSuggestions(true);
      setSuggestionsArtist(song.artist || null);

      fetchArtistSuggestions(song)
        .then(suggestions => {
          if (suggestionRequestIdRef.current === reqId && suggestions.length > 0) {
            setQueue(prevQueue => {
              const songIdx = prevQueue.findIndex(s => s.id === song.id);
              if (songIdx !== -1 && prevQueue.length <= songIdx + 1) {
                const existingIds = new Set(prevQueue.map(s => s.id));
                const fresh = suggestions.filter(s => !existingIds.has(s.id));
                if (fresh.length > 0) {
                  const merged = [...prevQueue, ...fresh];
                  preResolveQueueLookahead(songIdx, merged);
                  return merged;
                }
              }
              return prevQueue;
            });
          }
        })
        .finally(() => {
          if (suggestionRequestIdRef.current === reqId) {
            setIsLoadingSuggestions(false);
          }
        });
    } else {
      suggestionRequestIdRef.current = null;
      setIsLoadingSuggestions(false);
      setSuggestionsArtist(null);
    }
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || !currentSong) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(console.error);
    }
  };

  const pause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  const resume = () => {
    if (audioRef.current && currentSong) {
      audioRef.current.play().catch(console.error);
    }
  };

  const nextTrack = async () => {
    const curQueue = queueRef.current;
    const curIdx = queueIndexRef.current;
    const curSong = currentSongRef.current;
    const curRepeat = repeatRef.current;
    const curShuffle = shuffleRef.current;

    if (curQueue.length === 0) return;

    if (curShuffle && curQueue.length > 1) {
      let randIdx = Math.floor(Math.random() * curQueue.length);
      if (randIdx === curIdx) randIdx = (randIdx + 1) % curQueue.length;
      setQueueIndex(randIdx);
      playSong(curQueue[randIdx], curQueue);
      return;
    }

    const nextIdx = curIdx + 1;
    if (nextIdx < curQueue.length) {
      setQueueIndex(nextIdx);
      playSong(curQueue[nextIdx], curQueue);
      return;
    }

    // Reached the end of queue
    if (curRepeat === 'all' && curQueue.length > 1) {
      setQueueIndex(0);
      playSong(curQueue[0], curQueue);
      return;
    }

    // End of queue: keep playing songs from the same artist!
    if (curSong) {
      setIsLoading(true);
      try {
        const suggestions = await fetchArtistSuggestions(curSong);
        const existingIds = new Set(curQueue.map(s => s.id));
        const freshSuggestions = suggestions.filter(s => !existingIds.has(s.id));

        if (freshSuggestions.length > 0) {
          const updatedQueue = [...curQueue, ...freshSuggestions];
          const targetIndex = curQueue.length;
          setQueue(updatedQueue);
          setQueueIndex(targetIndex);
          await playSong(updatedQueue[targetIndex], updatedQueue);
          return;
        }
      } catch (err) {
        console.error('Error fetching artist suggestions on nextTrack:', err);
      } finally {
        setIsLoading(false);
      }
    }

    setIsPlaying(false);
  };

  const prevTrack = () => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      syncMediaSessionPosition();
      return;
    }

    const curQueue = queueRef.current;
    const curIdx = queueIndexRef.current;
    const curRepeat = repeatRef.current;
    const curShuffle = shuffleRef.current;

    if (curQueue.length === 0) return;

    let prevIdx: number;
    if (curShuffle) {
      prevIdx = Math.floor(Math.random() * curQueue.length);
    } else {
      prevIdx = curIdx - 1;
      if (prevIdx < 0) {
        prevIdx = curRepeat === 'all' ? curQueue.length - 1 : 0;
      }
    }

    const prevSong = curQueue[prevIdx];
    if (prevSong) {
      setQueueIndex(prevIdx);
      playSong(prevSong, curQueue);
    }
  };

  const seekTo = (timeInSeconds: number) => {
    const audio = audioRef.current;
    if (audio && !isNaN(timeInSeconds)) {
      audio.currentTime = timeInSeconds;
      setProgress(timeInSeconds);
      lastPlaybackPositionRef.current = timeInSeconds;
      syncMediaSessionPosition();
    }
  };

  // Keep references to handlers updated for MediaSession action handlers
  resumeRef.current = resume;
  pauseRef.current = pause;
  nextTrackRef.current = nextTrack;
  prevTrackRef.current = prevTrack;
  seekToRef.current = seekTo;

  const setVolumeLevel = (val: number) => {
    const clamped = Math.max(0, Math.min(1, val));
    setVolume(clamped);
    if (clamped > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    setIsMuted(prev => !prev);
  };

  const toggleShuffle = () => {
    setShuffle(prev => !prev);
  };

  const toggleRepeat = () => {
    setRepeat(prev => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
  };

  const addToQueue = (song: Song) => {
    setQueue(prev => [...prev, song]);
  };

  const removeFromQueue = (index: number) => {
    setQueue(prev => {
      const next = [...prev];
      next.splice(index, 1);
      if (index === queueIndex) {
        if (next.length > 0) {
          const nextIdx = Math.min(index, next.length - 1);
          setQueueIndex(nextIdx);
          playSong(next[nextIdx], next);
        } else {
          setCurrentSong(null);
          setQueueIndex(-1);
          if (audioRef.current) audioRef.current.pause();
        }
      } else if (index < queueIndex) {
        setQueueIndex(queueIndex - 1);
      }
      return next;
    });
  };

  const clearQueue = () => {
    setQueue(currentSong ? [currentSong] : []);
    setQueueIndex(currentSong ? 0 : -1);
    nextTrackCacheRef.current = null;
  };

  const playAlbumTracks = (tracks: Song[], startIndex: number = 0) => {
    if (!tracks || tracks.length === 0) return;
    const songToPlay = tracks[startIndex] || tracks[0];
    playSong(songToPlay, tracks);
  };

  const isFavorite = (songId: string) => {
    return favorites.some(s => s.id === songId);
  };

  const toggleFavorite = (song: Song) => {
    setFavorites(prev => {
      const exists = prev.some(s => s.id === song.id);
      if (exists) {
        return prev.filter(s => s.id !== song.id);
      } else {
        return [song, ...prev];
      }
    });
  };

  const createPlaylist = (name: string): string => {
    const id = `pl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newPl: Playlist = {
      id,
      name: name.trim() || 'قائمة جديدة',
      createdAt: Date.now(),
      tracks: [],
    };
    setPlaylists(prev => [...prev, newPl]);
    return id;
  };

  const deletePlaylist = (id: string) => {
    setPlaylists(prev => prev.filter(p => p.id !== id));
  };

  const addToPlaylist = (playlistId: string, song: Song) => {
    setPlaylists(prev =>
      prev.map(pl => {
        if (pl.id !== playlistId) return pl;
        if (pl.tracks.some(t => t.id === song.id)) return pl;
        return { ...pl, tracks: [...pl.tracks, song] };
      })
    );
  };

  const removeFromPlaylist = (playlistId: string, songId: string) => {
    setPlaylists(prev =>
      prev.map(pl => {
        if (pl.id !== playlistId) return pl;
        return { ...pl, tracks: pl.tracks.filter(t => t.id !== songId) };
      })
    );
  };

  return (
    <PlayerContext.Provider
      value={{
        currentSong,
        isPlaying,
        isLoading,
        progress,
        duration,
        volume,
        isMuted,
        shuffle,
        repeat,
        queue,
        queueIndex,
        playSong,
        togglePlay,
        pause,
        resume,
        nextTrack,
        prevTrack,
        seekTo,
        setVolumeLevel,
        toggleMute,
        toggleShuffle,
        toggleRepeat,
        addToQueue,
        removeFromQueue,
        clearQueue,
        playAlbumTracks,
        favorites,
        isFavorite,
        toggleFavorite,
        recentlyPlayed,
        playlists,
        createPlaylist,
        deletePlaylist,
        addToPlaylist,
        removeFromPlaylist,
        isFullScreen,
        setIsFullScreen,
        isQueueOpen,
        setIsQueueOpen,
        isLoadingSuggestions,
        suggestionsArtist,
      }}
    >
      {children}
      <audio
        ref={audioRef}
        id="mijwiz-persistent-audio"
        preload="auto"
        playsInline
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          width: '1px',
          height: '1px',
          opacity: 0.001,
          pointerEvents: 'none',
          zIndex: -1,
        }}
      />
    </PlayerContext.Provider>
  );
};

export const usePlayer = (): PlayerContextType => {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
};

