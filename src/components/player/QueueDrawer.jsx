import React from 'react';
import { X, Trash2, Play, Music } from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';
import { formatTime } from '../../utils/deviceId';

export const QueueDrawer = () => {
  const {
    queue,
    queueIndex,
    isQueueOpen,
    toggleQueueOpen,
    playSong,
    removeFromQueue,
    clearQueue,
  } = usePlayer();

  if (!isQueueOpen) return null;

  return (
    <div className="queue-drawer-backdrop" onClick={toggleQueueOpen}>
      <aside className="queue-drawer-content glass-card" onClick={(e) => e.stopPropagation()}>
        <div className="queue-drawer-header">
          <div className="queue-header-title">
            <Music size={18} className="text-indigo-400" />
            <h3>Playback Queue ({queue.length})</h3>
          </div>
          <div className="queue-header-actions">
            {queue.length > 0 && (
              <button className="btn-secondary btn-sm" onClick={clearQueue} title="Clear Queue">
                <Trash2 size={14} /> Clear
              </button>
            )}
            <button className="btn-icon" onClick={toggleQueueOpen}>
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="queue-drawer-body">
          {queue.length === 0 ? (
            <div className="empty-state">
              <p>Your playback queue is empty.</p>
            </div>
          ) : (
            <div className="queue-list">
              {queue.map((song, idx) => {
                const isCurrent = idx === queueIndex;
                return (
                  <div
                    key={`${song.id || song.audioUrl}_${idx}`}
                    className={`queue-item ${isCurrent ? 'active-queue-item' : ''}`}
                  >
                    <img src={song.thumbnail} alt="" className="queue-item-thumb" />
                    <div className="queue-item-info" onClick={() => playSong(song, queue, idx)}>
                      <div className="queue-item-title" title={song.title}>
                        {song.title}
                      </div>
                      <div className="queue-item-artist" title={song.artist}>
                        {song.artist}
                      </div>
                    </div>
                    <div className="queue-item-duration">{formatTime(song.duration)}</div>
                    <button
                      className="btn-icon queue-remove-btn"
                      onClick={() => removeFromQueue(idx)}
                      title="Remove from queue"
                    >
                      <X size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};
