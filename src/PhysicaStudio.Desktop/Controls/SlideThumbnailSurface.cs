using System.Globalization;
using Avalonia;
using Avalonia.Controls;
using Avalonia.Media;

namespace PhysicaStudio.Desktop.Controls;

public enum SlideThumbnailVariant
{
    Introduction,
    Harmonics,
    StandingWave,
    Energy,
    Applications
}

public sealed class SlideThumbnailSurface : Control
{
    public static readonly StyledProperty<SlideThumbnailVariant> VariantProperty =
        AvaloniaProperty.Register<SlideThumbnailSurface, SlideThumbnailVariant>(nameof(Variant));

    private static readonly Typeface Ui = new("Inter", FontStyle.Normal, FontWeight.Medium);
    private static readonly Typeface Display = new("Georgia", FontStyle.Normal, FontWeight.Bold);
    private static readonly IBrush Navy = Brush.Parse("#11284B");
    private static readonly IBrush Muted = Brush.Parse("#657784");
    private static readonly IBrush Blue = Brush.Parse("#168CFF");
    private static readonly IBrush Orange = Brush.Parse("#F29A2E");

    public SlideThumbnailVariant Variant
    {
        get => GetValue(VariantProperty);
        set => SetValue(VariantProperty, value);
    }

    public override void Render(DrawingContext context)
    {
        base.Render(context);
        context.DrawRectangle(Brush.Parse("#F8F9F7"), null, Bounds);
        if (Bounds.Width < 10 || Bounds.Height < 10)
        {
            return;
        }

        switch (Variant)
        {
            case SlideThumbnailVariant.Harmonics:
                DrawHarmonics(context);
                break;
            case SlideThumbnailVariant.StandingWave:
                DrawStandingWave(context);
                break;
            case SlideThumbnailVariant.Energy:
                DrawEnergy(context);
                break;
            case SlideThumbnailVariant.Applications:
                DrawApplications(context);
                break;
            default:
                DrawIntroduction(context);
                break;
        }
    }

    private void DrawIntroduction(DrawingContext dc)
    {
        Text(dc, "Standing Waves", 10, 7, 9, Navy, Display);
        Text(dc, "An introduction", 10, 19, 5.5, Muted, Ui);
        for (var phase = 0; phase < 4; phase++)
        {
            DrawWave(dc, 13, 56 + phase * 1.3, 132, 18 - phase * 2.2, 3, phase % 2 == 1,
                phase == 0 ? Blue : Brush.Parse("#B7D8F5"), phase == 0 ? 1.6 : .7);
        }
    }

    private void DrawHarmonics(DrawingContext dc)
    {
        Text(dc, "Harmonics", 10, 7, 9, Navy, Display);
        Text(dc, "Multiple modes of vibration", 10, 19, 5.5, Muted, Ui);
        for (var harmonic = 1; harmonic <= 3; harmonic++)
        {
            var y = 37 + harmonic * 15;
            Line(dc, Brush.Parse("#A5B0B8"), .7, 16, y, 145, y);
            DrawWave(dc, 16, y, 129, 6.5, harmonic, false, harmonic == 2 ? Blue : Brush.Parse("#75AADB"), 1.1);
        }
    }

    private void DrawStandingWave(DrawingContext dc)
    {
        Text(dc, "Standing Waves", 10, 7, 9, Navy, Display);
        Text(dc, "Nodes and antinodes", 10, 19, 5.5, Muted, Ui);
        DrawSupport(dc, 13, 39, 8, 43);
        DrawSupport(dc, 144, 39, 8, 43);
        Line(dc, Brush.Parse("#9AA8B2"), .7, 20, 60, 145, 60);
        DrawWave(dc, 20, 60, 125, 17, 3, false, Blue, 1.8);
        for (var i = 0; i <= 3; i++)
        {
            var x = 20 + 125d * i / 3d;
            dc.DrawEllipse(Brush.Parse("#F8F9F7"), new Pen(Blue, 1), new Point(X(x), Y(60)), X(2.1), Y(2.1));
        }
        dc.DrawEllipse(Orange, null, new Point(X(82.5), Y(43)), X(2.2), Y(2.2));
    }

