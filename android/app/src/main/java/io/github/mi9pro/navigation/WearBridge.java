package io.github.mi9pro.navigation;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import com.xiaomi.xms.wearable.Wearable;
import com.xiaomi.xms.wearable.auth.Permission;
import com.xiaomi.xms.wearable.message.MessageApi;
import com.xiaomi.xms.wearable.node.NodeApi;
import com.xiaomi.xms.wearable.service.OnServiceConnectionListener;
import org.json.JSONObject;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import java.io.PrintWriter;
import java.util.ArrayDeque;

/** One serialized transport, latest snapshot only, bounded retry and device acknowledgements. */
public final class WearBridge {
    private final Context context;
    private final SharedPreferences preferences;
    private final Handler main = new Handler(Looper.getMainLooper());
    private final NodeApi nodes;
    private final MessageApi messages;
    private final String session = UUID.randomUUID().toString();
    private String nodeId;
    private boolean discovering, sending;
    private long sequence, nextConnect, connectGeneration, sendGeneration;
    private NavigationParser.Result latest = state("idle", "请在高德地图开始导航");
    private NavigationParser.Result realLatest = latest;
    public boolean listenerConnected;
    public String statusText = "请连接小米运动健康并授权互联";
    public String lastAmapText = "尚未读取到高德通知";
    public long lastAckAt;
    private final ArrayDeque<String> events = new ArrayDeque<>();
    private String notificationState = "尚未检查";
    private long lastNotificationCheck;
    private int notificationCount = -1;
    private final AutoLaunchPolicy autoLaunch = new AutoLaunchPolicy();
    private final SendPolicy sendPolicy = new SendPolicy();
    private final Runnable sendTask = this::sendLatest;
    private Runnable uiListener;
    public void setUiListener(Runnable listener) {
        if (uiListener != null) main.removeCallbacks(uiListener);
        uiListener = listener;
    }
    private void notifyUi() {
        if (uiListener == null) return;
        main.removeCallbacks(uiListener);
        main.post(uiListener);
    }
    public String autoLaunchStatus = "等待高德开始导航";

    private void event(String text) {
        android.util.Log.i("WristNav", text);
        notifyUi();
        if (events.size() == 32) events.removeFirst();
        events.addLast(SystemClock.elapsedRealtime() + " " + text);
    }

    public void notificationChecked(int count, int readable, NavigationParser.Result result) {
        lastNotificationCheck = System.currentTimeMillis();
        notificationCount = count;
        String state = "高德通知=" + count + "，有文字=" + readable + "，识别=" + (result == null ? "无" : result.status);
        if (!state.equals(notificationState)) event(state);
        notificationState = state;
    }

    public void dump(PrintWriter writer) {
        writer.println("WristNavigation diagnostics (phone 0.2.0)");
        writer.println("enabled=" + enabled() + " listenerConnected=" + listenerConnected);
        writer.println("notification=" + notificationState + " checkedAt=" + lastNotificationCheck);
        writer.println("status=" + statusText);
        writer.println("nodeReady=" + (nodeId != null) + " discovering=" + discovering + " sending=" + sending);
        writer.println("outgoing=" + latest.status + " sequence=" + sequence + " lastAckAt=" + lastAckAt);
        writer.println("background=" + NavigationSyncService.status());
        writer.println("autoOpen=" + autoOpenEnabled() + " attempts=" + autoLaunch.attempts()
                + " opened=" + autoLaunch.opened() + " pending=" + autoLaunch.pending() + " status=" + autoLaunchStatus);
        for (String entry : events) writer.println("event=" + entry);
        writer.flush();
    }

    WearBridge(Context context) {
        this.context = context;
        preferences = context.getSharedPreferences("settings", Context.MODE_PRIVATE);
        nodes = Wearable.getNodeApi(context);
        messages = Wearable.getMessageApi(context);
        Wearable.getServiceApi(context).registerServiceConnectionListener(new OnServiceConnectionListener() {
            @Override public void onServiceConnected() { main.post(() -> { event("XMS service connected"); nextConnect = 0; if (enabled()) connect(false); }); }
            @Override public void onServiceDisconnected() { main.post(() -> lost("小米运动健康连接已断开")); }
        });
    }

