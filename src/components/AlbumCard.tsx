import React from 'react';
import { Play, Disc3 } from 'lucide-react';
import type { Album } from '../types.js';

interface AlbumCardProps {
  album: Album;
  onSelect: (id: string) => void;
  onPlayDirectly?: (album: Album) => void;
}

export const AlbumCard: React.FC<AlbumCardProps> = ({ album, onSelect, onPlayDirectly }) => {
  return (
    <div
      onClick={() => onSelect(album.id)}
      className="group relative bg-zinc-900/40 hover:bg-zinc-900/90 rounded-2xl p-3 border border-zinc-800/60 hover:border-zinc-700/80 transition-all duration-300 flex flex-col cursor-pointer hover:shadow-xl hover:shadow-black/50"
    >
      {/* Artwork Container */}
      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-zinc-900 mb-3 shadow-md flex items-center justify-center">
        {album.coverUrl ? (
          <img
            src={album.coverUrl}
            alt={album.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
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
            <Disc3 className="w-10 h-10" />
          </div>
        )}

        {/* Release Year Badge */}
        {album.year && (
          <span className="absolute top-2.5 right-2.5 text-[10px] font-mono font-medium bg-black/60 backdrop-blur-md text-zinc-300 px-2 py-0.5 rounded-full border border-white/10">
            {album.year}
          </span>
        )}

        {/* Quick Play Hover Button */}
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onPlayDirectly) {
                onPlayDirectly(album);
              } else {
                onSelect(album.id);
              }
            }}
            className="w-12 h-12 rounded-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 flex items-center justify-center shadow-lg shadow-emerald-500/30 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300"
            title="تشغيل الألبوم"
          >
            <Play className="w-5 h-5 fill-current translate-x-0.5" />
          </button>
        </div>
      </div>

      {/* Album Text Info */}
      <div className="flex-1 flex flex-col justify-between min-w-0">
        <div>
          <h3 className="font-semibold text-sm text-zinc-100 group-hover:text-emerald-400 transition-colors line-clamp-1 leading-snug">
            {album.title}
          </h3>
          <p className="text-xs text-zinc-400 line-clamp-1 mt-0.5">
            {album.artist || 'فنان متميز'}
          </p>
        </div>

        {album.trackCount !== undefined && album.trackCount > 0 && (
          <span className="text-[11px] text-zinc-500 mt-2 block">
            {album.trackCount} أغنية
          </span>
        )}
      </div>
    </div>
  );
};
