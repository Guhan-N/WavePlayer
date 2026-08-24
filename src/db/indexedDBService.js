import { openDB } from 'idb';
import { getOrCreateDeviceId } from '../utils/deviceId';

const DB_NAME = 'musicAppDB';
const DB_VERSION = 2; // Incremented for audio-only track schema

let dbPromise = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        if (!db.objectStoreNames.contains('users')) {
          db.createObjectStore('users', { keyPath: 'deviceUserId' });
        }

        if (!db.objectStoreNames.contains('playlists')) {
          const playlistStore = db.createObjectStore('playlists', { keyPath: 'id' });
          playlistStore.createIndex('createdAt', 'createdAt');
          playlistStore.createIndex('updatedAt', 'updatedAt');
        }

        // Recreate playlistSongs if upgrading
        if (db.objectStoreNames.contains('playlistSongs')) {
          db.deleteObjectStore('playlistSongs');
        }
        const songStore = db.createObjectStore('playlistSongs', { keyPath: 'id' });
        songStore.createIndex('playlistId', 'playlistId');
        songStore.createIndex('songId', 'songId');
        songStore.createIndex('addedAt', 'addedAt');
        songStore.createIndex('position', 'position');

        // Recreate favourites if upgrading
        if (db.objectStoreNames.contains('favourites')) {
          db.deleteObjectStore('favourites');
        }
        const favStore = db.createObjectStore('favourites', { keyPath: 'id' });
        favStore.createIndex('addedAt', 'addedAt');

        // Recreate recentlyPlayed if upgrading
        if (db.objectStoreNames.contains('recentlyPlayed')) {
          db.deleteObjectStore('recentlyPlayed');
        }
        const recentStore = db.createObjectStore('recentlyPlayed', { keyPath: 'id' });
        recentStore.createIndex('playedAt', 'playedAt');

        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}

// User Profile Init
export async function initLocalUserProfile() {
  const db = await getDB();
  const deviceUserId = getOrCreateDeviceId();
  let user = await db.get('users', deviceUserId);

  if (!user) {
    user = {
      deviceUserId,
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
    };
    await db.put('users', user);
  } else {
    user.lastActive = new Date().toISOString();
    await db.put('users', user);
  }
  return user;
}

