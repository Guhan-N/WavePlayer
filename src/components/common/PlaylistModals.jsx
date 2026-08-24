import React, { useState } from 'react';
import { Plus, ListMusic, Check } from 'lucide-react';
import { Modal } from './Modal';
import { useLibrary } from '../../context/LibraryContext';

export const CreatePlaylistModal = ({ isOpen, onClose, onNavigate }) => {
  const { createPlaylist } = useLibrary();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      const newPl = await createPlaylist({ name: name.trim(), description: description.trim() });
      setName('');
      setDescription('');
      onClose();
      if (newPl && onNavigate) {
        onNavigate(`playlist_${newPl.id}`);
      }
    } catch (err) {
      console.error('Modal error creating playlist:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Playlist">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-semibold mb-1 text-slate-200">Playlist Name</label>
          <input
            type="text"
            className="search-bar-input w-full"
            placeholder="e.g. My Favorites 2026..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1 text-slate-200">Description (Optional)</label>
          <textarea
            className="search-bar-input w-full h-20 resize-none"
            placeholder="What is this playlist about?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="modal-actions mt-2 flex gap-2">
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className="home-create-banner-btn flex-1 cursor-pointer"
            onClick={handleSubmit}
            disabled={isSubmitting || !name.trim()}
          >
            {isSubmitting ? 'Creating...' : 'Create Playlist'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export const AddToPlaylistModal = ({ isOpen, onClose, targetSong, onOpenCreatePlaylist }) => {
  const { playlists, addSongToPlaylist } = useLibrary();

  if (!targetSong) return null;

  const handleSelectPlaylist = async (playlistId) => {
    await addSongToPlaylist(playlistId, targetSong);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add to Playlist">
      <div className="add-to-playlist-modal-body">
        {/* Clean Target Song Card Preview */}
        <div className="target-song-preview">
          <img src={targetSong.thumbnail} alt="" className="target-song-thumb" />
          <div className="target-song-info">
            <h4 className="target-song-title">{targetSong.title}</h4>
            <span className="target-song-badge">Full Movie Track</span>
          </div>
        </div>

        {/* Playlists Selection List */}
        <div className="playlists-selection-list">
          {playlists.length === 0 ? (
            <div className="no-playlists-prompt">
              No custom playlists found. Create one first!
            </div>
          ) : (
            playlists.map((pl) => (
              <button
                key={pl.id}
                className="playlist-selection-item"
                onClick={() => handleSelectPlaylist(pl.id)}
              >
                <div className="flex items-center gap-3">
                  <ListMusic size={18} className="text-pink-400" />
                  <span className="playlist-selection-name">{pl.name}</span>
                </div>
                <Plus size={16} className="text-slate-400" />
              </button>
            ))
          )}
        </div>

        {/* Modal Action Button */}
        <div className="modal-actions mt-3">
          <button
            type="button"
            className="home-create-banner-btn w-full flex items-center justify-center gap-2"
            onClick={() => {
              onClose();
              if (onOpenCreatePlaylist) onOpenCreatePlaylist();
            }}
          >
            <Plus size={16} /> New Playlist
          </button>
        </div>
      </div>
    </Modal>
  );
};
