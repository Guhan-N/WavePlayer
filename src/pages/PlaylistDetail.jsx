import React, { useState, useEffect } from 'react';
import { ChevronLeft, Play, Shuffle, Download, Trash2, Edit3, ListMusic, Search, MoreHorizontal, Pause } from 'lucide-react';
import { getPlaylistById, getSongsInPlaylist, updatePlaylist } from '../db/indexedDBService';
import { useLibrary } from '../context/LibraryContext';
import { usePlayer } from '../context/PlayerContext';
import { useToast } from '../context/ToastContext';
import { SongCard } from '../components/cards/SongCard';

export const PlaylistDetail = ({ playlistId, onNavigate, onOpenAddToPlaylistModal }) => {
  const [playlist, setPlaylist] = useState(null);
  const [songs, setSongs] = useState([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [showSearchInput, setShowSearchInput] = useState(false);

  const { deletePlaylist, refreshPlaylists } = useLibrary();
  const { currentSong, isPlaying, playSong, togglePlay } = usePlayer();
  const { addToast } = useToast();

  useEffect(() => {
    async function loadData() {
      if (!playlistId) return;
      const pl = await getPlaylistById(playlistId);
      if (pl) {
        setPlaylist(pl);
        setEditName(pl.name);
        setEditDesc(pl.description || '');
        const s = await getSongsInPlaylist(playlistId);
        setSongs(s);
      }
    }
    loadData();
  }, [playlistId]);

  if (!playlist) {
    return (
      <div className="page-content empty-state">
        <h3>Playlist Not Found</h3>
        <button className="btn-primary mt-3" onClick={() => onNavigate('library')}>
          Back to Library
        </button>
      </div>
    );
  }

  const handlePlayAll = () => {
    if (songs.length > 0) {
      if (isPlaying && currentSong) {
        togglePlay();
      } else {
        playSong(songs[0], songs, 0);
      }
    }
  };

  const handleShuffle = () => {
    if (songs.length > 0) {
      const shuffled = [...songs].sort(() => Math.random() - 0.5);
      playSong(shuffled[0], shuffled, 0);
    }
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) return;
    const updated = await updatePlaylist(playlistId, { name: editName.trim(), description: editDesc.trim() });
    setPlaylist(updated);
    setIsEditing(false);
    await refreshPlaylists();
    addToast('Playlist updated', 'success');
  };

  const handleDeletePlaylist = () => {
    if (window.confirm(`Are you sure you want to delete playlist "${playlist.name}"?`)) {
      deletePlaylist(playlistId);
      onNavigate('library');
    }
  };

  const handleExportPlaylistFile = () => {
    const singleExport = {
      format: 'LocalMusicLibrary',
      version: 1,
      exportedAt: new Date().toISOString(),
      playlists: [
        {
          name: playlist.name,
          description: playlist.description,
          artwork: playlist.artwork,
          songs: songs.map(s => ({
            id: s.id || s.youtubeVideoId,
            title: s.title,
            artist: s.artist,
            thumbnail: s.thumbnail,
            audioUrl: s.audioUrl,
            duration: s.duration || 0,
          })),
        },
      ],
      favourites: [],
    };

    const jsonStr = JSON.stringify(singleExport, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `playlist-${playlist.name.toLowerCase().replace(/\s+/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast(`Exported playlist "${playlist.name}"`, 'success');
  };

  const filteredSongs = songs.filter(
    s => s.title.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const heroArtwork = playlist.artwork
    ? playlist.artwork
    : songs.length > 0
    ? songs[0].thumbnail
    : null;

  return (
    <div className="page-content joji-playlist-container animate-fade-in">
      {/* Top Back Navigation Arrow */}
      <div className="joji-top-nav">
        <button className="joji-back-btn" onClick={() => onNavigate('library')} title="Back">
          <ChevronLeft size={28} className="text-white" />
        </button>
      </div>

      {/* Hero Centered Cover Section */}
      <div className="joji-hero-section">
        <div className="joji-artwork-wrapper">
          {heroArtwork ? (
            <img src={heroArtwork} alt={playlist.name} className="joji-artwork-img" />
          ) : (
            <div className="joji-artwork-placeholder">
              <ListMusic size={64} className="text-pink-400 opacity-60" />
            </div>
          )}

          {/* Floating Round Glass Play Button */}
          <button className="joji-floating-play-btn" onClick={handlePlayAll} title="Play All">
            {isPlaying && currentSong ? (
              <Pause size={24} className="text-white" />
            ) : (
              <Play size={24} className="text-white ml-1" fill="white" />
            )}
          </button>
        </div>

        {/* Centered Large Title */}
        {isEditing ? (
          <div className="joji-edit-form max-w-sm mx-auto mt-4">
            <input
              type="text"
              className="edit-input edit-title-input text-center text-xl font-bold"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
            <textarea
              className="edit-input edit-desc-input text-center text-xs mt-2"
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              placeholder="Description"
            />
            <div className="flex justify-center gap-2 mt-3">
              <button className="btn-primary btn-sm" onClick={handleSaveEdit}>Save</button>
              <button className="btn-secondary btn-sm" onClick={() => setIsEditing(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <div className="joji-title-meta">
            <h1 className="joji-playlist-title">{playlist.name}</h1>
            {playlist.description && <p className="joji-playlist-sub">{playlist.description}</p>}

            {/* Action icons bar */}
            <div className="joji-action-icons-row">
              <button className="joji-icon-chip" onClick={handleShuffle} title="Shuffle">
                <Shuffle size={14} /> Shuffle
              </button>
              <button className="joji-icon-chip" onClick={handleExportPlaylistFile} title="Export">
                <Download size={14} /> Export
              </button>
              <button className="joji-icon-chip" onClick={() => setIsEditing(true)} title="Edit">
                <Edit3 size={14} /> Edit
              </button>
              <button className="joji-icon-chip text-rose-400" onClick={handleDeletePlaylist} title="Delete">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Songs Section */}
      <section className="joji-songs-section">
        <div className="joji-section-header">
          <h3 className="joji-section-title">Top songs</h3>
          <div className="flex items-center gap-2">
            {showSearchInput ? (
              <input
                type="text"
                className="joji-filter-input"
                placeholder="Filter..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                autoFocus
              />
            ) : (
              <button
                className="joji-see-all-btn"
                onClick={() => setShowSearchInput(true)}
              >
                See all
              </button>
            )}
          </div>
        </div>

        {songs.length === 0 ? (
          <div className="empty-state glass-card mt-4">
            <ListMusic size={48} className="text-muted mb-2" />
            <h3>Your playlist is empty</h3>
            <p>Search for songs and click "Add to Playlist" to build your collection.</p>
            <button className="btn-primary mt-3" onClick={() => onNavigate('search')}>
              Search Music
            </button>
          </div>
        ) : (
          <div className="joji-songs-list">
            {filteredSongs.map((song, idx) => (
              <SongCard
                key={`plsong_${song.id || song.audioUrl}_${idx}`}
                song={song}
                queueList={songs}
                index={idx}
                layout="row"
                playlistId={playlistId}
                onOpenAddToPlaylistModal={onOpenAddToPlaylistModal}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
