import React, { useState } from 'react';
import { Search, Disc3, Heart, Library, Music, Layers, ListMusic } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext.js';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onSearch: (query: string) => void;
  searchQuery: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onSearch,
  searchQuery,
}) => {
  const { queue, setIsQueueOpen, isPlaying, currentSong } = usePlayer();
  const [localQuery, setLocalQuery] = useState(searchQuery);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (localQuery.trim()) {
      onSearch(localQuery.trim());
      onSelectTab('search');
    }
  };

  const navItems = [
    { id: 'home', label: 'الرئيسية', labelEn: 'Home', icon: Music },
    { id: 'albums', label: 'الألبومات', labelEn: 'Albums', icon: Disc3 },
    { id: 'categories', label: 'التصنيفات', labelEn: 'Categories', icon: Layers },
    { id: 'library', label: 'مكتبتي', labelEn: 'Library', icon: Library },
  ];

  return (
    <header
      className="sticky top-0 z-40 w-full bg-zinc-950/90 backdrop-blur-xl border-b border-zinc-800/80 flex-shrink-0"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 h-16 sm:h-18 flex items-center justify-between gap-3">
        {/* Logo & Brand */}
        <div
          onClick={() => onSelectTab('home')}
          className="flex items-center gap-2.5 sm:gap-3 cursor-pointer select-none group"
        >
          <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl overflow-hidden shadow-md shadow-emerald-500/20 border-2 border-emerald-500/40 group-hover:scale-105 group-hover:border-emerald-400 transition-all duration-200 bg-zinc-900 flex-shrink-0">
            <img
              src="./mijwiz-logo.jpg"
              alt="MijWiz Logo"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={(e) => {
                // Fallback to root path if relative fails
                const target = e.currentTarget;
                if (!target.src.endsWith('/mijwiz-logo.jpg')) {
                  target.src = '/mijwiz-logo.jpg';
                }
              }}
            />
            {isPlaying && (
              <span className="absolute inset-0 rounded-xl ring-2 ring-emerald-400/70 animate-pulse pointer-events-none" />
            )}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg sm:text-xl tracking-tight text-white font-outfit">
                MijWiz
              </span>
              <span className="text-[9px] sm:text-[10px] font-bold tracking-wider uppercase text-emerald-300 bg-emerald-950/90 px-1.5 py-0.5 rounded border border-emerald-500/40">
                PRO
              </span>
            </div>
            <span className="text-[10px] sm:text-[11px] text-zinc-400 tracking-wide font-medium">
              مشغل الموسيقى العربية
            </span>
          </div>
        </div>

        {/* Center Search Bar */}
        <form
          onSubmit={handleSearchSubmit}
          className="flex-1 max-w-md hidden md:block"
        >
          <div className="relative group">
            <Search className="w-4 h-4 text-zinc-400 absolute right-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-emerald-400 transition-colors" />
            <input
              type="text"
              value={localQuery}
              onChange={(e) => {
                setLocalQuery(e.target.value);
                if (e.target.value.trim().length > 1) {
                  onSearch(e.target.value.trim());
                  if (currentTab !== 'search') onSelectTab('search');
                }
              }}
              placeholder="ابحث عن ألبوم، مطرب، أو أغنية..."
              className="w-full bg-zinc-900/90 text-sm text-zinc-100 placeholder:text-zinc-500 rounded-xl pr-10 pl-4 py-2.5 border border-zinc-800 hover:border-zinc-700 focus:border-emerald-500/60 focus:bg-zinc-900 focus:outline-none transition-all"
            />
            {localQuery && (
              <button
                type="button"
                onClick={() => {
                  setLocalQuery('');
                  onSearch('');
                }}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 hover:text-zinc-300 px-1 py-0.5"
              >
                ✕
              </button>
            )}
          </div>
        </form>

        {/* Navigation Tabs & Queue Control */}
        <div className="flex items-center gap-1 sm:gap-2">
          <nav className="flex items-center gap-1 bg-zinc-900/60 p-1 rounded-xl border border-zinc-800/70">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Queue Button */}
          <button
            onClick={() => setIsQueueOpen(true)}
            className="relative flex items-center justify-center p-2.5 rounded-xl bg-zinc-900/70 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition-colors"
            title="قائمة الانتظار"
          >
            <ListMusic className="w-4 h-4" />
            {queue.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-[10px] font-bold text-zinc-950 flex items-center justify-center">
                {queue.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Search row */}
      <div className="px-4 pb-3 md:hidden">
        <form onSubmit={handleSearchSubmit} className="relative">
          <Search className="w-4 h-4 text-zinc-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={localQuery}
            onChange={(e) => {
              setLocalQuery(e.target.value);
              if (e.target.value.trim().length > 1) {
                onSearch(e.target.value.trim());
                if (currentTab !== 'search') onSelectTab('search');
              }
            }}
            placeholder="ابحث عن ألبوم أو أغنية..."
            className="w-full bg-zinc-900 text-sm text-zinc-100 placeholder:text-zinc-500 rounded-xl pr-10 pl-4 py-2 border border-zinc-800 focus:border-emerald-500 focus:outline-none"
          />
        </form>
      </div>
    </header>
  );
};
