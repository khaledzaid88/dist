import * as cheerio from 'cheerio';
import type { Album, Category, CuratedCollection, HomeData, Singer, Song } from '../types.js';

const ALBUMATY_BASE = 'https://www.albumaty.com';

// In-memory cache for ultra-responsive mobile performance
const clientCache = new Map<string, { timestamp: number; data: unknown }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export function getCached<T>(key: string): T | null {
  const item = clientCache.get(key);
  if (!item) return null;
  if (Date.now() - item.timestamp > CACHE_TTL_MS) {
    clientCache.delete(key);
    return null;
  }
  return item.data as T;
}

export function setCached(key: string, data: unknown) {
  clientCache.set(key, { timestamp: Date.now(), data });
}

/**
 * Direct fetch from albumaty.com.
 * In an Android APK WebView (Capacitor/Cordova/Native WebView), direct fetch executes natively.
 * If blocked by browser CORS (e.g. in preview mode), it falls back to the local proxy.
 */
async function fetchHtml(urlPath: string): Promise<string> {
  const fullUrl = urlPath.startsWith('http')
    ? urlPath
    : `${ALBUMATY_BASE}${urlPath.startsWith('/') ? '' : '/'}${urlPath}`;

  // 1. Direct Fetch (Primary mode for static site / APK)
  try {
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (response.ok) {
      return await response.text();
    }
  } catch (err) {
    // In web browser preview environments with strict CORS, direct fetch throws a TypeError.
  }

  // 2. Dev server fallback for browser preview environment
  try {
    const proxyUrl = `/api/proxy?url=${encodeURIComponent(fullUrl)}`;
    const proxyResponse = await fetch(proxyUrl);
    if (proxyResponse.ok) {
      return await proxyResponse.text();
    }
  } catch {
    // ignore
  }

  throw new Error(`Failed to load page from Albumaty: ${fullUrl}`);
}

