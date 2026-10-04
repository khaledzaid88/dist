import * as cheerio from 'cheerio';
import type { Album, Category, CuratedCollection, HomeData, Singer, Song } from '../src/types.js';

const ALBUMATY_BASE = 'https://www.albumaty.com';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Simple in-memory cache to make browsing blazing fast
const cache = new Map<string, { timestamp: number; data: unknown }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function getCached<T>(key: string): T | null {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() - item.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return item.data as T;
}

function setCached(key: string, data: unknown) {
  cache.set(key, { timestamp: Date.now(), data });
}

async function fetchHtml(url: string): Promise<string> {
  const fullUrl = url.startsWith('http') ? url : `${ALBUMATY_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
  
  let lastError: any = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const response = await fetch(fullUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'ar,en-US;q=0.7,en;q=0.3',
          'Referer': `${ALBUMATY_BASE}/`,
        },
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to fetch ${fullUrl}: ${response.status} ${response.statusText}`);
      }

      return await response.text();
    } catch (err: any) {
      lastError = err;
      if (attempt < 3) {
        await new Promise(r => setTimeout(r, 400 * attempt));
      }
    }
  }

  throw lastError || new Error(`Failed to fetch ${fullUrl}`);
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

export async function fetchHome(): Promise<HomeData> {
  const cached = getCached<HomeData>('home');
  if (cached) return cached;

  const html = await fetchHtml('/');
  const $ = cheerio.load(html);

  // Static defined categories from Albumaty structure with English subtitles & icons
  const categories: Category[] = [
    { id: '1', name: 'اغاني عربية', nameEn: 'Arabic Hits', description: 'أحدث وأشهر الأغاني العربية الحديثة والمتنوعة', href: '/cat/1.html', iconName: 'Music2' },
    { id: '2', name: 'أغاني قديمة - زمن الفن الجميل', nameEn: 'Tarab & Classics', description: 'روائع الطرب الأصيل وعمالقة الغناء العربي', href: '/cat/2.html', iconName: 'Disc' },
    { id: '12', name: 'شيلات خليجية', nameEn: 'Khaleeji & Shelat', description: 'شيلات حماسية وأجمل النغمات والقصائد الخليجية', href: '/cat/12.html', iconName: 'Sparkles' },
    { id: '3', name: 'أغاني سودانية', nameEn: 'Sudanese Songs', description: 'سحر الموسيقى السودانية والإيقاعات الفريدة', href: '/cat/3.html', iconName: 'Radio' },
    { id: '13', name: 'أغاني جزائرية ومغاربية', nameEn: 'Algerian & Rai', description: 'موسيقى الراي وأشهر أغاني بلاد المغرب العربي', href: '/cat/13.html', iconName: 'Flame' },
    { id: '11', name: 'أغاني أجنبية', nameEn: 'International', description: 'مختارات من أفضل الأغاني العالمية والإنجليزية', href: '/cat/11.html', iconName: 'Globe' },
  ];

  // Curated collections
  const curatedCollections: CuratedCollection[] = [
    { id: 'col-ramadan', title: 'أغاني شهر رمضان المبارك', subtitle: 'روحانيات وأناشيد الشهر الفضيل', type: 'album', targetId: '444', coverUrl: 'https://www.albumaty.com/uploads/singers/444.jpg', color: '#0d9488' },
    { id: 'col-sad', title: 'أغاني حزينة وشجن', subtitle: 'أروع الألحان والمشاعر الهادئة', type: 'singer', targetId: '1190', coverUrl: 'https://www.albumaty.com/uploads/singers/1190.jpg', color: '#6366f1' },
    { id: 'col-mahraganat', title: 'مهرجانات شعبية', subtitle: 'أقوى المهرجانات والإيقاعات الحماسية', type: 'singer', targetId: '639', coverUrl: 'https://www.albumaty.com/uploads/singers/639.jpg', color: '#f59e0b' },
    { id: 'col-afrah', title: 'أغاني أفراح ومناسبات', subtitle: 'بهجة الأعراس والاحتفالات السعيدة', type: 'album', targetId: '1023', coverUrl: 'https://www.albumaty.com/uploads/singers/1023.jpg', color: '#ec4899' },
    { id: 'col-birthday', title: 'أغاني عيد ميلاد', subtitle: 'أجمل تهاني وأغاني أعياد الميلاد', type: 'album', targetId: '1051', coverUrl: 'https://www.albumaty.com/uploads/singers/1051.jpg', color: '#8b5cf6' },
    { id: 'col-sebou', title: 'أغاني سبوع المولود', subtitle: 'أغاني الترحيب بالمولود الجديد', type: 'album', targetId: '1024', coverUrl: 'https://www.albumaty.com/uploads/singers/1024.jpg', color: '#3b82f6' },
  ];

  // Parse Featured / Latest Albums
  const featuredAlbums: Album[] = [];
  $('a[href*="/album/"]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const idMatch = href.match(/\/album\/(\d+)\.html/);
    if (!idMatch) return;
    const id = idMatch[1];
    
    // Ignore small special albums in the header
    if (['444', '1051', '1024', '1023'].includes(id)) return;

    const img = $(el).find('img').attr('src') || $(el).closest('.country-singers').find('img').attr('src');
    const rawText = cleanText($(el).text());
    if (!rawText || rawText.length < 3) return;

    // Clean text format e.g. "ألبوم اندم 2026 علي فاروق" or "اندم - علي فاروق"
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
      // e.g. ألبوم اندم 2026 علي فاروق
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

  // Parse Latest Songs
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

  // Prominent artists on Albumaty
  const topSingers: Singer[] = [
    { id: '123', name: 'عمرو دياب', imageUrl: 'https://www.albumaty.com/uploads/cdnimg/c5b218845d3fa1248ceb7652fc6ed500.jpg', href: '/singer/123.html' },
    { id: '72', name: 'تامر عاشور', imageUrl: 'https://www.albumaty.com/uploads/singers/72.jpg', href: '/singer/72.html' },
    { id: '6', name: 'إليسا', imageUrl: 'https://www.albumaty.com/uploads/singers/6.jpg', href: '/singer/6.html' },
    { id: '121', name: 'شيرين عبدالوهاب', imageUrl: 'https://www.albumaty.com/uploads/singers/121.jpg', href: '/singer/121.html' },
    { id: '71', name: 'تامر حسني', imageUrl: 'https://www.albumaty.com/uploads/singers/71.jpg', href: '/singer/71.html' },
    { id: '102', name: 'رامي صبري', imageUrl: 'https://www.albumaty.com/uploads/singers/102.jpg', href: '/singer/102.html' },
    { id: '26', name: 'أم كلثوم', imageUrl: 'https://www.albumaty.com/uploads/singers/26.jpg', href: '/singer/26.html' },
    { id: '75', name: 'جورج وسوف', imageUrl: 'https://www.albumaty.com/uploads/singers/75.jpg', href: '/singer/75.html' },
    { id: '89', name: 'كاظم الساهر', imageUrl: 'https://www.albumaty.com/uploads/singers/89.jpg', href: '/singer/89.html' },
    { id: '76', name: 'أصالة نصري', imageUrl: 'https://www.albumaty.com/uploads/singers/76.jpg', href: '/singer/76.html' },
    { id: '155', name: 'محمد حماقي', imageUrl: 'https://www.albumaty.com/uploads/singers/155.jpg', href: '/singer/155.html' },
    { id: '69', name: 'بهاء سلطان', imageUrl: 'https://www.albumaty.com/uploads/singers/69.jpg', href: '/singer/69.html' },
    { id: '1179', name: 'مسلم', imageUrl: 'https://www.albumaty.com/uploads/singers/1179.jpg', href: '/singer/1179.html' },
    { id: '1052', name: 'عصام صاصا', imageUrl: 'https://www.albumaty.com/uploads/singers/1052.jpg', href: '/singer/1052.html' },
  ];

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

    // Skip special tags like 'اغاني حزينه' or 'مهرجانات' if we want clean artists, or include them
    const img = $(el).find('img').attr('src') || $(el).closest('.country-singers').find('img').attr('src');

    if (!singers.some(s => s.id === id)) {
      singers.push({
        id,
        name,
        imageUrl: img ? (img.startsWith('http') ? img : `${ALBUMATY_BASE}${img.startsWith('/') ? '' : '/'}${img}`) : `https://www.albumaty.com/uploads/singers/${id}.jpg`,
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

  // Extract available years
  const years: string[] = [];
  $('a[href*="lastalbums.html?id="]').each((_, el) => {
    const text = cleanText($(el).text());
    if (/^\d{4}$/.test(text) && !years.includes(text)) {
      years.push(text);
    }
  });

  if (years.length === 0) {
    // Fallback known years
    for (let y = 2026; y >= 1990; y--) {
      years.push(y.toString());
    }
  }

  const albums: Album[] = [];
  $('a[href*="/album/"]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const idMatch = href.match(/\/album\/(\d+)\.html/);
    if (!idMatch) return;
    const id = idMatch[1];
    if (['444', '1051', '1024', '1023'].includes(id)) return;

    const img = $(el).find('img').attr('src') || $(el).closest('.country-singers').find('img').attr('src');
    const rawText = cleanText($(el).text());
    if (!rawText || rawText.length < 2) return;

    let title = rawText;
    let artist = '';
    if (rawText.includes('-')) {
      const parts = rawText.split('-');
      title = parts[0].trim();
      artist = parts[1].trim();
    } else if (rawText.startsWith('ألبوم')) {
      title = rawText.replace(/^ألبوم\s*/, '').trim();
    }

    if (!albums.some(a => a.id === id)) {
      albums.push({
        id,
        title,
        artist,
        year: year || '2026',
        coverUrl: img ? (img.startsWith('http') ? img : `${ALBUMATY_BASE}${img.startsWith('/') ? '' : '/'}${img}`) : undefined,
        href,
      });
    }
  });

  const result = {
    albums,
    years,
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
  
  let albumTitle = '';
  let artist = '';
  let artistId: string | undefined;
  let year = '2026';

  const yearMatch = titleRaw.match(/\b(19\d{2}|20\d{2})\b/);
  if (yearMatch) {
    year = yearMatch[1];
  }

  // Parse from title like "تحميل البوم علي فاروق - اندم - 2026 الجديد MP3"
  const cleanTitle = titleRaw.replace(/^تحميل البوم\s*/i, '').replace(/\s*الجديد\s*MP3.*$/i, '').trim();
  const dashParts = cleanTitle.split('-').map(s => s.trim());
  if (dashParts.length >= 2) {
    artist = dashParts[0].replace(/\b(?:19\d{2}|20\d{2})\b/g, '').trim();
    albumTitle = dashParts[1].replace(/\b(?:19\d{2}|20\d{2})\b/g, '').trim();
  } else {
    albumTitle = cleanTitle.replace(/^البوم\s*/, '').trim();
  }

  // Look for the specific singer link inside the page (skipping navbar items)
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

  const titleRaw = cleanText($('title').text()) || cleanText($('h1').text());
  const singerName = titleRaw
    .replace(/^تحميل اغاني\s*-\s*/, '')
    .replace(/^اغاني\s*/, '')
    .replace(/\s*-\s*mp3$/i, '')
    .trim();

  const ogImg = $('meta[property="og:image"]').attr('content') || `https://www.albumaty.com/uploads/singers/${singerId}.jpg`;
  const imageUrl = ogImg ? (ogImg.startsWith('http') ? ogImg : `${ALBUMATY_BASE}${ogImg.startsWith('/') ? '' : '/'}${ogImg}`) : undefined;

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
  // Format: "تحميل اغنية - اربع بيبان اتهدوا - عصام صاصا - MP3"
  const titleParts = titleRaw
    .replace(/^تحميل اغنية\s*-\s*/, '')
    .replace(/\s*-\s*MP3$/i, '')
    .split('-')
    .map(s => s.trim());

  let songTitle = titleParts[0] || `أغنية ${songId}`;
  let artist = titleParts[1] || '';

  // Check singer links on page
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

  // Cover image
  const ogImg = $('meta[property="og:image"]').attr('content');
  const coverUrl = ogImg ? (ogImg.startsWith('http') ? ogImg : `${ALBUMATY_BASE}${ogImg.startsWith('/') ? '' : '/'}${ogImg}`) : undefined;

  // Direct Audio URL
  let audioUrl =
    $('audio').attr('src') ||
    $('audio source').attr('src') ||
    $('meta[property="og:audio"]').attr('content') ||
    $('meta[itemprop="contentUrl"]').attr('content') ||
    $('meta[itemprop="url"]').attr('content');

  if (!audioUrl) {
    // Scan for mp3 urls
    const mp3Match = html.match(/https?:\/\/[^"'\s<>]+\.mp3/i);
    if (mp3Match) {
      audioUrl = mp3Match[0];
    }
  }

  // Upgrade http to https to prevent mixed content
  if (audioUrl && audioUrl.startsWith('http://')) {
    audioUrl = audioUrl.replace(/^http:\/\//, 'https://');
  }

  // Duration
  const durationMeta = $('meta[itemprop="duration"]').attr('content');
  const { formatted, seconds } = parseDurationString(durationMeta);

  // Album
  const albumLink = $('a[href*="/album/"]').first();
  let albumTitle: string | undefined;
  let albumId: string | undefined;
  if (albumLink.length) {
    albumTitle = cleanText(albumLink.text());
    const aHref = albumLink.attr('href') || '';
    albumId = aHref.match(/\/album\/(\d+)\.html/)?.[1];
  }

  const streamUrl = audioUrl
    ? `/api/stream?songId=${songId}&url=${encodeURIComponent(audioUrl)}`
    : `/api/stream?songId=${songId}`;

  const song: Song = {
    id: songId,
    title: songTitle,
    artist: artist || 'فنان ألبوماتي',
    artistId,
    albumTitle,
    albumId,
    coverUrl,
    audioUrl,
    streamUrl,
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
        streamUrl: `/api/stream?songId=${id}`,
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
        imageUrl: `https://www.albumaty.com/uploads/singers/${id}.jpg`,
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

  // 1. If we don't have artistId, but have songId, try resolving song to get artistId & artist
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

  // 2. If we have artistId, fetch the singer page directly
  if (targetArtistId) {
    try {
      const singer = await fetchSinger(targetArtistId);
      if (singer) {
        if (!targetArtistName && singer.name) targetArtistName = singer.name;
        if (Array.isArray(singer.songs)) {
          candidateSongs.push(...singer.songs);
        }

        // If singer has few direct songs but has albums, fetch tracks from first album
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

  // 3. If still no songs found, search for artist
  if (candidateSongs.length === 0 && targetArtistName) {
    try {
      const cleanArtist = targetArtistName
        .replace(/^اغاني\s*/, '')
        .replace(/فنان\s*(البوماتي|ألبوماتي)/, '')
        .trim();

      if (cleanArtist) {
        const searchRes = await searchAlbumaty(cleanArtist);
        
        // Find singer in search results
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

        // Also add any songs returned by search matching artist
        if (searchRes.songs && searchRes.songs.length > 0) {
          candidateSongs.push(...searchRes.songs);
        }
      }
    } catch (e) {
      console.warn('Could not search for artist suggested tracks:', e);
    }
  }

  // 4. Filter duplicates and remove the current song
  const uniqueSongs: Song[] = [];
  const seenIds = new Set<string>();

  for (const s of candidateSongs) {
    if (!s.id || s.id === songId || seenIds.has(s.id)) continue;
    seenIds.add(s.id);
    uniqueSongs.push({
      ...s,
      artist: s.artist || targetArtistName || 'فنان ألبوماتي',
      artistId: s.artistId || targetArtistId,
      streamUrl: s.streamUrl || `/api/stream?songId=${s.id}`,
    });
  }

  return {
    songs: uniqueSongs,
    artist: targetArtistName,
    artistId: targetArtistId,
  };
}

