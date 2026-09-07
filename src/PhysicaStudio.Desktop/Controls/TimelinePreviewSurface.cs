using System.Globalization;
using Avalonia;
using Avalonia.Controls;
using Avalonia.Input;
using Avalonia.Media;

namespace PhysicaStudio.Desktop.Controls;

public enum TimelinePreviewMode
{
    Tracks,
    Curves
}

public sealed class TimelinePreviewSurface : Control
{
    public static readonly StyledProperty<double> PlayheadSecondsProperty =
        AvaloniaProperty.Register<TimelinePreviewSurface, double>(nameof(PlayheadSeconds), 2.35);

    public static readonly StyledProperty<double> ZoomProperty =
        AvaloniaProperty.Register<TimelinePreviewSurface, double>(nameof(Zoom), 1.0);

    public static readonly StyledProperty<TimelinePreviewMode> PreviewModeProperty =
        AvaloniaProperty.Register<TimelinePreviewSurface, TimelinePreviewMode>(nameof(PreviewMode), TimelinePreviewMode.Tracks);

    private static readonly Typeface Regular = new("Inter", FontStyle.Normal, FontWeight.Normal, FontStretch.Normal);
    private static readonly Typeface Medium = new("Inter", FontStyle.Normal, FontWeight.Medium, FontStretch.Normal);
    private bool _draggingPlayhead;

    public double PlayheadSeconds
    {
        get => GetValue(PlayheadSecondsProperty);
        set => SetValue(PlayheadSecondsProperty, value);
    }

    public double Zoom
    {
        get => GetValue(ZoomProperty);
        set => SetValue(ZoomProperty, value);
    }

    public TimelinePreviewMode PreviewMode
    {
        get => GetValue(PreviewModeProperty);
        set => SetValue(PreviewModeProperty, value);
    }

    public override void Render(DrawingContext context)
    {
        base.Render(context);
        if (Bounds.Width <= 0 || Bounds.Height <= 0)
        {
            return;
        }

        if (PreviewMode == TimelinePreviewMode.Curves)
        {
            DrawCurves(context);
        }
        else
        {
            DrawTracks(context);
        }
    }

    protected override void OnPointerPressed(PointerPressedEventArgs e)
    {
        base.OnPointerPressed(e);
        if (PreviewMode != TimelinePreviewMode.Tracks)
        {
            return;
        }

        var point = e.GetCurrentPoint(this);
        if (!point.Properties.IsLeftButtonPressed)
        {
            return;
        }

        _draggingPlayhead = true;
        UpdatePlayhead(point.Position.X);
        e.Pointer.Capture(this);
        e.Handled = true;
    }

    protected override void OnPointerMoved(PointerEventArgs e)
    {
        base.OnPointerMoved(e);
        if (!_draggingPlayhead)
        {
            return;
        }

        UpdatePlayhead(e.GetPosition(this).X);
        e.Handled = true;
    }

    protected override void OnPointerReleased(PointerReleasedEventArgs e)
    {
        base.OnPointerReleased(e);
        _draggingPlayhead = false;
        e.Pointer.Capture(null);
    }

    protected override void OnPointerWheelChanged(PointerWheelEventArgs e)
    {
        base.OnPointerWheelChanged(e);
        Zoom = Math.Clamp(Zoom + e.Delta.Y * .08, .65, 2.4);
        InvalidateVisual();
        e.Handled = true;
    }

    private void UpdatePlayhead(double x)
    {
        var header = Math.Min(255, Bounds.Width * .24);
        var width = Math.Max(1, Bounds.Width - header);
        PlayheadSeconds = Math.Clamp((x - header) / width * (8 / Zoom), 0, 8 / Zoom);
        InvalidateVisual();
    }

