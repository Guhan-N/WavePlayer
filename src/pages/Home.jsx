import React, { useState, useEffect } from 'react';
import { Play, Sparkles, Heart, Menu, Search as SearchIcon, ArrowRight, ListMusic, Plus, Settings as SettingsIcon } from 'lucide-react';
import { useLibrary } from '../context/LibraryContext';
import { usePlayer } from '../context/PlayerContext';
import { getSongsInPlaylist } from '../db/indexedDBService';
import { SongCard } from '../components/cards/SongCard';

const HomePlaylistCard = ({ playlist, onNavigate }) => {
  const [songs, setSongs] = useState(playlist.songs || []);

  useEffect(() => {
    let isMounted = true;
    if (playlist.songs && playlist.songs.length > 0) {
      setSongs(playlist.songs);
    } else {
      getSongsInPlaylist(playlist.id).then((fetchedSongs) => {
        if (isMounted) setSongs(fetchedSongs || []);
      });
    }
    return () => { isMounted = false; };
  }, [playlist.id, playlist.songs, playlist.updatedAt]);

  return (
    <div
      className="playlist-pink-card cursor-pointer"
      onClick={() => onNavigate(`playlist_${playlist.id}`)}
    >
      <div className="playlist-pink-art-container">
        {songs.length >= 4 ? (
          <div className="playlist-art-grid">
            <img src={songs[0].thumbnail} alt="" />
            <img src={songs[1].thumbnail} alt="" />
            <img src={songs[2].thumbnail} alt="" />
            <img src={songs[3].thumbnail} alt="" />
          </div>
        ) : songs.length > 0 ? (
          <img src={songs[0].thumbnail} alt={playlist.name} className="playlist-pink-art" />
        ) : playlist.artwork ? (
          <img src={playlist.artwork} alt={playlist.name} className="playlist-pink-art" />
        ) : (
          <div className="playlist-art-placeholder flex items-center justify-center h-full">
            <ListMusic size={32} className="text-pink-400 opacity-60" />
          </div>
        )}
      </div>

      <div className="playlist-pink-info">
        <h4 className="playlist-pink-name">{playlist.name.toUpperCase()}</h4>
        <span className="playlist-pink-count">
          {songs.length} {songs.length === 1 ? 'SONG' : 'SONGS'}
        </span>
      </div>
    </div>
  );
};

export const Home = ({ onNavigate, onOpenAddToPlaylistModal, onOpenCreatePlaylist }) => {
  const { playlists, favourites, recentlyPlayed } = useLibrary();
  const [searchInputValue, setSearchInputValue] = useState('');

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchInputValue.trim()) {
      onNavigate(`search_${encodeURIComponent(searchInputValue.trim())}`);
    } else {
      onNavigate('search');
    }
  };

  return (
    <div className="page-content home-page-container animate-fade-in">
      {/* Top Mobile Search Header Bar (⚙️ [Search input]) */}
      <div className="home-top-search-header flex items-center justify-between gap-2">
        <button className="btn-icon hamburger-btn" onClick={() => onNavigate('settings')} title="Settings">
          <SettingsIcon size={20} className="text-slate-300" />
        </button>

        <form className="home-search-form flex-1" onSubmit={handleSearchSubmit}>
          <SearchIcon size={18} className="text-pink-500 search-magenta-icon" />
          <input
            type="text"
            className="home-search-input"
            placeholder="SONGS, FULL MOVIE TRACKS"
            value={searchInputValue}
            onChange={(e) => setSearchInputValue(e.target.value)}
            onFocus={() => onNavigate('search')}
          />
        </form>
      </div>

      {/* Section 1: YOUR PLAYLISTS (ONLY User Created Playlists) */}
      <section className="home-magenta-section">
        <div className="magenta-header">
          <h2 className="magenta-title">YOUR PLAYLISTS ({playlists.length})</h2>
        </div>

        {playlists.length === 0 ? (
          <div className="empty-playlist-banner glass-card p-4 text-center cursor-pointer" onClick={onOpenCreatePlaylist}>
            <ListMusic size={32} className="text-pink-500 mx-auto mb-2 opacity-80" />
            <h4 className="text-sm font-bold text-white mb-1">No Custom Playlists Yet</h4>
            <p className="text-xs text-slate-400 mb-3">Create your own playlist to organize your favorite songs.</p>
            <button className="home-create-banner-btn">
              + Create Playlist
            </button>
          </div>
        ) : (
          <div className="playlists-grid-2col">
            {playlists.slice(0, 4).map((pl) => (
              <HomePlaylistCard
                key={`home_pl_${pl.id}`}
                playlist={pl}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        )}
      </section>

      {/* Section 2: LAST SESSION */}
      <section className="home-magenta-section mt-6">
        <div className="magenta-header">
          <h2 className="magenta-title">LAST SESSION</h2>
        </div>

        <div className="last-session-list">
          {(recentlyPlayed.length > 0 ? recentlyPlayed : favourites).slice(0, 5).map((song, idx) => (
            <SongCard
              key={`session_${song.id || song.audioUrl}_${idx}`}
              song={song}
              queueList={recentlyPlayed.length > 0 ? recentlyPlayed : favourites}
              index={idx}
              layout="row"
              onOpenAddToPlaylistModal={onOpenAddToPlaylistModal}
            />
          ))}
        </div>
      </section>
    </div>
  );
};