function cleanText(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

// Helper to ensure direct HTTPS and encode non-ASCII/Arabic characters for client-side HTML5 Audio
export function formatDirectAudioUrl(url?: string): string {
  if (!url) return '';
  let clean = url.trim();
  // Strip any old proxy wrappers if present
  if (clean.includes('/api/stream')) {
    const match = clean.match(/[?&]url=([^&]+)/);
    if (match) {
      clean = decodeURIComponent(match[1]);
    }
  }
  // 1. Force HTTPS
  if (clean.startsWith('http://')) {
    clean = clean.replace(/^http:\/\//, 'https://');
  }
  // 2. Encode non-ASCII and Arabic characters safely for HTML5 Audio decoder
  try {
    clean = encodeURI(decodeURI(clean));
  } catch {
    clean = encodeURI(clean);
  }
  return clean;
}

function parseDurationString(raw?: string): { formatted: string; seconds: number } {
  if (!raw) return { formatted: '--:--', seconds: 0 };
  const ptMatch = raw.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/i);
  if (ptMatch) {
    const hours = parseInt(ptMatch[1] || '0', 10);
    const minutes = parseInt(ptMatch[2] || '0', 10);
    const seconds = parseInt(ptMatch[3] || '0', 10);
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    const formatted = hours > 0
      ? `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      : `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    return { formatted, seconds: totalSeconds };
  }

  const colonMatch = raw.match(/(\d+):(\d+)(?::(\d+))?/);
  if (colonMatch) {
    if (colonMatch[3]) {
      const h = parseInt(colonMatch[1], 10);
      const m = parseInt(colonMatch[2], 10);
      const s = parseInt(colonMatch[3], 10);
      return { formatted: `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`, seconds: h * 3600 + m * 60 + s };
    }
    const m = parseInt(colonMatch[1], 10);
    const s = parseInt(colonMatch[2], 10);
    return { formatted: `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`, seconds: m * 60 + s };
  }

  return { formatted: raw, seconds: 0 };
}

export const KNOWN_SINGER_IMAGES: Record<string, string> = {
  '123': 'https://www.albumaty.com/uploads/cdnimg/c5b218845d3fa1248ceb7652fc6ed500.jpg', // عمرو دياب
  '72': 'https://www.albumaty.com/uploads/singers/10689503_725518320837303_4691403155259941154_n_173.webp', // تامر عاشور
  '6': 'https://www.albumaty.com/uploads/singers/fcb401_925.webp', // إليسا
  '121': 'https://www.albumaty.com/uploads/singers/qns7_288.webp', // شيرين
  '71': 'https://www.albumaty.com/uploads/cdnimg/b8807a3a506c93dc6435981758f476e3.jpg', // تامر حسني
  '102': 'https://www.albumaty.com/uploads/singers/34689_660_1284673_702.webp', // رامي صبري
  '26': 'https://www.albumaty.com/uploads/singers/umm-kulthum-1164_697.webp', // أم كلثوم
  '75': 'https://www.albumaty.com/uploads/singers/2012-05-08_00522_474.webp', // جورج وسوف
  '307': 'https://www.albumaty.com/uploads/singers/kazm-elsahr_218.webp', // كاظم الساهر
  '8': 'https://www.albumaty.com/uploads/cdnimg/836cdc8853f103f45a25de87b80f448a.jpg', // أصالة
  '76': 'https://www.albumaty.com/uploads/singers/10649660_697881290296517_3173866047866916292_n_718.webp', // جنات
  '155': 'https://www.albumaty.com/uploads/singers/p6mt_261.webp', // محمد حماقي
  '69': 'https://www.albumaty.com/uploads/cdnimg/ed59f4ec9d0e1733c7e3de0ab0555646.jpg', // بهاء سلطان
  '1179': 'https://www.albumaty.com/uploads/cdnimg/71b62430535afca7c964750323cd6296.webp', // مسلم
  '1052': 'https://www.albumaty.com/uploads/cdnimg/8d10099c46bb3fbac7aea5f4af2b0951.webp', // عصام صاصا
  '103': 'https://www.albumaty.com/uploads/cdnimg/11cf870f6c1aa287acbab6afe5dc90d6.webp', // رامي جمال
  '138': 'https://www.albumaty.com/uploads/singers/58815246619151515007_394.webp', // وائل جسار
};

export const FEATURED_SINGER_IDS = [
  '123',
  '72',
  '6',
  '121',
  '71',
  '102',
  '26',
  '75',
  '307',
  '8',
  '76',
  '155',
  '69',
  '1179',
  '1052',
  '103',
  '138',
];

export const getSingerImageUrl = (singerId?: string, scrapedImg?: string): string => {
  if (scrapedImg && !scrapedImg.includes('empty.png') && !scrapedImg.includes('no_pic.gif') && !scrapedImg.includes('logo.png')) {
    return scrapedImg.startsWith('http') ? scrapedImg : `${ALBUMATY_BASE}${scrapedImg.startsWith('/') ? '' : '/'}${scrapedImg}`;
  }
  if (singerId && KNOWN_SINGER_IMAGES[singerId]) {
    return KNOWN_SINGER_IMAGES[singerId];
  }
  return './mijwiz-logo.jpg';
};

export async function fetchHome(): Promise<HomeData> {
  const cached = getCached<HomeData>('home');
  if (cached) return cached;

  const html = await fetchHtml('/');
  const $ = cheerio.load(html);

  const categories: Category[] = [
    { id: '1', name: 'اغاني عربية', nameEn: 'Arabic Hits', description: 'أحدث وأشهر الأغاني العربية الحديثة والمتنوعة', href: '/cat/1.html', iconName: 'Music2' },
    { id: '2', name: 'أغاني قديمة - زمن الفن الجميل', nameEn: 'Tarab & Classics', description: 'روائع الطرب الأصيل وعمالقة الغناء العربي', href: '/cat/2.html', iconName: 'Disc' },
    { id: '12', name: 'شيلات خليجية', nameEn: 'Khaleeji & Shelat', description: 'شيلات حماسية وأجمل النغمات والقصائد الخليجية', href: '/cat/12.html', iconName: 'Sparkles' },
    { id: '3', name: 'أغاني سودانية', nameEn: 'Sudanese Songs', description: 'سحر الموسيقى السودانية والإيقاعات الفريدة', href: '/cat/3.html', iconName: 'Radio' },
    { id: '13', name: 'أغاني جزائرية ومغاربية', nameEn: 'Algerian & Rai', description: 'موسيقى الراي وأشهر أغاني بلاد المغرب العربي', href: '/cat/13.html', iconName: 'Flame' },
    { id: '11', name: 'أغاني أجنبية', nameEn: 'International', description: 'مختارات من أفضل الأغاني العالمية والإنجليزية', href: '/cat/11.html', iconName: 'Globe' },
  ];

  const curatedCollections: CuratedCollection[] = [
    { id: 'col-ramadan', title: 'أغاني شهر رمضان المبارك', subtitle: 'روحانيات وأناشيد الشهر الفضيل', type: 'album', targetId: '444', coverUrl: 'https://www.albumaty.com/uploads/singers/444.jpg', color: '#0d9488' },
    { id: 'col-sad', title: 'أغاني حزينة وشجن', subtitle: 'أروع الألحان والمشاعر الهادئة', type: 'singer', targetId: '1190', coverUrl: 'https://www.albumaty.com/uploads/singers/1190.jpg', color: '#6366f1' },
    { id: 'col-mahraganat', title: 'مهرجانات شعبية', subtitle: 'أقوى المهرجانات والإيقاعات الحماسية', type: 'singer', targetId: '639', coverUrl: 'https://www.albumaty.com/uploads/singers/639.jpg', color: '#f59e0b' },
    { id: 'col-afrah', title: 'أغاني أفراح ومناسبات', subtitle: 'بهجة الأعراس والاحتفالات السعيدة', type: 'album', targetId: '1023', coverUrl: 'https://www.albumaty.com/uploads/singers/1023.jpg', color: '#ec4899' },
    { id: 'col-birthday', title: 'أغاني عيد ميلاد', subtitle: 'أجمل تهاني وأغاني أعياد الميلاد', type: 'album', targetId: '1051', coverUrl: 'https://www.albumaty.com/uploads/singers/1051.jpg', color: '#8b5cf6' },
    { id: 'col-sebou', title: 'أغاني سبوع المولود', subtitle: 'أغاني الترحيب بالمولود الجديد', type: 'album', targetId: '1024', coverUrl: 'https://www.albumaty.com/uploads/singers/1024.jpg', color: '#3b82f6' },
  ];

  const featuredAlbums: Album[] = [];
  $('a[href*="/album/"]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const idMatch = href.match(/\/album\/(\d+)\.html/);
    if (!idMatch) return;
    const id = idMatch[1];
    
    if (['444', '1051', '1024', '1023'].includes(id)) return;

    const img = $(el).find('img').attr('src') || $(el).closest('.country-singers').find('img').attr('src');
    const rawText = cleanText($(el).text());
    if (!rawText || rawText.length < 3) return;

    let title = rawText;
    let artist = '';
    let year = '2026';

    const yearMatch = rawText.match(/\b(19\d{2}|20\d{2})\b/);
    if (yearMatch) {
      year = yearMatch[1];
    }

    if (rawText.includes('-')) {
      const parts = rawText.split('-');
      title = parts[0].trim();
      artist = parts[1].trim();
    } else if (rawText.startsWith('ألبوم')) {
      const withoutAlbum = rawText.replace(/^ألبوم\s*/, '');
      const parts = withoutAlbum.split(/\s+(?:20\d{2}|19\d{2})\s*/);
      if (parts.length > 1) {
        title = parts[0].trim();
        artist = parts[1].trim();
      } else {
        title = withoutAlbum;
      }
    }

    if (!featuredAlbums.some(a => a.id === id)) {
      featuredAlbums.push({
        id,
        title,
        artist,
        year,
        coverUrl: img ? (img.startsWith('http') ? img : `${ALBUMATY_BASE}${img.startsWith('/') ? '' : '/'}${img}`) : undefined,
        href,
      });
    }
  });

  const latestSongs: Song[] = [];
  $('a[href*="/song/"]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const idMatch = href.match(/\/song\/(\d+)\.html/);
    if (!idMatch) return;
    const id = idMatch[1];
    const title = cleanText($(el).text());
    if (!title) return;

    const li = $(el).closest('li');
    const singerLink = li.find('a[href*="/singer/"]');
    const singerName = cleanText(singerLink.text());
    const singerHref = singerLink.attr('href') || '';
    const singerId = singerHref.match(/\/singer\/(\d+)\.html/)?.[1];

    if (!latestSongs.some(s => s.id === id)) {
      latestSongs.push({
        id,
        title,
        artist: singerName || 'فنان البوماتي',
        artistId: singerId,
        href,
      });
    }
  });

  // Dynamically load top singers directly from their actual artist profiles
  const singerResults = await Promise.allSettled(
    FEATURED_SINGER_IDS.map(async (id): Promise<Singer> => {
      const s = await fetchSinger(id);
      return {
        id: s.id,
        name: s.name,
        imageUrl: s.imageUrl || getSingerImageUrl(s.id),
        href: `/singer/${s.id}.html`,
      };
    })
  );

  const topSingers: Singer[] = [];
  for (const r of singerResults) {
    if (r.status === 'fulfilled' && r.value && r.value.name) {
      topSingers.push(r.value);
    }
  }

  const homeData: HomeData = {
    featuredAlbums: featuredAlbums.slice(0, 16),
    latestAlbums: featuredAlbums.slice(0, 12),
    latestSongs: latestSongs.slice(0, 24),
    categories,
    curatedCollections,
    topSingers,
  };

  setCached('home', homeData);
  return homeData;
}

