import React, { useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Heart,
  ListMusic,
  Plus,
  Disc3,
  Sliders,
  Radio,
  ChevronDown,
} from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';
import { useLibrary } from '../../context/LibraryContext';
import { formatTime } from '../../utils/deviceId';

export const MusicPlayer = ({ onOpenAddToPlaylistModal }) => {
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    isShuffle,
    repeatMode,
    togglePlay,
    nextSong,
    prevSong,
    seekTo,
    toggleMute,
    toggleShuffle,
    cycleRepeat,
  } = usePlayer();

  const { isSongFavourite, toggleFavourite } = useLibrary();

  const [isExpanded, setIsExpanded] = useState(false);

  const songKey = currentSong ? (currentSong.id || currentSong.audioUrl || currentSong.title) : null;
  const isFav = songKey ? isSongFavourite(songKey) : false;

  const progressPercent = duration ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  if (!currentSong) {
    return (
      <div className="music-player empty-player">
        <div className="empty-player-text">
          <Disc3 size={18} className="spinning-art text-pink-400" />
          <span>Select any song from Home or Search to start audio playback</span>
        </div>
      </div>
    );
  }

  // Calculate coordinates for the SVG Circular Arc Dial
  const cx = 160;
  const cy = 125;
  const radius = 120;
  
  const startAngle = 200;
  const endAngle = 340;
  const currAngle = startAngle + ((endAngle - startAngle) * (progressPercent / 100));

  const toRad = (deg) => (deg * Math.PI) / 180;

  const handleX = cx + radius * Math.cos(toRad(currAngle));
  const handleY = cy + radius * Math.sin(toRad(currAngle));

  const handleArcClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const dx = clickX - cx;
    const dy = clickY - cy;
    let angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
    if (angleDeg < 0) angleDeg += 360;

    let pct = (angleDeg - startAngle) / (endAngle - startAngle);
    pct = Math.max(0, Math.min(1, pct));
    if (duration) {
      seekTo(pct * duration);
    }
  };

  return (
    <>
      {/* ===== BOTTOM MINI PLAYER BAR ===== */}
      <div className="music-player custom-image-player">
        {/* MOBILE PLAYER BAR */}
        <div className="mobile-player-layout">
          {/* Left Playback Controls: ⏮  ▶/⏸  ⏭ */}
          <div className="mobile-playback-controls">
            <button className="btn-icon mobile-ctrl-icon" onClick={prevSong} title="Previous">
              <SkipBack size={16} className="text-slate-300" />
            </button>
            <button className="btn-icon mobile-ctrl-icon" onClick={togglePlay} title="Play/Pause">
              {isPlaying ? (
                <Pause size={18} fill="white" color="white" />
              ) : (
                <Play size={18} fill="white" color="white" className="ml-0.5" />
              )}
            </button>
            <button className="btn-icon mobile-ctrl-icon" onClick={nextSong} title="Next">
              <SkipForward size={16} className="text-slate-300" />
            </button>
          </div>

          {/* Dynamic Island Capsule Card (Clicking opens Full-Screen Dial View) */}
          <div
            className="mobile-dynamic-island cursor-pointer"
            onClick={() => setIsExpanded(true)}
          >
            <div className="mobile-island-inner">
              <img src={currentSong.thumbnail} alt="" className="mobile-island-thumb" />
              <div className="mobile-island-info">
                <span className="mobile-island-title">{currentSong.title}</span>
              </div>

              <button
                className={`btn-icon mobile-island-fav ${isFav ? 'text-pink-500' : 'text-slate-400'}`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavourite(currentSong);
                }}
                title="Toggle Favourite"
              >
                <Heart size={15} fill={isFav ? '#ec4899' : 'none'} color={isFav ? '#ec4899' : 'currentColor'} />
              </button>

              {onOpenAddToPlaylistModal && (
                <button
                  className="btn-icon mobile-island-plus text-slate-400"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenAddToPlaylistModal(currentSong);
                  }}
                  title="Add to Playlist"
                >
                  <Plus size={15} />
                </button>
              )}

              {/* Bottom Scrubber Progress Bar Fill Line */}
              <div className="mobile-island-progress-track">
                <div className="mobile-island-progress-fill" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* DESKTOP PLAYER BAR */}
        <div className="desktop-player-layout">
          {/* Left: Previous, Play/Pause, Next Controls */}
          <div className="desktop-left-playback">
            <button className="btn-icon desktop-ctrl-icon" onClick={prevSong} title="Previous">
              <SkipBack size={18} className="text-slate-300" />
            </button>

            <button className="btn-icon desktop-ctrl-icon" onClick={togglePlay} title="Play/Pause">
              {isPlaying ? (
                <Pause size={20} fill="white" color="white" />
              ) : (
                <Play size={20} fill="white" color="white" className="ml-0.5" />
              )}
            </button>

            <button className="btn-icon desktop-ctrl-icon" onClick={nextSong} title="Next">
              <SkipForward size={18} className="text-slate-300" />
            </button>
          </div>

          {/* Center: Inner Dark Pill Card (Clicking opens Full-Screen Dial View) */}
          <div
            className="desktop-center-island cursor-pointer"
            onClick={() => setIsExpanded(true)}
          >
            <div className="island-inner-card">
              <img src={currentSong.thumbnail} alt="" className="island-thumb" />
              <div className="island-info">
                <span className="island-title" title={currentSong.title}>{currentSong.title}</span>
              </div>

              {onOpenAddToPlaylistModal && (
                <button
                  className="btn-icon island-action-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenAddToPlaylistModal(currentSong);
                  }}
                  title="Add to Playlist"
                >
                  <Plus size={16} className="text-slate-400" />
                </button>
              )}

              {/* Bottom Scrubber Fill Bar */}
              <div className="island-progress-track">
                <div className="island-progress-fill" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
          </div>

          {/* Right: Airplay, Equalizer/Repeat/Shuffle, Volume */}
          <div className="desktop-right-tools">
            <button className="btn-icon desktop-ctrl-icon" title="Broadcast">
              <Radio size={18} className="text-slate-300" />
            </button>

            <button
              className={`btn-icon desktop-ctrl-icon ${isShuffle || repeatMode !== 'off' ? 'text-pink-500' : 'text-slate-300'}`}
              onClick={toggleShuffle}
              title="Shuffle / FX"
            >
              <Sliders size={18} />
            </button>

            <button className="btn-icon desktop-ctrl-icon" onClick={toggleMute} title="Volume">
              {isMuted || volume === 0 ? <VolumeX size={18} className="text-rose-400" /> : <Volume2 size={18} className="text-slate-300" />}
            </button>
          </div>
        </div>
      </div>

      {/* ===== EXPANDED FULL-SCREEN SONG DETAIL VIEW (Matching User Mockup Image) ===== */}
      {isExpanded && (
        <div className="expanded-player-modal animate-fade-in">
          {/* Top Bar Navigation */}
          <div className="expanded-top-bar">
            <button
              className="btn-icon expanded-close-btn"
              onClick={() => setIsExpanded(false)}
              title="Collapse Player"
            >
              <ChevronDown size={28} className="text-white" />
            </button>
            <span className="expanded-subtitle">NOW PLAYING</span>
            {onOpenAddToPlaylistModal ? (
              <button
                className="btn-icon expanded-add-btn"
                onClick={() => onOpenAddToPlaylistModal(currentSong)}
                title="Add to Playlist"
              >
                <Plus size={22} className="text-white" />
              </button>
            ) : (
              <div style={{ width: 28 }} />
            )}
          </div>

          {/* Album Artwork Card */}
          <div className="expanded-artwork-container">
            <img src={currentSong.thumbnail} alt={currentSong.title} className="expanded-artwork-img" />
            <h2 className="expanded-song-title">{currentSong.title}</h2>
            <span className="expanded-song-sub">Full Track</span>
          </div>

          {/* CIRCULAR ARC DIAL CONTROLS CONTAINER (Matching Image) */}
          <div className="dial-player-container">
            {/* SVG Arc Progress Line & Handle Dot */}
            <svg
              className="dial-arc-svg"
              viewBox="0 0 320 160"
              onClick={handleArcClick}
            >
              {/* Background Arc Path */}
              <path
                d="M 47.2 83.9 A 120 120 0 0 1 272.8 83.9"
                fill="none"
                stroke="rgba(255, 255, 255, 0.2)"
                strokeWidth="4"
                strokeLinecap="round"
              />
              {/* Active Progress Arc Path */}
              <path
                d={`M 47.2 83.9 A 120 120 0 0 1 ${handleX} ${handleY}`}
                fill="none"
                stroke="#ffffff"
                strokeWidth="4"
                strokeLinecap="round"
              />
              {/* Glowing Handle Dot */}
              <circle
                cx={handleX}
                cy={handleY}
                r="7"
                fill="#ffffff"
                filter="drop-shadow(0px 0px 6px rgba(255, 255, 255, 0.9))"
              />
            </svg>

            {/* Dial Inner Content: Heart, Time */}
            <div className="dial-inner-header">
              <button
                className={`dial-fav-btn ${isFav ? 'text-red-500' : 'text-slate-400'}`}
                onClick={() => toggleFavourite(currentSong)}
                title="Favourite"
              >
                <Heart size={20} fill={isFav ? '#ef4444' : 'none'} color={isFav ? '#ef4444' : 'currentColor'} />
              </button>

              <div className="dial-time-display">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>

            {/* Secondary Action Circles: Shuffle (Left) & Repeat (Right) */}
            <div className="dial-action-circles">
              <button
                className={`dial-circle-btn ${isShuffle ? 'active-crimson' : ''}`}
                onClick={toggleShuffle}
                title="Shuffle"
              >
                <Shuffle size={18} />
              </button>

              <button
                className={`dial-circle-btn ${repeatMode !== 'off' ? 'active-crimson' : ''}`}
                onClick={cycleRepeat}
                title="Repeat"
              >
                {repeatMode === 'one' ? <Repeat1 size={18} /> : <Repeat size={18} />}
              </button>
            </div>

            {/* Main Playback Row: Prev, Glowing Crimson Circle Play/Pause, Next */}
            <div className="dial-main-controls">
              <button className="btn-icon dial-ctrl-btn" onClick={prevSong} title="Previous">
                <SkipBack size={26} className="text-white" />
              </button>

              {/* Glowing Crimson Center Circle Ring with White Play Button */}
              <button className="dial-glowing-play-ring" onClick={togglePlay} title="Play/Pause">
                <div className="dial-white-play-center">
                  {isPlaying ? (
                    <Pause size={28} fill="#000000" color="#000000" />
                  ) : (
                    <Play size={28} fill="#000000" color="#000000" className="ml-1" />
                  )}
                </div>
              </button>

              <button className="btn-icon dial-ctrl-btn" onClick={nextSong} title="Next">
                <SkipForward size={26} className="text-white" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
