package io.github.mi9pro.navigation;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Restore only the user's saved enabled state after boot or an in-place update. */
public final class SyncRestoreReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context, Intent intent) {
        if (Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction()) || Intent.ACTION_MY_PACKAGE_REPLACED.equals(intent.getAction())) {
            NavigationSyncService.start(context);
        }
    }
}
