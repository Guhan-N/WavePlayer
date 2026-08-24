import React, { useState } from 'react';
import { Heart, Play, Shuffle, Search } from 'lucide-react';
import { useLibrary } from '../context/LibraryContext';
import { usePlayer } from '../context/PlayerContext';
import { SongCard } from '../components/cards/SongCard';

export const Favourites = ({ onOpenAddToPlaylistModal }) => {
  const { favourites } = useLibrary();
  const { playSong } = usePlayer();
  const [filter, setFilter] = useState('');

  const handlePlayAll = () => {
    if (favourites.length > 0) {
      playSong(favourites[0], favourites, 0);
    }
  };

  const handleShuffle = () => {
    if (favourites.length > 0) {
      const shuffled = [...favourites].sort(() => Math.random() - 0.5);
      playSong(shuffled[0], shuffled, 0);
    }
  };

  const filteredFavs = favourites.filter(
    s => s.title.toLowerCase().includes(filter.toLowerCase()) || s.artist.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="page-content animate-fade-in">
      <div className="library-page-header">
        <div>
          <div className="flex items-center gap-2">
            <Heart size={28} className="text-indigo-400" fill="#6366f1" />
            <h1>Your Favourites ({favourites.length})</h1>
          </div>
          <p className="subtext">Your favourite songs saved locally on this device.</p>
        </div>

        {favourites.length > 0 && (
          <div className="flex items-center gap-3">
            <button className="btn-primary" onClick={handlePlayAll}>
              <Play size={18} className="ml-0.5" /> Play All
            </button>
            <button className="btn-secondary" onClick={handleShuffle}>
              <Shuffle size={16} /> Shuffle
            </button>
          </div>
        )}
      </div>

      {favourites.length > 0 && (
        <div className="search-input-wrapper filter-input-wrapper mb-4">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="search-bar-input filter-input"
            placeholder="Search within favourites..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
      )}

      {favourites.length === 0 ? (
        <div className="empty-state glass-card">
          <Heart size={48} className="text-muted mb-2" />
          <h3>No favourite songs yet</h3>
          <p>Click the heart icon on any song while listening or searching to build your list.</p>
        </div>
      ) : (
        <div className="recent-songs-row">
          {filteredFavs.map((song, idx) => (
            <SongCard
              key={`fav_page_${song.id || song.audioUrl}_${idx}`}
              song={song}
              queueList={favourites}
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
