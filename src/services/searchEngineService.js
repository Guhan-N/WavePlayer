/**
 * Multi-Source Unified Search Engine
 * Features: Tokenized Word Matching, Relevance Scoring, Local Library Search, 100% Full Song Filtering.
 */
import { youtubeService } from './youtubeService';
import { audiusApiService } from './audiusApiService';

// LRU Search Query Memory Cache
const searchCache = new Map();
const MAX_SEARCH_CACHE_SIZE = 50;

/**
 * Tokenizes search query into lowercase word tokens
 */

/**
 * Calculates relevance score for a song based on title
 */
export function calculateRelevanceScore(song, queryTokens, rawQuery) {
  if (!song || !queryTokens || queryTokens.length === 0) return 0;

  let score = 0;
  const title = (song.title || '').toLowerCase();
  const normalizedQuery = (rawQuery || '').toLowerCase().trim();

  // 1. Title Exact & Prefix match
  if (title === normalizedQuery) {
    score += 100;
  } else if (title.startsWith(normalizedQuery)) {
    score += 80;
  } else if (title.includes(normalizedQuery)) {
    score += 60;
  }

  // 2. Tokenized word boundary matching
  queryTokens.forEach((token) => {
    const wordBoundaryRegex = new RegExp(`\\b${token}\\b`, 'i');
    const matchesTitleWord = wordBoundaryRegex.test(title);

    if (matchesTitleWord) {
      score += 40;
    } else if (title.includes(token)) {
      score += 20;
    }
  });

  return score;
}

/**
 * Checks if query tokens strictly match exact words in song title
 */
export function isExactWordMatch(song, queryTokens) {
  if (!song || !queryTokens || queryTokens.length === 0) return false;

  const title = (song.title || '').toLowerCase();

  return queryTokens.every((token) => {
    const wordBoundaryRegex = new RegExp(`\\b${token}\\b`, 'i');
    return wordBoundaryRegex.test(title);
  });
}

/**
 * Normalizes title for deduplication
 */
export function getSongSignature(song) {
  if (!song) return '';
  const normTitle = (song.title || '').toLowerCase().replace(/[^\w]/g, '');
  return normTitle;
}

export const searchEngineService = {
  /**
   * Unified Search method
   */
  async searchAll(query, localTracks = []) {
    if (!query || !query.trim()) {
      return {
        songs: [],
        exactMatches: [],
        localMatches: [],
        queryTokens: [],
      };
    }

    const trimmedQuery = query.trim();
    const tokens = trimmedQuery.toLowerCase().split(/\s+/).filter(Boolean);
    const cacheKey = trimmedQuery.toLowerCase();

    if (searchCache.has(cacheKey)) {
      return searchCache.get(cacheKey);
    }

    // Query YouTube Full Movie Songs & Audius Full Tracks concurrently
    const [youtubeSongs, audiusRes] = await Promise.all([
      youtubeService.searchSongs(trimmedQuery, 20),
      audiusApiService.searchSongs(trimmedQuery, 20),
    ]);

    const audiusSongs = audiusRes.items || [];

    // Filter matching tracks from local user library
    const normalizedLocal = (localTracks || []).map(track => ({
      ...track,
      isLocal: true,
      source: track.source || 'local',
    }));

    const matchingLocalSongs = normalizedLocal.filter(song => {
      return calculateRelevanceScore(song, tokens, trimmedQuery) > 0;
    });

    // Combine ONLY 100% Full Songs (YouTube + Audius + Local)
    const rawCandidates = [
      ...matchingLocalSongs,
      ...(youtubeSongs || []),
      ...audiusSongs,
    ].filter(song => song.source !== 'itunes');

    // Deduplicate songs by normalized signature
    const seenSignatures = new Set();
    const deduplicatedSongs = [];

    rawCandidates.forEach((song) => {
      const sig = getSongSignature(song);
      if (!sig) {
        deduplicatedSongs.push(song);
        return;
      }
      if (!seenSignatures.has(sig)) {
        seenSignatures.add(sig);
        deduplicatedSongs.push(song);
      }
    });

    // Calculate score & filter matching full tracks
    const scoredSongs = deduplicatedSongs
      .map((song) => {
        const score = calculateRelevanceScore(song, tokens, trimmedQuery);
        const exactMatch = isExactWordMatch(song, tokens);
        return { ...song, relevanceScore: score, isExactMatch: exactMatch };
      })
      .filter((song) => song.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Subsets
    const exactMatches = scoredSongs.filter((song) => song.isExactMatch);
    const localMatches = scoredSongs.filter((song) => song.isLocal);

    const resultObj = {
      songs: scoredSongs,
      exactMatches,
      localMatches,
      queryTokens: tokens,
    };

    // Store in LRU cache
    if (searchCache.size >= MAX_SEARCH_CACHE_SIZE) {
      const firstKey = searchCache.keys().next().value;
      searchCache.delete(firstKey);
    }
    searchCache.set(cacheKey, resultObj);

    return resultObj;
  },
};