export async function fetchCategory(categoryId: string, page: number = 1): Promise<{ category: Category; singers: Singer[]; featuredAlbums: Album[] }> {
  const cacheKey = `cat_${categoryId}_${page}`;
  const cached = getCached<{ category: Category; singers: Singer[]; featuredAlbums: Album[] }>(cacheKey);
  if (cached) return cached;

  const url = `/cat/${categoryId}.html${page > 1 ? `?page=${page}` : ''}`;
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);

  const titleText = cleanText($('title').text()) || cleanText($('h1').text()) || `تصنيف ${categoryId}`;
  const categoryName = titleText.replace(/^تحميل\s*/, '').replace(/\s*-\s*MP3$/, '').replace(/أغاني\s*/, 'اغاني ').trim();

  const singers: Singer[] = [];
  $('a[href*="/singer/"]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const idMatch = href.match(/\/singer\/(\d+)\.html/);
    if (!idMatch) return;
    const id = idMatch[1];
    let name = cleanText($(el).text()).replace(/^اغاني\s*/, '').trim();
    if (!name || name.length < 2) return;

    const img = $(el).find('img').attr('src') || $(el).closest('.country-singers').find('img').attr('src');

    if (!singers.some(s => s.id === id)) {
      singers.push({
        id,
        name,
        imageUrl: getSingerImageUrl(id, img),
        href,
      });
    }
  });

  const featuredAlbums: Album[] = [];
  $('a[href*="/album/"]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const idMatch = href.match(/\/album\/(\d+)\.html/);
    if (!idMatch) return;
    const id = idMatch[1];
    const text = cleanText($(el).text());
    const img = $(el).find('img').attr('src');
    if (text && !featuredAlbums.some(a => a.id === id)) {
      featuredAlbums.push({
        id,
        title: text,
        artist: '',
        coverUrl: img ? (img.startsWith('http') ? img : `${ALBUMATY_BASE}${img.startsWith('/') ? '' : '/'}${img}`) : undefined,
        href,
      });
    }
  });

  const result = {
    category: {
      id: categoryId,
      name: categoryName,
      href: `/cat/${categoryId}.html`,
      count: singers.length,
    },
    singers: singers.slice(0, 100),
    featuredAlbums: featuredAlbums.slice(0, 12),
  };

  setCached(cacheKey, result);
  return result;
}

