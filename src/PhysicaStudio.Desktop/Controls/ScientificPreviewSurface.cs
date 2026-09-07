using System.Globalization;
using Avalonia;
using Avalonia.Controls;
using Avalonia.Media;

namespace PhysicaStudio.Desktop.Controls;

public enum ScientificPreviewKind
{
    StandingWave,
    ElectricFieldGraph,
    DarkPresentation,
    InteractivePresentation
}

public sealed class ScientificPreviewSurface : Control
{
    public static readonly StyledProperty<ScientificPreviewKind> PreviewKindProperty =
        AvaloniaProperty.Register<ScientificPreviewSurface, ScientificPreviewKind>(
            nameof(PreviewKind),
            ScientificPreviewKind.StandingWave);

    private static readonly Typeface Regular = new("Inter", FontStyle.Normal, FontWeight.Normal, FontStretch.Normal);
    private static readonly Typeface Medium = new("Inter", FontStyle.Normal, FontWeight.Medium, FontStretch.Normal);
    private static readonly Typeface SemiBold = new("Inter", FontStyle.Normal, FontWeight.SemiBold, FontStretch.Normal);
    private static readonly Typeface MathTypeface = new("Cambria Math", FontStyle.Normal, FontWeight.Normal, FontStretch.Normal);

    private static readonly IBrush Ink = Brush.Parse("#172B3C");
    private static readonly IBrush Muted = Brush.Parse("#667B8D");
    private static readonly IBrush Teal = Brush.Parse("#1BA99D");
    private static readonly IBrush TealBright = Brush.Parse("#59E0D0");
    private static readonly IBrush Blue = Brush.Parse("#3C91D7");
    private static readonly IBrush Orange = Brush.Parse("#F1A84C");
    private static readonly IBrush Red = Brush.Parse("#EF5D67");
    private static readonly IBrush White = Brushes.White;

    public ScientificPreviewKind PreviewKind
    {
        get => GetValue(PreviewKindProperty);
        set => SetValue(PreviewKindProperty, value);
    }

    public override void Render(DrawingContext context)
    {
        base.Render(context);
        if (Bounds.Width <= 0 || Bounds.Height <= 0)
        {
            return;
        }

        switch (PreviewKind)
        {
            case ScientificPreviewKind.ElectricFieldGraph:
                DrawElectricFieldGraph(context);
                break;
            case ScientificPreviewKind.DarkPresentation:
                DrawDarkPresentation(context);
                break;
            case ScientificPreviewKind.InteractivePresentation:
                DrawInteractivePresentation(context);
                break;
            default:
                DrawStandingWave(context);
                break;
        }
    }

