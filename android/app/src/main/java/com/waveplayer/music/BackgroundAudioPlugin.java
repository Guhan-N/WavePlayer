package com.waveplayer.music;

import android.content.Intent;
import android.os.Build;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "BackgroundAudio")
public class BackgroundAudioPlugin extends Plugin {
    private static BackgroundAudioPlugin instance;

    @Override
    public void load() {
        super.load();
        instance = this;
    }

    public static void dispatchMediaAction(String action, double position) {
        if (instance != null) {
            JSObject ret = new JSObject();
            ret.put("action", action);
            ret.put("position", position);
            instance.notifyListeners("mediaAction", ret);
        }
    }

    @PluginMethod
    public void playTrack(PluginCall call) {
        String audioUrl = call.getString("audioUrl", "");
        String title = call.getString("title", "WavePlayer Music");
        String artist = call.getString("artist", "Playing in Background");
        String album = call.getString("album", "WavePlayer");
        String thumbnail = call.getString("thumbnail", "");
        Double duration = call.getDouble("duration", 240.0);
        Double currentTime = call.getDouble("currentTime", 0.0);

        try {
            Intent intent = new Intent(getContext(), BackgroundAudioService.class);
            intent.setAction(BackgroundAudioService.ACTION_PLAY_TRACK);
            intent.putExtra("audioUrl", audioUrl);
            intent.putExtra("title", title);
            intent.putExtra("artist", artist);
            intent.putExtra("album", album);
            intent.putExtra("thumbnail", thumbnail);
            intent.putExtra("duration", duration != null ? duration : 240.0);
            intent.putExtra("currentTime", currentTime != null ? currentTime : 0.0);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                getContext().startForegroundService(intent);
            } else {
                getContext().startService(intent);
            }
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to play track via background audio service: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void pauseTrack(PluginCall call) {
        try {
            Intent intent = new Intent(getContext(), BackgroundAudioService.class);
            intent.setAction(BackgroundAudioService.ACTION_PAUSE);
            getContext().startService(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to pause background audio service: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void resumeTrack(PluginCall call) {
        try {
            Intent intent = new Intent(getContext(), BackgroundAudioService.class);
            intent.setAction(BackgroundAudioService.ACTION_PLAY);
            getContext().startService(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to resume background audio service: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void seekTo(PluginCall call) {
        Double position = call.getDouble("position", 0.0);
        try {
            Intent intent = new Intent(getContext(), BackgroundAudioService.class);
            intent.setAction(BackgroundAudioService.ACTION_SEEK);
            intent.putExtra("position", position != null ? position : 0.0);
            getContext().startService(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to seek background audio service: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void setVolume(PluginCall call) {
        Double volume = call.getDouble("volume", 1.0);
        try {
            Intent intent = new Intent(getContext(), BackgroundAudioService.class);
            intent.setAction(BackgroundAudioService.ACTION_SET_VOLUME);
            intent.putExtra("volume", volume != null ? volume.floatValue() : 1.0f);
            getContext().startService(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to set volume on background audio service: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void startService(PluginCall call) {
        updateMetadata(call);
    }

    @PluginMethod
    public void updateMetadata(PluginCall call) {
        String title = call.getString("title", "WavePlayer Music");
        String artist = call.getString("artist", "Playing in Background");
        String album = call.getString("album", "WavePlayer");
        String thumbnail = call.getString("thumbnail", "");
        Double duration = call.getDouble("duration", 240.0);
        Double currentTime = call.getDouble("currentTime", 0.0);
        Boolean isPlaying = call.getBoolean("isPlaying", true);

        try {
            Intent intent = new Intent(getContext(), BackgroundAudioService.class);
            intent.setAction(BackgroundAudioService.ACTION_UPDATE_METADATA);
            intent.putExtra("title", title);
            intent.putExtra("artist", artist);
            intent.putExtra("album", album);
            intent.putExtra("thumbnail", thumbnail);
            intent.putExtra("duration", duration != null ? duration : 240.0);
            intent.putExtra("currentTime", currentTime != null ? currentTime : 0.0);
            intent.putExtra("isPlaying", isPlaying != null ? isPlaying : true);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                getContext().startForegroundService(intent);
            } else {
                getContext().startService(intent);
            }
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to update background audio service: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void stopService(PluginCall call) {
        try {
            Intent serviceIntent = new Intent(getContext(), BackgroundAudioService.class);
            serviceIntent.setAction(BackgroundAudioService.ACTION_STOP);
            getContext().startService(serviceIntent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to stop background audio service: " + e.getMessage(), e);
        }
    }
}
