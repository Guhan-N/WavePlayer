import React, { useState } from 'react';
import { Settings as SettingsIcon, HardDrive, Trash2, ShieldCheck, RefreshCw, Music } from 'lucide-react';
import { useLibrary } from '../context/LibraryContext';
import { Modal } from '../components/common/Modal';

export const Settings = () => {
  const {
    userProfile,
    metrics,
    clearHistory,
    clearFavs,
    clearPlaylists,
    resetAll,
  } = useLibrary();

  const [confirmModal, setConfirmModal] = useState({ open: false, type: '', title: '', message: '', action: null });

  const formatBytes = (bytes) => {
    if (!bytes) return '0 KB';
    const kb = (bytes / 1024).toFixed(1);
    return `${kb} KB`;
  };

  const handleOpenConfirm = (type, title, message, action) => {
    setConfirmModal({ open: true, type, title, message, action });
  };

  const handleExecuteConfirm = async () => {
    if (confirmModal.action) {
      await confirmModal.action();
    }
    setConfirmModal({ open: false, type: '', title: '', message: '', action: null });
  };

  return (
    <div className="page-content animate-fade-in">
      <div className="library-page-header">
        <div>
          <div className="flex items-center gap-2">
            <SettingsIcon size={28} className="text-indigo-400" />
            <h1>Settings & Preferences</h1>
          </div>
          <p className="subtext">Manage local storage, audio engine, and privacy preferences.</p>
        </div>
      </div>

      <div className="settings-sections-list">
        {/* Audio Engine Information */}
        <section className="glass-card settings-card">
          <div className="settings-card-header">
            <Music size={22} className="text-emerald-400" />
            <div>
              <h3>Audio Engine Status</h3>
              <p className="subtext">Audius Open Audio Stream Engine</p>
            </div>
          </div>
          <div className="privacy-info-box">
            <p>
              <strong>Status: Active & Online</strong>
            </p>
            <p className="mt-2 text-xs text-muted">
              Zero external player SDK dependencies. Access tracks worldwide via the official Audius API (https://api.audius.co/v1).
            </p>
          </div>
        </section>

        {/* Local Storage & Library Metrics */}
        <section className="glass-card settings-card">
          <div className="settings-card-header">
            <HardDrive size={22} className="text-purple-400" />
            <div>
              <h3>Local Storage Usage</h3>
              <p className="subtext">Your library is stored locally in IndexedDB.</p>
            </div>
          </div>

          <div className="storage-metrics-grid">
            <div className="storage-metric-box">
              <span className="storage-val">{metrics.playlistsCount}</span>
              <span className="storage-lbl">Playlists</span>
            </div>
            <div className="storage-metric-box">
              <span className="storage-val">{metrics.songsCount}</span>
              <span className="storage-lbl">Playlist Songs</span>
            </div>
            <div className="storage-metric-box">
              <span className="storage-val">{metrics.favouritesCount}</span>
              <span className="storage-lbl">Favourites</span>
            </div>
            <div className="storage-metric-box">
              <span className="storage-val">{formatBytes(metrics.storageBytes)}</span>
              <span className="storage-lbl">Estimated Storage</span>
            </div>
          </div>
        </section>

        {/* Data Maintenance */}
        <section className="glass-card settings-card">
          <div className="settings-card-header">
            <Trash2 size={22} className="text-rose-400" />
            <div>
              <h3>Library Maintenance & Reset</h3>
              <p className="subtext">Clear history, favourites, or reset local database.</p>
            </div>
          </div>

          <div className="settings-danger-actions">
            <button
              className="btn-secondary"
              onClick={() => handleOpenConfirm('history', 'Clear Listening History', 'Are you sure you want to clear your recently played history?', clearHistory)}
            >
              Clear Recently Played
            </button>

            <button
              className="btn-secondary"
              onClick={() => handleOpenConfirm('favs', 'Clear Favourites', 'Are you sure you want to clear all your favourited songs?', clearFavs)}
            >
              Clear Favourites
            </button>

            <button
              className="btn-secondary text-rose-400"
              onClick={() => handleOpenConfirm('playlists', 'Delete All Playlists', 'Are you sure you want to delete all your playlists?', clearPlaylists)}
            >
              Clear All Playlists
            </button>

            <button
              className="btn-secondary text-rose-400 font-bold"
              onClick={() => handleOpenConfirm('reset', 'Reset Local Library', 'This will erase all local playlists, favourites, and history. Are you sure?', resetAll)}
            >
              <RefreshCw size={16} /> Reset Local Library
            </button>
          </div>
        </section>

        {/* Privacy & Device Profile */}
        <section className="glass-card settings-card">
          <div className="settings-card-header">
            <ShieldCheck size={22} className="text-indigo-400" />
            <div>
              <h3>Privacy & Local Device Profile</h3>
              <p className="subtext">Local-first architecture transparency notice.</p>
            </div>
          </div>

          <div className="privacy-info-box">
            <p>
              <strong>"Your playlists and favourites are stored locally on this device."</strong>
            </p>
            <p className="mt-2 text-xs text-muted">
              This application does not collect emails, passwords, phone numbers, or track your identity on a remote server. Device ID: <code className="text-indigo-400">{userProfile?.deviceUserId}</code>
            </p>
          </div>
        </section>
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={confirmModal.open}
        onClose={() => setConfirmModal({ ...confirmModal, open: false })}
        title={confirmModal.title}
      >
        <p className="mb-4">{confirmModal.message}</p>
        <div className="modal-actions">
          <button className="btn-secondary" onClick={() => setConfirmModal({ ...confirmModal, open: false })}>
            Cancel
          </button>
          <button className="btn-primary bg-rose-600" onClick={handleExecuteConfirm}>
            Confirm Action
          </button>
        </div>
      </Modal>
    </div>
  );
};
