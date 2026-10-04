import React, { useState, useEffect, useRef } from 'react';
import { PlayerProvider, usePlayer } from './context/PlayerContext.js';
import { Navbar } from './components/Navbar.js';
import { PlayerBar } from './components/PlayerBar.js';
import { FullScreenPlayer } from './components/FullScreenPlayer.js';
import { QueueDrawer } from './components/QueueDrawer.js';
import { AddToPlaylistModal } from './components/AddToPlaylistModal.js';
import { HomeView } from './views/HomeView.js';
import { AlbumsView } from './views/AlbumsView.js';
import { AlbumDetailView } from './views/AlbumDetailView.js';
import { SingerDetailView } from './views/SingerDetailView.js';
import { CategoryDetailView } from './views/CategoryDetailView.js';
import { SearchView } from './views/SearchView.js';
import { LibraryView } from './views/LibraryView.js';
import type { HomeData, Song } from './types.js';
import { fetchHome } from './services/albumaty.js';

type TabType =
  | 'home'
  | 'albums'
  | 'categories'
  | 'library'
  | 'search'
  | 'album-detail'
  | 'singer-detail'
  | 'category-detail';

interface NavState {
  tab: TabType;
  albumId?: string;
  singerId?: string;
  categoryId?: string;
}

function MainApp() {
  const {
    isFullScreen,
    setIsFullScreen,
    isQueueOpen,
    setIsQueueOpen,
  } = usePlayer();

  const [navHistory, setNavHistory] = useState<NavState[]>([{ tab: 'home' }]);
  const [currentNav, setCurrentNav] = useState<NavState>({ tab: 'home' });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [homeData, setHomeData] = useState<HomeData | null>(null);
  const [isLoadingHome, setIsLoadingHome] = useState<boolean>(true);
  const [playlistModalSong, setPlaylistModalSong] = useState<Song | null>(null);
  const mainContentRef = useRef<HTMLElement>(null);

  // References for reliable event handler access without closure staleness
  const isFullScreenRef = useRef<boolean>(isFullScreen);
  isFullScreenRef.current = isFullScreen;

  const isQueueOpenRef = useRef<boolean>(isQueueOpen);
  isQueueOpenRef.current = isQueueOpen;

  const playlistModalSongRef = useRef<Song | null>(playlistModalSong);
  playlistModalSongRef.current = playlistModalSong;

  const currentNavRef = useRef<NavState>(currentNav);
  currentNavRef.current = currentNav;

  const navHistoryRef = useRef<NavState[]>(navHistory);
  navHistoryRef.current = navHistory;

  // Reset scroll to top on navigation change
  useEffect(() => {
    mainContentRef.current?.scrollTo({ top: 0, behavior: 'instant' });
  }, [currentNav]);

  const [showExitToast, setShowExitToast] = useState<boolean>(false);
  const lastBackPressTimeRef = useRef<number>(0);

  // Universal Android Hardware / Gesture Back Navigation Controller
  useEffect(() => {
    // 1. Maintain Sentinel state in history so Android WebView never drains history to 0
    const ensureSentinel = () => {
      try {
        if (!window.history.state || window.history.state.__appSentinel !== true) {
          window.history.pushState({ __appSentinel: true }, '');
        }
      } catch {
        // ignore
      }
    };

    // Arm initial sentinel state
    ensureSentinel();

    const handleUniversalBack = (event?: any) => {
      if (event && typeof event.preventDefault === 'function') {
        event.preventDefault();
      }
      if (event && typeof event.stopPropagation === 'function') {
        event.stopPropagation();
      }

      // 1. إذا كان مشغل الشاشة الكاملة مفتوحاً -> يتم إغلاقه فقط
      if (isFullScreenRef.current) {
        setIsFullScreen(false);
        ensureSentinel();
        return;
      }

      // 2. إذا كانت قائمة الانتظار مفتوحة -> يتم إغلاقها فقط
      if (isQueueOpenRef.current) {
        setIsQueueOpen(false);
        ensureSentinel();
        return;
      }

      // 3. إذا كان مودال إضافة لقائمة التشغيل مفتوحاً -> يتم إغلاقه فقط
      if (playlistModalSongRef.current) {
        setPlaylistModalSong(null);
        ensureSentinel();
        return;
      }

      // 4. إذا كان المستخدم في صفحة ألبوم أو فنان أو بحث أو أي صفحة فرعية -> يتم الرجوع للخلف أو للرئيسية
      if (currentNavRef.current.tab !== 'home') {
        const hist = navHistoryRef.current;
        if (hist.length > 1) {
          const nextHist = hist.slice(0, -1);
          const prevNav = nextHist[nextHist.length - 1] || { tab: 'home' };
          setNavHistory(nextHist);
          setCurrentNav(prevNav);
        } else {
          setCurrentNav({ tab: 'home' });
          setNavHistory([{ tab: 'home' }]);
        }
        mainContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
        ensureSentinel();
        return;
      }

      // 5. إذا كان المستخدم بالفعل في الصفحة الرئيسية بدون أي نوافذ:
      // استخدام نمط الضغط المزدوج المعتمد في تطبيقات أندرويد لتفادي الخروج العرضي
      const now = Date.now();
      if (now - lastBackPressTimeRef.current < 2000) {
        // ضغطة ثانية خلال ثانيتين -> السماح بالخروج من التطبيق
        const nav = (navigator as any);
        if (nav.app && typeof nav.app.exitApp === 'function') {
          nav.app.exitApp();
        } else if ((window as any).navigator?.app?.exitApp) {
          (window as any).navigator.app.exitApp();
        }
        // ترك النظام يخرج
      } else {
        lastBackPressTimeRef.current = now;
        setShowExitToast(true);
        setTimeout(() => setShowExitToast(false), 2000);
        ensureSentinel();
      }
    };

    // Hook into all possible Android back event channels
    window.addEventListener('popstate', handleUniversalBack);
    document.addEventListener('backbutton', handleUniversalBack, false);
    window.addEventListener('backbutton', handleUniversalBack, false);
    (window as any).onBackPressed = handleUniversalBack;
    (window as any).handleBackButton = handleUniversalBack;
    (window as any).onHardwareBack = handleUniversalBack;

    let capListener: any = null;
    if ((window as any).Capacitor?.Plugins?.App?.addListener) {
      try {
        (window as any).Capacitor.Plugins.App.addListener('backButton', handleUniversalBack).then((l: any) => {
          capListener = l;
        }).catch(() => {});
      } catch {
        // ignore
      }
    }

    return () => {
      window.removeEventListener('popstate', handleUniversalBack);
      document.removeEventListener('backbutton', handleUniversalBack, false);
      window.removeEventListener('backbutton', handleUniversalBack, false);
      (window as any).onBackPressed = null;
      (window as any).handleBackButton = null;
      (window as any).onHardwareBack = null;
      if (capListener && typeof capListener.remove === 'function') {
        capListener.remove();
      }
    };
  }, [setIsFullScreen, setIsQueueOpen]);

  // Fetch initial home data
  useEffect(() => {
    let isMounted = true;
    const loadHomeData = async () => {
      setIsLoadingHome(true);
      try {
        const data = await fetchHome();
        if (isMounted) setHomeData(data);
      } catch (err) {
        console.error('Failed to fetch home data:', err);
      } finally {
        if (isMounted) setIsLoadingHome(false);
      }
    };

    loadHomeData();
    return () => {
      isMounted = false;
    };
  }, []);

  const navigateTo = (nextNav: NavState) => {
    try {
      if (!window.history.state || window.history.state.__appSentinel !== true) {
        window.history.pushState({ __appSentinel: true }, '');
      }
    } catch {
      // ignore
    }
    setNavHistory(prev => [...prev, nextNav]);
    setCurrentNav(nextNav);
    mainContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    const hist = navHistoryRef.current;
    if (hist.length > 1) {
      const nextHist = hist.slice(0, -1);
      const prevNav = nextHist[nextHist.length - 1] || { tab: 'home' };
      setNavHistory(nextHist);
      setCurrentNav(prevNav);
    } else {
      setCurrentNav({ tab: 'home' });
      setNavHistory([{ tab: 'home' }]);
    }
    mainContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectTab = (tab: string) => {
    if (tab === 'home') {
      setCurrentNav({ tab: 'home' });
      setNavHistory([{ tab: 'home' }]);
      mainContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (tab === 'categories') {
      const firstCatId = homeData?.categories[0]?.id || '1';
      navigateTo({ tab: 'category-detail', categoryId: firstCatId });
    } else {
      navigateTo({ tab: tab as TabType });
    }
  };

  const handleSelectAlbum = (id: string) => {
    navigateTo({ tab: 'album-detail', albumId: id });
  };

  const handleSelectSinger = (id: string) => {
    navigateTo({ tab: 'singer-detail', singerId: id });
  };

  const handleSelectCategory = (id: string) => {
    navigateTo({ tab: 'category-detail', categoryId: id });
  };

  const handleSelectCurated = (type: 'album' | 'singer' | 'tag', id: string) => {
    if (type === 'album') {
      handleSelectAlbum(id);
    } else if (type === 'singer') {
      handleSelectSinger(id);
    } else {
      handleSearch(id);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (currentNav.tab !== 'search') {
      navigateTo({ tab: 'search' });
    }
  };

  return (
    <div className="h-screen h-[100dvh] min-h-[100dvh] w-full bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-zinc-950 overflow-hidden">
      
      {/* Top Fixed Header */}
      <Navbar
        currentTab={currentNav.tab}
        onSelectTab={handleSelectTab}
        onSearch={handleSearch}
        searchQuery={searchQuery}
      />

      {/* Main Content Area */}
      <main
        ref={mainContentRef}
        className="flex-1 w-full overflow-y-auto overflow-x-hidden overscroll-y-contain"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 7.5rem)' }}
      >
        {currentNav.tab === 'home' && (
          <HomeView
            data={homeData}
            isLoading={isLoadingHome}
            onSelectAlbum={handleSelectAlbum}
            onSelectSinger={handleSelectSinger}
            onSelectCategory={handleSelectCategory}
            onSelectCurated={handleSelectCurated}
            onViewAllAlbums={() => navigateTo({ tab: 'albums' })}
            onOpenPlaylistModal={(s) => setPlaylistModalSong(s)}
          />
        )}

        {currentNav.tab === 'albums' && (
          <AlbumsView
            onSelectAlbum={handleSelectAlbum}
          />
        )}

        {currentNav.tab === 'album-detail' && currentNav.albumId && (
          <AlbumDetailView
            albumId={currentNav.albumId}
            onBack={handleBack}
            onSelectSinger={handleSelectSinger}
            onOpenPlaylistModal={(s) => setPlaylistModalSong(s)}
          />
        )}

        {currentNav.tab === 'singer-detail' && currentNav.singerId && (
          <SingerDetailView
            singerId={currentNav.singerId}
            onBack={handleBack}
            onSelectAlbum={handleSelectAlbum}
            onOpenPlaylistModal={(s) => setPlaylistModalSong(s)}
          />
        )}

        {currentNav.tab === 'category-detail' && currentNav.categoryId && (
          <CategoryDetailView
            categoryId={currentNav.categoryId}
            onBack={handleBack}
            onSelectSinger={handleSelectSinger}
            onSelectAlbum={handleSelectAlbum}
          />
        )}

        {currentNav.tab === 'search' && (
          <SearchView
            query={searchQuery}
            onSelectAlbum={handleSelectAlbum}
            onSelectSinger={handleSelectSinger}
            onOpenPlaylistModal={(s) => setPlaylistModalSong(s)}
          />
        )}

        {currentNav.tab === 'library' && (
          <LibraryView
            onSelectAlbum={handleSelectAlbum}
            onSelectSinger={handleSelectSinger}
            onOpenPlaylistModal={(s) => setPlaylistModalSong(s)}
          />
        )}
      </main>

      {/* Bottom Floating Music Player */}
      <PlayerBar
        onSelectSinger={handleSelectSinger}
        onSelectAlbum={handleSelectAlbum}
      />

      {/* Fullscreen Immersive Player */}
      <FullScreenPlayer
        onSelectSinger={handleSelectSinger}
        onSelectAlbum={handleSelectAlbum}
      />

      {/* Up Next Playback Queue Drawer */}
      <QueueDrawer />

      {/* Add To Playlist Modal */}
      <AddToPlaylistModal
        song={playlistModalSong}
        onClose={() => setPlaylistModalSong(null)}
      />

      {/* Android Double-Back Exit Toast */}
      {showExitToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-zinc-900/95 text-zinc-100 border border-zinc-700/80 px-4 py-2 rounded-full shadow-2xl text-xs font-medium animate-in fade-in zoom-in-95 pointer-events-none flex items-center gap-2">
          <span>اضغط مرة أخرى للخروج من التطبيق</span>
        </div>
      )}

    </div>
  );
}

export default function App() {
  return (
    <PlayerProvider>
      <MainApp />
    </PlayerProvider>
  );
}

