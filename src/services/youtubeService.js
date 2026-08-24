/**
 * YouTube API Service - High-Speed 100% full-length movie song resolution
 * Uses Parallel Instance Racing + LRU Memory Cache for instant loading.
 */

const YOUTUBE_API_KEY = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_YOUTUBE_API_KEY) || 'AIzaSyAIqEvY0FedTuIpyTcqzAnS-c5aMMm5HPE';
const YOUTUBE_BASE_URL = 'https://www.googleapis.com/youtube/v3';

const FALLBACK_INSTANCES = [
  'https://invidious.flokinet.to/api/v1/search',
  'https://invidious.io.lol/api/v1/search',
  'https://vid.puffyan.us/api/v1/search',
  'https://invidious.drgns.space/api/v1/search'
];

// In-memory high-speed cache
const ytCache = new Map();
const audioStreamCache = new Map();

/**
 * Normalizes YouTube video item into standard application Song schema
 */
export function normalizeYouTubeVideo(item) {
  if (!item) return null;

  const videoId = item.id?.videoId || (typeof item.id === 'string' ? item.id : item.videoId || null);
  if (!videoId) return null;

  const snippet = item.snippet || {};
  const thumbnail =
    snippet.thumbnails?.medium?.url ||
    snippet.thumbnails?.high?.url ||
    item.videoThumbnails?.[0]?.url ||
    `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  const title = (snippet.title || item.title || 'YouTube Song')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"');

  const artist = (snippet.channelTitle || item.author || 'YouTube Music')
    .replace('VEVO', '')
    .replace('Official', '')
    .trim();

  return {
    id: `yt_${videoId}`,
    youtubeVideoId: videoId,
    title: title,
    artist: artist,
    album: 'YouTube Full Track',
    thumbnail: thumbnail,
    audioUrl: `https://www.youtube.com/watch?v=${videoId}`,
    duration: item.lengthSeconds || 240,
    genre: 'Movie Song',
    source: 'youtube',
    isYouTube: true,
  };
}

/**
 * Fetch direct playable audio stream URL for a YouTube video
 * Raced parallel execution across 11 high-availability Piped & Invidious stream endpoints
 * This allows playing YouTube tracks via native Android MediaPlayer for 100% background playback
 */
export async function getDirectAudioUrl(videoId) {
  if (!videoId) return null;
  const cleanId = videoId.replace('yt_', '');

  if (audioStreamCache.has(cleanId)) {
    return audioStreamCache.get(cleanId);
  }

  const pipedEndpoints = [
    `https://pipedapi.kavin.rocks/streams/${cleanId}`,
    `https://api.piped.private.coffee/streams/${cleanId}`,
    `https://pipedapi.mha.fi/streams/${cleanId}`,
    `https://pipedapi.adminforge.de/streams/${cleanId}`,
    `https://pipedapi.astral.autistici.org/streams/${cleanId}`
  ];

  const invidiousEndpoints = [
    `https://invidious.flokinet.to/api/v1/videos/${cleanId}`,
    `https://inv.tux.pizza/api/v1/videos/${cleanId}`,
    `https://invidious.nerdvpn.de/api/v1/videos/${cleanId}`,
    `https://invidious.no-feather.fr/api/v1/videos/${cleanId}`,
    `https://y.com.sb/api/v1/videos/${cleanId}`,
    `https://vid.puffyan.us/api/v1/videos/${cleanId}`
  ];

  const fetchPiped = async (url) => {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) throw new Error(`Piped HTTP ${res.status}`);
    const data = await res.json();
    if (data.audioStreams && Array.isArray(data.audioStreams) && data.audioStreams.length > 0) {
      data.audioStreams.sort((a, b) => (parseInt(b.bitrate) || 0) - (parseInt(a.bitrate) || 0));
      if (data.audioStreams[0].url) return data.audioStreams[0].url;
    }
    throw new Error('No audio stream in Piped response');
  };

  try {
    const directUrl = await Promise.any(pipedEndpoints.map(url => fetchPiped(url)));
    if (directUrl) {
      audioStreamCache.set(cleanId, directUrl);
      return directUrl;
    }
  } catch (err) {
    // try invidious fallback
  }

  const fetchInvidious = async (url) => {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) throw new Error(`Invidious HTTP ${res.status}`);
    const data = await res.json();
    if (data.adaptiveFormats && Array.isArray(data.adaptiveFormats)) {
      const audioFormats = data.adaptiveFormats.filter(f => f.type && f.type.startsWith('audio/'));
      if (audioFormats.length > 0) {
        audioFormats.sort((a, b) => (parseInt(b.bitrate) || 0) - (parseInt(a.bitrate) || 0));
        if (audioFormats[0].url) return audioFormats[0].url;
      }
    }
    if (data.formatStreams && Array.isArray(data.formatStreams) && data.formatStreams.length > 0) {
      if (data.formatStreams[0].url) return data.formatStreams[0].url;
    }
    throw new Error('No audio format in Invidious response');
  };

  try {
    const directUrl = await Promise.any(invidiousEndpoints.map(url => fetchInvidious(url)));
    if (directUrl) {
      audioStreamCache.set(cleanId, directUrl);
      return directUrl;
    }
  } catch (err) {
    // ignore
  }

  return null;
}

