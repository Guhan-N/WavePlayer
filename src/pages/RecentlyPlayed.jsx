import React from 'react';
import { History, Play, Trash2 } from 'lucide-react';
import { useLibrary } from '../context/LibraryContext';
import { usePlayer } from '../context/PlayerContext';
import { SongCard } from '../components/cards/SongCard';

export const RecentlyPlayed = ({ onOpenAddToPlaylistModal }) => {
  const { recentlyPlayed, clearHistory } = useLibrary();
  const { playSong } = usePlayer();

  const handlePlayAll = () => {
    if (recentlyPlayed.length > 0) {
      playSong(recentlyPlayed[0], recentlyPlayed, 0);
    }
  };

  return (
    <div className="page-content animate-fade-in">
      <div className="library-page-header">
        <div>
          <div className="flex items-center gap-2">
            <History size={28} className="text-indigo-400" />
            <h1>Recently Played</h1>
          </div>
          <p className="subtext">Tracks listened to on this device.</p>
        </div>

        {recentlyPlayed.length > 0 && (
          <div className="flex items-center gap-3">
            <button className="btn-primary" onClick={handlePlayAll}>
              <Play size={18} className="ml-0.5" /> Play All
            </button>
            <button className="btn-secondary text-rose-400" onClick={clearHistory}>
              <Trash2 size={16} /> Clear History
            </button>
          </div>
        )}
      </div>

      {recentlyPlayed.length === 0 ? (
        <div className="empty-state glass-card">
          <History size={48} className="text-muted mb-2" />
          <h3>No recently played songs</h3>
          <p>Start listening to songs from Home or Search to see your listening history here.</p>
        </div>
      ) : (
        <div className="recent-songs-row">
          {recentlyPlayed.map((song, idx) => (
            <SongCard
              key={`recent_page_${song.id || song.audioUrl}_${idx}`}
              song={song}
              queueList={recentlyPlayed}
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
