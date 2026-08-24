import React, { useEffect, useRef } from 'react';
import { usePlayer } from '../../context/PlayerContext';

export const VideoOverlay = () => {
  const { currentSong, isPlaying, setDuration, setCurrentTime, nextSong } = usePlayer();
  const iframeRef = useRef(null);

  const isYouTube = currentSong && (currentSong.youtubeVideoId || currentSong.source === 'youtube');
  const videoId = isYouTube ? (currentSong.youtubeVideoId || currentSong.id.replace('yt_', '')) : '';

  // Always keep iframe mounted and send commands on videoId or isPlaying changes
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentWindow) return;

    if (isYouTube && videoId) {
      iframe.contentWindow.postMessage(
        JSON.stringify({
          event: 'command',
          func: 'loadVideoById',
          args: [videoId]
        }),
        '*'
      );
    } else {
      iframe.contentWindow.postMessage(
        JSON.stringify({
          event: 'command',
          func: 'pauseVideo',
          args: []
        }),
        '*'
      );
    }
  }, [videoId, isYouTube]);

  // Handle Play / Pause state changes for YouTube tracks
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentWindow || !isYouTube) return;

    const func = isPlaying ? 'playVideo' : 'pauseVideo';
    iframe.contentWindow.postMessage(
      JSON.stringify({ event: 'command', func, args: [] }),
      '*'
    );
  }, [isPlaying, isYouTube]);

  // Listen to postMessage events from YouTube IFrame
  useEffect(() => {
    const handleMessage = (e) => {
      try {
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (data.event === 'infoDelivery' && data.info) {
          if (data.info.duration && !isNaN(data.info.duration) && data.info.duration > 0) {
            setDuration(data.info.duration);
          }
          if (data.info.currentTime !== undefined && !isNaN(data.info.currentTime)) {
            setCurrentTime(data.info.currentTime);
          }
          if (data.info.playerState === 0) {
            // Track ended -> auto play next song in queue
            nextSong();
          } else if (data.info.playerState === 2 && isPlaying) {
            // Auto resume if Android backgrounding attempted to pause YouTube player
            iframeRef.current?.contentWindow?.postMessage(
              JSON.stringify({ event: 'command', func: 'playVideo', args: [] }),
              '*'
            );
          }
        }
      } catch (err) {
        // ignore non-json messages
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [setDuration, setCurrentTime, nextSong, isPlaying]);

  const originUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const initialEmbedUrl = `https://www.youtube-nocookie.com/embed/KUN5Uf9mObQ?enablejsapi=1&autoplay=0&controls=0&origin=${encodeURIComponent(originUrl)}`;

  return (
    <div
      className="youtube-player-hidden-container"
      style={{
        position: 'fixed',
        bottom: -9999,
        right: -9999,
        width: 1,
        height: 1,
        opacity: 0.01,
        pointerEvents: 'none',
        overflow: 'hidden'
      }}
    >
      <iframe
        ref={iframeRef}
        id="yt_player_iframe"
        width="200"
        height="200"
        src={initialEmbedUrl}
        title="YouTube Full Song Player Engine"
        allow="autoplay; encrypted-media"
      />
    </div>
  );
};
