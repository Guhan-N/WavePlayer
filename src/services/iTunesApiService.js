/**
 * iTunes Music API Service - Provides global music search across all languages
 * including Tamil, Hindi, Pop, Rock, Classical with HTML5 audio preview streams.
 */

const ITUNES_BASE_URL = 'https://itunes.apple.com/search';

/**
 * Normalizes iTunes API item into application standard Song schema
 */
export function normalizeITunesTrack(item) {
  if (!item || !item.trackId || !item.previewUrl) return null;

  // Upgrade low-res artwork to 600x600 resolution
  const artwork = item.artworkUrl100
    ? item.artworkUrl100.replace('100x100bb', '600x600bb')
    : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&q=80';

  return {
    id: `itunes_${item.trackId}`,
    title: item.trackName || 'Untitled Track',
    artist: item.artistName || 'Unknown Artist',
    album: item.collectionName || '',
    thumbnail: artwork,
    audioUrl: item.previewUrl,
    duration: Math.floor((item.trackTimeMillis || 30000) / 1000),
    genre: item.primaryGenreName || 'Music',
    releaseDate: item.releaseDate ? item.releaseDate.split('T')[0] : '',
    source: 'itunes',
  };
}

export const iTunesApiService = {
  /**
   * Search songs using iTunes Search API
   */
  async searchSongs(query, limit = 30) {
    if (!query || !query.trim()) return [];

    try {
      const url = `${ITUNES_BASE_URL}?term=${encodeURIComponent(query.trim())}&media=music&entity=song&limit=${limit}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`iTunes HTTP ${res.status}`);

      const json = await res.json();
      if (json.results && Array.isArray(json.results)) {
        return json.results.map(normalizeITunesTrack).filter(Boolean);
      }
    } catch (err) {
      console.warn('iTunes API search failed:', err);
    }
    return [];
  },

  /**
   * Search artists using iTunes Search API
   */
  async searchArtists(query, limit = 10) {
    if (!query || !query.trim()) return [];

    try {
      const url = `${ITUNES_BASE_URL}?term=${encodeURIComponent(query.trim())}&media=music&entity=musicArtist&limit=${limit}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`iTunes Artist Search HTTP ${res.status}`);

      const json = await res.json();
      if (json.results && Array.isArray(json.results)) {
        return json.results.map(artist => ({
          id: `itunes_artist_${artist.artistId}`,
          title: artist.artistName,
          genre: artist.primaryGenreName || 'Artist',
          artistUrl: artist.artistLinkUrl || '',
          source: 'itunes',
        }));
      }
    } catch (err) {
      console.warn('iTunes artist search failed:', err);
    }
    return [];
  }
};