// Playlists CRUD
export async function getAllPlaylists() {
  const db = await getDB();
  const playlists = await db.getAll('playlists');
  return playlists.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function getPlaylistById(id) {
  const db = await getDB();
  return db.get('playlists', id);
}

export async function createPlaylist({ name, description = '', artwork = null }) {
  const db = await getDB();
  const id = `pl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();
  const playlist = {
    id,
    name,
    description,
    artwork,
    createdAt: now,
    updatedAt: now,
  };
  await db.put('playlists', playlist);
  return playlist;
}

export async function updatePlaylist(id, updates) {
  const db = await getDB();
  const playlist = await db.get('playlists', id);
  if (!playlist) throw new Error('Playlist not found');

  const updated = {
    ...playlist,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  await db.put('playlists', updated);
  return updated;
}

export async function deletePlaylist(id) {
  const db = await getDB();
  const tx = db.transaction(['playlists', 'playlistSongs'], 'readwrite');
  await tx.objectStore('playlists').delete(id);

  const songStore = tx.objectStore('playlistSongs');
  const index = songStore.index('playlistId');
  let cursor = await index.openCursor(id);
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
}

// Playlist Songs
export async function getSongsInPlaylist(playlistId) {
  const db = await getDB();
  const songs = await db.getAllFromIndex('playlistSongs', 'playlistId', playlistId);
  return songs.sort((a, b) => a.position - b.position);
}

export async function addSongToPlaylist(playlistId, song) {
  const db = await getDB();
  const existingSongs = await getSongsInPlaylist(playlistId);

  const songKey = song.id || song.audioUrl || song.title;

  // Check duplicate in this playlist
  const duplicate = existingSongs.find(s => s.songId === songKey || s.id === `${playlistId}_${songKey}`);
  if (duplicate) {
    return { success: false, duplicate: true, song: duplicate };
  }

  const entryId = `${playlistId}_${songKey}`;
  const now = new Date().toISOString();
  const playlistSong = {
    id: entryId,
    playlistId,
    songId: songKey,
    title: song.title,
    artist: song.artist,
    thumbnail: song.thumbnail,
    audioUrl: song.audioUrl,
    duration: song.duration || 0,
    addedAt: now,
    position: existingSongs.length,
  };

  await db.put('playlistSongs', playlistSong);
  await updatePlaylist(playlistId, { updatedAt: now });
  return { success: true, song: playlistSong };
}

export async function removeSongFromPlaylist(playlistId, songKey) {
  const db = await getDB();
  const entryId = `${playlistId}_${songKey}`;
  await db.delete('playlistSongs', entryId);
  await updatePlaylist(playlistId, { updatedAt: new Date().toISOString() });
}

// Favourites CRUD
export async function getAllFavourites() {
  const db = await getDB();
  const favs = await db.getAll('favourites');
  return favs.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
}

export async function isFavourite(songKey) {
  if (!songKey) return false;
  const db = await getDB();
  const fav = await db.get('favourites', songKey);
  return !!fav;
}

export async function toggleFavourite(song) {
  const db = await getDB();
  const songKey = song.id || song.audioUrl || song.title;
  const existing = await db.get('favourites', songKey);

  if (existing) {
    await db.delete('favourites', songKey);
    return false; // Now unfavourited
  } else {
    const favItem = {
      id: songKey,
      title: song.title,
      artist: song.artist,
      thumbnail: song.thumbnail,
      audioUrl: song.audioUrl,
      duration: song.duration || 0,
      addedAt: new Date().toISOString(),
    };
    await db.put('favourites', favItem);
    return true; // Now favourited
  }
}

// Recently Played CRUD
export async function getRecentlyPlayed(limit = 30) {
  const db = await getDB();
  const items = await db.getAll('recentlyPlayed');
  items.sort((a, b) => new Date(b.playedAt) - new Date(a.playedAt));
  return items.slice(0, limit);
}

export async function addRecentlyPlayed(song) {
  if (!song) return;
  const songKey = song.id || song.audioUrl || song.title;
  const db = await getDB();
  const item = {
    id: songKey,
    title: song.title,
    artist: song.artist,
    thumbnail: song.thumbnail,
    audioUrl: song.audioUrl,
    duration: song.duration || 0,
    playedAt: new Date().toISOString(),
  };
  await db.put('recentlyPlayed', item);
}

export async function clearRecentlyPlayed() {
  const db = await getDB();
  await db.clear('recentlyPlayed');
}

export async function clearFavourites() {
  const db = await getDB();
  await db.clear('favourites');
}

export async function clearAllPlaylists() {
  const db = await getDB();
  const tx = db.transaction(['playlists', 'playlistSongs'], 'readwrite');
  await tx.objectStore('playlists').clear();
  await tx.objectStore('playlistSongs').clear();
  await tx.done;
}

export async function resetFullLibrary() {
  const db = await getDB();
  const tx = db.transaction(['playlists', 'playlistSongs', 'favourites', 'recentlyPlayed', 'settings'], 'readwrite');
  await tx.objectStore('playlists').clear();
  await tx.objectStore('playlistSongs').clear();
  await tx.objectStore('favourites').clear();
  await tx.objectStore('recentlyPlayed').clear();
  await tx.objectStore('settings').clear();
  await tx.done;
}

// Settings
export async function getSetting(key, defaultValue = null) {
  const db = await getDB();
  const res = await db.get('settings', key);
  return res ? res.value : defaultValue;
}

export async function saveSetting(key, value) {
  const db = await getDB();
  await db.put('settings', { key, value });
}

// Metrics
export async function getLibraryMetrics() {
  const db = await getDB();
  const playlists = await db.getAll('playlists');
  const playlistSongs = await db.getAll('playlistSongs');
  const favourites = await db.getAll('favourites');
  const recentlyPlayed = await db.getAll('recentlyPlayed');

  const jsonStr = JSON.stringify({ playlists, playlistSongs, favourites, recentlyPlayed });
  const storageBytes = new Blob([jsonStr]).size;

  return {
    playlistsCount: playlists.length,
    songsCount: playlistSongs.length,
    favouritesCount: favourites.length,
    historyCount: recentlyPlayed.length,
    storageBytes,
  };
}
