import React, { useState } from 'react';
import { ListMusic, Heart, History, Plus, Settings } from 'lucide-react';
import { useLibrary } from '../context/LibraryContext';
import { PlaylistCard } from '../components/cards/PlaylistCard';
import { SongCard } from '../components/cards/SongCard';

export const Library = ({ onNavigate, onOpenCreatePlaylist, onOpenAddToPlaylistModal }) => {
  const { playlists, favourites, recentlyPlayed } = useLibrary();
  const [activeTab, setActiveTab] = useState('playlists'); // 'playlists' | 'favourites' | 'history'

  return (
    <div className="page-content library-container animate-fade-in">
      {/* Perfectly Aligned Header */}
      <div className="library-header-clean">
        <div className="library-header-top flex items-center justify-between gap-2">
          <h1 className="library-title text-2xl md:text-3xl font-extrabold text-white">Your Music Library</h1>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button className="btn-icon header-settings-btn" onClick={() => onNavigate('settings')} title="Settings">
              <Settings size={20} className="text-slate-300" />
            </button>
            <button
              className="home-create-banner-btn flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-full"
              onClick={onOpenCreatePlaylist}
            >
              <Plus size={15} /> Create Playlist
            </button>
          </div>
        </div>
        <p className="library-subtext text-xs md:text-sm text-slate-400 mt-1 mb-4">
          Manage playlists, saved favourites, and playback history stored on this device.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="library-chips-row flex items-center gap-2 overflow-x-auto pb-2 mb-6">
        <button
          className={`search-tab-chip ${activeTab === 'playlists' ? 'active' : ''}`}
          onClick={() => setActiveTab('playlists')}
        >
          <ListMusic size={14} className="inline mr-1.5" /> Playlists ({playlists.length})
        </button>
        <button
          className={`search-tab-chip ${activeTab === 'favourites' ? 'active' : ''}`}
          onClick={() => setActiveTab('favourites')}
        >
          <Heart size={14} className="inline mr-1.5" /> Favourites ({favourites.length})
        </button>
        <button
          className={`search-tab-chip ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <History size={14} className="inline mr-1.5" /> History ({recentlyPlayed.length})
        </button>
      </div>

      {/* Content Sections */}
      {activeTab === 'playlists' && (
        <section className="library-section">
          {playlists.length === 0 ? (
            <div className="empty-state glass-card p-6 text-center">
              <ListMusic size={48} className="text-pink-500 mx-auto mb-3 opacity-80" />
              <h3 className="text-lg font-bold text-white mb-1">No Playlists Created</h3>
              <p className="text-xs text-slate-400 mb-4">Create custom playlists to organize your favorite music tracks.</p>
              <button className="home-create-banner-btn px-4 py-2 text-xs font-bold rounded-full" onClick={onOpenCreatePlaylist}>
                + Create Playlist
              </button>
            </div>
          ) : (
            <div className="cards-grid">
              {playlists.map((pl) => (
                <PlaylistCard
                  key={pl.id}
                  playlist={pl}
                  onClick={() => onNavigate(`playlist_${pl.id}`)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === 'favourites' && (
        <section className="library-section">
          {favourites.length === 0 ? (
            <div className="empty-state glass-card p-6 text-center">
              <Heart size={48} className="text-pink-500 mx-auto mb-3 opacity-80" />
              <h3 className="text-lg font-bold text-white mb-1">No Favourites Saved</h3>
              <p className="text-xs text-slate-400">Click the heart icon on any song to save it to your favourites.</p>
            </div>
          ) : (
            <div className="recent-songs-row flex flex-col gap-1.5">
              {favourites.map((song, idx) => (
                <SongCard
                  key={`fav_${song.id || song.audioUrl}_${idx}`}
                  song={song}
                  queueList={favourites}
                  index={idx}
                  layout="row"
                  onOpenAddToPlaylistModal={onOpenAddToPlaylistModal}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === 'history' && (
        <section className="library-section">
          {recentlyPlayed.length === 0 ? (
            <div className="empty-state glass-card p-6 text-center">
              <History size={48} className="text-pink-500 mx-auto mb-3 opacity-80" />
              <h3 className="text-lg font-bold text-white mb-1">No Playback History</h3>
              <p className="text-xs text-slate-400">Listen to music to view your recently played tracks here.</p>
            </div>
          ) : (
            <div className="recent-songs-row flex flex-col gap-1.5">
              {recentlyPlayed.map((song, idx) => (
                <SongCard
                  key={`recent_${song.id || song.audioUrl}_${idx}`}
                  song={song}
                  queueList={recentlyPlayed}
                  index={idx}
                  layout="row"
                  onOpenAddToPlaylistModal={onOpenAddToPlaylistModal}
                />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