export async function fetchAlbums(year?: string, page: number = 1): Promise<{ albums: Album[]; years: string[]; currentYear?: string }> {
  const cacheKey = `albums_${year || 'latest'}_${page}`;
  const cached = getCached<{ albums: Album[]; years: string[]; currentYear?: string }>(cacheKey);
  if (cached) return cached;

  const url = year ? `/lastalbums.html?id=${year}` : '/lastalbums.html';
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);

  const years: string[] = [];
  $('a[href*="lastalbums.html?id="]').each((_, el) => {
    const text = cleanText($(el).text());
    const match = text.match(/\b(19\d{2}|20\d{2})\b/);
    if (match && !years.includes(match[1])) {
      years.push(match[1]);
    }
  });

  const albums: Album[] = [];
  $('a[href*="/album/"]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const idMatch = href.match(/\/album\/(\d+)\.html/);
    if (!idMatch) return;
    const id = idMatch[1];
    if (['444', '1051', '1024', '1023'].includes(id)) return;

    const rawText = cleanText($(el).text());
    if (!rawText || rawText.length < 2) return;

    const img = $(el).find('img').attr('src') || $(el).closest('div').find('img').attr('src');
    
    let title = rawText;
    let artist = '';
    let albumYear = year || '2026';

    const yMatch = rawText.match(/\b(19\d{2}|20\d{2})\b/);
    if (yMatch) albumYear = yMatch[1];

    if (rawText.includes('-')) {
      const parts = rawText.split('-');
      title = parts[0].trim();
      artist = parts[1].trim();
    }

    if (!albums.some(a => a.id === id)) {
      albums.push({
        id,
        title,
        artist,
        year: albumYear,
        coverUrl: img ? (img.startsWith('http') ? img : `${ALBUMATY_BASE}${img.startsWith('/') ? '' : '/'}${img}`) : undefined,
        href,
      });
    }
  });

  const result = {
    albums: albums.slice(0, 48),
    years: years.length > 0 ? years : ['2026', '2025', '2024', '2023', '2022', '2021', '2020'],
    currentYear: year,
  };

  setCached(cacheKey, result);
  return result;
}

