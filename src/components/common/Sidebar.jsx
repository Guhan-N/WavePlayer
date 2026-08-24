import React from 'react';
import {
  Home,
  Search,
  Library,
  Heart,
  History,
  ArrowRightLeft,
  Settings,
  Plus,
  Music,
  ListMusic,
  Disc3,
} from 'lucide-react';
import { useLibrary } from '../../context/LibraryContext';

export const Sidebar = ({ currentTab, onNavigate, onOpenCreatePlaylist }) => {
  const { playlists } = useLibrary();

  const mainNavItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'library', label: 'Your Library', icon: Library },
    { id: 'favourites', label: 'Favourites', icon: Heart },
    { id: 'history', label: 'Recently Played', icon: History },
    { id: 'importexport', label: 'Import & Export', icon: ArrowRightLeft },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="sidebar-brand" onClick={() => onNavigate('home')}>
        <div className="brand-logo">
          <Disc3 size={24} className="brand-logo-icon spinning-art" />
        </div>
        <div className="brand-text">
          <span className="brand-title">WavePlayer</span>
          <span className="brand-badge">Local</span>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="sidebar-nav">
        <div className="nav-section-title">MENU</div>
        {mainNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => onNavigate(item.id)}
            >
              <Icon size={20} className="nav-icon" />
              <span className="nav-label">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User Playlists Section */}
      <div className="sidebar-playlists-section">
        <div className="playlists-section-header">
          <span className="nav-section-title">YOUR PLAYLISTS</span>
          <button
            className="btn-icon btn-add-playlist"
            onClick={onOpenCreatePlaylist}
            title="Create Playlist"
          >
            <Plus size={18} />
          </button>
        </div>

        <div className="sidebar-playlists-list">
          {playlists.length === 0 ? (
            <div className="sidebar-empty-playlists" onClick={onOpenCreatePlaylist}>
              <Plus size={14} />
              <span>Create your first playlist</span>
            </div>
          ) : (
            playlists.map((pl) => {
              const isSelected = currentTab === `playlist_${pl.id}`;
              return (
                <button
                  key={pl.id}
                  className={`playlist-item ${isSelected ? 'active' : ''}`}
                  onClick={() => onNavigate(`playlist_${pl.id}`)}
                >
                  <ListMusic size={16} className="playlist-item-icon" />
                  <span className="playlist-item-name">{pl.name}</span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </aside>
  );
};
