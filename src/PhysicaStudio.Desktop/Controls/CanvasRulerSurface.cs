using System.Globalization;
using Avalonia;
using Avalonia.Controls;
using Avalonia.Media;

namespace PhysicaStudio.Desktop.Controls;

public enum CanvasRulerOrientation
{
    Horizontal,
    Vertical,
}

public sealed class CanvasRulerSurface : Control
{
    public static readonly StyledProperty<CanvasRulerOrientation> OrientationProperty =
        AvaloniaProperty.Register<CanvasRulerSurface, CanvasRulerOrientation>(nameof(Orientation));

    public static readonly StyledProperty<double> ViewportZoomProperty =
        AvaloniaProperty.Register<CanvasRulerSurface, double>(nameof(ViewportZoom), 1);

    public static readonly StyledProperty<double> StartOffsetProperty =
        AvaloniaProperty.Register<CanvasRulerSurface, double>(nameof(StartOffset));

    public static readonly StyledProperty<double> LogicalLengthProperty =
        AvaloniaProperty.Register<CanvasRulerSurface, double>(nameof(LogicalLength), 1);

    public static readonly StyledProperty<double> MajorIntervalProperty =
        AvaloniaProperty.Register<CanvasRulerSurface, double>(nameof(MajorInterval));

    static CanvasRulerSurface() => AffectsRender<CanvasRulerSurface>(
        OrientationProperty, ViewportZoomProperty, StartOffsetProperty, LogicalLengthProperty,
        MajorIntervalProperty);

    public CanvasRulerOrientation Orientation
    {
        get => GetValue(OrientationProperty);
        set => SetValue(OrientationProperty, value);
    }

    public double ViewportZoom
    {
        get => GetValue(ViewportZoomProperty);
        set => SetValue(ViewportZoomProperty, value);
    }

    public double StartOffset
    {
        get => GetValue(StartOffsetProperty);
        set => SetValue(StartOffsetProperty, value);
    }

    public double LogicalLength
    {
        get => GetValue(LogicalLengthProperty);
        set => SetValue(LogicalLengthProperty, value);
    }

    /// <summary>
    /// Gets or sets the ruler's major interval in slide units. Zero selects an
    /// interval automatically from the current zoom.
    /// </summary>
    public double MajorInterval
    {
        get => GetValue(MajorIntervalProperty);
        set => SetValue(MajorIntervalProperty, value);
    }

    public override void Render(DrawingContext context)
    {
        base.Render(context);
        context.DrawRectangle(Brush.Parse("#EC0F1C25"), null, Bounds);
        if (!double.IsFinite(ViewportZoom) || ViewportZoom <= 0 || LogicalLength <= 0)
        {
            return;
        }

        var major = MajorInterval > 0 ? MajorInterval : SelectMajorStep(ViewportZoom);
        var minor = major / 5;
        var end = StartOffset + LogicalLength * ViewportZoom;
        var axisPen = new Pen(Brush.Parse("#63798A"), 1);
        var tickPen = new Pen(Brush.Parse("#7790A1"), 1);
        var labelBrush = Brush.Parse("#A8BBC8");
        var typeface = new Typeface("Inter");
        var lower = Math.Max(0, Math.Floor(-StartOffset / ViewportZoom / minor) * minor);

        for (var logical = lower; logical <= LogicalLength + .001; logical += minor)
        {
            var screen = StartOffset + logical * ViewportZoom;
            if (screen < -1 || screen > (Orientation == CanvasRulerOrientation.Horizontal ? Bounds.Width : Bounds.Height) + 1)
            {
                continue;
            }
            var majorTick = Math.Abs(logical / major - Math.Round(logical / major)) < .001;
            if (Orientation == CanvasRulerOrientation.Horizontal)
            {
                context.DrawLine(tickPen, new Point(screen, Bounds.Height),
                    new Point(screen, Bounds.Height - (majorTick ? 9 : 5)));
                if (majorTick)
                {
                    var label = new FormattedText(logical.ToString("0", CultureInfo.CurrentCulture),
                        CultureInfo.CurrentCulture, FlowDirection.LeftToRight, typeface, 9.5, labelBrush);
                    context.DrawText(label, new Point(screen + 3, 2));
                }
            }
            else
            {
                context.DrawLine(tickPen, new Point(Bounds.Width, screen),
                    new Point(Bounds.Width - (majorTick ? 9 : 5), screen));
                if (majorTick)
                {
                    var label = new FormattedText(logical.ToString("0", CultureInfo.CurrentCulture),
                        CultureInfo.CurrentCulture, FlowDirection.LeftToRight, typeface, 9.5, labelBrush);
                    using var rotation = context.PushTransform(Matrix.CreateRotation(-Math.PI / 2,
                        new Point(2, screen - 3)));
                    context.DrawText(label, new Point(2, screen - 3));
                }
            }
        }

        if (Orientation == CanvasRulerOrientation.Horizontal)
        {
            context.DrawLine(axisPen, new Point(Math.Max(0, StartOffset), Bounds.Height - .5),
                new Point(Math.Min(Bounds.Width, end), Bounds.Height - .5));
        }
        else
        {
            context.DrawLine(axisPen, new Point(Bounds.Width - .5, Math.Max(0, StartOffset)),
                new Point(Bounds.Width - .5, Math.Min(Bounds.Height, end)));
        }
    }

    private static double SelectMajorStep(double zoom)
    {
        var candidates = new[] { 10d, 20d, 50d };
        var power = Math.Pow(10, Math.Floor(Math.Log10(80 / zoom)) - 1);
        while (true)
        {
            foreach (var candidate in candidates)
            {
                var step = candidate * power;
                if (step * zoom >= 70)
                {
                    return step;
                }
            }
            power *= 10;
        }
    }
}
