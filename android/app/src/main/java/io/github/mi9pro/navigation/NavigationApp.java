package io.github.mi9pro.navigation;

import android.app.Application;

public final class NavigationApp extends Application {
    private WearBridge bridge;
    public synchronized WearBridge bridge() {
        if (bridge == null) bridge = new WearBridge(this);
        return bridge;
    }
}