    private void DrawEnergy(DrawingContext dc)
    {
        Text(dc, "Energy in a", 10, 7, 8.2, Navy, Display);
        Text(dc, "standing wave", 10, 17, 8.2, Navy, Display);
        Text(dc, "Kinetic and potential", 10, 29, 5.2, Muted, Ui);
        Line(dc, Brush.Parse("#8998A3"), .8, 22, 80, 22, 42);
        Line(dc, Brush.Parse("#8998A3"), .8, 22, 80, 148, 80);
        var blue = PathGeometry.Parse($"M {X(24)},{Y(76)} C {X(52)},{Y(69)} {X(55)},{Y(46)} {X(83)},{Y(44)} C {X(111)},{Y(45)} {X(120)},{Y(67)} {X(146)},{Y(75)}");
        var orange = PathGeometry.Parse($"M {X(24)},{Y(46)} C {X(48)},{Y(50)} {X(60)},{Y(74)} {X(84)},{Y(76)} C {X(110)},{Y(75)} {X(119)},{Y(50)} {X(146)},{Y(46)}");
        dc.DrawGeometry(null, new Pen(Blue, 1.5), blue);
        dc.DrawGeometry(null, new Pen(Orange, 1.4), orange);
    }

    private void DrawApplications(DrawingContext dc)
    {
        Text(dc, "Applications", 10, 7, 9, Navy, Display);
        Text(dc, "Strings and resonators", 10, 19, 5.5, Muted, Ui);
        var body = PathGeometry.Parse($"M {X(45)},{Y(80)} C {X(28)},{Y(72)} {X(31)},{Y(49)} {X(49)},{Y(45)} C {X(62)},{Y(42)} {X(68)},{Y(31)} {X(81)},{Y(36)} C {X(92)},{Y(42)} {X(88)},{Y(55)} {X(78)},{Y(61)} C {X(68)},{Y(67)} {X(63)},{Y(87)} {X(45)},{Y(80)} Z");
        dc.DrawGeometry(Brush.Parse("#B07A43"), new Pen(Brush.Parse("#6F492A"), 1), body);
        dc.DrawEllipse(Brush.Parse("#2A211B"), new Pen(Brush.Parse("#D3AA6A"), .7), new Point(X(62), Y(62)), X(8), Y(8));
        Line(dc, Brush.Parse("#6F492A"), 5, 79, 43, 139, 23);
        Line(dc, Brush.Parse("#D8B57D"), .8, 63, 62, 139, 27);
        DrawWave(dc, 91, 41, 54, 7, 2, false, Blue, 1.2);
    }

    private void DrawSupport(DrawingContext dc, double x, double y, double width, double height)
    {
        dc.DrawRectangle(Brush.Parse("#263038"), new Pen(Brush.Parse("#53616B"), .8), new Rect(X(x), Y(y), X(width), Y(height)), X(2), Y(2));
        Line(dc, Brush.Parse("#929BA1"), .8, x + 2.5, y + 3, x + 2.5, y + height - 3);
    }

    private void DrawWave(DrawingContext dc, double startX, double centerY, double length, double amplitude, int loops,
        bool inverted, IBrush brush, double width)
    {
        var points = new List<Point>();
        const int samples = 100;
        for (var i = 0; i <= samples; i++)
        {
            var t = i / (double)samples;
            var sign = inverted ? -1 : 1;
            var y = centerY - Math.Sin(t * loops * Math.PI) * amplitude * sign;
            points.Add(new Point(X(startX + t * length), Y(y)));
        }
        var geometry = new StreamGeometry();
        using (var g = geometry.Open())
        {
            g.BeginFigure(points[0], false);
            for (var i = 1; i < points.Count; i++)
            {
                g.LineTo(points[i]);
            }
        }
        dc.DrawGeometry(null, new Pen(brush, Math.Max(.6, X(width)), lineCap: PenLineCap.Round, lineJoin: PenLineJoin.Round), geometry);
    }

    private void Text(DrawingContext dc, string value, double x, double y, double size, IBrush brush, Typeface face)
    {
        var text = new FormattedText(value, CultureInfo.CurrentCulture, FlowDirection.LeftToRight, face, X(size), brush);
        dc.DrawText(text, new Point(X(x), Y(y)));
    }

    private void Line(DrawingContext dc, IBrush brush, double width, double x1, double y1, double x2, double y2) =>
        dc.DrawLine(new Pen(brush, Math.Max(.5, X(width)), lineCap: PenLineCap.Round),
            new Point(X(x1), Y(y1)), new Point(X(x2), Y(y2)));

    private double X(double value) => value / 167d * Bounds.Width;
    private double Y(double value) => value / 94d * Bounds.Height;
}
