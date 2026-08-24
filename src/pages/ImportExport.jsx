import React, { useState, useRef } from 'react';
import { ArrowRightLeft, Download, Upload, ShieldCheck, CheckCircle2, AlertTriangle, FileJson } from 'lucide-react';
import { exportLocalLibrary, validateImportData, importLocalLibrary } from '../services/importExportService';
import { useLibrary } from '../context/LibraryContext';
import { useToast } from '../context/ToastContext';
import { Modal } from '../components/common/Modal';

export const ImportExport = () => {
  const { refreshPlaylists, refreshFavourites } = useLibrary();
  const { addToast } = useToast();

  const [importFile, setImportFile] = useState(null);
  const [importData, setImportData] = useState(null);
  const [summary, setSummary] = useState(null);
  const [strategy, setStrategy] = useState('merge'); // 'merge' | 'replace' | 'duplicate'
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const fileInputRef = useRef(null);

  const handleExport = async () => {
    try {
      await exportLocalLibrary();
      addToast('Library exported successfully as JSON file', 'success');
    } catch (err) {
      console.error('Export failed:', err);
      addToast('Failed to export library', 'error');
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      addToast('Invalid file type. Please select a .json library file.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        const validation = validateImportData(parsed);

        if (!validation.valid) {
          setErrorMsg(validation.error);
          addToast(validation.error, 'error');
          return;
        }

        setImportFile(file);
        setImportData(parsed);
        setSummary(validation.summary);
        setErrorMsg(null);
        setIsPreviewOpen(true);
      } catch (err) {
        addToast('Invalid JSON file format', 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = async () => {
    if (!importData) return;

    try {
      await importLocalLibrary(importData, strategy);
      await refreshPlaylists();
      await refreshFavourites();
      setIsPreviewOpen(false);
      setImportFile(null);
      setImportData(null);
      addToast(`Successfully restored library using "${strategy}" mode!`, 'success');
    } catch (err) {
      console.error('Import failed:', err);
      addToast(err.message || 'Import failed', 'error');
    }
  };

  return (
    <div className="page-content animate-fade-in">
      <div className="library-page-header">
        <div>
          <div className="flex items-center gap-2">
            <ArrowRightLeft size={28} className="text-indigo-400" />
            <h1>Import & Export Library</h1>
          </div>
          <p className="subtext">Transfer your playlists, favourites, and music collection between devices with ease.</p>
        </div>
      </div>

      <div className="import-export-grid">
        {/* Export Card */}
        <div className="glass-card transfer-card">
          <div className="transfer-card-header">
            <div className="transfer-icon-box text-indigo-400">
              <Download size={28} />
            </div>
            <div>
              <h3>Export your library</h3>
              <p>Save all your custom playlists and favourited songs into a portable JSON file.</p>
            </div>
          </div>

          <div className="transfer-features">
            <div className="transfer-feature-item">
              <CheckCircle2 size={16} className="text-emerald-400" />
              <span>Includes all playlists, track ordering, and favourites</span>
            </div>
            <div className="transfer-feature-item">
              <ShieldCheck size={16} className="text-indigo-400" />
              <span>No personal info, passwords, or API keys exported</span>
            </div>
          </div>

          <button className="btn-primary w-full mt-4" onClick={handleExport}>
            <Download size={18} /> Export Library (JSON)
          </button>
        </div>

        {/* Import Card */}
        <div className="glass-card transfer-card">
          <div className="transfer-card-header">
            <div className="transfer-icon-box text-purple-400">
              <Upload size={28} />
            </div>
            <div>
              <h3>Import your library</h3>
              <p>Restore playlists and favourites transferred from another device.</p>
            </div>
          </div>

          <div
            className="import-dropzone"
            onClick={() => fileInputRef.current?.click()}
          >
            <FileJson size={40} className="text-purple-400 mb-2" />
            <span>Click to select music-library.json</span>
            <span className="text-xs text-muted">Supports standard LocalMusicLibrary format</span>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".json"
              style={{ display: 'none' }}
            />
          </div>
        </div>
      </div>

      {/* Pre-Import Preview Modal */}
      <Modal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title="Import Library Preview"
      >
        {summary && (
          <div className="import-preview-body">
            <div className="preview-metrics-box glass-card">
              <div className="metric-item">
                <span className="metric-val">{summary.playlistsCount}</span>
                <span className="metric-lbl">Playlists</span>
              </div>
              <div className="metric-item">
                <span className="metric-val">{summary.songsCount}</span>
                <span className="metric-lbl">Songs</span>
              </div>
              <div className="metric-item">
                <span className="metric-val">{summary.favouritesCount}</span>
                <span className="metric-lbl">Favourites</span>
              </div>
            </div>

            <div className="duplicate-strategy-section">
              <label className="strategy-title">Handling Existing Data Strategy:</label>

              <div className="radio-group">
                <label className="radio-option">
                  <input
                    type="radio"
                    name="strategy"
                    value="merge"
                    checked={strategy === 'merge'}
                    onChange={(e) => setStrategy(e.target.value)}
                  />
                  <div>
                    <strong>Merge (Recommended)</strong>
                    <p className="text-xs text-muted">Add new songs and missing playlists to current library.</p>
                  </div>
                </label>

                <label className="radio-option">
                  <input
                    type="radio"
                    name="strategy"
                    value="replace"
                    checked={strategy === 'replace'}
                    onChange={(e) => setStrategy(e.target.value)}
                  />
                  <div>
                    <strong className="text-rose-400">Replace</strong>
                    <p className="text-xs text-muted">Overwrites current library. (Creates auto-backup snapshot first).</p>
                  </div>
                </label>

                <label className="radio-option">
                  <input
                    type="radio"
                    name="strategy"
                    value="duplicate"
                    checked={strategy === 'duplicate'}
                    onChange={(e) => setStrategy(e.target.value)}
                  />
                  <div>
                    <strong>Create Duplicates</strong>
                    <p className="text-xs text-muted">Creates imported playlists with "(Imported)" suffix if names match.</p>
                  </div>
                </label>
              </div>
            </div>

            {strategy === 'replace' && (
              <div className="alert-box alert-warning">
                <AlertTriangle size={18} />
                <span>Replace mode will clear your existing library. A backup snapshot will be saved.</span>
              </div>
            )}

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setIsPreviewOpen(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleConfirmImport}>
                Confirm & Import Library
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