    public boolean enabled() { return preferences.getBoolean("enabled", false); }
    public boolean autoOpenEnabled() { return preferences.getBoolean("auto_open", true); }
    public boolean keepScreenOnEnabled() { return preferences.getBoolean("keep_screen_on", true); }
    public void setKeepScreenOnEnabled(boolean value) {
        preferences.edit().putBoolean("keep_screen_on", value).apply();
        sendLatest();
    }
    public long pollIntervalMs() { return "active".equals(realLatest.status) ? sendPolicy.nextReadDelay(SystemClock.elapsedRealtime()) : 60000; }
    public String navigationStatus() { return realLatest.status; }
    public boolean hasConnectedNode() { return nodeId != null; }
    public boolean isNavigationActive() {
        long age = System.currentTimeMillis() - lastNotificationCheck;
        return enabled() && listenerConnected && "active".equals(realLatest.status) && age >= 0 && age < 20000;
    }
    public void setAutoOpenEnabled(boolean value) {
        preferences.edit().putBoolean("auto_open", value).apply();
        updateControlState();
        maybeAutoLaunch();
    }
    public String preview() { return latest.instruction + (latest.distance.isEmpty() ? "" : " · " + latest.distance) + "\n" + latest.rawText; }

    public void setEnabled(boolean value) {
        preferences.edit().putBoolean("enabled", value).apply();
        if (value) {
            // Notifications may have ended while synchronization was disabled.
            realLatest = state("idle", "等待导航");
            lastNotificationCheck = 0;
            notificationCount = -1;
        }
        latest = value ? realLatest : state("paused", "手机已暂停同步");
        sendPolicy.reset();
        updateControlState();
        if (value) NavigationSyncService.start(context);
        else NavigationSyncService.stop(context);
        if (value) connect(false);
        NavigationNotificationListener.requestRefresh();
        notifyUi();
        sendLatest();
    }

    public void updateFromNotifications(NavigationParser.Result result) {
        realLatest = result == null ? new NavigationParser.Result("idle", "高德地图",
                notificationCount > 0 ? NavigationParser.clip(lastAmapText, 480) : "",
                "unknown", "等待导航", "") : result;
        updateControlState();
        if (!enabled()) return;
        latest = realLatest;
        if (nodeId == null) connect(false);
        sendLatest();
    }

    public void unavailable(String reason) {
        notificationCount = -1;
        realLatest = state("unavailable", reason);
        updateControlState();
        if (!enabled()) return;
        latest = realLatest;
        sendLatest();
    }

    public void connect(boolean requestPermission) {
        if (discovering || (!requestPermission && SystemClock.elapsedRealtime() < nextConnect)) return;
        if (nodeId != null && !requestPermission) { sendLatest(); return; }
        discovering = true;
        final long generation = ++connectGeneration;
        nextConnect = SystemClock.elapsedRealtime() + 10000;
        statusText = "正在查找已配对的手环…";
        event("discover, requestPermission=" + requestPermission);
        main.postDelayed(() -> {
            if (generation == connectGeneration && discovering) lost("互联查询超时，请打开小米运动健康后重试");
        }, 12000);
        nodes.getConnectedNodes().addOnSuccessListener(found -> main.post(() -> {
            if (generation != connectGeneration) return;
            event("connected devices=" + found.size());
            if (found.isEmpty()) { lost("未发现手环，请先在小米运动健康中连接"); return; }
            if (found.size() > 1) { lost("发现多个设备，请只保留目标手环连接后重试"); return; }
            final String selected = found.get(0).id;
            if (requestPermission) {
                Wearable.getAuthApi(context).requestPermission(selected, Permission.DEVICE_MANAGER)
                    .addOnSuccessListener(granted -> main.post(() -> check(selected, generation)))
                    .addOnFailureListener(error -> main.post(() -> failConnect(generation, "互联授权失败：" + error.getMessage())));
            } else check(selected, generation);
        })).addOnFailureListener(error -> main.post(() -> failConnect(generation, "无法查询手环：" + error.getMessage())));
    }

