/**
 * Unified Global Music Search Service
 */
import { searchEngineService } from './searchEngineService.js';
import { audiusApiService } from './audiusApiService.js';

export const musicApiService = {
  async searchAllMusic(query, localTracks = []) {
    if (!query || !query.trim()) {
      return { songs: [], exactMatches: [], localMatches: [] };
    }
    return searchEngineService.searchAll(query, localTracks);
  },

  async getGenreMusic(genre) {
    return audiusApiService.getSongsByGenre(genre);
  },

  async getTrendingHits() {
    return audiusApiService.getTrendingTracks();
  },
};