    private void DrawStandingWave(DrawingContext dc)
    {
        DrawRect(dc, "#F8FBFD", 0, 0, 1000, 562.5);
        DrawText(dc, "STANDING WAVES", 54, 35, 14, Teal, SemiBold);
        DrawText(dc, "Frequency, tension and the shape of a stationary wave", 54, 62, 28, Ink, SemiBold);
        DrawText(dc, "The physical model drives every node, antinode, value and graph.", 55, 103, 14, Muted, Regular);

        DrawRoundedRect(dc, "#FFFFFF", "#CDD9E3", 1, 52, 145, 638, 328, 10);
        for (var y = 192; y <= 420; y += 57)
        {
            DrawLine(dc, "#E7EDF2", 1, 78, y, 657, y);
        }

        DrawLine(dc, "#9AAEBD", 1, 96, 306, 635, 306, new DashStyle([5, 5], 0));

        // Driving oscillator and mounting plate.
        DrawRoundedRect(dc, "#27495E", "#6F8898", 1, 70, 235, 52, 142, 5);
        DrawRoundedRect(dc, "#163342", "#38596C", 1, 77, 250, 38, 64, 4);
        DrawEllipse(dc, "#5BDCCB", "#C8FFF7", 1, 96, 282, 9, 9);
        DrawRoundedRect(dc, "#D9E4EB", "#91A5B3", 1, 58, 377, 77, 18, 5);
        DrawText(dc, "VIBRATION", 61, 408, 9, Muted, SemiBold);
        DrawText(dc, "GENERATOR", 61, 421, 9, Muted, SemiBold);

        // Pulley, hanging load and support.
        DrawLine(dc, "#7890A1", 5, 635, 221, 635, 394);
        DrawLine(dc, "#7890A1", 3, 635, 306, 661, 306);
        DrawEllipse(dc, "#EAF0F4", "#607A8D", 3, 668, 306, 23, 23);
        DrawEllipse(dc, "#FFFFFF", "#8EA1AF", 1, 668, 306, 7, 7);
        DrawLine(dc, "#268F87", 4, 691, 306, 691, 394);
        DrawRoundedRect(dc, "#34566B", "#183848", 1, 670, 394, 43, 45, 5);
        DrawText(dc, "m", 685, 404, 16, White, SemiBold);

        // Wave glow and two extreme positions.
        var upper = WavePath(96, 306, 539, 80, 4, false);
        var lower = WavePath(96, 306, 539, 80, 4, true);
        DrawGeometry(dc, upper, "#8CF4E6", 10, .16);
        DrawGeometry(dc, upper, "#2ECBBE", 5, 1);
        DrawGeometry(dc, lower, "#4FA6C8", 2, .55, new DashStyle([7, 5], 0));

        for (var i = 0; i <= 4; i++)
        {
            var x = 96 + (539d / 4d * i);
            DrawEllipse(dc, "#123E54", "#78E9DB", 1, x, 306, 7, 7);
            if (i is > 0 and < 4)
            {
                DrawLine(dc, "#A6BAC7", 1, x, 225, x, 387, new DashStyle([3, 5], 0));
                DrawText(dc, "NODE", x - 18, 205, 9, Blue, SemiBold);
            }
        }

        DrawArrow(dc, "#F0A74D", 2, 231, 245, 231, 203);
        DrawText(dc, "ANTINODE", 193, 183, 10, Orange, SemiBold);
        DrawArrow(dc, "#F0A74D", 2, 500, 369, 500, 411);
        DrawText(dc, "ANTINODE", 462, 421, 10, Orange, SemiBold);
        DrawDimension(dc, 96, 454, 635, "string length  L = 1.80 m");

        // Equation and observable cards.
        DrawRoundedRect(dc, "#102838", null, 0, 720, 145, 230, 147, 10);
        DrawText(dc, "MODEL", 740, 163, 11, TealBright, SemiBold);
        DrawText(dc, "v = √(T / μ)", 740, 194, 26, White, MathTypeface);
        DrawText(dc, "fₙ = nv / 2L", 740, 238, 25, White, MathTypeface);
        DrawText(dc, "IDEAL STRING · FIXED ENDS", 740, 272, 9, Brush.Parse("#8FA9B8"), SemiBold);

        DrawRoundedRect(dc, "#EBF3F6", "#C8D8E1", 1, 720, 309, 230, 164, 10);
        DrawMetric(dc, "Frequency", "6.00 Hz", 740, 329);
        DrawMetric(dc, "Tension", "24.0 N", 740, 371);
        DrawMetric(dc, "Linear density", "0.015 kg m⁻¹", 740, 413);
        DrawText(dc, "PREVIEW DATA · PHYSICS PLANNED", 740, 452, 9, Brush.Parse("#A27331"), SemiBold);

        DrawRoundedRect(dc, "#EAF2F6", "#CBD8E1", 1, 52, 493, 898, 42, 7);
        DrawRoundedRect(dc, "#D7F3EF", null, 0, 67, 504, 118, 21, 4);
        DrawText(dc, "SHELL PREVIEW", 79, 507, 9, Brush.Parse("#176B64"), SemiBold);
        DrawText(dc, "Visual qualification scene — scientific behavior activates in later phases.", 201, 505, 12, Brush.Parse("#4D6575"), Regular);
    }