export async function fetchAlbum(albumId: string): Promise<Album> {
  const cacheKey = `album_${albumId}`;
  const cached = getCached<Album>(cacheKey);
  if (cached) return cached;

  const url = `/album/${albumId}.html`;
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);

  const titleRaw = cleanText($('title').text()) || cleanText($('h1').text());
  const cleanTitle = titleRaw
    .replace(/^تحميل\s*/, '')
    .replace(/^البوم\s*/, '')
    .replace(/^ألبوم\s*/, '')
    .replace(/\s*-\s*MP3$/i, '')
    .replace(/\s*-\s*البوماتي$/i, '')
    .trim();

  let artist = '';
  let albumTitle = cleanTitle;
  let year = '2026';
  let artistId: string | undefined;

  const yearMatch = cleanTitle.match(/\b(19\d{2}|20\d{2})\b/);
  if (yearMatch) {
    year = yearMatch[1];
  }

  const dashParts = cleanTitle.split('-').map(s => s.trim());
  if (dashParts.length >= 2) {
    artist = dashParts[0].replace(/\b(?:19\d{2}|20\d{2})\b/g, '').trim();
    albumTitle = dashParts[1].replace(/\b(?:19\d{2}|20\d{2})\b/g, '').trim();
  } else {
    albumTitle = cleanTitle.replace(/^البوم\s*/, '').trim();
  }

  $('a[href*="/singer/"]').each((_, el) => {
    const href = $(el).attr('href') || '';
    if (href.includes('/1190.html') || href.includes('/639.html')) return;
    const idMatch = href.match(/\/singer\/(\d+)\.html/);
    if (idMatch && !artistId) {
      artistId = idMatch[1];
      const linkText = cleanText($(el).text()).replace(/^اغاني\s*/, '').trim();
      if (linkText && (!artist || artist === 'فنان')) {
        artist = linkText;
      }
    }
  });

  const ogImg = $('meta[property="og:image"]').attr('content') || $('img[fetchpriority="high"]').attr('src') || $('img').first().attr('src');
  const coverUrl = ogImg ? (ogImg.startsWith('http') ? ogImg : `${ALBUMATY_BASE}${ogImg.startsWith('/') ? '' : '/'}${ogImg}`) : undefined;

  const tracks: Song[] = [];
  $('a[href*="/song/"]').each((i, el) => {
    const href = $(el).attr('href') || '';
    const idMatch = href.match(/\/song\/(\d+)\.html/);
    if (!idMatch) return;
    const id = idMatch[1];
    const trackTitle = cleanText($(el).text());
    if (!trackTitle) return;

    if (!tracks.some(t => t.id === id)) {
      tracks.push({
        id,
        title: trackTitle,
        artist: artist || 'فنان',
        artistId,
        albumTitle,
        albumId,
        coverUrl,
        year,
        href,
      });
    }
  });

  const album: Album = {
    id: albumId,
    title: albumTitle,
    artist: artist || 'فنان ألبوماتي',
    artistId,
    year,
    coverUrl,
    href: `/album/${albumId}.html`,
    trackCount: tracks.length,
    tracks,
  };

  setCached(cacheKey, album);
  return album;
}

