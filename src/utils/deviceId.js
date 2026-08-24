/**
 * Device Identification Utility for Local-First Architecture.
 * Generates and retrieves a unique local device user ID stored in localStorage/IndexedDB.
 * No login, registration, or cloud tracking required.
 */

const DEVICE_ID_KEY = 'music_app_device_user_id';
const FIRST_LAUNCH_KEY = 'music_app_first_launch_done';

export function getOrCreateDeviceId() {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

export function isFirstLaunch() {
  return !localStorage.getItem(FIRST_LAUNCH_KEY);
}

export function markFirstLaunchComplete() {
  localStorage.setItem(FIRST_LAUNCH_KEY, 'true');
}

export function formatTime(seconds) {
  if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export function parseISO8601Duration(durationStr) {
  if (!durationStr) return 0;
  const match = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  return hours * 3600 + minutes * 60 + seconds;
}