    private void DrawElectricFieldGraph(DrawingContext dc)
    {
        DrawRect(dc, "#F7FAFD", 0, 0, 1000, 562.5);
        DrawText(dc, "ELECTRIC POTENTIAL", 48, 32, 13, Brush.Parse("#617589"), SemiBold);
        DrawText(dc, "One model, several automatic representations", 48, 58, 27, Ink, SemiBold);
        DrawText(dc, "Change the charges or separation; fields, vectors and graphs remain bound.", 49, 98, 14, Muted, Regular);

        DrawRoundedRect(dc, "#0F2230", "#294759", 1, 46, 136, 447, 345, 11);
        DrawText(dc, "FIELD VIEW", 66, 154, 10, TealBright, SemiBold);
        DrawText(dc, "E  and  V  between two point charges", 66, 176, 13, Brush.Parse("#B9CAD5"), Regular);

        var negative = new Point(ToX(170), ToY(310));
        var positive = new Point(ToX(372), ToY(310));
        for (var i = -4; i <= 4; i++)
        {
            var bend = i * 28;
            var fieldLine = PathGeometry.Parse($"M {ToX(353)},{ToY(310 + i * 8)} C {ToX(308)},{ToY(205 + bend)} {ToX(230)},{ToY(205 + bend)} {ToX(189)},{ToY(310 + i * 8)}");
            dc.DrawGeometry(null, new Pen(Brush.Parse("#4FC6BA"), ScaleStroke(1.15), new DashStyle([4, 3], 0), PenLineCap.Round, PenLineJoin.Round, 10), fieldLine);
        }
        DrawEllipse(dc, "#E95D67", "#FFBCC1", 2, 170, 310, 29, 29);
        DrawEllipse(dc, "#377DD0", "#ABD3FF", 2, 372, 310, 29, 29);
        DrawText(dc, "+Q", 155, 297, 20, White, SemiBold);
        DrawText(dc, "−Q", 356, 297, 20, White, SemiBold);
        DrawArrow(dc, "#F2C063", 3, 268, 310, 225, 310);
        DrawText(dc, "E", 261, 278, 14, Orange, SemiBold);
        DrawDimension(dc, 170, 410, 372, "separation  d");

        DrawRoundedRect(dc, "#FFFFFF", "#CAD8E2", 1, 518, 136, 434, 345, 11);
        DrawText(dc, "AUTOMATIC GRAPH", 538, 154, 10, Teal, SemiBold);
        DrawText(dc, "Potential and field strength along the sampling line", 538, 176, 13, Ink, Medium);
        DrawLine(dc, "#879AA8", 1.5, 565, 419, 920, 419);
        DrawLine(dc, "#879AA8", 1.5, 742, 215, 742, 440);
        for (var x = 585; x <= 900; x += 52)
        {
            DrawLine(dc, "#EDF1F4", 1, x, 211, x, 419);
        }
        for (var y = 250; y <= 400; y += 38)
        {
            DrawLine(dc, "#EDF1F4", 1, 565, y, 920, y);
        }
        var potential = PathGeometry.Parse($"M {ToX(575)},{ToY(365)} C {ToX(625)},{ToY(350)} {ToX(660)},{ToY(226)} {ToX(704)},{ToY(230)} C {ToX(727)},{ToY(232)} {ToX(730)},{ToY(410)} {ToX(758)},{ToY(408)} C {ToX(805)},{ToY(405)} {ToX(847)},{ToY(330)} {ToX(911)},{ToY(316)}");
        dc.DrawGeometry(null, new Pen(Teal, ScaleStroke(3), null, PenLineCap.Round, PenLineJoin.Round, 10), potential);
        var fieldCurve = PathGeometry.Parse($"M {ToX(575)},{ToY(389)} C {ToX(655)},{ToY(382)} {ToX(688)},{ToY(348)} {ToX(716)},{ToY(250)} M {ToX(768)},{ToY(250)} C {ToX(794)},{ToY(348)} {ToX(838)},{ToY(382)} {ToX(911)},{ToY(389)}");
        dc.DrawGeometry(null, new Pen(Blue, ScaleStroke(2), new DashStyle([6, 4], 0), PenLineCap.Round, PenLineJoin.Round, 10), fieldCurve);
        DrawText(dc, "V(x)", 858, 226, 12, Teal, SemiBold);
        DrawText(dc, "|E(x)|", 858, 247, 12, Blue, SemiBold);
        DrawText(dc, "x / m", 882, 428, 11, Muted, Regular);
        DrawText(dc, "V / kV", 547, 208, 11, Muted, Regular);

        DrawBindingPill(dc, "SOURCE", "Potential V", 48, 501, 205);
        DrawBindingPill(dc, "DOMAIN", "Sampling line A → B", 268, 501, 230);
        DrawBindingPill(dc, "UPDATE", "Live after model change", 513, 501, 231);
        DrawBindingPill(dc, "VALIDATION", "Preview data", 759, 501, 193);
    }

