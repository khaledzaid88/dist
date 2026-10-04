import dns from 'node:dns';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  fetchAlbum,
  fetchAlbums,
  fetchCategory,
  fetchHome,
  fetchSinger,
  fetchSong,
  fetchSuggestedForArtist,
  searchAlbumaty,
} from './server/albumaty.js';

// Force Node.js DNS to prefer IPv4 first.
// Prevents 10s ConnectTimeoutError when Cloudflare IPv6 routes are unreachable or throttled in containerized runtimes.
try {
  dns.setDefaultResultOrder('ipv4first');
} catch (e) {
  console.warn('Could not set DNS default result order to ipv4first:', e);
}

const PORT = 3000;

async function startServer() {
  const app = express();
  app.use(express.json());

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', source: 'albumaty.com' });
  });

  // Direct HTML proxy fallback for preview browser iframe with automatic retry
  app.get('/api/proxy', async (req, res) => {
    const url = req.query.url as string;
    if (!url) return res.status(400).send('URL is required');

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);

        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Referer': 'https://www.albumaty.com/',
          },
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          return res.status(response.status).send(`Upstream response: ${response.statusText}`);
        }

        const text = await response.text();
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send(text);
      } catch (e: any) {
        console.warn(`Attempt ${attempt} failed in /api/proxy for ${url}:`, e?.message || e);
        if (attempt === 3) {
          console.error('Final failure in /api/proxy:', e);
          return res.status(502).send('Proxy upstream connect error');
        }
        await new Promise(r => setTimeout(r, 400 * attempt));
      }
    }
  });

  // Home data: featured albums, categories, latest songs, top singers
  app.get('/api/home', async (req, res) => {
    try {
      const data = await fetchHome();
      res.json(data);
    } catch (error) {
      console.error('Error in /api/home:', error);
      res.status(500).json({ error: 'Failed to fetch home data from albumaty.com' });
    }
  });

  // Category data: singers and featured albums
  app.get('/api/category', async (req, res) => {
    try {
      const id = (req.query.id as string) || '1';
      const page = parseInt((req.query.page as string) || '1', 10);
      const data = await fetchCategory(id, page);
      res.json(data);
    } catch (error) {
      console.error('Error in /api/category:', error);
      res.status(500).json({ error: 'Failed to fetch category data' });
    }
  });

  // Albums browse list (by year or latest)
  app.get('/api/albums', async (req, res) => {
    try {
      const year = req.query.year as string | undefined;
      const page = parseInt((req.query.page as string) || '1', 10);
      const data = await fetchAlbums(year, page);
      res.json(data);
    } catch (error) {
      console.error('Error in /api/albums:', error);
      res.status(500).json({ error: 'Failed to fetch albums' });
    }
  });

  // Single album details & tracklist
  app.get('/api/album', async (req, res) => {
    try {
      const id = req.query.id as string;
      if (!id) {
        return res.status(400).json({ error: 'Album ID is required' });
      }
      const data = await fetchAlbum(id);
      res.json(data);
    } catch (error) {
      console.error('Error in /api/album:', error);
      res.status(500).json({ error: 'Failed to fetch album details' });
    }
  });

  // Single singer details, discography & songs
  app.get('/api/singer', async (req, res) => {
    try {
      const id = req.query.id as string;
      if (!id) {
        return res.status(400).json({ error: 'Singer ID is required' });
      }
      const data = await fetchSinger(id);
      res.json(data);
    } catch (error) {
      console.error('Error in /api/singer:', error);
      res.status(500).json({ error: 'Failed to fetch singer details' });
    }
  });

  // Song details & resolved audio stream
  app.get('/api/song', async (req, res) => {
    try {
      const id = req.query.id as string;
      if (!id) {
        return res.status(400).json({ error: 'Song ID is required' });
      }
      const data = await fetchSong(id);
      res.json(data);
    } catch (error) {
      console.error('Error in /api/song:', error);
      res.status(500).json({ error: 'Failed to fetch song details' });
    }
  });

  // Search query
  app.get('/api/search', async (req, res) => {
    try {
      const q = (req.query.q as string) || '';
      const data = await searchAlbumaty(q);
      res.json(data);
    } catch (error) {
      console.error('Error in /api/search:', error);
      res.status(500).json({ error: 'Search failed' });
    }
  });

  // Suggested tracks for artist (continuous playback / autoplay)
  app.get('/api/suggested', async (req, res) => {
    try {
      const songId = req.query.songId as string | undefined;
      const artistId = req.query.artistId as string | undefined;
      const artist = req.query.artist as string | undefined;

      const data = await fetchSuggestedForArtist(songId, artistId, artist);
      res.json(data);
    } catch (error) {
      console.error('Error in /api/suggested:', error);
      res.status(500).json({ error: 'Failed to fetch suggested tracks', songs: [] });
    }
  });

  // Audio Streaming Proxy with HTTP Range Requests support
  app.get('/api/stream', async (req, res) => {
    try {
      let targetUrl = req.query.url as string | undefined;
      const songId = req.query.songId as string | undefined;

      if (!targetUrl && songId) {
        const songData = await fetchSong(songId);
        targetUrl = songData.audioUrl;
      }

      if (!targetUrl) {
        return res.status(404).send('No audio URL or valid songId provided');
      }

      // Ensure HTTPS and proper URI encoding for non-ASCII Arabic paths
      if (targetUrl.startsWith('http://')) {
        targetUrl = targetUrl.replace(/^http:\/\//, 'https://');
      }
      try {
        targetUrl = encodeURI(decodeURI(targetUrl));
      } catch {
        // preserve as is if decode fails
      }

      const headers: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.albumaty.com/',
      };

      if (req.headers.range) {
        headers['Range'] = req.headers.range;
      }

      const audioResponse = await fetch(targetUrl, {
        headers,
        redirect: 'follow',
      });

      if (!audioResponse.ok && audioResponse.status !== 206) {
        return res.status(audioResponse.status).send(`Failed to stream audio: ${audioResponse.statusText}`);
      }

      // Relay essential audio headers
      res.status(audioResponse.status);
      res.setHeader('Content-Type', audioResponse.headers.get('content-type') || 'audio/mpeg');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('Access-Control-Allow-Origin', '*');

      const contentLength = audioResponse.headers.get('content-length');
      if (contentLength) {
        res.setHeader('Content-Length', contentLength);
      }

      const contentRange = audioResponse.headers.get('content-range');
      if (contentRange) {
        res.setHeader('Content-Range', contentRange);
      }

      const cacheControl = audioResponse.headers.get('cache-control');
      if (cacheControl) {
        res.setHeader('Cache-Control', cacheControl);
      } else {
        res.setHeader('Cache-Control', 'public, max-age=86400');
      }

      if (audioResponse.body) {
        const reader = audioResponse.body.getReader();
        let isClosed = false;

        req.on('close', () => {
          isClosed = true;
          try {
            reader.cancel().catch(() => {});
          } catch {}
        });

        const pump = async () => {
          while (!isClosed) {
            const { done, value } = await reader.read();
            if (done || isClosed) break;
            res.write(value);
          }
          if (!isClosed) {
            res.end();
          }
        };
        pump().catch(err => {
          if (!isClosed) {
            console.error('Error streaming audio pump:', err);
            res.end();
          }
        });
      } else {
        res.end();
      }
    } catch (error) {
      console.error('Streaming proxy error:', error);
      if (!res.headersSent) {
        res.status(500).send('Error streaming audio file');
      }
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
