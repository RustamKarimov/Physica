using System.Globalization;
using Avalonia;
using Avalonia.Controls;
using Avalonia.Media;

namespace PhysicaStudio.Desktop.Controls;

public sealed class StandingWaveReferenceSurface : Control
{
    private static readonly Typeface Ui = new("Inter", FontStyle.Normal, FontWeight.Normal);
    private static readonly Typeface UiMedium = new("Inter", FontStyle.Normal, FontWeight.Medium);
    private static readonly Typeface UiBold = new("Inter", FontStyle.Normal, FontWeight.SemiBold);
    private static readonly Typeface Display = new("Georgia", FontStyle.Normal, FontWeight.Bold);
    private static readonly Typeface Mathematics = new("Cambria Math", FontStyle.Italic, FontWeight.Normal);

    private static readonly IBrush Navy = Brush.Parse("#11284B");
    private static readonly IBrush Body = Brush.Parse("#34424D");
    private static readonly IBrush Muted = Brush.Parse("#697985");
    private static readonly IBrush Blue = Brush.Parse("#0878F9");
    private static readonly IBrush Cyan = Brush.Parse("#24B8FF");
    private static readonly IBrush Orange = Brush.Parse("#ED7F18");

    public override void Render(DrawingContext context)
    {
        base.Render(context);
        if (Bounds.Width <= 0 || Bounds.Height <= 0)
        {
            return;
        }

        Rect(context, "#F8F9F7", 0, 0, 1000, 562.5);
        Text(context, "Standing Waves", 72, 30, 32, Navy, Display);
        Text(context, "When a wave reflects at both ends of a string, identical waves travelling", 72, 77, 13.5, Body, Ui);
        Text(context, "in opposite directions interfere to form a standing wave.", 72, 97, 13.5, Body, Ui);

        const double left = 106;
        const double right = 894;
        const double center = 270;
        const double length = right - left;

        DrawSupport(context, 78, 160, false);
        DrawSupport(context, 894, 160, true);
        Line(context, Brush.Parse("#929DA5"), 1.4, left, center, right, center, new DashStyle([6, 5], 0));

        // A family of low-opacity phase traces creates the luminous standing-wave envelope.
        for (var step = 1; step <= 5; step++)
        {
            var amplitude = 11d * step;
            DrawWave(context, left, center, length, amplitude, 3, false, Brush.Parse("#8BC8F4"), .7 + step * .12, .12 + step * .025);
            DrawWave(context, left, center, length, amplitude, 3, true, Brush.Parse("#8BC8F4"), .7 + step * .12, .12 + step * .025);
        }

        DrawWave(context, left, center, length, 57, 3, false, Cyan, 7, .10);
        DrawWave(context, left, center, length, 57, 3, true, Cyan, 7, .10);
        DrawWave(context, left, center, length, 57, 3, false, Blue, 2.6, 1);
        DrawWave(context, left, center, length, 57, 3, true, Blue, 2.6, 1);

        for (var nodeIndex = 0; nodeIndex <= 3; nodeIndex++)
        {
            var x = left + length * nodeIndex / 3d;
            Ellipse(context, "#F8F9F7", "#0878F9", 2.2, x, center, 6.5, 6.5);
            if (nodeIndex is 1 or 2)
            {
                Line(context, Blue, 1.2, x, center + 10, x, center + 52);
                Text(context, "Node", x - 19, center + 57, 13, Blue, UiMedium);
            }
        }

        // Antinode callout over the central lobe.
        var antinodeX = left + length / 2d;
        Ellipse(context, "#ED7F18", "#FFF0DE", 1, antinodeX, center - 57, 4.7, 4.7);
        Line(context, Orange, 1.4, antinodeX, center - 63, antinodeX, center - 91);
        Text(context, "Antinode", antinodeX - 31, center - 116, 13, Orange, UiMedium);
        var brace = PathGeometry.Parse(
            $"M {X(antinodeX - 62)},{Y(center - 82)} C {X(antinodeX - 47)},{Y(center - 82)} {X(antinodeX - 43)},{Y(center - 92)} {X(antinodeX - 37)},{Y(center - 92)} " +
            $"C {X(antinodeX - 27)},{Y(center - 92)} {X(antinodeX - 22)},{Y(center - 82)} {X(antinodeX)},{Y(center - 82)} " +
            $"C {X(antinodeX + 22)},{Y(center - 82)} {X(antinodeX + 27)},{Y(center - 92)} {X(antinodeX + 37)},{Y(center - 92)} " +
            $"C {X(antinodeX + 43)},{Y(center - 92)} {X(antinodeX + 47)},{Y(center - 82)} {X(antinodeX + 62)},{Y(center - 82)}");
        context.DrawGeometry(null, new Pen(Orange, S(1.4), lineCap: PenLineCap.Round), brace);

        Line(context, Muted, 1, 790, center, 790, center + 32);
        Text(context, "Equilibrium", 755, center + 38, 11.5, Muted, Ui);
        Text(context, "position", 769, center + 54, 11.5, Muted, Ui);

        DrawFrequencyControl(context);
        DrawEquationCard(context);
        DrawLegend(context);
    }

