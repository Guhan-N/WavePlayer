import React, { useState, useEffect } from 'react';
import { Play, ListMusic, Shuffle, MoreVertical, Trash2 } from 'lucide-react';
import { getSongsInPlaylist } from '../../db/indexedDBService';
import { usePlayer } from '../../context/PlayerContext';
import { useLibrary } from '../../context/LibraryContext';

export const PlaylistCard = ({ playlist, onClick }) => {
  const [songs, setSongs] = useState([]);
  const { playSong } = usePlayer();
  const { deletePlaylist } = useLibrary();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    getSongsInPlaylist(playlist.id).then(setSongs);
  }, [playlist.id, playlist.updatedAt]);

  const handlePlayAll = (e) => {
    e.stopPropagation();
    if (songs.length > 0) {
      playSong(songs[0], songs, 0);
    }
  };

  const handleShuffle = (e) => {
    e.stopPropagation();
    if (songs.length > 0) {
      const shuffled = [...songs].sort(() => Math.random() - 0.5);
      playSong(shuffled[0], shuffled, 0);
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    setMenuOpen(false);
    deletePlaylist(playlist.id);
  };

  return (
    <div className="glass-card playlist-card" onClick={onClick}>
      <div className="playlist-artwork-container">
        {playlist.artwork ? (
          <img src={playlist.artwork} alt={playlist.name} className="playlist-art-img" />
        ) : songs.length >= 4 ? (
          <div className="playlist-art-grid">
            <img src={songs[0].thumbnail} alt="" />
            <img src={songs[1].thumbnail} alt="" />
            <img src={songs[2].thumbnail} alt="" />
            <img src={songs[3].thumbnail} alt="" />
          </div>
        ) : songs.length > 0 ? (
          <img src={songs[0].thumbnail} alt="" className="playlist-art-img" />
        ) : (
          <div className="playlist-art-placeholder">
            <ListMusic size={40} className="text-indigo-400" />
          </div>
        )}

        <div className="playlist-card-overlay">
          <button className="btn-primary playlist-play-btn" onClick={handlePlayAll} title="Play All">
            <Play size={20} className="ml-1" />
          </button>
          <button className="btn-secondary playlist-shuffle-btn" onClick={handleShuffle} title="Shuffle">
            <Shuffle size={16} />
          </button>
        </div>
      </div>

      <div className="playlist-card-info">
        <h4 className="playlist-card-title" title={playlist.name}>
          {playlist.name}
        </h4>
        <div className="playlist-card-sub">
          {songs.length} {songs.length === 1 ? 'song' : 'songs'}
        </div>
      </div>
    </div>
  );
};
