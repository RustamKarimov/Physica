using System.Globalization;
using Avalonia;
using Avalonia.Controls;
using Avalonia.Media;
using PhysicaStudio.Document;
using PhysicaStudio.Rendering2D;

namespace PhysicaStudio.Desktop.Controls;

public sealed class DocumentSceneSurface : Control
{
    public static readonly StyledProperty<SceneSnapshot?> SnapshotProperty =
        AvaloniaProperty.Register<DocumentSceneSurface, SceneSnapshot?>(nameof(Snapshot));

    static DocumentSceneSurface() => AffectsRender<DocumentSceneSurface>(SnapshotProperty);

    public SceneSnapshot? Snapshot
    {
        get => GetValue(SnapshotProperty);
        set => SetValue(SnapshotProperty, value);
    }

    public override void Render(DrawingContext context)
    {
        base.Render(context);
        var snapshot = Snapshot;
        if (snapshot is null || Bounds.Width <= 0 || Bounds.Height <= 0
            || snapshot.LogicalSize.Width <= 0 || snapshot.LogicalSize.Height <= 0)
        {
            return;
        }

        using (context.PushOpacity(snapshot.Background.Opacity))
        {
            context.DrawRectangle(ParseBrush(snapshot.Background.Color, Brushes.White), null, Bounds);
        }

        foreach (var layer in snapshot.Layers.Where(layer => layer.IsVisible).OrderBy(layer => layer.ZIndex))
        {
            foreach (var primitive in layer.Primitives)
            {
                DrawPrimitive(context, snapshot.LogicalSize, primitive);
            }
        }
    }

    private void DrawPrimitive(DrawingContext context, RenderSize logicalSize, RenderPrimitiveSnapshot primitive)
    {
        if (primitive.Opacity <= 0)
        {
            return;
        }

        var bounds = Scale(logicalSize, primitive.Bounds);
        var style = primitive.Style;
        var fill = ParseOptionalBrush(style.FillColor);
        var stroke = ParseOptionalBrush(style.StrokeColor);
        var pen = stroke is null || style.StrokeWidth <= 0
            ? null
            : new Pen(stroke, StrokeScale(logicalSize, style.StrokeWidth), CreateDash(style.DashPattern), PenLineCap.Round, PenLineJoin.Round);

        using var opacity = context.PushOpacity(Math.Clamp(primitive.Opacity, 0, 1));
        switch (primitive.Kind)
        {
            case RenderPrimitiveKind.Ellipse:
                context.DrawEllipse(fill, pen, bounds.Center, bounds.Width / 2, bounds.Height / 2);
                break;
            case RenderPrimitiveKind.Line:
                DrawLine(context, logicalSize, primitive, pen);
                break;
            case RenderPrimitiveKind.Path:
            case RenderPrimitiveKind.Graph:
            case RenderPrimitiveKind.Field:
                DrawPath(context, logicalSize, primitive, fill, pen);
                break;
            case RenderPrimitiveKind.Text:
                DrawText(context, logicalSize, primitive, bounds);
                break;
            case RenderPrimitiveKind.Image:
                DrawImagePlaceholder(context, bounds, fill, pen);
                break;
            default:
                context.DrawRectangle(fill, pen, bounds,
                    StrokeScale(logicalSize, style.CornerRadius),
                    StrokeScale(logicalSize, style.CornerRadius));
                break;
        }
    }

    private void DrawLine(DrawingContext context, RenderSize logicalSize, RenderPrimitiveSnapshot primitive, IPen? pen)
    {
        if (pen is null || primitive.Points.Count < 2)
        {
            return;
        }

        context.DrawLine(pen, Scale(logicalSize, primitive.Points[0]), Scale(logicalSize, primitive.Points[^1]));
    }

    private void DrawPath(DrawingContext context, RenderSize logicalSize, RenderPrimitiveSnapshot primitive, IBrush? fill, IPen? pen)
    {
        if (primitive.Points.Count < 2)
        {
            return;
        }

        var geometry = new StreamGeometry();
        using (var drawing = geometry.Open())
        {
            drawing.BeginFigure(Scale(logicalSize, primitive.Points[0]), fill is not null);
            for (var index = 1; index < primitive.Points.Count; index++)
            {
                drawing.LineTo(Scale(logicalSize, primitive.Points[index]));
            }
        }
        context.DrawGeometry(fill, pen, geometry);
    }

    private void DrawText(DrawingContext context, RenderSize logicalSize, RenderPrimitiveSnapshot primitive, Rect bounds)
    {
        var text = primitive.Text ?? string.Empty;
        if (text.Length == 0)
        {
            return;
        }

        var style = primitive.Style;
        var weight = style.FontWeight switch
        {
            SceneFontWeight.Medium => FontWeight.Medium,
            SceneFontWeight.SemiBold => FontWeight.SemiBold,
            SceneFontWeight.Bold => FontWeight.Bold,
            _ => FontWeight.Normal,
        };
        var typeface = new Typeface(style.FontFamily,
            style.IsItalic ? FontStyle.Italic : FontStyle.Normal,
            weight);
        var fontSize = StrokeScale(logicalSize, style.FontSize);
        var brush = ParseBrush(style.TextColor, Brushes.Black);
        var lineHeight = fontSize * 1.25;
        var y = bounds.Y;
        foreach (var line in text.Replace("\r", string.Empty, StringComparison.Ordinal).Split('\n'))
        {
            var formatted = new FormattedText(line, CultureInfo.CurrentCulture, FlowDirection.LeftToRight, typeface, fontSize, brush);
            var x = style.TextAlignment switch
            {
                SceneTextAlignment.Center => bounds.X + (bounds.Width - formatted.Width) / 2,
                SceneTextAlignment.End => bounds.Right - formatted.Width,
                _ => bounds.X,
            };
            context.DrawText(formatted, new Point(x, y));
            y += lineHeight;
        }
    }

    private static void DrawImagePlaceholder(DrawingContext context, Rect bounds, IBrush? fill, IPen? pen)
    {
        context.DrawRectangle(fill ?? Brushes.WhiteSmoke, pen, bounds);
        var guidePen = pen ?? new Pen(Brushes.SlateGray, 1);
        context.DrawLine(guidePen, bounds.TopLeft, bounds.BottomRight);
        context.DrawLine(guidePen, bounds.TopRight, bounds.BottomLeft);
    }

    private Rect Scale(RenderSize logicalSize, RenderBounds bounds) => new(
        bounds.X / logicalSize.Width * Bounds.Width,
        bounds.Y / logicalSize.Height * Bounds.Height,
        bounds.Width / logicalSize.Width * Bounds.Width,
        bounds.Height / logicalSize.Height * Bounds.Height);

    private Point Scale(RenderSize logicalSize, RenderPoint point) => new(
        point.X / logicalSize.Width * Bounds.Width,
        point.Y / logicalSize.Height * Bounds.Height);

    private double StrokeScale(RenderSize logicalSize, double value) => value * Math.Min(
        Bounds.Width / logicalSize.Width,
        Bounds.Height / logicalSize.Height);

    private static IDashStyle? CreateDash(IReadOnlyList<double> pattern) =>
        pattern.Count == 0 ? null : new DashStyle(pattern, 0);

    private static IBrush? ParseOptionalBrush(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : ParseBrush(value, Brushes.Transparent);

    private static IBrush ParseBrush(string value, IBrush fallback)
    {
        try
        {
            return Brush.Parse(value);
        }
        catch (FormatException)
        {
            return fallback;
        }
    }
}