export async function fetchSinger(singerId: string): Promise<Singer> {
  const cacheKey = `singer_${singerId}`;
  const cached = getCached<Singer>(cacheKey);
  if (cached) return cached;

  const url = `/singer/${singerId}.html`;
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);

  let singerName = cleanText($('h1').first().text());
  if (!singerName || singerName.length < 2) {
    const titleRaw = cleanText($('title').text());
    singerName = titleRaw
      .replace(/^تحميل\s*أ?غاني\s*-\s*/i, '')
      .replace(/^تحميل\s*/i, '')
      .replace(/^أ?غاني\s*-\s*/i, '')
      .replace(/^أ?غاني\s*/i, '')
      .replace(/\s*-\s*mp3$/i, '')
      .replace(/\s*-\s*البوماتي.*$/i, '')
      .replace(/\s*-\s*ألبوماتي.*$/i, '')
      .replace(/^-\s*/, '')
      .trim();
  }

  const rawOgImg = $('meta[property="og:image"]').attr('content');
  const imageUrl = getSingerImageUrl(singerId, rawOgImg);
  if (imageUrl && !imageUrl.endsWith('mijwiz-logo.jpg')) {
    KNOWN_SINGER_IMAGES[singerId] = imageUrl;
  }

  const albums: Album[] = [];
  $('a[href*="/album/"]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const idMatch = href.match(/\/album\/(\d+)\.html/);
    if (!idMatch) return;
    const id = idMatch[1];
    if (['444', '1051', '1024', '1023'].includes(id)) return;

    const text = cleanText($(el).text()).replace(/^ألبوم\s*/, '').trim();
    if (!text) return;
    const img = $(el).find('img').attr('src');

    if (!albums.some(a => a.id === id)) {
      albums.push({
        id,
        title: text,
        artist: singerName,
        artistId: singerId,
        coverUrl: img ? (img.startsWith('http') ? img : `${ALBUMATY_BASE}${img.startsWith('/') ? '' : '/'}${img}`) : imageUrl,
        href,
      });
    }
  });

  const songs: Song[] = [];
  $('a[href*="/song/"]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const idMatch = href.match(/\/song\/(\d+)\.html/);
    if (!idMatch) return;
    const id = idMatch[1];
    const text = cleanText($(el).text());
    if (!text) return;

    if (!songs.some(s => s.id === id)) {
      songs.push({
        id,
        title: text,
        artist: singerName,
        artistId: singerId,
        coverUrl: imageUrl,
        href,
      });
    }
  });

  const singer: Singer = {
    id: singerId,
    name: singerName || `مطرب ${singerId}`,
    imageUrl,
    href: `/singer/${singerId}.html`,
    albumCount: albums.length,
    songCount: songs.length,
    albums,
    songs: songs.slice(0, 50),
  };

  setCached(cacheKey, singer);
  return singer;
}

