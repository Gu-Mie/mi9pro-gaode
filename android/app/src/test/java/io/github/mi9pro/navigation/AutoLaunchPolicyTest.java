package io.github.mi9pro.navigation;

import org.junit.Test;
import static org.junit.Assert.*;

public class AutoLaunchPolicyTest {
    @Test public void capturedQuickRestartAfter1983MillisecondsStartsANewTrip() {
        AutoLaunchPolicy policy = opened();
        policy.update("idle", true, true, 100);
        policy.update("active", true, false, 2083);
        long request = policy.claim(2083);
        assertTrue(request > 0);
        assertEquals(1, policy.attempts());
        assertTrue(policy.complete(request, true, 2100));
        policy.update("active", true, false, 10000);
        assertEquals(0, policy.claim(10000));
    }

    @Test public void unrecognizedNotificationsDoNotCountAsEndingNavigation() {
        AutoLaunchPolicy policy = opened();
        policy.update("idle", true, false, 100);
        policy.update("idle", true, false, 30000);
        policy.update("active", true, false, 60000);
        assertEquals(0, policy.claim(60000));
    }

    @Test public void losingListenerDuringEmptyGapDoesNotConfirmAnEnd() {
        AutoLaunchPolicy policy = opened();
        policy.update("idle", true, true, 100);
        policy.update("unavailable", true, false, 500);
        policy.update("active", true, false, 30000);
        assertEquals(0, policy.claim(30000));
    }

    @Test public void opensOnceDespiteUpdatesAndUserLeavingThePage() {
        AutoLaunchPolicy policy = new AutoLaunchPolicy();
        policy.update("active", true, false, 0);
        long request = policy.claim(0);
        assertTrue(request > 0);
        assertEquals(0, policy.claim(1));
        assertTrue(policy.complete(request, true, 10));
        for (int time = 8000; time < 80000; time += 8000) {
            policy.update("active", true, false, time);
            assertEquals(0, policy.claim(time));
        }
    }

    @Test public void aNewTripLaunchesAfterEndOrSustainedAbsence() {
        for (String end : new String[]{"ended", "idle"}) {
            AutoLaunchPolicy policy = opened();
            policy.update(end, true, "idle".equals(end), 100);
            policy.update("active", true, false, 10000);
            assertTrue(end, policy.claim(10000) > 0);
        }
    }

    @Test public void notificationReplacementOrListenerLossDoesNotStartAnotherTrip() {
        for (String status : new String[]{"idle", "unavailable"}) {
            AutoLaunchPolicy policy = opened();
            policy.update(status, true, "idle".equals(status), 100);
            assertEquals(0, policy.claim(100));
            policy.update("active", true, false, 500);
            assertEquals(0, policy.claim(500));
        }
    }

    @Test public void failedLaunchRetriesWithBackoffAndStopsAfterThreeAttempts() {
        AutoLaunchPolicy policy = new AutoLaunchPolicy();
        policy.update("active", true, false, 0);
        for (int i = 0; i < 3; i++) {
            long time = i * 6000L;
            long request = policy.claim(time);
            assertTrue(request > 0);
            assertTrue(policy.complete(request, false, time));
            assertEquals(0, policy.claim(time + 4999));
        }
        assertEquals(0, policy.claim(60000));
    }

    @Test public void lateCallbacksCannotCompleteANewerTripOrConnection() {
        AutoLaunchPolicy policy = new AutoLaunchPolicy();
        policy.update("active", true, false, 0);
        long old = policy.claim(0);
        policy.update("ended", true, false, 10);
        policy.update("active", true, false, 20);
        long current = policy.claim(20);
        assertFalse(policy.complete(old, true, 30));
        policy.disconnected(40);
        assertFalse(policy.complete(current, true, 50));
        assertEquals(0, policy.claim(5000));
        assertTrue(policy.claim(5040) > 0);
    }

    @Test public void disablingCancelsRetriesAndDemoNeverAutoLaunches() {
        AutoLaunchPolicy policy = new AutoLaunchPolicy();
        for (String status : new String[]{"demo", "idle", "ended", "paused", "unavailable"}) {
            policy.update(status, true, "idle".equals(status), 0);
            assertEquals(0, policy.claim(0));
        }
        policy.update("active", true, false, 0);
        long old = policy.claim(0);
        policy.update("active", false, false, 10);
        assertFalse(policy.complete(old, false, 20));
        assertEquals(0, policy.claim(30000));
        policy.update("active", true, false, 40000);
        assertTrue(policy.claim(40000) > 0);
    }

    @Test public void delayedConnectionStillLaunchesAndManualOpenConsumesTheTrip() {
        AutoLaunchPolicy policy = new AutoLaunchPolicy();
        policy.update("active", true, false, 0);
        policy.update("active", true, false, 8000);
        assertTrue(policy.claim(16000) > 0);
        policy.manuallyOpened();
        assertEquals(0, policy.claim(32000));
    }

    private AutoLaunchPolicy opened() {
        AutoLaunchPolicy policy = new AutoLaunchPolicy();
        policy.update("active", true, false, 0);
        policy.complete(policy.claim(0), true, 1);
        return policy;
    }
}
