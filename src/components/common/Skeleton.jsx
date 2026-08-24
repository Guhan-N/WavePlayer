import React from 'react';

export const SongSkeleton = ({ count = 5 }) => {
  return (
    <div className="skeleton-list">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="song-row-grid skeleton-row">
          <div className="skeleton-box skeleton-thumb" />
          <div className="skeleton-details">
            <div className="skeleton-box skeleton-title" />
            <div className="skeleton-box skeleton-artist" />
          </div>
          <div className="skeleton-box skeleton-time" />
        </div>
      ))}
    </div>
  );
};

export const CardSkeleton = ({ count = 4 }) => {
  return (
    <div className="cards-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass-card card-skeleton-box">
          <div className="skeleton-box card-skeleton-img" />
          <div className="skeleton-box card-skeleton-line1" />
          <div className="skeleton-box card-skeleton-line2" />
        </div>
      ))}
    </div>
  );
};
