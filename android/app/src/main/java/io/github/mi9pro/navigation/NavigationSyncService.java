package io.github.mi9pro.navigation;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.provider.Settings;
import android.service.notification.NotificationListenerService;
import java.io.FileDescriptor;
import java.io.PrintWriter;

/** User-enabled Bluetooth companion relay; the phone Activity is not its lifetime owner. */
public final class NavigationSyncService extends Service {
    private static final String CHANNEL = "navigation_sync";
    private static final String STOP = "io.github.mi9pro.navigation.STOP_SYNC";
    private static final int NOTIFICATION_ID = 9;
    private static NavigationSyncService instance;
    private static String status = "后台同步未启动";
    private PowerManager.WakeLock wakeLock;
    private boolean foreground;
    private long renewWakeAt;
    private String shownText = "";

    static boolean hasDevicePermission(Context context) {
        return Build.VERSION.SDK_INT < 31 || context.checkSelfPermission(Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED;
    }

    static boolean hasNotificationAccess(Context context) {
        ComponentName listener = new ComponentName(context, NavigationNotificationListener.class);
        if (Build.VERSION.SDK_INT >= 27) return context.getSystemService(NotificationManager.class).isNotificationListenerAccessGranted(listener);
        String allowed = Settings.Secure.getString(context.getContentResolver(), "enabled_notification_listeners");
        if (allowed != null) for (String item : allowed.split(":")) if (listener.equals(ComponentName.unflattenFromString(item))) return true;
        return false;
    }

    static void start(Context context) {
        if (!context.getSharedPreferences("settings", MODE_PRIVATE).getBoolean("enabled", false)) return;
        if (!hasNotificationAccess(context)) { status = "请先开启通知使用权"; return; }
        if (!hasDevicePermission(context)) { status = "请点击「启用后台同步」授权附近设备"; return; }
        if (instance != null && instance.foreground) {
            status = "后台同步已运行，可退出手机页面";
            return;
        }
        try {
            context.startForegroundService(new Intent(context, NavigationSyncService.class));
        } catch (IllegalStateException | SecurityException error) {
            status = "系统暂不允许后台启动，请打开腕上导航启用后台同步";
            android.util.Log.w("WristNav", "foreground start rejected: " + error.getClass().getSimpleName());
        }
    }

    static void stop(Context context) {
        if (instance != null) instance.releaseWakeLock();
        context.stopService(new Intent(context, NavigationSyncService.class));
        status = "后台同步已停止";
    }

    static String status() { return status; }
    static boolean running() { return instance != null && instance.foreground; }
    static void refresh() { if (running()) instance.update(); }
    private WearBridge bridge() { return ((NavigationApp) getApplication()).bridge(); }

    @Override public void onCreate() {
        super.onCreate();
        instance = this;
        NotificationChannel channel = new NotificationChannel(CHANNEL, "导航后台同步", NotificationManager.IMPORTANCE_LOW);
        channel.setDescription("开启同步后等待高德导航；可随时停止");
        channel.setShowBadge(false);
        getSystemService(NotificationManager.class).createNotificationChannel(channel);
        wakeLock = getSystemService(PowerManager.class).newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "WristNavigation:relay");
        wakeLock.setReferenceCounted(false);
    }

    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && STOP.equals(intent.getAction())) {
            bridge().setEnabled(false);
            stopSelf();
            return START_NOT_STICKY;
        }
        try {
            Notification notification = notification("等待高德导航，可退出此页面");
            if (Build.VERSION.SDK_INT >= 29) startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_CONNECTED_DEVICE);
            else startForeground(NOTIFICATION_ID, notification);
            foreground = true;
        } catch (IllegalStateException | SecurityException error) {
            status = "后台同步启动失败，请检查附近设备权限";
            android.util.Log.w("WristNav", "foreground promotion rejected: " + error.getClass().getSimpleName());
            stopSelf();
            return START_NOT_STICKY;
        }
        if (!bridge().enabled() || !hasNotificationAccess(this)) {
            stopSelf();
            return START_NOT_STICKY;
        }
        status = "后台同步已运行，可退出手机页面";
        android.util.Log.i("WristNav", "foreground relay started");
        if (!bridge().listenerConnected) NotificationListenerService.requestRebind(new ComponentName(this, NavigationNotificationListener.class));
        bridge().connect(false);
        update();
        return START_STICKY;
    }

    private void update() {
        boolean active = bridge().isNavigationActive() && bridge().hasConnectedNode();
        // The band expires packets after 20 s. Only a live, connected navigation renews
        // this bounded CPU lease; it never turns on or holds the phone screen.
        long now = android.os.SystemClock.elapsedRealtime();
        if (active) {
            if (!wakeLock.isHeld() || now >= renewWakeAt) {
                wakeLock.acquire(60000);
                renewWakeAt = now + 30000;
            }
        } else releaseWakeLock();
        String text = !bridge().listenerConnected ? "通知监听未连接，请检查通知使用权"
                : !bridge().hasConnectedNode() ? "等待运动健康连接手环"
                : active ? "正在后台同步高德导航" : "等待高德导航，可退出此页面";
        if (!text.equals(shownText)) {
            shownText = text;
            getSystemService(NotificationManager.class).notify(NOTIFICATION_ID, notification(text));
        }
    }

    private Notification notification(String text) {
        PendingIntent open = PendingIntent.getActivity(this, 0,
                new Intent(this, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP),
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        PendingIntent stop = PendingIntent.getService(this, 1, new Intent(this, NavigationSyncService.class).setAction(STOP),
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        return new Notification.Builder(this, CHANNEL).setSmallIcon(R.drawable.ic_navigation)
                .setContentTitle("腕上导航后台同步").setContentText(text).setContentIntent(open)
                .setOnlyAlertOnce(true).setOngoing(true).setShowWhen(false)
                .addAction(new Notification.Action.Builder(null, "停止同步", stop).build()).build();
    }

    private void releaseWakeLock() { if (wakeLock != null && wakeLock.isHeld()) wakeLock.release(); }
    @Override public void onDestroy() {
        foreground = false;
        releaseWakeLock();
        stopForeground(STOP_FOREGROUND_REMOVE);
        if (instance == this) instance = null;
        if (status.startsWith("后台同步已运行")) status = "后台同步已停止";
        android.util.Log.i("WristNav", "foreground relay stopped");
        super.onDestroy();
    }
    @Override public IBinder onBind(Intent intent) { return null; }
    @Override protected void dump(FileDescriptor fd, PrintWriter writer, String[] args) {
        writer.println("foreground=" + foreground + " wakeLock=" + (wakeLock != null && wakeLock.isHeld())
                + " nearbyPermission=" + hasDevicePermission(this));
        bridge().dump(writer);
    }
}