    private void check(String selected, long generation) {
        if (generation != connectGeneration) return;
        Wearable.getAuthApi(context).checkPermission(selected, Permission.DEVICE_MANAGER)
            .addOnSuccessListener(granted -> main.post(() -> {
                if (generation != connectGeneration) return;
                event("permission=" + granted);
                if (!Boolean.TRUE.equals(granted)) { lost("请点击「连接并授权手环」完成互联授权"); return; }
                nodes.isWearAppInstalled(selected).addOnSuccessListener(installed -> main.post(() -> {
                    if (generation != connectGeneration) return;
                    event("wear app installed=" + installed);
                    if (!Boolean.TRUE.equals(installed)) { lost("未检测到配套手环应用，请先安装同签名 RPK"); return; }
                    if (selected.equals(nodeId)) {
                        connected(selected, generation, true);
                        return;
                    }
                    if (nodeId != null) messages.removeListener(nodeId);
                    nodeId = null;
                    messages.addListener(selected, (source, bytes) -> main.post(() -> receive(source, bytes)))
                        .addOnSuccessListener(ignored -> main.post(() -> connected(selected, generation, false)))
                        .addOnFailureListener(error -> main.post(() -> failConnect(generation, "接收监听失败：" + error.getMessage())));
                })).addOnFailureListener(error -> main.post(() -> failConnect(generation, "无法检查手环应用：" + error.getMessage())));
            })).addOnFailureListener(error -> main.post(() -> failConnect(generation, "权限检查失败：" + error.getMessage())));
    }

    private void connected(String selected, long generation, boolean reused) {
        if (generation != connectGeneration) return;
        nodeId = selected;
        discovering = false;
        statusText = "互联已就绪，等待导航数据";
        event(reused ? "message listener reused" : "message listener registered");
        NavigationSyncService.refresh();
        sendPolicy.reset();
        sendLatest();
    }

    public void openWearApp() {
        if (nodeId == null) { statusText = "请先连接并授权手环"; return; }
        autoLaunch.manuallyOpened();
        event("manual wear launch requested");
        nodes.launchWearApp(nodeId, "/pages/index")
            .addOnSuccessListener(ignored -> main.post(() -> { event("manual wear launch accepted"); sendPolicy.reset(); sendLatest(); }))
            .addOnFailureListener(error -> main.post(() -> statusText = "打开失败，请在手环手动打开：" + error.getMessage()));
    }

    private void updateControlState() {
        autoLaunch.update(realLatest.status, enabled() && autoOpenEnabled(), notificationCount == 0, SystemClock.elapsedRealtime());
        if (!enabled() || !autoOpenEnabled()) autoLaunchStatus = "自动打开已关闭";
        else if (!"active".equals(realLatest.status)) autoLaunchStatus = "等待高德开始导航";
        else if (autoLaunch.opened()) autoLaunchStatus = "已请求打开手环，本次导航不重复打开";
        NavigationSyncService.refresh();
    }

    private void maybeAutoLaunch() {
        if (nodeId == null || !isNavigationActive() || !"active".equals(latest.status)) return;
        long request = autoLaunch.claim(SystemClock.elapsedRealtime());
        if (request == 0) return;
        String selected = nodeId;
        autoLaunchStatus = "正在自动打开手环导航…";
        event("auto wear launch attempt=" + autoLaunch.attempts());
        main.postDelayed(() -> finishAutoLaunch(request, false, "打开请求超时"), 10000);
        try {
            nodes.launchWearApp(selected, "/pages/index")
                .addOnSuccessListener(ignored -> main.post(() -> finishAutoLaunch(request, true, "")))
                .addOnFailureListener(error -> main.post(() -> finishAutoLaunch(request, false, error.getMessage())));
        } catch (RuntimeException error) { finishAutoLaunch(request, false, error.getMessage()); }
    }

    private void finishAutoLaunch(long request, boolean success, String detail) {
        if (!autoLaunch.complete(request, success, SystemClock.elapsedRealtime())) return;
        if (success) {
            autoLaunchStatus = "已请求打开手环，本次导航不重复打开";
            event("auto wear launch accepted");
            sendPolicy.reset();
            sendLatest();
        } else {
            autoLaunchStatus = "自动打开失败：" + detail;
            event("auto wear launch failed: " + detail);
            main.postDelayed(this::maybeAutoLaunch, AutoLaunchPolicy.RETRY_MS);
        }
    }

