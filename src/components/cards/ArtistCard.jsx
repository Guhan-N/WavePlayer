import React from 'react';
import { UserCheck } from 'lucide-react';

export const ArtistCard = ({ artist, onClick }) => {
  return (
    <div className="glass-card artist-card" onClick={onClick}>
      <div className="artist-avatar-container">
        <img
          src={artist.thumbnail || `https://ui-avatars.com/api/?name=${encodeURIComponent(artist.title)}&background=6366f1&color=fff`}
          alt={artist.title}
          className="artist-avatar-img"
          loading="lazy"
        />
      </div>
      <div className="artist-card-info">
        <div className="artist-card-name">{artist.title}</div>
        <div className="artist-card-type">
          <UserCheck size={12} /> Artist
        </div>
      </div>
    </div>
  );
};
