package io.github.mi9pro.navigation;

import org.junit.Test;
import static org.junit.Assert.*;

/** Synthetic edge cases plus a captured Xiaomi 15 / Gaode 16.22 navigation format. */
public class NavigationParserTest {
    private NavigationParser.Result parse(String text) {
        return NavigationParser.parse(NavigationParser.AMAP_PACKAGE, true, "高德地图", text);
    }
    @Test public void extractsTurnDistanceAndKeepsRawText() {
        var result = parse("前方200米后右转，进入示例路");
        assertEquals("right", result.maneuver);
        assertEquals("200 米", result.distance);
        assertTrue(result.rawText.contains("进入示例路"));
    }
    @Test public void acceptsDistanceWithoutOngoingFlag() {
        var result = NavigationParser.parse(NavigationParser.AMAP_PACKAGE, false, "500米后左转");
        assertEquals("left", result.maneuver);
    }
    @Test public void handlesDecimalKilometersAndUTurnBeforeLeft() {
        var result = parse("前方1.2公里掉头");
        assertEquals("uturn", result.maneuver);
        assertEquals("1.2 公里", result.distance);
    }
    @Test public void ignoresOtherAppsAndPromotions() {
        assertNull(NavigationParser.parse("com.example.chat", true, "200米后左转"));
        assertNull(NavigationParser.parse(NavigationParser.AMAP_PACKAGE, false, "开启导航享优惠"));
        assertNull(parse("领取打车优惠券"));
    }
    @Test public void doesNotUseTotalRemainingDistanceAsTurnDistance() {
        assertEquals("", parse("导航中，剩余3公里，右转进入示例路").distance);
        assertEquals("", parse("导航中，剩余3公里右转").distance);
        assertEquals("200 米", parse("导航中，剩余3公里，前方200米右转").distance);
    }
    @Test public void preservesUnknownNavigationInsteadOfGuessingStraight() {
        var result = parse("步行导航中，剩余15分钟，1.2公里");
        assertEquals("active", result.status);
        assertEquals("unknown", result.maneuver);
        assertEquals("", result.distance);
    }
    @Test public void arrivalIsOnlyWhenExplicitlyCompleted() {
        assertEquals("ended", parse("已到达目的地，导航结束").status);
        assertEquals("active", parse("步行导航，前方200米到达目的地").status);
    }
    @Test public void deduplicatesExtrasAndLimitsPayload() {
        var result = NavigationParser.parse(NavigationParser.AMAP_PACKAGE, true, "高德导航", "200米右转", "200米右转");
        assertEquals("高德导航\n200米右转", result.rawText);
        assertTrue(parse("导航中" + "示例道路".repeat(300)).rawText.length() <= 480);
    }
    @Test public void handlesMissingFields() {
        assertNull(NavigationParser.parse(NavigationParser.AMAP_PACKAGE, true, null, " "));
    }
    @Test public void parsesCapturedHyperOsWalkingNotificationWithoutOngoingFlag() {
        var result = NavigationParser.parse(NavigationParser.AMAP_PACKAGE, false, "直行152米", "高德导航中");
        assertNotNull(result);
        assertEquals("active", result.status);
        assertEquals("straight", result.maneuver);
        assertEquals("152 米", result.distance);
    }
    @Test public void distanceAfterInstructionDoesNotConsumeTripSummary() {
        assertEquals("", parse("直行，剩余152米").distance);
        assertEquals("", parse("直行\n152米后右转").distance);
        assertEquals("", parse("右转进入示例路，剩余152米").distance);
        assertEquals("1.2 公里", parse("直行1.2公里").distance);
    }
}
