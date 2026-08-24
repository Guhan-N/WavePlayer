/**
 * Audius API Service - Powered by Audius Open Audio Protocol (https://api.audius.co/v1)
 * REST access to tracks, trending music, search, artists, and direct HTML5 audio streaming.
 */

const AUDIUS_BASE_URL = 'https://api.audius.co/v1';
const APP_NAME = 'MUSIC_APP';

const FALLBACK_THUMBNAIL = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&q=80';

/**
 * Normalizes Audius API track object into standard application song schema
 */
export function normalizeAudiusTrack(track) {
  if (!track) return null;

  const artwork =
    track.artwork?.['480x480'] ||
    track.artwork?.['150x150'] ||
    track.artwork?.['1000x1000'] ||
    track.user?.profile_picture?.['480x480'] ||
    track.user?.profile_picture?.['150x150'] ||
    FALLBACK_THUMBNAIL;

  const trackId = track.id || track.track_id;
  const streamUrl = `${AUDIUS_BASE_URL}/tracks/${trackId}/stream?app_name=${APP_NAME}`;

  return {
    id: trackId,
    title: track.title || 'Untitled Track',
    artist: track.user?.name || track.user?.handle || 'Audius Artist',
    artistHandle: track.user?.handle || '',
    thumbnail: artwork,
    audioUrl: streamUrl,
    duration: Math.floor(track.duration || 180),
    genre: track.genre || 'Electronic',
    mood: track.mood || '',
    playCount: track.play_count || 0,
    favoriteCount: track.favorite_count || 0,
    repostCount: track.repost_count || 0,
    permalink: track.permalink || '',
    source: 'audius',
  };
}

/**
 * Helper to check if string is an Audius canonical URL (e.g. audius.co/artist/track)
 */
export function isAudiusUrl(urlStr) {
  if (!urlStr || typeof urlStr !== 'string') return false;
  const trimmed = urlStr.trim();
  return (
    trimmed.includes('audius.co/') ||
    trimmed.includes('api.audius.co/')
  );
}

export const audiusApiService = {
  /**
   * Fetch Trending Tracks from Audius
   */
  async getTrendingTracks({ genre = '', time = 'week', limit = 30 } = {}) {
    try {
      let url = `${AUDIUS_BASE_URL}/tracks/trending?app_name=${APP_NAME}&limit=${limit}&time=${time}`;
      if (genre && genre !== 'Trending') {
        url += `&genre=${encodeURIComponent(genre)}`;
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error(`Audius HTTP Error ${res.status}`);

      const json = await res.json();
      if (json.data && Array.isArray(json.data)) {
        return json.data.map(normalizeAudiusTrack).filter(Boolean);
      }
    } catch (err) {
      console.warn('Audius trending tracks fetch error:', err);
    }
    return [];
  },

  /**
   * Search Tracks on Audius
   */
  async searchSongs(query, limit = 30) {
    if (!query || !query.trim()) {
      return { items: await this.getTrendingTracks({ limit }) };
    }

    const trimmed = query.trim();

    // Check direct Audius URL
    if (isAudiusUrl(trimmed)) {
      const resolvedTrack = await this.resolveAudiusUrl(trimmed);
      if (resolvedTrack) {
        return { items: [resolvedTrack], isDirectLink: true };
      }
    }

    try {
      const url = `${AUDIUS_BASE_URL}/tracks/search?query=${encodeURIComponent(trimmed)}&limit=${limit}&app_name=${APP_NAME}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Audius Search Error ${res.status}`);

      const json = await res.json();
      if (json.data && Array.isArray(json.data)) {
        const songs = json.data.map(normalizeAudiusTrack).filter(Boolean);
        return { items: songs };
      }
    } catch (err) {
      console.warn('Audius search error:', err);
    }

    return { items: [] };
  },

  /**
   * Get Tracks by Genre
   */
  async getSongsByGenre(genre, limit = 30) {
    if (!genre || genre === 'Trending') {
      return this.getTrendingTracks({ limit });
    }
    return this.getTrendingTracks({ genre, limit });
  },

  /**
   * Get Single Track by ID
   */
  async getTrackById(trackId) {
    try {
      const url = `${AUDIUS_BASE_URL}/tracks/${trackId}?app_name=${APP_NAME}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Audius Track Error ${res.status}`);

      const json = await res.json();
      if (json.data) {
        return normalizeAudiusTrack(json.data);
      }
    } catch (err) {
      console.warn('Audius getTrackById error:', err);
    }
    return null;
  },

  /**
   * Search Users / Artists on Audius
   */
  async searchArtists(query, limit = 10) {
    if (!query || !query.trim()) return [];
    try {
      const url = `${AUDIUS_BASE_URL}/users/search?query=${encodeURIComponent(query)}&limit=${limit}&app_name=${APP_NAME}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Audius Users Search Error ${res.status}`);

      const json = await res.json();
      if (json.data && Array.isArray(json.data)) {
        return json.data.map(user => ({
          id: user.id,
          title: user.name || user.handle,
          handle: user.handle,
          thumbnail: user.profile_picture?.['480x480'] || user.profile_picture?.['150x150'] || FALLBACK_THUMBNAIL,
          bio: user.bio || '',
          followerCount: user.follower_count || 0,
          trackCount: user.track_count || 0,
        }));
      }
    } catch (err) {
      console.warn('Audius searchArtists error:', err);
    }
    return [];
  },

  /**
   * Get Top Users / Artists
   */
  async getTopArtists(limit = 10) {
    try {
      const url = `${AUDIUS_BASE_URL}/users/top?limit=${limit}&app_name=${APP_NAME}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Audius Top Users Error ${res.status}`);

      const json = await res.json();
      if (json.data && Array.isArray(json.data)) {
        return json.data.map(user => ({
          id: user.id,
          title: user.name || user.handle,
          handle: user.handle,
          thumbnail: user.profile_picture?.['480x480'] || user.profile_picture?.['150x150'] || FALLBACK_THUMBNAIL,
          bio: user.bio || '',
          followerCount: user.follower_count || 0,
          trackCount: user.track_count || 0,
        }));
      }
    } catch (err) {
      console.warn('Audius top artists error:', err);
    }
    return [];
  },

  /**
   * Resolve canonical Audius URL to Track object
   */
  async resolveAudiusUrl(audiusUrl) {
    try {
      const url = `${AUDIUS_BASE_URL}/resolve?url=${encodeURIComponent(audiusUrl)}&app_name=${APP_NAME}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Audius Resolve Error ${res.status}`);

      const json = await res.json();
      if (json.data) {
        return normalizeAudiusTrack(json.data);
      }
    } catch (err) {
      console.warn('Audius resolve URL error:', err);
    }
    return null;
  },
};