    private void DrawDarkPresentation(DrawingContext dc)
    {
        DrawRect(dc, "#07121B", 0, 0, 1000, 562.5);
        DrawEllipse(dc, "#0B2E3C", null, 0, 535, 300, 330, 250);
        DrawEllipse(dc, "#092633", null, 0, 535, 300, 245, 185);
        DrawText(dc, "STANDING WAVES", 66, 42, 13, TealBright, SemiBold);
        DrawText(dc, "Where does the string", 66, 82, 34, White, SemiBold);
        DrawText(dc, "never move?", 66, 124, 34, White, SemiBold);
        DrawText(dc, "Watch the pattern, then pause at the turning point.", 68, 184, 15, Brush.Parse("#A6BAC8"), Regular);

        DrawLine(dc, "#819AA9", 4, 116, 315, 874, 315);
        var path = WavePath(116, 315, 758, 105, 4, false);
        DrawGeometry(dc, path, "#76FFF0", 16, .10);
        DrawGeometry(dc, path, "#4FE0D1", 7, .28);
        DrawGeometry(dc, path, "#73F1E4", 3.5, 1);
        for (var i = 0; i <= 4; i++)
        {
            var x = 116 + 758d / 4d * i;
            DrawEllipse(dc, "#07121B", "#92FFF2", 2, x, 315, 8, 8);
            DrawText(dc, i is 0 or 4 ? "FIXED END" : "NODE", x - 28, 430, 10, Brush.Parse("#85D8D0"), SemiBold);
            DrawLine(dc, "#347879", 1, x, 330, x, 414, new DashStyle([3, 5], 0));
        }

        DrawRoundedRect(dc, "#102A37", "#275062", 1, 66, 474, 286, 55, 8);
        DrawText(dc, "CHECKPOINT  02", 84, 486, 10, TealBright, SemiBold);
        DrawText(dc, "Identify every node", 84, 504, 14, White, Medium);
        DrawRoundedRect(dc, "#132532", "#2C4B5E", 1, 680, 478, 254, 48, 24);
        DrawText(dc, "Previous", 704, 491, 12, Brush.Parse("#B7C8D2"), Medium);
        DrawEllipse(dc, "#36BFB2", null, 0, 806, 502, 16, 16);
        DrawText(dc, "Next checkpoint", 838, 491, 12, White, Medium);
    }