    private void DrawTracks(DrawingContext dc)
    {
        var header = Math.Min(255, Bounds.Width * .24);
        const double toolbar = 29;
        const double ruler = 25;
        var trackTop = toolbar + ruler;
        var rows = new[]
        {
            new TrackRow("Standing wave system", 0, "#1E3444", true),
            new TrackRow("String shape", 1, "#172B39", true),
            new TrackRow("Create / trace", 2, "#142532", false),
            new TrackRow("Frequency  f", 1, "#172B39", false),
            new TrackRow("Node markers", 1, "#172B39", false),
            new TrackRow("Camera focus", 0, "#1E3444", false),
            new TrackRow("Checkpoints & events", 0, "#2A2830", false)
        };
        var rowHeight = Math.Max(22, (Bounds.Height - trackTop) / rows.Length);

        dc.DrawRectangle(Brush.Parse("#0D1721"), null, Bounds);
        dc.DrawRectangle(Brush.Parse("#142331"), null, new Rect(0, 0, Bounds.Width, toolbar));
        dc.DrawLine(new Pen(Brush.Parse("#2C4052"), 1), new Point(0, toolbar), new Point(Bounds.Width, toolbar));

        DrawToolbarIcon(dc, 14, 14, "play");
        DrawToolbarIcon(dc, 46, 14, "pause");
        DrawToolbarIcon(dc, 78, 14, "key");
        DrawToolbarIcon(dc, 110, 14, "condition");
        DrawText(dc, "00:02.35 / 00:12.00", 144, 7, 11.5, "#AEBECA", Medium);
        DrawText(dc, "Drag to seek  ·  wheel to zoom", Bounds.Width - 228, 7, 11.5, "#768C9F", Regular);

        dc.DrawRectangle(Brush.Parse("#101D28"), null, new Rect(0, toolbar, Bounds.Width, ruler));
        dc.DrawLine(new Pen(Brush.Parse("#2B3E50"), 1), new Point(header, toolbar), new Point(header, Bounds.Height));

        var visibleSeconds = 8 / Zoom;
        var secondWidth = (Bounds.Width - header) / visibleSeconds;
        for (var second = 0; second <= Math.Ceiling(visibleSeconds); second++)
        {
            var x = header + second * secondWidth;
            dc.DrawLine(new Pen(Brush.Parse("#34495A"), 1), new Point(x, toolbar + 13), new Point(x, Bounds.Height));
            DrawText(dc, $"{second:0}s", x + 5, toolbar + 4, 10.5, "#8196A8", Regular);
            if (second < Math.Ceiling(visibleSeconds))
            {
                for (var quarter = 1; quarter < 4; quarter++)
                {
                    var qx = x + quarter * secondWidth / 4;
                    dc.DrawLine(new Pen(Brush.Parse("#243746"), 1), new Point(qx, toolbar + 19), new Point(qx, Bounds.Height));
                }
            }
        }

        for (var i = 0; i < rows.Length; i++)
        {
            var y = trackTop + i * rowHeight;
            dc.DrawRectangle(Brush.Parse(rows[i].Background), null, new Rect(0, y, Bounds.Width, rowHeight));
            dc.DrawLine(new Pen(Brush.Parse("#223545"), 1), new Point(0, y + rowHeight), new Point(Bounds.Width, y + rowHeight));
            DrawTrackHeader(dc, rows[i], i, y, rowHeight, header);
        }

        DrawClip(dc, header, secondWidth, trackTop + rowHeight * 0 + 4, .15, 6.7, rowHeight - 8, "#225D72", "Physics continues");
        DrawClip(dc, header, secondWidth, trackTop + rowHeight * 2 + 4, .55, 1.55, rowHeight - 8, "#4B6591", "Create wave");
        DrawClip(dc, header, secondWidth, trackTop + rowHeight * 3 + 4, 2.2, 2.0, rowHeight - 8, "#604987", "6.0 → 9.0 Hz");
        DrawClip(dc, header, secondWidth, trackTop + rowHeight * 4 + 4, 4.35, 1.75, rowHeight - 8, "#26766E", "Reveal nodes");
        DrawClip(dc, header, secondWidth, trackTop + rowHeight * 5 + 4, 4.9, 1.2, rowHeight - 8, "#385C78", "Focus");

        DrawKey(dc, header + secondWidth * 2.2, trackTop + rowHeight * 3 + rowHeight / 2, "#9B68D7", false);
        DrawKey(dc, header + secondWidth * 4.35, trackTop + rowHeight * 4 + rowHeight / 2, "#25C9C3", false);
        DrawKey(dc, header + secondWidth * 5.95, trackTop + rowHeight * 5 + rowHeight / 2, "#168CFF", false);
        DrawKey(dc, header + secondWidth * 2.2, trackTop + rowHeight * 6 + rowHeight / 2, "#F29A2E", true);
        DrawKey(dc, header + secondWidth * 4.35, trackTop + rowHeight * 6 + rowHeight / 2, "#9B68D7", true);
        DrawKey(dc, header + secondWidth * 6.1, trackTop + rowHeight * 6 + rowHeight / 2, "#25C9C3", false);

        var playX = header + PlayheadSeconds * secondWidth;
        dc.DrawLine(new Pen(Brush.Parse("#168CFF"), 1.5), new Point(playX, toolbar), new Point(playX, Bounds.Height));
        dc.DrawGeometry(Brush.Parse("#168CFF"), null, PathGeometry.Parse($"M {playX-5},{toolbar} L {playX+5},{toolbar} L {playX},{toolbar+7} Z"));
        DrawText(dc, $"{PlayheadSeconds:0.00}s", Math.Clamp(playX - 18, header, Bounds.Width - 52), 2, 10.5, "#D8ECFF", Medium);
    }

