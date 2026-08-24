import React, { useState, useEffect, useCallback } from 'react';
import {
  Search as SearchIcon,
  ArrowLeft,
  X,
  Sparkles,
  Flame,
  Music2,
  Heart,
  Radio,
  Disc,
  AlertCircle
} from 'lucide-react';
import { isAudiusUrl } from '../services/audiusApiService';
import { searchEngineService } from '../services/searchEngineService';
import { useLibrary } from '../context/LibraryContext';
import { SongCard } from '../components/cards/SongCard';
import { SongSkeleton } from '../components/common/Skeleton';

export const Search = ({ initialQuery = '', onNavigate, onOpenAddToPlaylistModal }) => {
  const { favourites, playlists, recentlyPlayed } = useLibrary();

  const [query, setQuery] = useState(initialQuery || '');
  const [activeTab, setActiveTab] = useState('songs');

  const [songResults, setSongResults] = useState([]);
  const [exactMatches, setExactMatches] = useState([]);
  const [localMatches, setLocalMatches] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (initialQuery !== undefined) {
      setQuery(initialQuery);
    }
  }, [initialQuery]);

  const getLocalTracks = useCallback(() => {
    const playlistSongs = playlists.flatMap((p) => p.songs || []);
    return [...favourites, ...playlistSongs, ...recentlyPlayed];
  }, [favourites, playlists, recentlyPlayed]);

  const performSearch = useCallback(async (searchQuery) => {
    if (!searchQuery || !searchQuery.trim()) {
      setSongResults([]);
      setExactMatches([]);
      setLocalMatches([]);
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const localTracks = getLocalTracks();
      const results = await searchEngineService.searchAll(searchQuery, localTracks);

      setSongResults(results.songs || []);
      setExactMatches(results.exactMatches || []);
      setLocalMatches(results.localMatches || []);
    } catch (err) {
      console.error('Search engine failed:', err);
      setError('Unable to fetch search results. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  }, [getLocalTracks]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (query.trim()) {
        performSearch(query.trim());
      } else {
        setSongResults([]);
        setExactMatches([]);
        setLocalMatches([]);
      }
    }, 150);
    return () => clearTimeout(handler);
  }, [query, performSearch]);

  const handleQueryChange = (e) => {
    setQuery(e.target.value);
  };

  const handleClear = () => {
    setQuery('');
  };

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion);
  };

  const isLink = isAudiusUrl(query);

  const filterTabs = [
    { id: 'songs', label: 'Songs' },
    { id: 'exact', label: 'Exact Matches' },
    { id: 'local', label: 'Local Library' },
  ];

  const exploreCategories = [
    { name: 'Tamil Movie Songs', icon: Music2, gradient: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)', query: 'Tamil Movie Full Songs' },
    { name: 'Trending Hits 2026', icon: Flame, gradient: 'linear-gradient(135deg, #f97316 0%, #e11d48 100%)', query: 'Latest Trending Tamil Songs' },
    { name: 'Lo-Fi & Chill', icon: Radio, gradient: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)', query: 'Tamil Lofi Slowed Reverb' },
    { name: 'Romantic Melodies', icon: Heart, gradient: 'linear-gradient(135deg, #f43f5e 0%, #fb7185 100%)', query: 'Tamil Romantic Melody Songs' },
  ];

  const popularTags = [
    'Rowdy Baby',
    'Arabic Kuthu',
    'Jimikki Ponnu',
    'Beast Track',
    'Anirudh Hits',
    'AR Rahman Melodies',
    'Acoustic & Unplugged',
    'Lo-Fi Remix',
  ];

  const getDisplayedSongs = () => {
    if (activeTab === 'exact') return exactMatches;
    if (activeTab === 'local') return localMatches;
    return songResults;
  };

  const displayedSongs = getDisplayedSongs();

  return (
    <div className="page-content search-page-container animate-fade-in">
      {/* Top Mobile & Desktop Search Field */}
      <div className="search-header-box">
        {onNavigate && (
          <button className="btn-icon back-btn" onClick={() => onNavigate('home')} title="Back to Home">
            <ArrowLeft size={22} className="text-white" />
          </button>
        )}
        <div className="search-input-capsule">
          <SearchIcon size={20} className="search-icon-pink" />
          <input
            type="text"
            className="search-main-input"
            placeholder="Search songs, full movie tracks..."
            value={query}
            onChange={handleQueryChange}
            autoFocus
          />
          {query && (
            <button className="search-clear-btn" onClick={handleClear} title="Clear Search">
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {isLink && (
        <div className="audius-detected-banner animate-fade-in">
          <Sparkles size={16} className="text-pink-400" />
          <span>Audius Stream URL detected! Stream ready.</span>
        </div>
      )}

      {/* Filter Tabs Bar */}
      <div className="search-chips-row">
        {filterTabs.map((tab) => (
          <button
            key={tab.id}
            className={`search-tab-chip ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Search View States */}
      {loading ? (
        <SongSkeleton count={8} />
      ) : error ? (
        <div className="glass-card error-card">
          <AlertCircle size={40} className="text-rose-400 mb-2" />
          <h3>Search Error</h3>
          <p>{error}</p>
          <button className="btn-primary mt-3" onClick={() => performSearch(query)}>
            Retry Search
          </button>
        </div>
      ) : !query.trim() ? (
        <div className="pre-search-view animate-fade-in">
          {/* Explore Quick Categories */}
          <div className="explore-section">
            <h3 className="explore-section-title">Explore Categories</h3>
            <div className="explore-grid">
              {exploreCategories.map((cat, idx) => {
                const IconComp = cat.icon;
                return (
                  <div
                    key={`cat_${idx}`}
                    className="explore-card"
                    style={{ background: cat.gradient }}
                    onClick={() => handleSuggestionClick(cat.query)}
                  >
                    <IconComp size={24} className="explore-card-icon" />
                    <span className="explore-card-name">{cat.name}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Popular Searches Section */}
          <div className="popular-section mt-6">
            <h3 className="popular-section-title">Popular Searches</h3>
            <div className="popular-tags-wrap">
              {popularTags.map((tag) => (
                <button
                  key={tag}
                  className="popular-tag-btn"
                  onClick={() => handleSuggestionClick(tag)}
                >
                  <Sparkles size={13} className="text-pink-400 opacity-80" />
                  <span>{tag}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : displayedSongs.length === 0 ? (
        <div className="empty-search-results glass-card">
          <Disc size={48} className="text-slate-500 mb-3 mx-auto opacity-60" />
          <h3>No Songs Found</h3>
          <p>No matching tracks for "{query}". Try checking the spelling or search another keyword.</p>
        </div>
      ) : (
        <div className="search-results-list">
          {displayedSongs.map((song, idx) => (
            <SongCard
              key={`search_${song.id || song.audioUrl}_${idx}`}
              song={song}
              queueList={displayedSongs}
              index={idx}
              layout="row"
              onOpenAddToPlaylistModal={onOpenAddToPlaylistModal}
            />
          ))}
        </div>
      )}
    </div>
  );
};
