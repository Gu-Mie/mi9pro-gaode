package io.github.mi9pro.navigation;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Shell-only controls for repeatable phone-to-band tests without tapping stale UI bounds. */
public final class DiagnosticReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context, Intent intent) {
        WearBridge bridge = ((NavigationApp) context.getApplicationContext()).bridge();
        String command = intent.getStringExtra("command");
        if ("connect".equals(command)) bridge.connect(false);
        else if ("open".equals(command)) bridge.openWearApp();
    }
}