export async function fetchSong(songId: string): Promise<Song> {
  const cacheKey = `song_${songId}`;
  const cached = getCached<Song>(cacheKey);
  if (cached) return cached;

  const url = `/song/${songId}.html`;
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);

  const titleRaw = cleanText($('title').text()) || cleanText($('h1').text());
  const titleParts = titleRaw
    .replace(/^تحميل اغنية\s*-\s*/, '')
    .replace(/\s*-\s*MP3$/i, '')
    .split('-')
    .map(s => s.trim());

  let songTitle = titleParts[0] || `أغنية ${songId}`;
  let artist = titleParts[1] || '';

  const singerLink = $('a[href*="/singer/"]').filter((_, el) => {
    const href = $(el).attr('href') || '';
    return !href.includes('/1190.html') && !href.includes('/639.html');
  }).first();

  let artistId: string | undefined;
  if (singerLink.length) {
    const sName = cleanText(singerLink.text());
    if (sName) artist = sName;
    const sHref = singerLink.attr('href') || '';
    artistId = sHref.match(/\/singer\/(\d+)\.html/)?.[1];
  }

  const ogImg = $('meta[property="og:image"]').attr('content');
  const coverUrl = ogImg ? (ogImg.startsWith('http') ? ogImg : `${ALBUMATY_BASE}${ogImg.startsWith('/') ? '' : '/'}${ogImg}`) : undefined;

  // Direct Audio MP3 link on Albumaty CDN
  let audioUrl =
    $('audio').attr('src') ||
    $('audio source').attr('src') ||
    $('meta[property="og:audio"]').attr('content') ||
    $('meta[itemprop="contentUrl"]').attr('content') ||
    $('meta[itemprop="url"]').attr('content');

  if (!audioUrl) {
    const mp3Match = html.match(/https?:\/\/[^"'\s<>]+\.mp3/i);
    if (mp3Match) {
      audioUrl = mp3Match[0];
    }
  }

  // 100% Client-Side direct HTTPS audio URL formatted and encoded
  const directAudioUrl = formatDirectAudioUrl(audioUrl);

  const durationMeta = $('meta[itemprop="duration"]').attr('content');
  const { formatted, seconds } = parseDurationString(durationMeta);

  const albumLink = $('a[href*="/album/"]').first();
  let albumTitle: string | undefined;
  let albumId: string | undefined;
  if (albumLink.length) {
    albumTitle = cleanText(albumLink.text());
    const aHref = albumLink.attr('href') || '';
    albumId = aHref.match(/\/album\/(\d+)\.html/)?.[1];
  }

  const song: Song = {
    id: songId,
    title: songTitle,
    artist: artist || 'فنان ألبوماتي',
    artistId,
    albumTitle,
    albumId,
    coverUrl,
    audioUrl: directAudioUrl,
    streamUrl: directAudioUrl,
    duration: formatted,
    durationSeconds: seconds,
    href: `/song/${songId}.html`,
  };

  setCached(cacheKey, song);
  return song;
}

export async function searchAlbumaty(query: string): Promise<{ songs: Song[]; albums: Album[]; singers: Singer[] }> {
  if (!query || !query.trim()) {
    return { songs: [], albums: [], singers: [] };
  }

  const cacheKey = `search_${query.trim()}`;
  const cached = getCached<{ songs: Song[]; albums: Album[]; singers: Singer[] }>(cacheKey);
  if (cached) return cached;

  const url = `/search.php?q=${encodeURIComponent(query.trim())}`;
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);

  const songs: Song[] = [];
  const albums: Album[] = [];
  const singers: Singer[] = [];

  $('a[href*="/song/"]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const idMatch = href.match(/\/song\/(\d+)\.html/);
    if (!idMatch) return;
    const id = idMatch[1];
    const text = cleanText($(el).text());
    if (!text) return;

    let title = text;
    let artist = '';
    if (text.includes('-')) {
      const parts = text.split('-');
      artist = parts[0].trim();
      title = parts[1].trim();
    }

    if (!songs.some(s => s.id === id)) {
      songs.push({
        id,
        title,
        artist: artist || 'فنان',
        href,
      });
    }
  });

  $('a[href*="/album/"]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const idMatch = href.match(/\/album\/(\d+)\.html/);
    if (!idMatch) return;
    const id = idMatch[1];
    const text = cleanText($(el).text());
    if (!text || ['444', '1051', '1024', '1023'].includes(id)) return;

    if (!albums.some(a => a.id === id)) {
      albums.push({
        id,
        title: text,
        artist: '',
        href,
      });
    }
  });

  $('a[href*="/singer/"]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const idMatch = href.match(/\/singer\/(\d+)\.html/);
    if (!idMatch) return;
    const id = idMatch[1];
    const text = cleanText($(el).text()).replace(/^اغاني\s*/, '').trim();
    if (!text) return;

    if (!singers.some(s => s.id === id)) {
      singers.push({
        id,
        name: text,
        imageUrl: getSingerImageUrl(id),
        href,
      });
    }
  });

  const result = {
    songs: songs.slice(0, 30),
    albums: albums.slice(0, 20),
    singers: singers.slice(0, 15),
  };

  setCached(cacheKey, result);
  return result;
}

