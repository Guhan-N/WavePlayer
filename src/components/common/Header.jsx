import React, { useState, useEffect } from 'react';
import { Search, HardDrive, Sparkles, Link } from 'lucide-react';
import { useLibrary } from '../../context/LibraryContext';
import { isAudiusUrl } from '../../services/audiusApiService';

export const Header = ({ onNavigate, currentTab, onSearchSubmit, searchQuery = '' }) => {
  const { metrics } = useLibrary();
  const [localQuery, setLocalQuery] = useState(searchQuery);

  useEffect(() => {
    setLocalQuery(searchQuery);
  }, [searchQuery]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (localQuery.trim()) {
      onSearchSubmit(localQuery.trim());
      onNavigate('search');
    }
  };

  const isLink = isAudiusUrl(localQuery);

  return (
    <header className="header">
      <div className="header-greeting">
        <h2>
          {getGreeting()},{' '}
          <span className="heading-gradient">Music Lover</span>
        </h2>
        <div className="header-subtitle">
          <HardDrive size={13} />
          <span>Local Library &bull; {metrics.playlistsCount} Playlists &bull; {metrics.favouritesCount} Favourites</span>
        </div>
      </div>

      <form className="header-search-form" onSubmit={handleSearchSubmit}>
        <div className="search-input-wrapper">
          {isLink ? (
            <Link size={18} className="search-icon text-indigo-400" />
          ) : (
            <Search size={18} className="search-icon" />
          )}
          <input
            type="text"
            className="search-bar-input"
            placeholder="Search exact song words, Tamil artists, iTunes, Audius..."
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
          />
        </div>
      </form>

      <div className="header-actions">
        <button
          className="btn-secondary header-badge-btn"
          onClick={() => onNavigate('importexport')}
          title="Export / Import your music library"
        >
          <Sparkles size={16} className="text-amber-400" />
          <span className="hidden-mobile">Transfer Library</span>
        </button>
      </div>
    </header>
  );
};