    private void DrawCurves(DrawingContext dc)
    {
        dc.DrawRectangle(Brush.Parse("#0D1721"), null, Bounds);
        dc.DrawRectangle(Brush.Parse("#142331"), null, new Rect(0, 0, Bounds.Width, 30));
        DrawText(dc, "ANIMATION CURVES  ·  FREQUENCY", 14, 8, 10, "#AABBC9", Medium);
        DrawText(dc, "Cubic Bézier", Bounds.Width - 104, 8, 10, "#57D8C8", Medium);
        var left = 46d;
        var top = 52d;
        var right = Bounds.Width - 22;
        var bottom = Bounds.Height - 28;
        for (var i = 0; i <= 5; i++)
        {
            var x = left + (right - left) * i / 5;
            dc.DrawLine(new Pen(Brush.Parse("#243847"), 1), new Point(x, top), new Point(x, bottom));
        }
        for (var i = 0; i <= 4; i++)
        {
            var y = top + (bottom - top) * i / 4;
            dc.DrawLine(new Pen(Brush.Parse("#243847"), 1), new Point(left, y), new Point(right, y));
        }
        dc.DrawLine(new Pen(Brush.Parse("#73899A"), 1), new Point(left, bottom), new Point(right, bottom));
        dc.DrawLine(new Pen(Brush.Parse("#73899A"), 1), new Point(left, bottom), new Point(left, top));

        var curve = PathGeometry.Parse($"M {left},{bottom} C {left + (right-left)*.16},{bottom} {left + (right-left)*.27},{top + (bottom-top)*.16} {left + (right-left)*.48},{top + (bottom-top)*.38} C {left + (right-left)*.68},{top + (bottom-top)*.57} {left + (right-left)*.82},{top} {right},{top}");
        dc.DrawGeometry(null, new Pen(Brush.Parse("#57D8C8"), 3, null, PenLineCap.Round, PenLineJoin.Round, 10), curve);
        DrawHandle(dc, left + (right-left)*.16, bottom, left, bottom);
        DrawHandle(dc, left + (right-left)*.27, top + (bottom-top)*.16, left + (right-left)*.48, top + (bottom-top)*.38);
        DrawHandle(dc, left + (right-left)*.82, top, right, top);
        DrawText(dc, "0 Hz", 8, bottom - 5, 9, "#7E94A6", Regular);
        DrawText(dc, "12 Hz", 5, top - 5, 9, "#7E94A6", Regular);
        DrawText(dc, "presentation time", right - 95, bottom + 9, 9, "#7E94A6", Regular);
    }

    private void DrawTrackHeader(DrawingContext dc, TrackRow row, int index, double y, double height, double header)
    {
        var indent = 10 + row.Depth * 18;
        if (row.HasChildren)
        {
            var midY = y + height / 2;
            dc.DrawGeometry(Brush.Parse("#91A5B7"), null, PathGeometry.Parse($"M {indent},{midY-3} L {indent+7},{midY-3} L {indent+3.5},{midY+3} Z"));
        }
        DrawText(dc, row.Name, indent + 14, y + Math.Max(3, (height - 16) / 2), 12.5, row.Name.Contains("Checkpoints", StringComparison.Ordinal) ? "#E8C175" : "#C5D3DE", row.Depth == 0 ? Medium : Regular);
        DrawEye(dc, header - 52, y + height / 2);
        DrawLock(dc, header - 25, y + height / 2);
        if (index == 3)
        {
            DrawText(dc, "6.00 Hz", header - 107, y + Math.Max(3, (height - 16) / 2), 11, "#76DED2", Medium);
        }
    }

