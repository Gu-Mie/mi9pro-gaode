package io.github.mi9pro.navigation;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RectF;
import android.view.View;

/** Small static vector drawings: no bitmaps, timers or animation work in the background. */
@android.annotation.SuppressLint("ViewConstructor") // Created in Java only; no XML inflation.
final class NavigationArtwork extends View {
    private final Paint pen = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Path path = new Path();
    private final RectF box = new RectF();
    private final String kind;
    private final int tint;

    NavigationArtwork(Context context, String kind, int tint) {
        super(context);
        this.kind = kind;
        this.tint = tint;
        setImportantForAccessibility(IMPORTANT_FOR_ACCESSIBILITY_NO);
    }

    @Override protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);
        canvas.save();
        canvas.translate(getPaddingLeft(), getPaddingTop());
        float width = getWidth() - getPaddingLeft() - getPaddingRight();
        float height = getHeight() - getPaddingTop() - getPaddingBottom();
        pen.setColor(tint);
        pen.setStyle(Paint.Style.STROKE);
        pen.setStrokeCap(Paint.Cap.ROUND);
        pen.setStrokeJoin(Paint.Join.ROUND);
        if ("devices".equals(kind)) {
            float scale = Math.min(width / 256f, height / 104f);
            canvas.translate((width - 256 * scale) / 2, (height - 104 * scale) / 2);
            canvas.scale(scale, scale);
            devices(canvas);
        } else {
            canvas.scale(width / 24, height / 24);
            pen.setStrokeWidth(1.7f);
            switch (kind) {
                case "settings":
                    canvas.drawCircle(12, 12, 7, pen); canvas.drawCircle(12, 12, 2.5f, pen);
                    for (int i = 0; i < 8; i++) {
                        canvas.save(); canvas.rotate(i * 45, 12, 12);
                        canvas.drawLine(12, 2, 12, 4, pen); canvas.restore();
                    }
                    break;
                case "close": line(canvas, 6, 6, 18, 18); line(canvas, 18, 6, 6, 18); break;
                case "chevron": stroke(canvas, 9, 5, 15, 12, 9, 19); break;
                case "sliders":
                    line(canvas, 4, 7, 20, 7); line(canvas, 4, 17, 20, 17);
                    pen.setStyle(Paint.Style.FILL); canvas.drawCircle(9, 7, 3, pen); canvas.drawCircle(15, 17, 3, pen);
                    break;
                case "battery":
                    rounded(canvas, 3, 6, 19, 18, 3); line(canvas, 22, 10, 22, 14);
                    stroke(canvas, 12, 8, 9, 12, 14, 12, 11, 16); break;
                case "bell":
                    path.reset(); path.moveTo(5, 17); path.lineTo(7, 14); path.lineTo(7, 9);
                    path.cubicTo(7, 2, 17, 2, 17, 9); path.lineTo(17, 14); path.lineTo(19, 17);
                    path.close(); canvas.drawPath(path, pen); line(canvas, 10, 21, 14, 21); break;
                case "link":
                    rounded(canvas, 3, 6, 10, 18, 2); rounded(canvas, 15, 8, 22, 16, 2);
                    line(canvas, 17, 5, 20, 5); line(canvas, 17, 19, 20, 19);
                    line(canvas, 11, 12, 14, 12); break;
                default: break;
            }
        }
        canvas.restore();
    }

    private void devices(Canvas canvas) {
        pen.setStrokeWidth(1.8f);
        // Phone and band are illustrative hardware, never a made-up navigation route.
        pen.setAlpha(55);
        line(canvas, 100, 52, 156, 52);
        for (int x = 111; x < 151; x += 12) { pen.setAlpha(100); canvas.drawCircle(x, 52, 1, pen); }
        pen.setAlpha(255);
        rounded(canvas, 43, 12, 85, 92, 10);
        line(canvas, 57, 19, 71, 19); line(canvas, 58, 84, 70, 84);
        pen.setAlpha(35); rounded(canvas, 49, 29, 79, 75, 5); pen.setAlpha(255);
        arrow(canvas, 64, 53, 9);
        pen.setAlpha(80);
        rounded(canvas, 181, 3, 203, 101, 8);
        pen.setAlpha(255);
        pen.setStyle(Paint.Style.FILL); pen.setColor(0xff253c2e);
        rounded(canvas, 174, 25, 210, 79, 12);
        pen.setStyle(Paint.Style.STROKE); pen.setColor(tint);
        rounded(canvas, 174, 25, 210, 79, 12);
        arrow(canvas, 192, 52, 9);
    }
    private void arrow(Canvas canvas, float x, float y, float size) {
        path.reset(); path.moveTo(x, y - size); path.lineTo(x + size * .65f, y + size * .6f);
        path.lineTo(x, y + size * .25f); path.lineTo(x - size * .65f, y + size * .6f);
        path.close(); canvas.drawPath(path, pen);
    }
    private void rounded(Canvas canvas, float left, float top, float right, float bottom, float radius) {
        box.set(left, top, right, bottom); canvas.drawRoundRect(box, radius, radius, pen);
    }
    private void line(Canvas canvas, float x1, float y1, float x2, float y2) { canvas.drawLine(x1, y1, x2, y2, pen); }
    private void stroke(Canvas canvas, float... points) {
        path.reset(); path.moveTo(points[0], points[1]);
        for (int i = 2; i < points.length; i += 2) path.lineTo(points[i], points[i + 1]);
        canvas.drawPath(path, pen);
    }
}
