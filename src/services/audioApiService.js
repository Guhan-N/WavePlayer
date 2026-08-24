/**
 * Pure Audio API Service - Powered by Audius Open Audio Protocol Catalog
 * Native HTML5 Audio streams directly from Audius decentralised content network.
 */
import { audiusApiService, isAudiusUrl } from './audiusApiService';

export { isAudiusUrl as isAudioUrl };

export const audioApiService = {
  /**
   * Search songs using Audius API
   */
  async searchSongs(query) {
    return audiusApiService.searchSongs(query);
  },

  /**
   * Fetch songs by genre using Audius API
   */
  async getSongsByGenre(genre) {
    return audiusApiService.getSongsByGenre(genre);
  },

  /**
   * Fetch Trending Songs for Home Page using Audius API
   */
  async getTrendingSongs() {
    return audiusApiService.getTrendingTracks({ limit: 30 });
  },
};
