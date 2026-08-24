import {
  getAllPlaylists,
  getSongsInPlaylist,
  getAllFavourites,
  createPlaylist,
  addSongToPlaylist,
  resetFullLibrary,
  getDB,
} from '../db/indexedDBService';

/**
 * Exports the entire user local music library to a downloadable JSON file.
 */
export async function exportLocalLibrary() {
  const playlists = await getAllPlaylists();
  const favourites = await getAllFavourites();

  const exportedPlaylists = [];
  for (const pl of playlists) {
    const songs = await getSongsInPlaylist(pl.id);
    exportedPlaylists.push({
      name: pl.name,
      description: pl.description || '',
      artwork: pl.artwork || null,
      songs: songs.map(s => ({
        id: s.id || s.youtubeVideoId,
        title: s.title,
        artist: s.artist,
        thumbnail: s.thumbnail,
        audioUrl: s.audioUrl,
        duration: s.duration || 0,
      })),
    });
  }

  const exportedFavourites = favourites.map(f => ({
    id: f.id || f.youtubeVideoId,
    title: f.title,
    artist: f.artist,
    thumbnail: f.thumbnail,
    audioUrl: f.audioUrl,
    duration: f.duration || 0,
  }));

  const exportData = {
    format: 'LocalMusicLibrary',
    version: 2,
    exportedAt: new Date().toISOString(),
    playlists: exportedPlaylists,
    favourites: exportedFavourites,
  };

  const jsonString = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  const dateStr = new Date().toISOString().split('T')[0];
  a.download = `music-library-${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return exportData;
}

/**
 * Validates an imported JSON string or object for required schema fields.
 */
export function validateImportData(data) {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'File content is not a valid JSON object.' };
  }

  if (data.format !== 'LocalMusicLibrary') {
    return { valid: false, error: 'Invalid file format. Expected "LocalMusicLibrary".' };
  }

  if (!Array.isArray(data.playlists) || !Array.isArray(data.favourites)) {
    return { valid: false, error: 'File structure is missing required "playlists" or "favourites" arrays.' };
  }

  let totalSongsCount = 0;
  for (const pl of data.playlists) {
    if (!pl.name || typeof pl.name !== 'string') {
      return { valid: false, error: 'One or more playlists are missing a valid name.' };
    }
    if (Array.isArray(pl.songs)) {
      totalSongsCount += pl.songs.length;
      for (const song of pl.songs) {
        if (!song.id && !song.youtubeVideoId && !song.audioUrl && !song.title) {
          return { valid: false, error: `Song in playlist "${pl.name}" is missing track identifier.` };
        }
      }
    }
  }

  for (const fav of data.favourites) {
    if (!fav.id && !fav.youtubeVideoId && !fav.audioUrl && !fav.title) {
      return { valid: false, error: 'One or more favourites are missing a track identifier.' };
    }
  }

  return {
    valid: true,
    summary: {
      playlistsCount: data.playlists.length,
      songsCount: totalSongsCount,
      favouritesCount: data.favourites.length,
    },
  };
}

/**
 * Create a safety backup snapshot in localStorage before destructive replace operations
 */
export async function createLibraryBackupSnapshot() {
  try {
    const playlists = await getAllPlaylists();
    const favourites = await getAllFavourites();
    const backupData = { playlists, favourites, backedUpAt: new Date().toISOString() };
    localStorage.setItem('music_app_library_backup', JSON.stringify(backupData));
  } catch (err) {
    console.error('Failed to create local library backup snapshot:', err);
  }
}

/**
 * Performs the import operation based on chosen strategy: 'merge' | 'replace' | 'duplicate'
 */
export async function importLocalLibrary(importData, strategy = 'merge') {
  const validation = validateImportData(importData);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Backup current state first
  await createLibraryBackupSnapshot();

  if (strategy === 'replace') {
    await resetFullLibrary();
  }

  const existingPlaylists = await getAllPlaylists();

  // Import Playlists & Songs
  for (const pl of importData.playlists) {
    let targetPlaylist = null;

    if (strategy === 'merge') {
      targetPlaylist = existingPlaylists.find(p => p.name.trim().toLowerCase() === pl.name.trim().toLowerCase());
    }

    if (strategy === 'duplicate' && existingPlaylists.some(p => p.name.trim().toLowerCase() === pl.name.trim().toLowerCase())) {
      targetPlaylist = await createPlaylist({
        name: `${pl.name} (Imported)`,
        description: pl.description || '',
        artwork: pl.artwork,
      });
    }

    if (!targetPlaylist) {
      targetPlaylist = await createPlaylist({
        name: pl.name,
        description: pl.description || '',
        artwork: pl.artwork,
      });
    }

    // Add songs
    if (Array.isArray(pl.songs)) {
      for (const song of pl.songs) {
        await addSongToPlaylist(targetPlaylist.id, song);
      }
    }
  }

  // Import Favourites
  for (const fav of importData.favourites) {
    const db = await getDB();
    const favKey = fav.id || fav.audioUrl || fav.youtubeVideoId || fav.title;
    const existing = await db.get('favourites', favKey);
    if (!existing) {
      await db.put('favourites', {
        id: favKey,
        title: fav.title || 'Unknown Song',
        artist: fav.artist || 'Unknown Artist',
        thumbnail: fav.thumbnail || '',
        audioUrl: fav.audioUrl || '',
        duration: fav.duration || 0,
        addedAt: new Date().toISOString(),
      });
    }
  }

  return { success: true, strategy };
}