/**
 * Parallel Raced Search across public Invidious instances
 */
async function fallbackYouTubeSearch(query, limit = 15) {
  const fetchInstance = async (baseUrl) => {
    const url = `${baseUrl}?q=${encodeURIComponent(query)}&type=video`;
    const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) throw new Error('Empty dataset');
    return data;
  };

  try {
    const rawItems = await Promise.any(FALLBACK_INSTANCES.map(url => fetchInstance(url)));
    if (Array.isArray(rawItems)) {
      return rawItems.slice(0, limit).map(item => normalizeYouTubeVideo({
        id: { videoId: item.videoId },
        videoId: item.videoId,
        title: item.title,
        author: item.author,
        lengthSeconds: item.lengthSeconds,
        videoThumbnails: item.videoThumbnails
      })).filter(Boolean);
    }
  } catch (err) {
    for (const baseUrl of FALLBACK_INSTANCES) {
      try {
        const url = `${baseUrl}?q=${encodeURIComponent(query)}&type=video`;
        const res = await fetch(url, { signal: AbortSignal.timeout(2500) });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            return data.slice(0, limit).map(item => normalizeYouTubeVideo({
              id: { videoId: item.videoId },
              videoId: item.videoId,
              title: item.title,
              author: item.author,
              lengthSeconds: item.lengthSeconds,
              videoThumbnails: item.videoThumbnails
            })).filter(Boolean);
          }
        }
      } catch (e) {
        // ignore individual retry error
      }
    }
  }
  return [];
}

export const youtubeService = {
  getDirectAudioUrl,

  /**
   * Search YouTube with Parallel Racing + Instant Memory Cache
   */
  async searchSongs(query, limit = 15) {
    if (!query || !query.trim()) return [];

    const searchQuery = query.trim().toLowerCase().includes('song') || query.trim().toLowerCase().includes('tamil') || query.trim().toLowerCase().includes('full')
      ? query.trim()
      : `${query.trim()} full song`;

    const cacheKey = searchQuery.toLowerCase();
    if (ytCache.has(cacheKey)) {
      return ytCache.get(cacheKey);
    }

    let songs = [];

    // Try YouTube Data API v3 first
    try {
      const url = `${YOUTUBE_BASE_URL}/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&maxResults=${limit}&key=${YOUTUBE_API_KEY}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
      
      if (res.ok) {
        const json = await res.json();
        if (json.items && Array.isArray(json.items) && json.items.length > 0) {
          songs = json.items.map(normalizeYouTubeVideo).filter(Boolean);
        }
      }
    } catch (err) {
      // ignore & fallback to raced instance search
    }

    if (songs.length === 0) {
      songs = await fallbackYouTubeSearch(searchQuery, limit);
    }

    if (songs.length > 0) {
      ytCache.set(cacheKey, songs);
      if (ytCache.size > 100) {
        const firstKey = ytCache.keys().next().value;
        ytCache.delete(firstKey);
      }
    }

    return songs;
  },

  /**
   * Get single YouTube video details
   */
  async getVideoDetails(videoId) {
    if (!videoId) return null;
    try {
      const url = `${YOUTUBE_BASE_URL}/videos?part=snippet,contentDetails&id=${videoId}&key=${YOUTUBE_API_KEY}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        const json = await res.json();
        if (json.items && json.items[0]) {
          return normalizeYouTubeVideo(json.items[0]);
        }
      }
    } catch (err) {
      // ignore
    }
    return normalizeYouTubeVideo({ id: { videoId } });
  }
};
