import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { addRecentlyPlayed } from '../db/indexedDBService';
import { youtubeService } from '../services/youtubeService';
import { iTunesApiService } from '../services/iTunesApiService';
import { audiusApiService } from '../services/audiusApiService';
import { useToast } from './ToastContext';

const BackgroundAudio = registerPlugin('BackgroundAudio');

const PlayerContext = createContext(null);

export const PlayerProvider = ({ children, refreshRecentlyPlayed }) => {
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(() => {
    const savedVol = localStorage.getItem('music_app_volume');
    return savedVol !== null ? parseInt(savedVol, 10) : 80;
  });
  const [isMuted, setIsMuted] = useState(false);

  const [queue, setQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(-1);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState('off'); // 'off' | 'all' | 'one'
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [playerError, setPlayerError] = useState(null);

  const audioRef = useRef(null);
  const { addToast } = useToast();

  // Helper to send commands to hidden YouTube IFrame
  const sendYouTubeCommand = (func, args = []) => {
    const iframe = document.getElementById('yt_player_iframe');
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func, args }),
        '*'
      );
    }
  };

  // Initialize Native HTML5 Audio Engine
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.volume = volume / 100;
    audio.muted = isMuted;
    audioRef.current = audio;

    const handleTimeUpdate = () => {
      if (!Capacitor.isNativePlatform() && audioRef.current && audioRef.current.src) {
        setCurrentTime(audioRef.current.currentTime);
      }
    };

    const handleDurationChange = () => {
      if (audioRef.current && audioRef.current.src && !isNaN(audioRef.current.duration)) {
        setDuration(audioRef.current.duration);
      }
    };

    const handleEnded = () => {
      if (!Capacitor.isNativePlatform()) {
        setIsPlaying(false);
        handleTrackEnded();
      }
    };

    const handleError = async (e) => {
      console.warn('HTML5 Audio engine stream error, attempting auto-recovery:', e);
      setIsPlaying(false);

      if (currentSong && currentSong.title && currentSong.source !== 'youtube') {
        addToast(`Switching to Full YouTube Track for "${currentSong.title}"...`, 'info');
        try {
          const ytResults = await youtubeService.searchSongs(`${currentSong.title} ${currentSong.artist}`, 1);
          if (ytResults && ytResults.length > 0) {
            playSong(ytResults[0], queue, queueIndex);
            return;
          }
        } catch (ytErr) {
          console.warn('YouTube stream recovery failed:', ytErr);
        }
      }

      addToast('Stream unavailable, playing next track...', 'info');
      nextSong();
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('loadedmetadata', handleDurationChange);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('loadedmetadata', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [currentSong, queue, queueIndex, addToast]);

  // Smoothly update playback current time for web audio, native audio & YouTube tracks
  useEffect(() => {
    let timer = null;
    if (isPlaying) {
      timer = setInterval(() => {
        const isYT = currentSong && (currentSong.youtubeVideoId || currentSong.source === 'youtube');
        if (audioRef.current && !audioRef.current.paused && audioRef.current.currentTime > 0) {
          setCurrentTime(audioRef.current.currentTime);
        } else {
          if (isYT) {
            sendYouTubeCommand('listening');
          }
          setCurrentTime((prev) => {
            if (duration && prev >= duration) {
              return prev;
            }
            return Math.min(duration || 300, prev + 0.25);
          });
        }
      }, 250);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, currentSong, duration]);

  const handleTrackEnded = useCallback(() => {
    if (repeatMode === 'one') {
      if (currentSong && (currentSong.youtubeVideoId || currentSong.source === 'youtube')) {
        sendYouTubeCommand('seekTo', [0, true]);
        sendYouTubeCommand('playVideo');
        setIsPlaying(true);
      } else if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(console.error);
        setIsPlaying(true);
      }
    } else {
      nextSong();
    }
  }, [repeatMode, currentSong]);

  // Play an Audio Track or YouTube Track directly
  const playSong = useCallback((song, newQueue = null, indexInQueue = -1) => {
    if (!song) {
      addToast('Invalid song selection', 'error');
      return;
    }

    // Auto-Upgrade legacy 30-second iTunes tracks to Full YouTube/Audius songs
    if (song.source === 'itunes' || (song.audioUrl && song.audioUrl.includes('itunes.apple.com'))) {
      const searchQuery = `${song.title} ${song.artist}`.trim();
      youtubeService.searchSongs(searchQuery, 1).then(ytResults => {
        if (ytResults && ytResults.length > 0) {
          playSong(ytResults[0], newQueue, indexInQueue);
        }
      }).catch(console.warn);
      return;
    }

    const isYT = !!(song.youtubeVideoId || song.source === 'youtube');

    setCurrentSong(song);
    setPlayerError(null);
    setCurrentTime(0);
    setDuration(song.duration || 240);
    setIsPlaying(true);

    // Save to recently played DB
    addRecentlyPlayed(song).then(() => {
      if (refreshRecentlyPlayed) refreshRecentlyPlayed();
    });

    // Update Queue
    if (newQueue) {
      setQueue(newQueue);
      const idx = indexInQueue >= 0 ? indexInQueue : newQueue.findIndex(s => s.id === song.id);
      setQueueIndex(idx >= 0 ? idx : 0);
    } else {
      setQueue(prev => {
        const existingIdx = prev.findIndex(s => s.id === song.id);
        if (existingIdx >= 0) {
          setQueueIndex(existingIdx);
          return prev;
        } else {
          const updated = [...prev, song];
          setQueueIndex(updated.length - 1);
          return updated;
        }
      });
    }

    // Start playback on native Android MediaPlayer service if on native platform
    if (Capacitor.isNativePlatform() && BackgroundAudio && BackgroundAudio.playTrack && song.audioUrl && !isYT) {
      BackgroundAudio.playTrack({
        audioUrl: song.audioUrl,
        title: song.title || 'WavePlayer Track',
        artist: song.artist || 'Unknown Artist',
        album: song.album || 'WavePlayer',
        thumbnail: song.thumbnail || '',
        duration: song.duration || 240,
        currentTime: 0
      }).catch(console.warn);
    }

    if (isYT) {
      const videoId = song.youtubeVideoId || song.id.replace('yt_', '');

      // Stop & clear any previous HTML5 audio stream so it doesn't play old/short clips
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }

      // Load & Play FULL-LENGTH YouTube video audio via YouTube player engine
      sendYouTubeCommand('loadVideoById', [videoId]);
      sendYouTubeCommand('setVolume', [volume]);
      sendYouTubeCommand('playVideo');

      // Attempt background direct stream resolution from Audius / Invidious
      (async () => {
        try {
          let directUrl = await youtubeService.getDirectAudioUrl(videoId);

          if (!directUrl) {
            const searchQuery = `${song.title} ${song.artist}`.replace(/official|video|lyric|audio|hd|4k/gi, '').trim();
            const audiusResults = await audiusApiService.searchSongs(searchQuery, 1);
            if (audiusResults && audiusResults.items && audiusResults.items.length > 0 && audiusResults.items[0].audioUrl) {
              directUrl = audiusResults.items[0].audioUrl;
            }
          }

          if (directUrl) {
            if (Capacitor.isNativePlatform() && BackgroundAudio && BackgroundAudio.playTrack) {
              BackgroundAudio.playTrack({
                audioUrl: directUrl,
                title: song.title || 'WavePlayer Track',
                artist: song.artist || 'Unknown Artist',
                album: song.album || 'WavePlayer',
                thumbnail: song.thumbnail || '',
                duration: song.duration || 240,
                currentTime: 0
              }).catch(console.warn);
            }
            if (audioRef.current) {
              audioRef.current.src = directUrl;
              audioRef.current.currentTime = 0;
              audioRef.current.play().then(() => {
                sendYouTubeCommand('pauseVideo');
                setIsPlaying(true);
              }).catch(e => console.warn('HTML5 direct audio stream play fallback:', e));
            }
          }
        } catch (err) {
          console.warn('Direct stream resolution error:', err);
        }
      })();
    } else if (song.audioUrl) {
      sendYouTubeCommand('pauseVideo');

      if (audioRef.current) {
        audioRef.current.src = song.audioUrl;
        audioRef.current.currentTime = 0;
        audioRef.current
          .play()
          .then(() => {
            setIsPlaying(true);
          })
          .catch(async (err) => {
            console.warn('Audio play failed, attempting YouTube recovery:', err);
            try {
              const ytResults = await youtubeService.searchSongs(`${song.title} ${song.artist}`, 1);
              if (ytResults && ytResults.length > 0) {
                addToast(`Playing YouTube Full Track for "${song.title}"`, 'info');
                playSong(ytResults[0], newQueue, indexInQueue);
                return;
              }
            } catch (recoveryErr) {
              console.warn('YouTube recovery failed:', recoveryErr);
            }
            addToast('Stream unavailable, skipping track', 'error');
            nextSong();
          });
      }
    }
  }, [refreshRecentlyPlayed, addToast, volume]);

  const togglePlay = useCallback(() => {
    if (!currentSong) return;
    const isYT = !!(currentSong.youtubeVideoId || currentSong.source === 'youtube');

    if (Capacitor.isNativePlatform() && BackgroundAudio) {
      if (isPlaying) {
        BackgroundAudio.pauseTrack().catch(console.warn);
        setIsPlaying(false);
      } else {
        BackgroundAudio.resumeTrack().catch(console.warn);
        setIsPlaying(true);
      }
      return;
    }

    if (isPlaying) {
      if (isYT && (!audioRef.current || !audioRef.current.src)) {
        sendYouTubeCommand('pauseVideo');
      }
      if (audioRef.current && audioRef.current.src) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
    } else {
      if (isYT && (!audioRef.current || !audioRef.current.src)) {
        sendYouTubeCommand('playVideo');
      }
      if (audioRef.current && audioRef.current.src) {
        audioRef.current.play().catch(console.error);
      }
      setIsPlaying(true);
    }
  }, [currentSong, isPlaying]);

  const nextSong = useCallback(() => {
    if (queue.length === 0) return;

    if (isShuffle) {
      const randomIdx = Math.floor(Math.random() * queue.length);
      setQueueIndex(randomIdx);
      playSong(queue[randomIdx], queue, randomIdx);
      return;
    }

    let nextIdx = queueIndex + 1;
    if (nextIdx >= queue.length) {
      if (repeatMode === 'all') {
        nextIdx = 0;
      } else {
        setIsPlaying(false);
        return;
      }
    }
    setQueueIndex(nextIdx);
    playSong(queue[nextIdx], queue, nextIdx);
  }, [queue, queueIndex, isShuffle, repeatMode, playSong]);

  const prevSong = useCallback(() => {
    if (currentTime > 3) {
      seekTo(0);
      return;
    }

    if (queue.length === 0) return;

    let prevIdx = queueIndex - 1;
    if (prevIdx < 0) {
      prevIdx = queue.length - 1;
    }
    setQueueIndex(prevIdx);
    playSong(queue[prevIdx], queue, prevIdx);
  }, [currentTime, queue, queueIndex, playSong]);

  const seekTo = useCallback((seconds) => {
    if (isNaN(seconds)) return;
    setCurrentTime(seconds);

    if (Capacitor.isNativePlatform() && BackgroundAudio && BackgroundAudio.seekTo) {
      BackgroundAudio.seekTo({ position: seconds }).catch(console.warn);
    }

    const isYT = currentSong && (currentSong.youtubeVideoId || currentSong.source === 'youtube');

    if (isYT) {
      sendYouTubeCommand('seekTo', [seconds, true]);
    } else if (audioRef.current) {
      audioRef.current.currentTime = seconds;
    }
  }, [currentSong]);

  const setVolume = useCallback((val) => {
    const clamped = Math.max(0, Math.min(100, val));
    setVolumeState(clamped);
    localStorage.setItem('music_app_volume', clamped.toString());

    if (Capacitor.isNativePlatform() && BackgroundAudio && BackgroundAudio.setVolume) {
      BackgroundAudio.setVolume({ volume: clamped / 100 }).catch(console.warn);
    }

    if (audioRef.current) {
      audioRef.current.volume = clamped / 100;
    }
    sendYouTubeCommand('setVolume', [clamped]);

    if (clamped === 0) {
      setIsMuted(true);
      sendYouTubeCommand('mute');
    } else if (isMuted) {
      setIsMuted(false);
      if (audioRef.current) audioRef.current.muted = false;
      sendYouTubeCommand('unMute');
    }
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    if (isMuted) {
      if (audioRef.current) audioRef.current.muted = false;
      sendYouTubeCommand('unMute');
      setIsMuted(false);
    } else {
      if (audioRef.current) audioRef.current.muted = true;
      sendYouTubeCommand('mute');
      setIsMuted(true);
    }
  }, [isMuted]);

  const toggleShuffle = useCallback(() => {
    setIsShuffle(prev => {
      const next = !prev;
      addToast(next ? 'Shuffle enabled' : 'Shuffle disabled', 'info');
      return next;
    });
  }, [addToast]);

  const cycleRepeat = useCallback(() => {
    setRepeatMode(prev => {
      const modes = ['off', 'all', 'one'];
      const nextIdx = (modes.indexOf(prev) + 1) % modes.length;
      const nextMode = modes[nextIdx];
      const labels = { off: 'Repeat off', all: 'Repeat all', one: 'Repeat song' };
      addToast(labels[nextMode], 'info');
      return nextMode;
    });
  }, [addToast]);

  const addToQueue = useCallback((song) => {
    setQueue(prev => {
      if (prev.some(s => s.id === song.id)) {
        addToast(`"${song.title}" is already in queue`, 'info');
        return prev;
      }
      addToast(`Added "${song.title}" to queue`, 'success');
      return [...prev, song];
    });
  }, [addToast]);

  const removeFromQueue = useCallback((index) => {
    setQueue(prev => prev.filter((_, i) => i !== index));
    if (index < queueIndex) {
      setQueueIndex(prev => prev - 1);
    }
  }, [queueIndex]);

  const clearQueue = useCallback(() => {
    setQueue([]);
    setQueueIndex(-1);
    addToast('Queue cleared', 'info');
  }, [addToast]);

  const toggleQueueOpen = useCallback(() => {
    setIsQueueOpen(prev => !prev);
  }, []);

  // MediaSession API integration for native lockscreen controls & background audio
  useEffect(() => {
    if (typeof window !== 'undefined' && 'mediaSession' in navigator && currentSong) {
      try {
        if ('MediaMetadata' in window) {
          navigator.mediaSession.metadata = new window.MediaMetadata({
            title: currentSong.title || 'Unknown Track',
            artist: 'Wave Player',
            album: 'Full Audio Track',
            artwork: [
              { src: currentSong.thumbnail || '', sizes: '96x96', type: 'image/png' },
              { src: currentSong.thumbnail || '', sizes: '512x512', type: 'image/png' }
            ]
          });
        }

        const safeSetAction = (action, handler) => {
          try {
            navigator.mediaSession.setActionHandler(action, handler);
          } catch (e) {
            // Action not supported
          }
        };

        safeSetAction('play', () => togglePlay());
        safeSetAction('pause', () => togglePlay());
        safeSetAction('previoustrack', () => prevSong());
        safeSetAction('nexttrack', () => nextSong());
        safeSetAction('seekto', (details) => {
          if (details && details.seekTime !== undefined) seekTo(details.seekTime);
        });
      } catch (err) {
        console.warn('MediaSession notice:', err);
      }
    }
  }, [currentSong, togglePlay, prevSong, nextSong, seekTo]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'mediaSession' in navigator) {
      try {
        navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
      } catch (e) {}
    }
  }, [isPlaying]);

  // Native Android Foreground Service controller for rich System Media Controls
  useEffect(() => {
    if (Capacitor.isNativePlatform() && BackgroundAudio) {
      if (currentSong) {
        BackgroundAudio.updateMetadata({
          title: currentSong.title || 'WavePlayer Track',
          artist: currentSong.artist || 'Unknown Artist',
          album: currentSong.album || 'WavePlayer',
          thumbnail: currentSong.thumbnail || '',
          duration: duration || 240,
          currentTime: currentTime || 0,
          isPlaying: isPlaying
        }).catch(err => console.warn('Background service update notice:', err));
      } else {
        BackgroundAudio.stopService().catch(err => console.warn('Background service stop notice:', err));
      }
    }
  }, [currentSong, isPlaying, duration]);

  // Listen to native Android system media control actions (Play, Pause, Next, Prev, Seek, Ended, TimeUpdate)
  useEffect(() => {
    if (Capacitor.isNativePlatform() && BackgroundAudio && BackgroundAudio.addListener) {
      let listenerHandler = null;
      BackgroundAudio.addListener('mediaAction', (data) => {
        if (!data || !data.action) return;
        if (data.action === 'play') {
          setIsPlaying(true);
        } else if (data.action === 'pause') {
          setIsPlaying(false);
        } else if (data.action === 'next') {
          nextSong();
        } else if (data.action === 'prev') {
          prevSong();
        } else if (data.action === 'ended') {
          setIsPlaying(false);
          handleTrackEnded();
        } else if (data.action === 'seek' && data.position !== undefined) {
          setCurrentTime(data.position);
        } else if (data.action === 'timeUpdate' && data.position !== undefined) {
          setCurrentTime(data.position);
        }
      }).then(l => {
        listenerHandler = l;
      }).catch(console.warn);

      return () => {
        if (listenerHandler && listenerHandler.remove) listenerHandler.remove();
      };
    }
  }, [nextSong, prevSong, handleTrackEnded]);

  // Keep Android MediaSession position state synchronized
  useEffect(() => {
    if (typeof window !== 'undefined' && 'mediaSession' in navigator && currentSong && duration > 0) {
      try {
        if ('setPositionState' in navigator.mediaSession) {
          navigator.mediaSession.setPositionState({
            duration: Math.max(duration, 1),
            playbackRate: 1,
            position: Math.min(currentTime, Math.max(duration, 1))
          });
        }
      } catch (err) {
        // ignore
      }
    }
  }, [currentSong, currentTime, duration]);

  return (
    <PlayerContext.Provider
      value={{
        currentSong,
        isPlaying,
        currentTime,
        duration,
        volume,
        isMuted,
        queue,
        queueIndex,
        isShuffle,
        repeatMode,
        isQueueOpen,
        playerError,
        setDuration,
        setCurrentTime,
        playSong,
        togglePlay,
        nextSong,
        prevSong,
        seekTo,
        setVolume,
        toggleMute,
        toggleShuffle,
        cycleRepeat,
        addToQueue,
        removeFromQueue,
        clearQueue,
        toggleQueueOpen,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
  return ctx;
};
