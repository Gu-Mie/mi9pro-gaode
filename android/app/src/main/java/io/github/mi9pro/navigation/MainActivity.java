package io.github.mi9pro.navigation;

import android.Manifest;
import android.app.Activity;
import android.app.Dialog;
import android.content.ComponentName;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.res.Configuration;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.graphics.drawable.RippleDrawable;
import android.content.res.ColorStateList;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.provider.Settings;
import android.service.notification.NotificationListenerService;
import android.view.Gravity;
import android.view.View;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.Switch;
import android.widget.TextView;
import java.io.FileDescriptor;
import java.io.PrintWriter;
import java.util.ArrayList;

/** Event-driven daily controls. Permissions and preferences use compact, scrollable sheets. */
public final class MainActivity extends Activity {
    private WearBridge bridge;
    private TextView status, syncDetail, connectionDetail, action;
    private Switch sync;
    private Dialog sheet;
    private boolean dark;
    private int background, surface, ink, muted, line, accent, accentInk;
    private final Runnable refreshUi = this::render;

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        bridge = ((NavigationApp) getApplication()).bridge();
        dark = (getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK)
            == Configuration.UI_MODE_NIGHT_YES;
        background = color(dark ? "#111713" : "#F4F6F0");
        surface = color(dark ? "#202922" : "#FFFFFF");
        ink = color(dark ? "#ECF2E9" : "#202C24");
        muted = color(dark ? "#A7B5A8" : "#707D72");
        line = color(dark ? "#344036" : "#E9EDE5");
        accent = color("#C5EE91");
        accentInk = color("#233A27");

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(background);
        edgeToEdge(getWindow());
        root.setOnApplyWindowInsetsListener((view, insets) -> {
            if (Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets bars = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            } else {
                view.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(),
                    insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            }
            return insets;
        });
        ScrollView scroll = new ScrollView(this);
        scroll.setClipToPadding(false);
        scroll.setVerticalScrollBarEnabled(false);
        root.addView(scroll, new FrameLayout.LayoutParams(-1, -1));
        FrameLayout center = new FrameLayout(this);
        scroll.addView(center);
        LinearLayout content = column();
        content.setPadding(dp(24), dp(22), dp(24), dp(28));
        FrameLayout.LayoutParams centered = new FrameLayout.LayoutParams(
            Math.min(getResources().getDisplayMetrics().widthPixels, dp(600)), -2, Gravity.TOP | Gravity.CENTER_HORIZONTAL);
        center.addView(content, centered);

        LinearLayout header = row();
        LinearLayout heading = column();
        heading.addView(label("腕上导航", 29, ink, true));
        TextView subtitle = label("让每一步，都在腕间", 14, muted, false);
        heading.addView(subtitle, space(-1, -2, 7));
        header.addView(heading, new LinearLayout.LayoutParams(0, -2, 1));
        header.addView(iconButton("settings", "设置", view -> settings()), new LinearLayout.LayoutParams(dp(48), dp(48)));
        content.addView(header, space(-1, -2, 0));

