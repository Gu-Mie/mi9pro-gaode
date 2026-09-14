package io.github.mi9pro.navigation;

import android.app.Notification;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import java.util.ArrayList;
import java.util.List;
import java.io.FileDescriptor;
import java.io.PrintWriter;

public final class NavigationNotificationListener extends NotificationListenerService {
    private static NavigationNotificationListener instance;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private boolean connected;
    private WearBridge bridge() { return ((NavigationApp) getApplication()).bridge(); }
    private final Runnable poll = this::refresh;
    private final Runnable refreshTask = this::refresh;

    static void requestRefresh() {
        if (instance == null) return;
        instance.handler.removeCallbacks(instance.refreshTask);
        instance.handler.post(instance.refreshTask);
    }

    @Override public void onListenerConnected() {
        instance = this;
        connected = true;
        bridge().listenerConnected = true;
        NavigationSyncService.start(this);
        handler.removeCallbacks(poll);
        handler.post(poll);
    }

    @Override public void onNotificationPosted(StatusBarNotification sbn) { changed(sbn); }
    @Override public void onNotificationRemoved(StatusBarNotification sbn) { changed(sbn); }

    private void changed(StatusBarNotification sbn) {
        if (sbn == null || !NavigationParser.AMAP_PACKAGE.equals(sbn.getPackageName()) || !bridge().enabled()) return;
        // Coalesce remove+repost bursts and reread the active set instead of ending another route.
        handler.removeCallbacks(refreshTask);
        handler.postDelayed(refreshTask, 350);
    }

    private void refresh() {
        handler.removeCallbacks(poll);
        handler.removeCallbacks(refreshTask);
        if (!connected || !bridge().enabled()) return;
        try {
            NavigationParser.Result best = null;
            long newest = Long.MIN_VALUE;
            String lastRaw = "";
            long rawTime = Long.MIN_VALUE;
            int count = 0, readable = 0;
            StatusBarNotification[] active = getActiveNotifications();
            if (active == null) {
                bridge().unavailable("暂时无法读取通知");
                return;
            }
            for (StatusBarNotification sbn : active) {
                if (!NavigationParser.AMAP_PACKAGE.equals(sbn.getPackageName())) continue;
                count++;
                Notification notification = sbn.getNotification();
                if ((notification.flags & Notification.FLAG_GROUP_SUMMARY) != 0) continue;
                String[] fields = fields(notification);
                if (fields.length > 0) readable++;
                if (sbn.getPostTime() >= rawTime) {
                    lastRaw = NavigationParser.clip(String.join("\n", fields), 1000);
                    rawTime = sbn.getPostTime();
                }
                NavigationParser.Result result = NavigationParser.parse(sbn.getPackageName(), sbn.isOngoing(), fields);
                if (result != null && sbn.getPostTime() >= newest) {
                    best = result;
                    newest = sbn.getPostTime();
                }
            }
            bridge().lastAmapText = lastRaw.isEmpty() ? "没有可读取的高德通知文字" : lastRaw;
            bridge().notificationChecked(count, readable, best);
            bridge().updateFromNotifications(best);
        } catch (SecurityException | IllegalStateException error) {
            bridge().unavailable("通知读取不可用，请检查通知使用权");
        } finally {
            if (connected && bridge().enabled()) handler.postDelayed(poll, bridge().pollIntervalMs());
        }
    }

    static String[] fields(Notification notification) {
        Bundle extras = notification.extras;
        List<String> fields = new ArrayList<>();
        if (extras != null) {
            for (String key : new String[] { Notification.EXTRA_TITLE, Notification.EXTRA_TEXT,
                    Notification.EXTRA_BIG_TEXT, Notification.EXTRA_SUB_TEXT, Notification.EXTRA_SUMMARY_TEXT }) {
                CharSequence value = extras.getCharSequence(key);
                if (value != null && value.length() > 0) fields.add(value.toString());
            }
            CharSequence[] lines = extras.getCharSequenceArray(Notification.EXTRA_TEXT_LINES);
            if (lines != null) for (CharSequence line : lines) if (line != null) fields.add(line.toString());
        }
        if (notification.tickerText != null) fields.add(notification.tickerText.toString());
        return fields.toArray(new String[0]);
    }

    @Override public void onListenerDisconnected() { disconnect(); }
    @Override protected void dump(FileDescriptor fd, PrintWriter writer, String[] args) { bridge().dump(writer); }
    @Override public void onDestroy() { disconnect(); super.onDestroy(); }
    private void disconnect() {
        if (instance == this) instance = null;
        connected = false;
        handler.removeCallbacksAndMessages(null);
        bridge().listenerConnected = false;
        bridge().unavailable("通知监听已断开");
    }
}