    private void DrawInteractivePresentation(DrawingContext dc)
    {
        DrawRect(dc, "#F5F8FB", 0, 0, 1000, 562.5);
        DrawText(dc, "INTERACTIVE INVESTIGATION", 52, 34, 12, Teal, SemiBold);
        DrawText(dc, "Explore a projectile's motion", 52, 61, 28, Ink, SemiBold);
        DrawText(dc, "Change the launch conditions. The trajectory, vectors and graph remain linked.", 53, 103, 14, Muted, Regular);

        DrawRoundedRect(dc, "#FFFFFF", "#CAD7E1", 1, 48, 145, 554, 339, 10);
        DrawText(dc, "MODEL VIEW", 68, 164, 10, Brush.Parse("#6A7E8E"), SemiBold);
        DrawLine(dc, "#CBD6DE", 2, 80, 423, 568, 423);
        for (var x = 92; x < 560; x += 52)
        {
            DrawLine(dc, "#EEF2F5", 1, x, 194, x, 423);
        }
        for (var y = 215; y < 423; y += 52)
        {
            DrawLine(dc, "#EEF2F5", 1, 80, y, 568, y);
        }
        DrawRoundedRect(dc, "#294E63", "#163646", 1, 83, 381, 49, 42, 5);
        DrawLine(dc, "#335F75", 8, 110, 385, 150, 348);
        DrawEllipse(dc, "#F2A34B", "#FFD7A4", 2, 151, 347, 11, 11);
        var trajectory = PathGeometry.Parse($"M {ToX(151)},{ToY(347)} C {ToX(250)},{ToY(195)} {ToX(417)},{ToY(187)} {ToX(540)},{ToY(423)}");
        dc.DrawGeometry(null, new Pen(Teal, ScaleStroke(4), null, PenLineCap.Round, PenLineJoin.Round, 10), trajectory);
        dc.DrawGeometry(null, new Pen(Brush.Parse("#8FDCD4"), ScaleStroke(1.5), new DashStyle([6, 5], 0), PenLineCap.Round, PenLineJoin.Round, 10), trajectory);
        DrawArrow(dc, "#377FCB", 3, 151, 347, 212, 292);
        DrawText(dc, "u", 192, 276, 14, Blue, SemiBold);
        DrawArrow(dc, "#E5656D", 3, 327, 230, 327, 293);
        DrawText(dc, "g", 337, 252, 14, Red, SemiBold);
        DrawEllipse(dc, "#F2A34B", "#FFF1D8", 2, 327, 230, 12, 12);
        DrawText(dc, "t = 1.25 s", 300, 193, 12, Ink, Medium);
        DrawDimension(dc, 151, 456, 540, "horizontal range");

        DrawRoundedRect(dc, "#102738", null, 0, 626, 145, 326, 202, 10);
        DrawText(dc, "MODEL", 648, 165, 10, TealBright, SemiBold);
        DrawText(dc, "x = u cosθ · t", 648, 195, 21, White, MathTypeface);
        DrawText(dc, "y = u sinθ · t − ½gt²", 648, 229, 21, White, MathTypeface);
        DrawLine(dc, "#304C5C", 1, 648, 270, 928, 270);
        DrawMetricDark(dc, "Launch speed", "18.0 m s⁻¹", 648, 287);
        DrawMetricDark(dc, "Angle", "42.0°", 648, 319);

        DrawRoundedRect(dc, "#FFFFFF", "#CAD7E1", 1, 626, 365, 326, 119, 10);
        DrawText(dc, "HEIGHT AGAINST TIME", 646, 381, 10, Brush.Parse("#6B7F8F"), SemiBold);
        DrawLine(dc, "#93A5B2", 1, 655, 463, 923, 463);
        DrawLine(dc, "#93A5B2", 1, 655, 463, 655, 399);
        var graph = PathGeometry.Parse($"M {ToX(655)},{ToY(463)} C {ToX(735)},{ToY(384)} {ToX(837)},{ToY(384)} {ToX(920)},{ToY(463)}");
        dc.DrawGeometry(null, new Pen(Teal, ScaleStroke(3), null, PenLineCap.Round, PenLineJoin.Round, 10), graph);

        DrawRoundedRect(dc, "#E7F3F2", "#BADBD7", 1, 48, 505, 904, 35, 18);
        DrawText(dc, "PREVIEW CONTROLS", 68, 515, 9, Brush.Parse("#26756F"), SemiBold);
        DrawText(dc, "Adjustments demonstrate classroom interaction only; the physics kernel is still planned.", 199, 512, 12, Brush.Parse("#526A79"), Regular);
    }

    private void DrawMetric(DrawingContext dc, string label, string value, double x, double y)
    {
        DrawText(dc, label, x, y, 12, Brush.Parse("#607687"), Regular);
        DrawText(dc, value, x + 105, y, 13, Brush.Parse("#1C716C"), SemiBold);
        DrawLine(dc, "#D5E0E7", 1, x, y + 27, x + 190, y + 27);
    }

    private void DrawMetricDark(DrawingContext dc, string label, string value, double x, double y)
    {
        DrawText(dc, label, x, y, 11, Brush.Parse("#8FA8B7"), Regular);
        DrawText(dc, value, x + 134, y, 12, White, SemiBold);
    }

    private void DrawBindingPill(DrawingContext dc, string eyebrow, string value, double x, double y, double width)
    {
        DrawRoundedRect(dc, "#FFFFFF", "#CEDAE3", 1, x, y, width, 39, 7);
        DrawText(dc, eyebrow, x + 12, y + 7, 8, Brush.Parse("#758A99"), SemiBold);
        DrawText(dc, value, x + 12, y + 19, 11, Ink, Medium);
    }

    private void DrawDimension(DrawingContext dc, double x1, double y, double x2, string label)
    {
        DrawLine(dc, "#778E9E", 1, x1, y, x2, y);
        DrawLine(dc, "#778E9E", 1, x1, y - 5, x1, y + 5);
        DrawLine(dc, "#778E9E", 1, x2, y - 5, x2, y + 5);
        DrawText(dc, label, (x1 + x2) / 2 - label.Length * 2.9, y - 19, 10, Muted, Medium);
    }

