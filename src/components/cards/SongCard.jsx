import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Heart, MoreVertical, PlusCircle, Plus, ListPlus, Trash2 } from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';
import { useLibrary } from '../../context/LibraryContext';
import { formatTime } from '../../utils/deviceId';

export const SongCard = ({
  song,
  queueList = null,
  index = -1,
  layout = 'row', // 'row' | 'grid'
  playlistId = null,
  onOpenAddToPlaylistModal = null,
}) => {
  const { currentSong, isPlaying, playSong, togglePlay, addToQueue } = usePlayer();
  const { isSongFavourite, toggleFavourite, removeSongFromPlaylist } = useLibrary();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const songKey = song.id || song.audioUrl || song.title;
  const currentKey = currentSong ? (currentSong.id || currentSong.audioUrl || currentSong.title) : null;
  const isCurrent = currentKey === songKey;
  const isFav = isSongFavourite(songKey);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const handlePlayClick = (e) => {
    e.stopPropagation();
    if (isCurrent) {
      togglePlay();
    } else {
      playSong(song, queueList, index);
    }
  };

  const handleFavClick = (e) => {
    e.stopPropagation();
    toggleFavourite(song);
  };

  const handleMenuToggle = (e) => {
    e.stopPropagation();
    setMenuOpen(prev => !prev);
  };

  const handleAddToPlaylist = (e) => {
    e.stopPropagation();
    setMenuOpen(false);
    if (onOpenAddToPlaylistModal) {
      onOpenAddToPlaylistModal(song);
    }
  };

  const handleAddToQueue = (e) => {
    e.stopPropagation();
    setMenuOpen(false);
    addToQueue(song);
  };

  const handleRemoveFromPlaylist = (e) => {
    e.stopPropagation();
    setMenuOpen(false);
    if (playlistId) {
      removeSongFromPlaylist(playlistId, songKey);
    }
  };

  if (layout === 'grid') {
    return (
      <div className={`glass-card song-grid-card ${isCurrent ? 'playing-border' : ''}`}>
        <div className="song-grid-thumb-container" onClick={handlePlayClick}>
          <img src={song.thumbnail} alt={song.title} className="song-grid-thumb" loading="lazy" />
          <div className="song-grid-overlay">
            <button className="btn-primary song-grid-play-btn" onClick={handlePlayClick}>
              {isCurrent && isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-1" />}
            </button>
          </div>
          {isCurrent && isPlaying && (
            <div className="equalizer song-grid-eq">
              <div className="equalizer-bar" />
              <div className="equalizer-bar" />
              <div className="equalizer-bar" />
            </div>
          )}
        </div>

        <div className="song-grid-info">
          <div className="song-grid-title" title={song.title}>
            {song.title}
          </div>
          <div className="song-grid-subtext">
            {song.source === 'youtube' ? 'Song • Full Movie Track' : 'Song • Full Track'}
          </div>
        </div>

        <div className="song-grid-actions">
          <button className={`btn-icon fav-btn ${isFav ? 'active' : ''}`} onClick={handleFavClick}>
            <Heart size={16} fill={isFav ? '#6366f1' : 'none'} />
          </button>
          <button className="btn-icon" onClick={handleMenuToggle}>
            <MoreVertical size={16} />
          </button>
        </div>

        {menuOpen && (
          <div className="dropdown-menu" ref={menuRef}>
            <button onClick={handleAddToQueue}>
              <ListPlus size={15} /> Add to Queue
            </button>
            {onOpenAddToPlaylistModal && (
              <button onClick={handleAddToPlaylist}>
                <Plus size={15} /> Add to Playlist
              </button>
            )}
            {playlistId && (
              <button onClick={handleRemoveFromPlaylist} className="text-rose-400">
                <Trash2 size={15} /> Remove from Playlist
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // Mobile & Row layout matching the design image (Square thumb, Title, Subtext, ⋮, ⊕)
  return (
    <div className={`song-row-grid ${isCurrent ? 'active-song-row' : ''}`}>
      <div className="song-row-thumb-wrapper" onClick={handlePlayClick}>
        <img src={song.thumbnail} alt={song.title} className="song-row-thumb" loading="lazy" />
        <div className="song-row-play-overlay">
          {isCurrent && isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
        </div>
      </div>

      <div className="song-row-details" onClick={handlePlayClick}>
        <div className={`song-row-title ${isCurrent ? 'text-accent' : ''}`} title={song.title}>
          {song.title}
        </div>
      </div>

      <div className="song-row-actions">
        <button
          className="btn-icon menu-trigger-btn"
          onClick={handleMenuToggle}
          title="More options"
        >
          <MoreVertical size={18} />
        </button>

        {onOpenAddToPlaylistModal ? (
          <button
            className="btn-icon add-circle-btn"
            onClick={handleAddToPlaylist}
            title="Add to Playlist"
          >
            <PlusCircle size={20} />
          </button>
        ) : (
          <button
            className={`btn-icon fav-btn ${isFav ? 'active' : ''}`}
            onClick={handleFavClick}
            title={isFav ? 'Remove from Favourites' : 'Add to Favourites'}
          >
            <Heart size={18} fill={isFav ? '#6366f1' : 'none'} />
          </button>
        )}

        {menuOpen && (
          <div className="dropdown-menu" ref={menuRef}>
            <button onClick={handleAddToQueue}>
              <ListPlus size={15} /> Add to Queue
            </button>
            {onOpenAddToPlaylistModal && (
              <button onClick={handleAddToPlaylist}>
                <Plus size={15} /> Add to Playlist
              </button>
            )}
            {playlistId && (
              <button onClick={handleRemoveFromPlaylist} className="text-rose-400">
                <Trash2 size={15} /> Remove from Playlist
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