    private void DrawSupport(DrawingContext dc, double x, double y, bool right)
    {
        // Ground shadow.
        Rounded(dc, "#D7DADB", null, 0, x - 5, y + 178, 40, 9, 5);
        // Dark extruded body.
        Rounded(dc, "#171B1E", "#090C0E", 1, x, y, 30, 176, 6);
        Rounded(dc, "#33393D", "#535A5F", 1, x + 4, y + 5, 18, 165, 4);
        Rounded(dc, "#697177", null, 0, x + 7, y + 8, 4, 159, 2);
        Rounded(dc, "#202629", null, 0, x + 15, y + 8, 5, 159, 2);
        // Clamp and brass eyelet.
        var eyeX = right ? x : x + 30;
        Line(dc, Brush.Parse("#30383D"), 5, eyeX, y + 110, eyeX + (right ? -12 : 12), y + 110);
        Ellipse(dc, "#B77A25", "#5A3B12", 1.3, eyeX, y + 110, 8.5, 8.5);
        Ellipse(dc, "#F4C66A", "#FFF0B4", 1, eyeX, y + 110, 4.2, 4.2);
        Ellipse(dc, "#293237", null, 0, eyeX, y + 110, 1.7, 1.7);
    }

    private void DrawFrequencyControl(DrawingContext dc)
    {
        Rounded(dc, "#FFFFFF", "#D5DADE", 1, 72, 392, 215, 76, 7);
        Text(dc, "Frequency", 88, 408, 12.5, Body, UiMedium);
        Text(dc, "4.0", 215, 408, 13, Blue, UiBold);
        Text(dc, "Hz", 249, 408, 11.5, Muted, Ui);
        Rounded(dc, "#F2F4F5", "#D5DADE", 1, 88, 438, 24, 22, 3);
        Line(dc, Muted, 1.5, 95, 449, 105, 449);
        Line(dc, Brush.Parse("#AEB9C0"), 3, 128, 449, 240, 449);
        Line(dc, Blue, 3, 128, 449, 184, 449);
        Ellipse(dc, "#0878F9", "#FFFFFF", 1.2, 184, 449, 5.5, 5.5);
        Rounded(dc, "#F2F4F5", "#D5DADE", 1, 250, 438, 24, 22, 3);
        Line(dc, Muted, 1.4, 257, 449, 267, 449);
        Line(dc, Muted, 1.4, 262, 444, 262, 454);
    }

    private void DrawEquationCard(DrawingContext dc)
    {
        Rounded(dc, "#FFFFFF", "#AEB8C0", 1.2, 405, 401, 182, 60, 5);
        Text(dc, "v = f λ", 447, 411, 31, Navy, Mathematics);
    }

    private void DrawLegend(DrawingContext dc)
    {
        Rounded(dc, "#FFFFFF", "#D5DADE", 1, 650, 392, 280, 76, 6);
        Ellipse(dc, "#0878F9", null, 0, 670, 414, 5, 5);
        Text(dc, "Node", 684, 404, 11.5, Body, UiMedium);
        Text(dc, "(zero displacement)", 726, 404, 11.5, Muted, Ui);
        Ellipse(dc, "#ED7F18", null, 0, 670, 442, 5, 5);
        Text(dc, "Antinode", 684, 432, 11.5, Body, UiMedium);
        Text(dc, "(maximum displacement)", 749, 432, 11.5, Muted, Ui);
    }

    private void DrawWave(DrawingContext dc, double startX, double centerY, double length, double amplitude,
        int lobes, bool inverted, IBrush brush, double width, double opacity)
    {
        var points = new List<Point>();
        const int sampleCount = 180;
        for (var i = 0; i <= sampleCount; i++)
        {
            var t = i / (double)sampleCount;
            var sign = inverted ? -1d : 1d;
            var y = centerY - Math.Sin(t * lobes * Math.PI) * amplitude * sign;
            points.Add(new Point(X(startX + t * length), Y(y)));
        }

        var geometry = new StreamGeometry();
        using (var drawing = geometry.Open())
        {
            drawing.BeginFigure(points[0], false);
            for (var i = 1; i < points.Count; i++)
            {
                drawing.LineTo(points[i]);
            }
        }

        using var _ = dc.PushOpacity(opacity);
        dc.DrawGeometry(null, new Pen(brush, S(width), lineCap: PenLineCap.Round, lineJoin: PenLineJoin.Round), geometry);
    }

    private void Text(DrawingContext dc, string value, double x, double y, double size, IBrush brush, Typeface face)
    {
        var formatted = new FormattedText(value, CultureInfo.CurrentCulture, FlowDirection.LeftToRight, face, S(size), brush);
        dc.DrawText(formatted, new Point(X(x), Y(y)));
    }

    private void Rect(DrawingContext dc, string fill, double x, double y, double width, double height) =>
        dc.DrawRectangle(Brush.Parse(fill), null, new Rect(X(x), Y(y), X(width), Y(height)));

    private void Rounded(DrawingContext dc, string fill, string? stroke, double strokeWidth,
        double x, double y, double width, double height, double radius) =>
        dc.DrawRectangle(Brush.Parse(fill), stroke is null ? null : new Pen(Brush.Parse(stroke), S(strokeWidth)),
            new Rect(X(x), Y(y), X(width), Y(height)), X(radius), Y(radius));

    private void Line(DrawingContext dc, IBrush brush, double width, double x1, double y1, double x2, double y2,
        IDashStyle? dash = null) =>
        dc.DrawLine(new Pen(brush, S(width), dash, PenLineCap.Round, PenLineJoin.Round),
            new Point(X(x1), Y(y1)), new Point(X(x2), Y(y2)));

    private void Ellipse(DrawingContext dc, string? fill, string? stroke, double strokeWidth,
        double cx, double cy, double rx, double ry) =>
        dc.DrawEllipse(fill is null ? null : Brush.Parse(fill),
            stroke is null ? null : new Pen(Brush.Parse(stroke), S(strokeWidth)),
            new Point(X(cx), Y(cy)), X(rx), Y(ry));

    private double X(double value) => value / 1000d * Bounds.Width;
    private double Y(double value) => value / 562.5d * Bounds.Height;
    private double S(double value) => value * Math.Min(Bounds.Width / 1000d, Bounds.Height / 562.5d);
}
