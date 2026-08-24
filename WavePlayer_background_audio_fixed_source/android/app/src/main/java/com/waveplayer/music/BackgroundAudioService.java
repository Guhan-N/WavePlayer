package com.waveplayer.music;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.support.v4.media.MediaMetadataCompat;
import android.support.v4.media.session.MediaSessionCompat;
import android.support.v4.media.session.PlaybackStateCompat;

import androidx.core.app.NotificationCompat;
import androidx.media.app.NotificationCompat.MediaStyle;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

public class BackgroundAudioService extends Service {
    private static final String CHANNEL_ID = "waveplayer_background_audio";
    private static final int NOTIFICATION_ID = 1001;

    public static final String ACTION_UPDATE_METADATA = "com.waveplayer.music.UPDATE_METADATA";
    public static final String ACTION_PLAY_TRACK = "com.waveplayer.music.PLAY_TRACK";
    public static final String ACTION_PLAY = "com.waveplayer.music.PLAY";
    public static final String ACTION_PAUSE = "com.waveplayer.music.PAUSE";
    public static final String ACTION_PREV = "com.waveplayer.music.PREV";
    public static final String ACTION_NEXT = "com.waveplayer.music.NEXT";
    public static final String ACTION_STOP = "com.waveplayer.music.STOP";
    public static final String ACTION_SEEK = "com.waveplayer.music.SEEK";
    public static final String ACTION_SET_VOLUME = "com.waveplayer.music.SET_VOLUME";

    private MediaSessionCompat mediaSession;
    private PowerManager.WakeLock wakeLock;

    private MediaPlayer mediaPlayer;
    private AudioManager audioManager;
    private AudioFocusRequest audioFocusRequest;

    private final Handler positionHandler = new Handler(Looper.getMainLooper());
    private Runnable positionRunnable;

    private String currentTitle = "WavePlayer Music";
    private String currentArtist = "Playing in Background";
    private String currentAlbum = "WavePlayer";
    private String currentThumbnailUrl = "";
    private long currentDuration = 240000; // ms
    private long currentTime = 0; // ms
    private boolean isPlaying = false;
    private boolean isPrepared = false;
    private boolean pendingPlay = false;
    private boolean resumeAfterFocusGain = false;

    private Bitmap currentArtwork = null;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        initMediaSession();

        audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);

        // Promote the service to a media foreground service immediately.
        // Android requires a started foreground service to call startForeground()
        // promptly; do not wait for the network audio source to finish preparing.
        updateMediaStateAndNotification();

        try {
            PowerManager powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (powerManager != null) {
                wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "WavePlayer::BackgroundAudioWakeLock");
                wakeLock.acquire();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void initMediaPlayer() {
        if (mediaPlayer == null) {
            mediaPlayer = new MediaPlayer();
        } else {
            try {
                mediaPlayer.reset();
            } catch (Exception ignored) {
            }
        }
        isPrepared = false;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            mediaPlayer.setAudioAttributes(
                new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .build()
            );
        } else {
            mediaPlayer.setAudioStreamType(AudioManager.STREAM_MUSIC);
        }

        try {
            mediaPlayer.setWakeMode(getApplicationContext(), PowerManager.PARTIAL_WAKE_LOCK);
        } catch (Exception e) {
            e.printStackTrace();
        }

        mediaPlayer.setOnPreparedListener(mp -> {
            isPrepared = true;
            if (pendingPlay || isPlaying) {
                pendingPlay = false;
                if (requestAudioFocus()) {
                    try {
                        mp.start();
                        isPlaying = true;
                    } catch (IllegalStateException e) {
                        isPlaying = false;
                    }
                }
            } else {
                isPlaying = false;
            }
            if (mp.getDuration() > 0) {
                currentDuration = mp.getDuration();
            }
            updateMediaStateAndNotification();
            if (isPlaying) {
                BackgroundAudioPlugin.dispatchMediaAction("play", mp.getCurrentPosition() / 1000.0);
                startPositionUpdates();
            }
        });

        mediaPlayer.setOnCompletionListener(mp -> {
            isPrepared = false;
            pendingPlay = false;
            isPlaying = false;
            stopPositionUpdates();
            updateMediaStateAndNotification();
            BackgroundAudioPlugin.dispatchMediaAction("ended", 0);
        });

        mediaPlayer.setOnErrorListener((mp, what, extra) -> {
            isPrepared = false;
            pendingPlay = false;
            isPlaying = false;
            stopPositionUpdates();
            updateMediaStateAndNotification();
            BackgroundAudioPlugin.dispatchMediaAction("error", 0);
            return true;
        });
    }

    private boolean requestAudioFocus() {
        if (audioManager == null) return false;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            AudioAttributes playbackAttributes = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_MEDIA)
                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                .build();

            audioFocusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                .setAudioAttributes(playbackAttributes)
                .setAcceptsDelayedFocusGain(true)
                .setOnAudioFocusChangeListener(focusChange -> {
                    if (focusChange == AudioManager.AUDIOFOCUS_LOSS) {
                        resumeAfterFocusGain = false;
                        handleAction(ACTION_PAUSE);
                    } else if (focusChange == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT) {
                        resumeAfterFocusGain = isPlaying;
                        handleAction(ACTION_PAUSE);
                    } else if (focusChange == AudioManager.AUDIOFOCUS_GAIN && resumeAfterFocusGain) {
                        resumeAfterFocusGain = false;
                        handleAction(ACTION_PLAY);
                    }
                })
                .build();

            int res = audioManager.requestAudioFocus(audioFocusRequest);
            return res == AudioManager.AUDIOFOCUS_REQUEST_GRANTED;
        } else {
            int res = audioManager.requestAudioFocus(
                focusChange -> {
                    if (focusChange == AudioManager.AUDIOFOCUS_LOSS) {
                        resumeAfterFocusGain = false;
                        handleAction(ACTION_PAUSE);
                    } else if (focusChange == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT) {
                        resumeAfterFocusGain = isPlaying;
                        handleAction(ACTION_PAUSE);
                    } else if (focusChange == AudioManager.AUDIOFOCUS_GAIN && resumeAfterFocusGain) {
                        resumeAfterFocusGain = false;
                        handleAction(ACTION_PLAY);
                    }
                },
                AudioManager.STREAM_MUSIC,
                AudioManager.AUDIOFOCUS_GAIN
            );
            return res == AudioManager.AUDIOFOCUS_REQUEST_GRANTED;
        }
    }

    private void abandonAudioFocus() {
        if (audioManager == null) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && audioFocusRequest != null) {
            audioManager.abandonAudioFocusRequest(audioFocusRequest);
        }
    }

    private void startPositionUpdates() {
        stopPositionUpdates();
        positionRunnable = new Runnable() {
            @Override
            public void run() {
                if (mediaPlayer != null && isPlaying) {
                    try {
                        if (mediaPlayer.isPlaying()) {
                            currentTime = mediaPlayer.getCurrentPosition();
                            BackgroundAudioPlugin.dispatchMediaAction("timeUpdate", currentTime / 1000.0);
                        }
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                    positionHandler.postDelayed(this, 1000);
                }
            }
        };
        positionHandler.post(positionRunnable);
    }

    private void stopPositionUpdates() {
        if (positionRunnable != null) {
            positionHandler.removeCallbacks(positionRunnable);
            positionRunnable = null;
        }
    }

    private void initMediaSession() {
        mediaSession = new MediaSessionCompat(this, "WavePlayerMediaSession");
        mediaSession.setFlags(
            MediaSessionCompat.FLAG_HANDLES_MEDIA_BUTTONS |
            MediaSessionCompat.FLAG_HANDLES_TRANSPORT_CONTROLS
        );

        mediaSession.setCallback(new MediaSessionCompat.Callback() {
            @Override
            public void onPlay() {
                handleAction(ACTION_PLAY);
            }

            @Override
            public void onPause() {
                handleAction(ACTION_PAUSE);
            }

            @Override
            public void onSkipToNext() {
                handleAction(ACTION_NEXT);
            }

            @Override
            public void onSkipToPrevious() {
                handleAction(ACTION_PREV);
            }

            @Override
            public void onSeekTo(long pos) {
                if (mediaPlayer != null) {
                    try {
                        mediaPlayer.seekTo((int) pos);
                        currentTime = pos;
                        updateMediaStateAndNotification();
                        BackgroundAudioPlugin.dispatchMediaAction("seek", pos / 1000.0);
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                }
            }
        });

        mediaSession.setActive(true);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) return START_STICKY;

        String action = intent.getAction();

        if (ACTION_STOP.equals(action)) {
            stopForeground(true);
            stopSelf();
            return START_NOT_STICKY;
        }

        if (ACTION_PLAY_TRACK.equals(action)) {
            String url = intent.getStringExtra("audioUrl");
            if (intent.hasExtra("title")) currentTitle = intent.getStringExtra("title");
            if (intent.hasExtra("artist")) currentArtist = intent.getStringExtra("artist");
            if (intent.hasExtra("album")) currentAlbum = intent.getStringExtra("album");
            if (intent.hasExtra("duration")) currentDuration = (long) (intent.getDoubleExtra("duration", 240.0) * 1000);
            if (intent.hasExtra("currentTime")) currentTime = (long) (intent.getDoubleExtra("currentTime", 0.0) * 1000);

            String newThumbnail = intent.getStringExtra("thumbnail");
            if (newThumbnail != null && !newThumbnail.equals(currentThumbnailUrl)) {
                currentThumbnailUrl = newThumbnail;
                loadArtworkAsync(currentThumbnailUrl);
            }

            pendingPlay = true;
            isPlaying = false;
            updateMediaStateAndNotification();
            playTrackUrl(url);
            return START_STICKY;
        }

        if (ACTION_SEEK.equals(action)) {
            double posSec = intent.getDoubleExtra("position", 0.0);
            long posMs = (long) (posSec * 1000);
            if (mediaPlayer != null && isPrepared) {
                try {
                    mediaPlayer.seekTo((int) posMs);
                    currentTime = posMs;
                    updateMediaStateAndNotification();
                    BackgroundAudioPlugin.dispatchMediaAction("seek", posSec);
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
            return START_STICKY;
        }

        if (ACTION_SET_VOLUME.equals(action)) {
            float vol = intent.getFloatExtra("volume", 1.0f);
            if (mediaPlayer != null) {
                try {
                    mediaPlayer.setVolume(vol, vol);
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
            return START_STICKY;
        }

        if (ACTION_PLAY.equals(action) || ACTION_PAUSE.equals(action) || ACTION_PREV.equals(action) || ACTION_NEXT.equals(action)) {
            handleAction(action);
            return START_STICKY;
        }

        if (ACTION_UPDATE_METADATA.equals(action)) {
            if (intent.hasExtra("title")) currentTitle = intent.getStringExtra("title");
            if (intent.hasExtra("artist")) currentArtist = intent.getStringExtra("artist");
            if (intent.hasExtra("album")) currentAlbum = intent.getStringExtra("album");
            if (intent.hasExtra("duration")) currentDuration = (long) (intent.getDoubleExtra("duration", 240.0) * 1000);
            if (intent.hasExtra("currentTime")) currentTime = (long) (intent.getDoubleExtra("currentTime", 0.0) * 1000);
            if (intent.hasExtra("isPlaying")) isPlaying = intent.getBooleanExtra("isPlaying", true);

            String newThumbnail = intent.getStringExtra("thumbnail");
            if (newThumbnail != null && !newThumbnail.equals(currentThumbnailUrl)) {
                currentThumbnailUrl = newThumbnail;
                loadArtworkAsync(currentThumbnailUrl);
            } else {
                updateMediaStateAndNotification();
            }
        }

        return START_STICKY;
    }

    private void playTrackUrl(String url) {
        if (url == null || url.trim().isEmpty()) {
            pendingPlay = false;
            isPlaying = false;
            updateMediaStateAndNotification();
            BackgroundAudioPlugin.dispatchMediaAction("error", 0);
            return;
        }
        try {
            stopPositionUpdates();
            pendingPlay = true;
            isPlaying = false;
            initMediaPlayer();
            mediaPlayer.setDataSource(getApplicationContext(), Uri.parse(url.trim()));
            mediaPlayer.prepareAsync();
        } catch (Exception e) {
            pendingPlay = false;
            isPrepared = false;
            isPlaying = false;
            stopPositionUpdates();
            updateMediaStateAndNotification();
            BackgroundAudioPlugin.dispatchMediaAction("error", 0);
        }
    }

    private void handleAction(String action) {
        if (ACTION_PLAY.equals(action)) {
            if (mediaPlayer == null || !isPrepared) {
                pendingPlay = true;
                isPlaying = false;
            } else {
                try {
                    if (requestAudioFocus()) {
                        mediaPlayer.start();
                        isPlaying = true;
                        startPositionUpdates();
                    }
                } catch (IllegalStateException e) {
                    isPlaying = false;
                }
            }
            if (isPlaying) {
                BackgroundAudioPlugin.dispatchMediaAction("play", currentTime / 1000.0);
            }
        } else if (ACTION_PAUSE.equals(action)) {
            pendingPlay = false;
            isPlaying = false;
            if (mediaPlayer != null && isPrepared) {
                try {
                    if (mediaPlayer.isPlaying()) {
                        mediaPlayer.pause();
                    }
                    stopPositionUpdates();
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
            BackgroundAudioPlugin.dispatchMediaAction("pause", currentTime / 1000.0);
        } else if (ACTION_PREV.equals(action)) {
            BackgroundAudioPlugin.dispatchMediaAction("prev", 0);
        } else if (ACTION_NEXT.equals(action)) {
            BackgroundAudioPlugin.dispatchMediaAction("next", 0);
        }
        updateMediaStateAndNotification();
    }

    private void loadArtworkAsync(String urlStr) {
        new Thread(() -> {
            try {
                if (urlStr != null && !urlStr.isEmpty()) {
                    URL url = new URL(urlStr);
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setDoInput(true);
                    conn.connect();
                    InputStream input = conn.getInputStream();
                    currentArtwork = BitmapFactory.decodeStream(input);
                } else {
                    currentArtwork = null;
                }
            } catch (Exception e) {
                currentArtwork = null;
            }
            updateMediaStateAndNotification();
        }).start();
    }

    private void updateMediaStateAndNotification() {
        if (mediaSession == null) return;

        // 1. Update MediaMetadata
        MediaMetadataCompat.Builder metaBuilder = new MediaMetadataCompat.Builder()
            .putString(MediaMetadataCompat.METADATA_KEY_TITLE, currentTitle)
            .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, currentArtist)
            .putString(MediaMetadataCompat.METADATA_KEY_ALBUM, currentAlbum)
            .putLong(MediaMetadataCompat.METADATA_KEY_DURATION, Math.max(currentDuration, 1000));

        if (currentArtwork != null) {
            metaBuilder.putBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART, currentArtwork);
            metaBuilder.putBitmap(MediaMetadataCompat.METADATA_KEY_DISPLAY_ICON, currentArtwork);
        }
        mediaSession.setMetadata(metaBuilder.build());

        // 2. Update PlaybackState
        long actions = PlaybackStateCompat.ACTION_PLAY |
                       PlaybackStateCompat.ACTION_PAUSE |
                       PlaybackStateCompat.ACTION_PLAY_PAUSE |
                       PlaybackStateCompat.ACTION_SKIP_TO_NEXT |
                       PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS |
                       PlaybackStateCompat.ACTION_SEEK_TO;

        int state = isPlaying ? PlaybackStateCompat.STATE_PLAYING : PlaybackStateCompat.STATE_PAUSED;
        PlaybackStateCompat.Builder stateBuilder = new PlaybackStateCompat.Builder()
            .setActions(actions)
            .setState(state, currentTime, 1.0f);

        mediaSession.setPlaybackState(stateBuilder.build());

        // 3. Build Rich System Media Notification
        Notification notification = buildMediaStyleNotification();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }
    }

    private Notification buildMediaStyleNotification() {
        Intent contentIntent = new Intent(this, MainActivity.class);
        PendingIntent pContent = PendingIntent.getActivity(
            this, 0, contentIntent,
            PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );

        PendingIntent pPrev = PendingIntent.getService(
            this, 1, new Intent(this, BackgroundAudioService.class).setAction(ACTION_PREV),
            PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );

        PendingIntent pPlayPause = PendingIntent.getService(
            this, 2, new Intent(this, BackgroundAudioService.class).setAction(isPlaying ? ACTION_PAUSE : ACTION_PLAY),
            PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );

        PendingIntent pNext = PendingIntent.getService(
            this, 3, new Intent(this, BackgroundAudioService.class).setAction(ACTION_NEXT),
            PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );

        int playPauseIcon = isPlaying ? android.R.drawable.ic_media_pause : android.R.drawable.ic_media_play;

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(currentTitle)
            .setContentText(currentArtist)
            .setSubText(currentAlbum)
            .setContentIntent(pContent)
            .setOngoing(isPlaying)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .addAction(android.R.drawable.ic_media_previous, "Previous", pPrev)
            .addAction(playPauseIcon, isPlaying ? "Pause" : "Play", pPlayPause)
            .addAction(android.R.drawable.ic_media_next, "Next", pNext)
            .setStyle(new MediaStyle()
                .setShowActionsInCompactView(0, 1, 2)
                .setMediaSession(mediaSession.getSessionToken()));

        if (currentArtwork != null) {
            builder.setLargeIcon(currentArtwork);
        }

        return builder.build();
    }

    @Override
    public void onDestroy() {
        stopPositionUpdates();
        isPrepared = false;
        pendingPlay = false;
        isPlaying = false;
        if (mediaPlayer != null) {
            try {
                if (mediaPlayer.isPlaying()) {
                    mediaPlayer.stop();
                }
                mediaPlayer.release();
                mediaPlayer = null;
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
        abandonAudioFocus();
        if (mediaSession != null) {
            mediaSession.setActive(false);
            mediaSession.release();
        }
        if (wakeLock != null && wakeLock.isHeld()) {
            try {
                wakeLock.release();
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel serviceChannel = new NotificationChannel(
                CHANNEL_ID,
                "WavePlayer Media Controls",
                NotificationManager.IMPORTANCE_LOW
            );
            serviceChannel.setDescription("Controls music playback and shows active song information");
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(serviceChannel);
            }
        }
    }
}
