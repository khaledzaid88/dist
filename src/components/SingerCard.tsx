import React from 'react';
import type { Singer } from '../types.js';
import { getSingerImageUrl, getCached, fetchSinger } from '../services/albumaty.js';

interface SingerCardProps {
  singer: Singer;
  onSelect: (id: string) => void;
}

export const SingerCard: React.FC<SingerCardProps> = ({ singer, onSelect }) => {
  const [singerData, setSingerData] = React.useState<Singer>(() => {
    const cached = getCached<Singer>(`singer_${singer.id}`);
    if (cached && cached.name) {
      return {
        ...singer,
        name: cached.name,
        imageUrl: cached.imageUrl || singer.imageUrl,
      };
    }
    return singer;
  });

  React.useEffect(() => {
    let isMounted = true;
    const cached = getCached<Singer>(`singer_${singer.id}`);
    if (cached && cached.name) {
      setSingerData(prev => ({
        ...prev,
        name: cached.name,
        imageUrl: cached.imageUrl || prev.imageUrl,
      }));
    } else {
      fetchSinger(singer.id)
        .then((fresh) => {
          if (isMounted && fresh && fresh.name) {
            setSingerData({
              id: fresh.id,
              name: fresh.name,
              imageUrl: fresh.imageUrl || getSingerImageUrl(fresh.id),
              href: `/singer/${fresh.id}.html`,
            });
          }
        })
        .catch(() => {});
    }

    return () => {
      isMounted = false;
    };
  }, [singer.id, singer.name]);

  const displayImage = getSingerImageUrl(singerData.id, singerData.imageUrl);
  const displayName = singerData.name || singer.name || 'مطرب';

  return (
    <div
      onClick={() => onSelect(singer.id)}
      className="group flex flex-col items-center text-center p-3 rounded-2xl hover:bg-zinc-900/60 transition-all duration-300 cursor-pointer select-none"
    >
      <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden bg-zinc-900 border-2 border-zinc-800 group-hover:border-emerald-500/80 shadow-lg group-hover:shadow-emerald-500/20 group-hover:scale-105 transition-all duration-300 mb-3 flex items-center justify-center">
        <img
          src={displayImage}
          alt={displayName}
          className="w-full h-full object-cover"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={(e) => {
            const target = e.currentTarget;
            if (!target.src.endsWith('/mijwiz-logo.jpg')) {
              target.src = './mijwiz-logo.jpg';
            }
          }}
        />
      </div>

      <h4 className="font-semibold text-sm text-zinc-200 group-hover:text-emerald-400 transition-colors line-clamp-1 w-full">
        {displayName}
      </h4>
      <span className="text-[11px] text-zinc-500 mt-0.5">
        مطرب
      </span>
    </div>
  );
};