export async function fetchSuggestedForArtist(
  songId?: string,
  artistId?: string,
  artistName?: string
): Promise<{ songs: Song[]; artist: string; artistId?: string }> {
  let targetArtistId = artistId;
  let targetArtistName = artistName ? artistName.trim() : '';

  if (!targetArtistId && songId) {
    try {
      const songData = await fetchSong(songId);
      if (songData) {
        if (songData.artistId) targetArtistId = songData.artistId;
        if (!targetArtistName && songData.artist) targetArtistName = songData.artist;
      }
    } catch (e) {
      console.warn('Could not fetch song info for suggestions:', e);
    }
  }

  let candidateSongs: Song[] = [];

  if (targetArtistId) {
    try {
      const singer = await fetchSinger(targetArtistId);
      if (singer) {
        if (!targetArtistName && singer.name) targetArtistName = singer.name;
        if (Array.isArray(singer.songs)) {
          candidateSongs.push(...singer.songs);
        }

        if (candidateSongs.length < 10 && singer.albums && singer.albums.length > 0) {
          try {
            const albumData = await fetchAlbum(singer.albums[0].id);
            if (albumData && albumData.tracks) {
              candidateSongs.push(...albumData.tracks);
            }
          } catch (e) {
            console.warn('Could not fetch album tracks for singer suggestions:', e);
          }
        }
      }
    } catch (e) {
      console.warn('Could not fetch singer for suggestions:', e);
    }
  }

  if (candidateSongs.length === 0 && targetArtistName) {
    try {
      const cleanArtist = targetArtistName
        .replace(/^اغاني\s*/, '')
        .replace(/فنان\s*(البوماتي|ألبوماتي)/, '')
        .trim();

      if (cleanArtist) {
        const searchRes = await searchAlbumaty(cleanArtist);
        
        const matchingSinger = searchRes.singers.find(s => 
          !['1190', '639'].includes(s.id) &&
          (s.name.toLowerCase().includes(cleanArtist.toLowerCase()) || cleanArtist.toLowerCase().includes(s.name.toLowerCase()))
        ) || searchRes.singers.find(s => !['1190', '639'].includes(s.id));

        if (matchingSinger) {
          targetArtistId = matchingSinger.id;
          if (!targetArtistName) targetArtistName = matchingSinger.name;
          const singerData = await fetchSinger(matchingSinger.id);
          if (singerData && singerData.songs) {
            candidateSongs.push(...singerData.songs);
          }
        }

        if (searchRes.songs && searchRes.songs.length > 0) {
          candidateSongs.push(...searchRes.songs);
        }
      }
    } catch (e) {
      console.warn('Could not search for artist suggested tracks:', e);
    }
  }

  const uniqueSongs: Song[] = [];
  const seenIds = new Set<string>();

  for (const s of candidateSongs) {
    if (!s.id || s.id === songId || seenIds.has(s.id)) continue;
    seenIds.add(s.id);
    uniqueSongs.push({
      ...s,
      artist: s.artist || targetArtistName || 'فنان ألبوماتي',
      artistId: s.artistId || targetArtistId,
    });
  }

  return {
    songs: uniqueSongs,
    artist: targetArtistName,
    artistId: targetArtistId,
  };
}
