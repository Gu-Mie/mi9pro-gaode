package io.github.mi9pro.navigation;

/** A navigation opens the band once; transient notification replacement is not a new trip. */
final class AutoLaunchPolicy {
    static final long EMPTY_GRACE_MS = 1000;
    static final long RETRY_MS = 5000;
    static final int MAX_ATTEMPTS = 3;
    private boolean trip, eligible, opened, pending;
    private int attempts;
    private long emptySince = -1, retryAt, token;

    void update(String status, boolean enabled, boolean notificationsAbsent, long now) {
        eligible = enabled && "active".equals(status);
        if (!enabled || "ended".equals(status) || "paused".equals(status)) {
            reset();
        } else if (eligible) {
            if (emptySince >= 0 && now - emptySince >= EMPTY_GRACE_MS) reset();
            if (!trip) { trip = true; attempts = 0; opened = false; }
            eligible = true;
            emptySince = -1;
        } else if ("idle".equals(status) && notificationsAbsent) {
            // The listener already coalesces remove/repost bursts for 350 ms.
            // A further second with NO Gaode notifications permits a quick new trip.
            // Unreadable text with notifications still present is not an end signal.
            if (emptySince < 0) emptySince = now;
            if (now - emptySince >= EMPTY_GRACE_MS) reset();
        } else {
            // Unavailable/listener loss is not evidence that the user ended the trip.
            emptySince = -1;
        }
    }

    long claim(long now) {
        if (!eligible || !trip || opened || pending || attempts >= MAX_ATTEMPTS || now < retryAt) return 0;
        pending = true;
        attempts++;
        return ++token;
    }

    boolean complete(long request, boolean success, long now) {
        if (!pending || request != token) return false;
        pending = false;
        opened = success;
        retryAt = now + RETRY_MS;
        return true;
    }

    void disconnected(long now) {
        if (pending) { pending = false; token++; retryAt = now + RETRY_MS; }
    }

    void manuallyOpened() { if (trip) { opened = true; pending = false; token++; } }
    int attempts() { return attempts; }
    boolean opened() { return opened; }
    boolean pending() { return pending; }

    private void reset() {
        trip = eligible = opened = pending = false;
        attempts = 0;
        retryAt = 0;
        emptySince = -1;
        token++;
    }
}