        LinearLayout hero = column();
        hero.setPadding(dp(24), dp(22), dp(24), dp(22));
        hero.setBackground(shape(color("#253C2E"), 28));
        status = label("同步已暂停", 12, accent, true);
        status.setPadding(dp(11), dp(6), dp(11), dp(6));
        status.setBackground(shape(color("#3C5140"), 20));
        status.setAccessibilityLiveRegion(View.ACCESSIBILITY_LIVE_REGION_POLITE);
        hero.addView(status, new LinearLayout.LayoutParams(-2, -2));
        TextView heroTitle = label("导航，抬腕即见", 25, Color.WHITE, true);
        hero.addView(heroTitle, space(-1, -2, 16));
        NavigationArtwork illustration = new NavigationArtwork(this, "devices", accent);
        illustration.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO);
        hero.addView(illustration, space(-1, 104, 10));
        LinearLayout deviceLabels = row();
        TextView phone = label("高德地图", 13, color("#C7D7C9"), false);
        TextView watch = label("小米手环", 13, color("#C7D7C9"), false);
        phone.setGravity(Gravity.CENTER); watch.setGravity(Gravity.CENTER);
        deviceLabels.addView(phone, new LinearLayout.LayoutParams(0, -2, 1));
        deviceLabels.addView(watch, new LinearLayout.LayoutParams(0, -2, 1));
        hero.addView(deviceLabels);
        content.addView(hero, space(-1, -2, 26));

        LinearLayout syncCard = row();
        syncCard.setPadding(dp(20), dp(19), dp(14), dp(19));
        syncCard.setBackground(shape(surface, 24));
        LinearLayout syncCopy = column();
        syncCopy.addView(label("同步导航", 18, ink, true));
        syncDetail = label("已暂停转发", 13, muted, false);
        syncCopy.addView(syncDetail, space(-1, -2, 5));
        syncCard.addView(syncCopy, new LinearLayout.LayoutParams(0, -2, 1));
        sync = toggle("同步导航", bridge.enabled());
        sync.setOnCheckedChangeListener((view, checked) -> {
            if (bridge.enabled() == checked) return;
            bridge.setEnabled(checked);
            if (checked) completeSetup();
            render();
        });
        syncCard.addView(sync, new LinearLayout.LayoutParams(dp(62), dp(48)));
        content.addView(syncCard, space(-1, -2, 16));

        LinearLayout links = column();
        links.setBackground(shape(surface, 24));
        LinearLayout connectionRow = entry("link", "连接与权限", "", view -> connectionSettings());
        connectionDetail = (TextView) ((LinearLayout) connectionRow.getChildAt(1)).getChildAt(1);
        links.addView(connectionRow);
        divider(links, 64);
        links.addView(entry("sliders", "导航偏好", "自动打开 · 屏幕常亮", view -> settings()));
        content.addView(links, space(-1, -2, 16));

        action = filledButton("完成连接设置", view -> completeSetup());
        content.addView(action, space(-1, -2, 16));
        TextView privacy = label("仅同步高德导航通知", 12, muted, false);
        privacy.setGravity(Gravity.CENTER);
        content.addView(privacy, space(-1, -2, 24));
        setContentView(root);
    }

    @Override public void onResume() {
        super.onResume();
        bridge.setUiListener(refreshUi);
        if (NavigationSyncService.hasNotificationAccess(this) && !bridge.listenerConnected) {
            NotificationListenerService.requestRebind(new ComponentName(this, NavigationNotificationListener.class));
        }
        NavigationSyncService.start(this);
        NavigationNotificationListener.requestRefresh();
        render();
    }
    @Override public void onPause() { bridge.setUiListener(null); super.onPause(); }
    @Override public void onDestroy() {
        if (sheet != null) sheet.dismiss();
        super.onDestroy();
    }
    @Override public void dump(String prefix, FileDescriptor fd, PrintWriter writer, String[] args) { bridge.dump(writer); }

    private void render() {
        if (sync.isChecked() != bridge.enabled()) sync.setChecked(bridge.enabled());
        String state;
        boolean setup = false;
        if (!bridge.enabled()) state = "同步已暂停";
        else if (!NavigationSyncService.hasNotificationAccess(this) || !NavigationSyncService.hasDevicePermission(this)) {
            state = "等待授权"; setup = true;
        } else if (!NavigationSyncService.running()) { state = "后台同步未运行"; setup = true; }
        else if (!bridge.hasConnectedNode()) { state = "等待手环连接"; setup = true; }
        else if (!bridge.listenerConnected) { state = "正在连接通知服务"; setup = true; }
        else state = bridge.isNavigationActive() ? "正在同步高德导航" : "已就绪 · 等待导航";
        setText(status, state);
        setText(syncDetail, bridge.enabled() ? "高德开始导航后自动同步" : "开启后自动转发导航");
        String connection = !NavigationSyncService.hasNotificationAccess(this) ? "需要通知使用权"
            : !NavigationSyncService.hasDevicePermission(this) ? "需要附近设备权限"
            : bridge.hasConnectedNode() ? "手机互联已连接" : "通过小米运动健康连接";
        setText(connectionDetail, connection);
        action.setVisibility(setup ? View.VISIBLE : View.GONE);
    }

    private void completeSetup() {
        dismissSheet();
        if (!bridge.enabled()) bridge.setEnabled(true);
        if (!NavigationSyncService.hasNotificationAccess(this)) {
            LinearLayout options = sheetContent("允许读取导航通知", "仅处理高德导航通知，发送至配对手环。");
            options.addView(filledButton("去授权", view -> {
                dismissSheet();
                startActivity(new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS));
            }), space(-1, -2, 22));
            showSheet(options);
            return;
        }
        ArrayList<String> permissions = new ArrayList<>();
        if (Build.VERSION.SDK_INT >= 31 && !NavigationSyncService.hasDevicePermission(this)) permissions.add(Manifest.permission.BLUETOOTH_CONNECT);
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) permissions.add(Manifest.permission.POST_NOTIFICATIONS);
        if (!permissions.isEmpty()) { requestPermissions(permissions.toArray(new String[0]), 1); return; }
        NavigationSyncService.start(this);
        NotificationListenerService.requestRebind(new ComponentName(this, NavigationNotificationListener.class));
        if (!bridge.hasConnectedNode()) bridge.connect(true);
        render();
    }

    @Override public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(requestCode, permissions, results);
        if (requestCode == 1) {
            NavigationSyncService.start(this);
            if (NavigationSyncService.hasDevicePermission(this) && !bridge.hasConnectedNode()) bridge.connect(true);
            render();
        }
    }

    private void settings() {
        LinearLayout options = sheetContent("导航偏好", "按你的习惯，调整腕上体验");
        preference(options, "自动打开手环导航", "每次开始导航时打开一次", bridge.autoOpenEnabled(), bridge::setAutoOpenEnabled);
        divider(options, 0);
        preference(options, "导航时手环常亮", "关闭后可减少屏幕耗电", bridge.keepScreenOnEnabled(), bridge::setKeepScreenOnEnabled);
        TextView version = label("腕上导航  " + BuildConfig.VERSION_NAME, 12, muted, false);
        options.addView(version, space(-1, -2, 16));
        showSheet(options);
    }

    private void connectionSettings() {
        LinearLayout options = sheetContent("连接与权限", "手机连接小米运动健康后即可同步");
        options.addView(entry("bell", "通知与设备授权", "检查导航通知和手环连接", view -> completeSetup()), space(-1, -2, 14));
        divider(options, 0);
        options.addView(entry("battery", "后台运行", "允许自启动，省电策略设为无限制", view -> {
            dismissSheet();
            PowerManager power = getSystemService(PowerManager.class);
            if (!power.isIgnoringBatteryOptimizations(getPackageName())) {
                try { startActivity(new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:" + getPackageName()))); }
                catch (android.content.ActivityNotFoundException error) { appSettings(); }
            } else appSettings();
        }));
        showSheet(options);
    }

    private LinearLayout sheetContent(String title, String description) {
        LinearLayout body = column();
        body.setPadding(dp(24), dp(8), dp(24), dp(26));
        LinearLayout header = row();
        TextView name = label(title, 24, ink, true);
        header.addView(name, new LinearLayout.LayoutParams(0, -2, 1));
        header.addView(iconButton("close", "关闭设置", view -> dismissSheet()), new LinearLayout.LayoutParams(dp(48), dp(48)));
        body.addView(header);
        body.addView(label(description, 14, muted, false), space(-1, -2, 4));
        return body;
    }

    private void showSheet(LinearLayout body) {
        dismissSheet();
        Dialog dialog = new Dialog(this);
        dialog.requestWindowFeature(Window.FEATURE_NO_TITLE);
        LinearLayout shell = column();
        shell.setBackground(shape(surface, 28));
        View handle = new View(this);
        handle.setBackground(shape(line, 4));
        LinearLayout.LayoutParams handleSize = space(36, 4, 12);
        handleSize.gravity = Gravity.CENTER_HORIZONTAL;
        shell.addView(handle, handleSize);
        ScrollView scrolling = new ScrollView(this);
        scrolling.setVerticalScrollBarEnabled(false);
        scrolling.addView(body);
        shell.addView(scrolling, new LinearLayout.LayoutParams(-1, -2));
        dialog.setContentView(shell);
        dialog.setCanceledOnTouchOutside(true);
        Window window = dialog.getWindow();
        window.setBackgroundDrawableResource(android.R.color.transparent);
        window.addFlags(android.view.WindowManager.LayoutParams.FLAG_DIM_BEHIND);
        window.setDimAmount(0.35f);
        window.setGravity(Gravity.BOTTOM | Gravity.CENTER_HORIZONTAL);
        window.setNavigationBarColor(surface);
        window.setStatusBarColor(Color.TRANSPARENT);
        if (Build.VERSION.SDK_INT >= 29) window.setNavigationBarContrastEnforced(false);
        shell.setOnApplyWindowInsetsListener((view, insets) -> {
            view.setPadding(0, 0, 0, insets.getSystemWindowInsetBottom());
            return insets;
        });
        dialog.show();
        window.setLayout(Math.min(getResources().getDisplayMetrics().widthPixels, dp(600)), -2);
        systemBarIcons(window);
        int maxHeight = Math.round(getResources().getDisplayMetrics().heightPixels * 0.85f);
        shell.post(() -> {
            if (dialog.isShowing() && shell.getHeight() > maxHeight) {
                scrolling.setLayoutParams(new LinearLayout.LayoutParams(-1,
                    maxHeight - dp(16) - shell.getPaddingBottom()));
            }
        });
        sheet = dialog;
    }

    private void dismissSheet() { if (sheet != null) { sheet.dismiss(); sheet = null; } }
    private void appSettings() { startActivity(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + getPackageName()))); }
    private interface Preference { void set(boolean value); }
    private void preference(LinearLayout parent, String title, String detail, boolean checked, Preference preference) {
        LinearLayout container = row();
        container.setPadding(0, dp(20), 0, dp(20));
        LinearLayout copy = column();
        copy.addView(label(title, 16, ink, true));
        copy.addView(label(detail, 13, muted, false), space(-1, -2, 5));
        container.addView(copy, new LinearLayout.LayoutParams(0, -2, 1));
        Switch toggle = toggle(title, checked);
        toggle.setOnCheckedChangeListener((button, value) -> preference.set(value));
        container.addView(toggle, new LinearLayout.LayoutParams(dp(62), dp(48)));
        parent.addView(container, space(-1, -2, 6));
    }

    private Switch toggle(String title, boolean checked) {
        Switch toggle = new Switch(this);
        toggle.setContentDescription(title);
        toggle.setChecked(checked);
        toggle.setShowText(false);
        toggle.setSwitchMinWidth(dp(46));
        toggle.setGravity(Gravity.CENTER);
        toggle.setThumbTintList(new ColorStateList(new int[][] { {android.R.attr.state_checked}, {} },
            new int[] { accentInk, dark ? color("#A7B5A8") : Color.WHITE }));
        toggle.setTrackTintList(new ColorStateList(new int[][] { {android.R.attr.state_checked}, {} },
            new int[] { accent, dark ? color("#556358") : color("#C4CDC2") }));
        return toggle;
    }
    private LinearLayout entry(String icon, String title, String detail, View.OnClickListener listener) {
        LinearLayout entry = row();
        entry.setPadding(dp(16), dp(17), dp(16), dp(17));
        entry.setMinimumHeight(dp(76));
        entry.setBackground(ripple(surface, 22));
        entry.setOnClickListener(listener);
        entry.setFocusable(true);
        entry.addView(new NavigationArtwork(this, icon, muted), new LinearLayout.LayoutParams(dp(26), dp(26)));
        LinearLayout copy = column();
        copy.addView(label(title, 16, ink, true));
        copy.addView(label(detail, 12, muted, false), space(-1, -2, 4));
        LinearLayout.LayoutParams copySize = new LinearLayout.LayoutParams(0, -2, 1);
        copySize.setMargins(dp(14), 0, dp(8), 0);
        entry.addView(copy, copySize);
        entry.addView(new NavigationArtwork(this, "chevron", muted), new LinearLayout.LayoutParams(dp(16), dp(20)));
        return entry;
    }
    private View iconButton(String icon, String title, View.OnClickListener listener) {
        NavigationArtwork view = new NavigationArtwork(this, icon, ink);
        view.setPadding(dp(13), dp(13), dp(13), dp(13));
        view.setBackground(ripple(surface, 24));
        view.setContentDescription(title);
        view.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_YES);
        view.setOnClickListener(listener);
        view.setFocusable(true);
        return view;
    }
    private TextView filledButton(String title, View.OnClickListener listener) {
        TextView view = label(title, 16, accentInk, true);
        view.setGravity(Gravity.CENTER);
        view.setPadding(dp(16), dp(16), dp(16), dp(16));
        view.setMinimumHeight(dp(54));
        view.setBackground(ripple(accent, 18));
        view.setOnClickListener(listener);
        view.setFocusable(true);
        view.setAccessibilityDelegate(new View.AccessibilityDelegate() {
            @Override public void onInitializeAccessibilityNodeInfo(View host, android.view.accessibility.AccessibilityNodeInfo info) {
                super.onInitializeAccessibilityNodeInfo(host, info);
                info.setClassName("android.widget.Button");
            }
        });
        return view;
    }
    private void divider(LinearLayout parent, int inset) {
        View divider = new View(this); divider.setBackgroundColor(line);
        LinearLayout.LayoutParams size = new LinearLayout.LayoutParams(-1, dp(1));
        size.setMarginStart(dp(inset)); size.setMarginEnd(dp(20));
        parent.addView(divider, size);
    }
    private TextView label(String value, int size, int tint, boolean bold) {
        TextView text = new TextView(this);
        text.setText(value); text.setTextSize(size); text.setTextColor(tint);
        text.setFontFeatureSettings("kern");
        text.setIncludeFontPadding(false);
        text.setTypeface(Typeface.create(bold ? "sans-serif-medium" : "sans-serif", Typeface.NORMAL));
        text.setLineSpacing(dp(3), 1f);
        return text;
    }
    private LinearLayout column() { LinearLayout view = new LinearLayout(this); view.setOrientation(LinearLayout.VERTICAL); return view; }
    private LinearLayout row() { LinearLayout view = new LinearLayout(this); view.setOrientation(LinearLayout.HORIZONTAL); view.setGravity(Gravity.CENTER_VERTICAL); return view; }
    private LinearLayout.LayoutParams space(int width, int height, int top) {
        LinearLayout.LayoutParams size = new LinearLayout.LayoutParams(width < 0 ? width : dp(width), height < 0 ? height : dp(height));
        size.topMargin = dp(top); return size;
    }
    private GradientDrawable shape(int tint, int radius) {
        GradientDrawable shape = new GradientDrawable(); shape.setColor(tint); shape.setCornerRadius(dp(radius)); return shape;
    }
    private RippleDrawable ripple(int tint, int radius) {
        return new RippleDrawable(ColorStateList.valueOf(color(dark ? "#285B765E" : "#183F6245")), shape(tint, radius), null);
    }
    private void edgeToEdge(Window window) {
        if (Build.VERSION.SDK_INT >= 30) window.setDecorFitsSystemWindows(false);
        else window.getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
        window.setStatusBarColor(Color.TRANSPARENT); window.setNavigationBarColor(Color.TRANSPARENT);
        if (Build.VERSION.SDK_INT >= 29) window.setNavigationBarContrastEnforced(false);
        systemBarIcons(window);
    }
    private void systemBarIcons(Window window) {
        // HyperOS needs a created decor view before PhoneWindow.getInsetsController().
        View decor = window.getDecorView();
        if (Build.VERSION.SDK_INT >= 30) {
            int flags = WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS;
            decor.post(() -> {
                WindowInsetsController controller = decor.getWindowInsetsController();
                if (controller != null) controller.setSystemBarsAppearance(dark ? 0 : flags, flags);
            });
        } else {
            int flags = View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
            int current = window.getDecorView().getSystemUiVisibility();
            window.getDecorView().setSystemUiVisibility(dark ? current & ~flags : current | flags);
        }
    }
    private void setText(TextView view, String value) { if (!value.contentEquals(view.getText())) view.setText(value); }
    private int color(String value) { return Color.parseColor(value); }
    private int dp(int value) { return Math.round(value * getResources().getDisplayMetrics().density); }
}
