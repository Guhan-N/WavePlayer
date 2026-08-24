import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  initLocalUserProfile,
  getAllPlaylists,
  getSongsInPlaylist,
  getAllFavourites,
  getRecentlyPlayed,
  createPlaylist as createPlaylistDB,
  deletePlaylist as deletePlaylistDB,
  addSongToPlaylist as addSongToPlaylistDB,
  removeSongFromPlaylist as removeSongFromPlaylistDB,
  toggleFavourite as toggleFavouriteDB,
  clearRecentlyPlayed as clearRecentlyPlayedDB,
  clearFavourites as clearFavouritesDB,
  clearAllPlaylists as clearAllPlaylistsDB,
  resetFullLibrary as resetFullLibraryDB,
  getLibraryMetrics as getLibraryMetricsDB,
  getSetting,
  saveSetting,
} from '../db/indexedDBService';
import { useToast } from './ToastContext';

const LibraryContext = createContext(null);

export const LibraryProvider = ({ children }) => {
  const [userProfile, setUserProfile] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [favourites, setFavourites] = useState([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState([]);
  const [metrics, setMetrics] = useState({ playlistsCount: 0, songsCount: 0, favouritesCount: 0, storageBytes: 0 });
  const [theme, setTheme] = useState('dark');
  const [loading, setLoading] = useState(true);

  const { addToast } = useToast();

  const reloadMetrics = useCallback(async () => {
    try {
      const m = await getLibraryMetricsDB();
      setMetrics(m);
    } catch (err) {
      console.error('Failed loading metrics:', err);
    }
  }, []);

  const refreshPlaylists = useCallback(async () => {
    const rawData = await getAllPlaylists();
    const data = await Promise.all(
      rawData.map(async (pl) => {
        const songs = await getSongsInPlaylist(pl.id);
        return { ...pl, songs };
      })
    );
    setPlaylists(data);
    reloadMetrics();
  }, [reloadMetrics]);

  const refreshFavourites = useCallback(async () => {
    const data = await getAllFavourites();
    setFavourites(data);
    reloadMetrics();
  }, [reloadMetrics]);

  const refreshRecentlyPlayed = useCallback(async () => {
    const data = await getRecentlyPlayed();
    setRecentlyPlayed(data);
    reloadMetrics();
  }, [reloadMetrics]);

  // Initial Load
  useEffect(() => {
    let isMounted = true;
    async function init() {
      try {
        const user = await initLocalUserProfile();
        if (isMounted) setUserProfile(user);

        const savedTheme = await getSetting('theme', 'dark');
        if (isMounted) {
          setTheme(savedTheme);
          document.documentElement.setAttribute('data-theme', savedTheme);
        }

        const [rawPls, favs, recents] = await Promise.all([
          getAllPlaylists(),
          getAllFavourites(),
          getRecentlyPlayed(),
        ]);

        const pls = await Promise.all(
          rawPls.map(async (pl) => {
            const songs = await getSongsInPlaylist(pl.id);
            return { ...pl, songs };
          })
        );

        if (isMounted) {
          setPlaylists(pls);
          setFavourites(favs);
          setRecentlyPlayed(recents);
          setLoading(false);
        }
        reloadMetrics();
      } catch (err) {
        console.error('Failed to initialize local user profile/library:', err);
        if (isMounted) setLoading(false);
      }
    }
    init();
    return () => { isMounted = false; };
  }, [reloadMetrics]);

  // Playlist Actions
  const createPlaylist = async ({ name, description, artwork }) => {
    try {
      if (!name || !name.trim()) return null;
      const pl = await createPlaylistDB({ name: name.trim(), description: description || '', artwork: artwork || null });
      await refreshPlaylists();
      addToast(`Created playlist "${pl.name}"`, 'success');
      return pl;
    } catch (err) {
      console.error('Failed creating playlist:', err);
      addToast('Error creating playlist', 'error');
      return null;
    }
  };

  const deletePlaylist = async (id) => {
    const pl = playlists.find(p => p.id === id);
    await deletePlaylistDB(id);
    await refreshPlaylists();
    if (pl) addToast(`Deleted playlist "${pl.name}"`, 'info');
  };

  const addSongToPlaylist = async (playlistId, song) => {
    const res = await addSongToPlaylistDB(playlistId, song);
    const pl = playlists.find(p => p.id === playlistId);
    const playlistName = pl ? pl.name : 'playlist';

    if (res.duplicate) {
      addToast(`"${song.title}" is already in "${playlistName}"`, 'info');
      return false;
    }
    await refreshPlaylists();
    addToast(`Added "${song.title}" to "${playlistName}"`, 'success');
    return true;
  };

  const removeSongFromPlaylist = async (playlistId, songKey) => {
    await removeSongFromPlaylistDB(playlistId, songKey);
    await refreshPlaylists();
    addToast('Removed song from playlist', 'info');
  };

  // Favourites Action
  const toggleFavourite = async (song) => {
    const isFav = await toggleFavouriteDB(song);
    await refreshFavourites();
    if (isFav) {
      addToast(`Added "${song.title}" to Favourites`, 'success');
    } else {
      addToast(`Removed "${song.title}" from Favourites`, 'info');
    }
    return isFav;
  };

  const isSongFavourite = (songKey) => {
    if (!songKey) return false;
    return favourites.some(f => (f.id || f.audioUrl || f.title || f.youtubeVideoId) === songKey);
  };

  // Theme Toggle
  const toggleTheme = async (newTheme) => {
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    await saveSetting('theme', newTheme);
  };

  // Clear & Reset
  const clearHistory = async () => {
    await clearRecentlyPlayedDB();
    await refreshRecentlyPlayed();
    addToast('Cleared listening history', 'info');
  };

  const clearFavs = async () => {
    await clearFavouritesDB();
    await refreshFavourites();
    addToast('Cleared favourites', 'info');
  };

  const clearPlaylists = async () => {
    await clearAllPlaylistsDB();
    await refreshPlaylists();
    addToast('Cleared all playlists', 'info');
  };

  const resetAll = async () => {
    await resetFullLibraryDB();
    await refreshPlaylists();
    await refreshFavourites();
    await refreshRecentlyPlayed();
    addToast('Local library has been reset', 'info');
  };

  return (
    <LibraryContext.Provider
      value={{
        userProfile,
        playlists,
        favourites,
        recentlyPlayed,
        metrics,
        theme,
        loading,
        createPlaylist,
        deletePlaylist,
        addSongToPlaylist,
        removeSongFromPlaylist,
        toggleFavourite,
        isSongFavourite,
        toggleTheme,
        refreshPlaylists,
        refreshFavourites,
        refreshRecentlyPlayed,
        clearHistory,
        clearFavs,
        clearPlaylists,
        resetAll,
      }}
    >
      {children}
    </LibraryContext.Provider>
  );
};

export const useLibrary = () => {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error('useLibrary must be used within LibraryProvider');
  return ctx;
};