    private void DrawClip(DrawingContext dc, double header, double secondWidth, double y, double start, double duration, double height, string color, string label)
    {
        var rect = new Rect(header + start * secondWidth, y, Math.Max(8, duration * secondWidth), Math.Max(8, height));
        dc.DrawRectangle(Brush.Parse(color), new Pen(Brush.Parse("#7890A3"), .6), rect, 3, 3);
        if (rect.Width > 58)
        {
            DrawText(dc, label, rect.X + 8, rect.Y + Math.Max(1, (rect.Height - 15) / 2), 11, "#EEF6FB", Medium);
        }
    }

    private static void DrawKey(DrawingContext dc, double x, double y, string color, bool outlined)
    {
        var geometry = PathGeometry.Parse($"M {x},{y-6} L {x+6},{y} L {x},{y+6} L {x-6},{y} Z");
        dc.DrawGeometry(outlined ? Brush.Parse("#101A24") : Brush.Parse(color), new Pen(Brush.Parse(color), 1.5), geometry);
    }

    private static void DrawEye(DrawingContext dc, double x, double y)
    {
        dc.DrawGeometry(null, new Pen(Brush.Parse("#708799"), 1), PathGeometry.Parse($"M {x-6},{y} C {x-3},{y-4} {x+3},{y-4} {x+6},{y} C {x+3},{y+4} {x-3},{y+4} {x-6},{y}"));
        dc.DrawEllipse(Brush.Parse("#708799"), null, new Point(x, y), 1.7, 1.7);
    }

    private static void DrawLock(DrawingContext dc, double x, double y)
    {
        var pen = new Pen(Brush.Parse("#667D90"), 1);
        dc.DrawRectangle(null, pen, new Rect(x - 4, y - 1, 8, 7), 1, 1);
        dc.DrawGeometry(null, pen, PathGeometry.Parse($"M {x-3},{y-1} L {x-3},{y-4} C {x-3},{y-8} {x+3},{y-8} {x+3},{y-4} L {x+3},{y-1}"));
    }

    private static void DrawToolbarIcon(DrawingContext dc, double x, double y, string kind)
    {
        var pen = new Pen(Brush.Parse("#9CB0C1"), 1.4, null, PenLineCap.Round, PenLineJoin.Round, 10);
        switch (kind)
        {
            case "play":
                dc.DrawGeometry(Brush.Parse("#57D8C8"), null, PathGeometry.Parse($"M {x-4},{y-6} L {x+6},{y} L {x-4},{y+6} Z"));
                break;
            case "pause":
                dc.DrawLine(pen, new Point(x - 3, y - 5), new Point(x - 3, y + 5));
                dc.DrawLine(pen, new Point(x + 3, y - 5), new Point(x + 3, y + 5));
                break;
            case "condition":
                dc.DrawEllipse(null, pen, new Point(x, y), 6, 6);
                dc.DrawLine(pen, new Point(x, y), new Point(x + 4, y - 3));
                break;
            default:
                dc.DrawGeometry(null, pen, PathGeometry.Parse($"M {x},{y-6} L {x+6},{y} L {x},{y+6} L {x-6},{y} Z"));
                break;
        }
    }

    private static void DrawHandle(DrawingContext dc, double handleX, double handleY, double anchorX, double anchorY)
    {
        dc.DrawLine(new Pen(Brush.Parse("#6D8294"), 1), new Point(anchorX, anchorY), new Point(handleX, handleY));
        dc.DrawEllipse(Brush.Parse("#0D1721"), new Pen(Brush.Parse("#E8B85F"), 2), new Point(handleX, handleY), 5, 5);
    }

    private static void DrawText(DrawingContext dc, string text, double x, double y, double size, string color, Typeface typeface)
    {
        var formatted = new FormattedText(text, CultureInfo.CurrentCulture, FlowDirection.LeftToRight, typeface, size, Brush.Parse(color));
        dc.DrawText(formatted, new Point(x, y));
    }

    private sealed record TrackRow(string Name, int Depth, string Background, bool HasChildren);
}