    private void receive(String source, byte[] bytes) {
        event("message received, matchingNode=" + (nodeId != null && nodeId.equals(source)) + " bytes=" + (bytes == null ? 0 : bytes.length));
        if (nodeId == null || !nodeId.equals(source) || bytes == null || bytes.length > 4096) return;
        try {
            JSONObject packet = new JSONObject(new String(bytes, StandardCharsets.UTF_8));
            if (packet.optInt("v") != 1) return;
            if ("ready".equals(packet.optString("type"))) { event("wear app ready"); sendPolicy.reset(); sendLatest(); }
            if ("ack".equals(packet.optString("type")) && session.equals(packet.optString("session"))
                    && packet.optLong("seq") == sequence) {
                lastAckAt = System.currentTimeMillis();
                statusText = "手环已确认收到";
                event("ack sequence=" + sequence);
            }
        } catch (Exception ignored) { /* Ignore malformed peer frames, never log navigation contents. */ }
    }

    private void sendLatest() {
        maybeAutoLaunch();
        main.removeCallbacks(sendTask);
        if (nodeId == null || sending) return;
        // Before the first permission grant, do not emit a misleading live state.
        NavigationParser.Result outgoing = enabled() ? latest : state("paused", "手机已暂停同步");
        String fingerprint = outgoing.fingerprint() + "\n" + keepScreenOnEnabled();
        long delay = sendPolicy.delay(fingerprint, "active".equals(outgoing.status), SystemClock.elapsedRealtime());
        if (delay != 0) {
            // Heartbeats require a fresh notification read; only defer short update bursts here.
            if (delay > 0 && delay <= SendPolicy.MIN_UPDATE_MS) main.postDelayed(sendTask, delay);
            return;
        }
        try {
            JSONObject packet = new JSONObject();
            packet.put("v", 1).put("type", "navigation").put("session", session).put("seq", ++sequence)
                .put("status", outgoing.status).put("title", outgoing.title).put("rawText", outgoing.rawText)
                .put("maneuver", outgoing.maneuver).put("instruction", outgoing.instruction)
                .put("distance", outgoing.distance).put("sentAt", System.currentTimeMillis())
                .put("keepScreenOn", keepScreenOnEnabled());
            byte[] data = packet.toString().getBytes(StandardCharsets.UTF_8);
            if (data.length > 4096) { statusText = "通知过长，发送已跳过"; return; }
            final long generation = ++sendGeneration;
            sending = true;
            sendPolicy.sent(fingerprint, SystemClock.elapsedRealtime());
            statusText = "正在发送到手环…";
            event("send sequence=" + sequence + " status=" + outgoing.status + " bytes=" + data.length);
            main.postDelayed(() -> { if (sending && generation == sendGeneration) lost("发送超时，请检查手环应用是否打开"); }, 10000);
            messages.sendMessage(nodeId, data).addOnSuccessListener(ignored -> main.post(() -> {
                if (generation != sendGeneration) return;
                sending = false;
                event("SDK send succeeded");
                if (!"手环已确认收到".equals(statusText)) statusText = "已发送，等待手环确认";
                // A changed snapshot during an in-flight send supersedes the old one immediately.
                sendLatest();
            })).addOnFailureListener(error -> main.post(() -> {
                if (generation == sendGeneration) lost("发送失败：" + error.getMessage());
            }));
        } catch (Exception error) { lost("无法发送：" + error.getMessage()); }
    }

    private void failConnect(long generation, String message) { if (generation == connectGeneration) lost(message); }
    private void lost(String message) {
        main.removeCallbacks(sendTask);
        sendPolicy.reset();
        String old = nodeId;
        nodeId = null;
        discovering = false;
        sending = false;
        connectGeneration++;
        sendGeneration++;
        nextConnect = SystemClock.elapsedRealtime() + 10000;
        autoLaunch.disconnected(SystemClock.elapsedRealtime());
        NavigationSyncService.refresh();
        statusText = message;
        event(message);
        if (old != null) messages.removeListener(old);
    }
    private static NavigationParser.Result state(String status, String text) {
        return new NavigationParser.Result(status, "腕上导航", text, "unknown", text, "");
    }
}
