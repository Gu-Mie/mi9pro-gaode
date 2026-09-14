package io.github.mi9pro.navigation;

import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Pure text heuristics; no route is calculated and no direction is guessed from icons. */
public final class NavigationParser {
    public static final String AMAP_PACKAGE = "com.autonavi.minimap";
    private static final Pattern END = Pattern.compile("导航(?:已)?结束|结束导航|已到达目的地|已到达终点|本次导航已完成");
    private static final Pattern NAV = Pattern.compile("导航|直行|左转|右转|掉头|调头|行驶|步行|骑行|沿.{1,20}(?:路|街)|进入.{1,20}(?:路|街)");
    private static final Pattern TURN = Pattern.compile("左前方|右前方|左后方|右后方|向左转|向右转|左转|右转|掉头|调头|直行|靠左|靠右|进入环岛|驶出环岛");
    private static final Pattern DISTANCE = Pattern.compile("(\\d+(?:\\.\\d+)?)[\\s]*(公里|千米|米|km|m)(?![a-z])", Pattern.CASE_INSENSITIVE);

    public static final class Result {
        public final String status, title, rawText, maneuver, instruction, distance;
        public Result(String status, String title, String rawText, String maneuver, String instruction, String distance) {
            this.status = status;
            this.title = clip(title, 80);
            this.rawText = clip(rawText, 480);
            this.maneuver = maneuver;
            this.instruction = clip(instruction, 48);
            this.distance = distance;
        }
        public String fingerprint() { return status + '\n' + title + '\n' + rawText; }
    }

    public static Result parse(String packageName, boolean ongoing, String... fields) {
        if (!AMAP_PACKAGE.equals(packageName)) return null;
        Set<String> unique = new LinkedHashSet<>();
        for (String field : fields) {
            if (field != null && !field.trim().isEmpty()) unique.add(field.trim().replaceAll("[\\t ]+", " "));
        }
        if (unique.isEmpty()) return null;
        String text = String.join("\n", unique);
        String title = unique.iterator().next();
        if (END.matcher(text).find()) return new Result("ended", title, text, "arrive", "导航已结束", "");
        Matcher turn = TURN.matcher(text);
        boolean hasTurn = turn.find();
        if (!(ongoing && NAV.matcher(text).find()) && !(hasTurn && DISTANCE.matcher(text).find())) return null;

        String instruction = hasTurn ? turn.group() : "请查看导航原文";
        String maneuver = hasTurn ? maneuver(instruction) : "unknown";
        String distance = "";
        if (hasTurn) {
            // Only a distance immediately associated with the first turn is a next-turn distance.
            // Do not turn a remaining-trip distance (e.g. 剩余 3 公里) into a turn distance.
            String before = text.substring(Math.max(0, turn.start() - 28), turn.start());
            Matcher near = Pattern.compile("(?:前方|还有|再)?\\s*(\\d+(?:\\.\\d+)?)\\s*(公里|千米|米|km|m)\\s*(?:后|处)?[，,：: ]*$", Pattern.CASE_INSENSITIVE).matcher(before);
            if (near.find() && !before.substring(0, near.start()).matches("(?s).*剩余\\s*$")) {
                distance = near.group(1) + " " + near.group(2).toLowerCase(Locale.ROOT);
            }
            // Captured Xiaomi 15 / Gaode 16.22 walking notification: "直行152米".
            // A distance directly following the maneuver also describes that instruction.
            // Do not cross another word, punctuation or line into a remaining-trip summary.
            if (distance.isEmpty()) {
                Matcher after = Pattern.compile("^[ \\t]*(\\d+(?:\\.\\d+)?)[ \\t]*(公里|千米|米|km|m)(?![a-z])", Pattern.CASE_INSENSITIVE)
                    .matcher(text.substring(turn.end()));
                if (after.find()) distance = after.group(1) + " " + after.group(2).toLowerCase(Locale.ROOT);
            }
        }
        return new Result("active", title, text, maneuver, instruction, distance);
    }

    private static String maneuver(String text) {
        if (text.contains("掉头") || text.contains("调头")) return "uturn";
        if (text.contains("环岛")) return "roundabout";
        if (text.contains("左前") || text.contains("靠左")) return "slight_left";
        if (text.contains("右前") || text.contains("靠右")) return "slight_right";
        if (text.contains("左后")) return "sharp_left";
        if (text.contains("右后")) return "sharp_right";
        if (text.contains("左")) return "left";
        if (text.contains("右")) return "right";
        if (text.contains("直行")) return "straight";
        return "unknown";
    }

    public static String clip(String value, int limit) {
        if (value.length() <= limit) return value;
        int end = limit - 1;
        if (Character.isHighSurrogate(value.charAt(end - 1))) end--;
        return value.substring(0, end) + "…";
    }
}