    private void DrawArrow(DrawingContext dc, string color, double width, double x1, double y1, double x2, double y2)
    {
        DrawLine(dc, color, width, x1, y1, x2, y2);
        var angle = Math.Atan2(y2 - y1, x2 - x1);
        const double head = 10;
        DrawLine(dc, color, width, x2, y2, x2 - Math.Cos(angle - .55) * head, y2 - Math.Sin(angle - .55) * head);
        DrawLine(dc, color, width, x2, y2, x2 - Math.Cos(angle + .55) * head, y2 - Math.Sin(angle + .55) * head);
    }

    private Geometry WavePath(double startX, double centerY, double length, double amplitude, int loops, bool inverted)
    {
        var pieces = new List<string> { $"M {ToX(startX)},{ToY(centerY)}" };
        var halfW = length / (loops * 2d);
        var sign = inverted ? -1d : 1d;
        for (var i = 0; i < loops * 2; i++)
        {
            var direction = i % 2 == 0 ? -sign : sign;
            var x0 = startX + i * halfW;
            var x1 = x0 + halfW;
            pieces.Add($"C {ToX(x0 + halfW * .34)},{ToY(centerY + amplitude * direction)} {ToX(x0 + halfW * .66)},{ToY(centerY + amplitude * direction)} {ToX(x1)},{ToY(centerY)}");
        }
        return PathGeometry.Parse(string.Join(' ', pieces));
    }

    private void DrawText(DrawingContext dc, string text, double x, double y, double size, IBrush brush, Typeface typeface)
    {
        var formatted = new FormattedText(text, CultureInfo.CurrentCulture, FlowDirection.LeftToRight, typeface, ScaleStroke(size), brush);
        dc.DrawText(formatted, new Point(ToX(x), ToY(y)));
    }

    private void DrawRect(DrawingContext dc, string fill, double x, double y, double width, double height) =>
        dc.DrawRectangle(Brush.Parse(fill), null, ToRect(x, y, width, height));

    private void DrawRoundedRect(DrawingContext dc, string fill, string? stroke, double strokeWidth, double x, double y, double width, double height, double radius) =>
        dc.DrawRectangle(Brush.Parse(fill), stroke is null ? null : new Pen(Brush.Parse(stroke), ScaleStroke(strokeWidth)), ToRect(x, y, width, height), ScaleX(radius), ScaleY(radius));

    private void DrawLine(DrawingContext dc, string color, double width, double x1, double y1, double x2, double y2, IDashStyle? dash = null) =>
        dc.DrawLine(new Pen(Brush.Parse(color), ScaleStroke(width), dash, PenLineCap.Round, PenLineJoin.Round, 10), new Point(ToX(x1), ToY(y1)), new Point(ToX(x2), ToY(y2)));

    private void DrawEllipse(DrawingContext dc, string? fill, string? stroke, double strokeWidth, double cx, double cy, double rx, double ry) =>
        dc.DrawEllipse(fill is null ? null : Brush.Parse(fill), stroke is null ? null : new Pen(Brush.Parse(stroke), ScaleStroke(strokeWidth)), new Point(ToX(cx), ToY(cy)), ScaleX(rx), ScaleY(ry));

    private void DrawGeometry(DrawingContext dc, Geometry geometry, string color, double width, double opacity, IDashStyle? dash = null)
    {
        using var _ = dc.PushOpacity(opacity);
        dc.DrawGeometry(null, new Pen(Brush.Parse(color), ScaleStroke(width), dash, PenLineCap.Round, PenLineJoin.Round, 10), geometry);
    }

    private Rect ToRect(double x, double y, double width, double height) => new(ToX(x), ToY(y), ScaleX(width), ScaleY(height));
    private double ToX(double value) => value / 1000d * Bounds.Width;
    private double ToY(double value) => value / 562.5d * Bounds.Height;
    private double ScaleX(double value) => value / 1000d * Bounds.Width;
    private double ScaleY(double value) => value / 562.5d * Bounds.Height;
    private double ScaleStroke(double value) => value * Math.Min(Bounds.Width / 1000d, Bounds.Height / 562.5d);
}
