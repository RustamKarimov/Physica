using System.Globalization;
using Avalonia;
using Avalonia.Controls;
using Avalonia.Media;
using PhysicaStudio.Document;
using PhysicaStudio.Rendering2D;

namespace PhysicaStudio.Desktop.Controls;

public enum CanvasSelectionHandle
{
    None,
    Body,
    ResizeNorthWest,
    ResizeNorthEast,
    ResizeSouthEast,
    ResizeSouthWest,
    Rotate,
}

public sealed record CanvasNodePreview(RenderBounds Bounds, double RotationDegrees);

public sealed class DocumentSceneSurface : Control
{
    public static readonly StyledProperty<SceneSnapshot?> SnapshotProperty =
        AvaloniaProperty.Register<DocumentSceneSurface, SceneSnapshot?>(nameof(Snapshot));

    public static readonly StyledProperty<IReadOnlySet<Guid>?> SelectedNodeIdsProperty =
        AvaloniaProperty.Register<DocumentSceneSurface, IReadOnlySet<Guid>?>(nameof(SelectedNodeIds));

    public static readonly StyledProperty<bool> IsAuthoringSurfaceProperty =
        AvaloniaProperty.Register<DocumentSceneSurface, bool>(nameof(IsAuthoringSurface));

    private IReadOnlyDictionary<Guid, CanvasNodePreview> _interactionPreview =
        new Dictionary<Guid, CanvasNodePreview>();
    private Rect? _selectionMarquee;

    static DocumentSceneSurface() => AffectsRender<DocumentSceneSurface>(
        SnapshotProperty,
        SelectedNodeIdsProperty,
        IsAuthoringSurfaceProperty);

    public SceneSnapshot? Snapshot
    {
        get => GetValue(SnapshotProperty);
        set => SetValue(SnapshotProperty, value);
    }

    public IReadOnlySet<Guid>? SelectedNodeIds
    {
        get => GetValue(SelectedNodeIdsProperty);
        set => SetValue(SelectedNodeIdsProperty, value);
    }

    public bool IsAuthoringSurface
    {
        get => GetValue(IsAuthoringSurfaceProperty);
        set => SetValue(IsAuthoringSurfaceProperty, value);
    }

    public void SetInteractionPreview(IReadOnlyDictionary<Guid, CanvasNodePreview>? preview)
    {
        _interactionPreview = preview ?? new Dictionary<Guid, CanvasNodePreview>();
        InvalidateVisual();
    }

    public void SetSelectionMarquee(Rect? marquee)
    {
        _selectionMarquee = marquee;
        InvalidateVisual();
    }

    public IReadOnlySet<Guid> GetNodeIdsInsideMarquee(Rect marquee)
    {
        var snapshot = Snapshot;
        if (snapshot is null)
        {
            return new HashSet<Guid>();
        }

        var normalized = CanvasTransformGeometry.Normalize(marquee.TopLeft, marquee.BottomRight);
        return snapshot.Layers
            .Where(layer => layer.IsVisible)
            .SelectMany(layer => layer.Primitives)
            .Where(primitive => primitive.Opacity > 0)
            .Where(primitive =>
            {
                var logicalBounds = _interactionPreview.TryGetValue(primitive.Id, out var preview)
                    ? preview.Bounds
                    : primitive.Bounds;
                var surfaceBounds = Scale(snapshot.LogicalSize, logicalBounds);
                return normalized.Contains(surfaceBounds.TopLeft)
                    && normalized.Contains(surfaceBounds.BottomRight);
            })
            .Select(primitive => primitive.Id)
            .ToHashSet();
    }

    public Point ToLogical(Point surfacePoint)
    {
        var snapshot = Snapshot;
        return snapshot is null || Bounds.Width <= 0 || Bounds.Height <= 0
            ? default
            : new Point(
                surfacePoint.X / Bounds.Width * snapshot.LogicalSize.Width,
                surfacePoint.Y / Bounds.Height * snapshot.LogicalSize.Height);
    }

    public Guid? HitTestNode(Point surfacePoint)
    {
        var snapshot = Snapshot;
        if (snapshot is null)
        {
            return null;
        }

        foreach (var layer in snapshot.Layers.Where(layer => layer.IsVisible).OrderByDescending(layer => layer.ZIndex))
        {
            foreach (var primitive in layer.Primitives.Reverse())
            {
                _interactionPreview.TryGetValue(primitive.Id, out var preview);
                if (primitive.Opacity > 0 && HitTestPrimitive(snapshot.LogicalSize, primitive, preview, surfacePoint))
                {
                    return primitive.Id;
                }
            }
        }

        return null;
    }

    public CanvasSelectionHandle HitTestSelectionHandle(Point surfacePoint)
    {
        var selectionBounds = GetSelectionSurfaceBounds();
        if (selectionBounds is not Rect bounds)
        {
            return CanvasSelectionHandle.None;
        }

        const double hitRadius = 9;
        var rotationCenter = new Point(bounds.Center.X, bounds.Top - 26);
        if (Distance(surfacePoint, rotationCenter) <= hitRadius + 2)
        {
            return CanvasSelectionHandle.Rotate;
        }

        var handles = new[]
        {
            (CanvasSelectionHandle.ResizeNorthWest, bounds.TopLeft),
            (CanvasSelectionHandle.ResizeNorthEast, bounds.TopRight),
            (CanvasSelectionHandle.ResizeSouthEast, bounds.BottomRight),
            (CanvasSelectionHandle.ResizeSouthWest, bounds.BottomLeft),
        };
        foreach (var (kind, point) in handles)
        {
            if (Distance(surfacePoint, point) <= hitRadius)
            {
                return kind;
            }
        }

        var snapshot = Snapshot;
        var selectedIds = SelectedNodeIds;
        if (snapshot is not null && selectedIds is not null)
        {
            foreach (var primitive in snapshot.Layers.SelectMany(layer => layer.Primitives)
                         .Where(primitive => selectedIds.Contains(primitive.Id)))
            {
                _interactionPreview.TryGetValue(primitive.Id, out var preview);
                if (primitive.Opacity > 0 && HitTestPrimitive(snapshot.LogicalSize, primitive, preview, surfacePoint))
                {
                    return CanvasSelectionHandle.Body;
                }
            }
        }

        return CanvasSelectionHandle.None;
    }

    public RenderBounds? GetNodeLogicalBounds(Guid nodeId)
    {
        if (_interactionPreview.TryGetValue(nodeId, out var preview))
        {
            return preview.Bounds;
        }

        return Snapshot?.Layers
            .SelectMany(layer => layer.Primitives)
            .FirstOrDefault(primitive => primitive.Id == nodeId)
            ?.Bounds;
    }

    private bool HitTestPrimitive(
        RenderSize logicalSize,
        RenderPrimitiveSnapshot primitive,
        CanvasNodePreview? preview,
        Point surfacePoint)
    {
        var logicalBounds = preview?.Bounds ?? primitive.Bounds;
        var surfaceBounds = Scale(logicalSize, logicalBounds);
        var rotationDegrees = preview?.RotationDegrees ?? primitive.RotationDegrees;
        var testPoint = Math.Abs(rotationDegrees) > .001
            ? Rotate(surfacePoint, surfaceBounds.Center, -rotationDegrees)
            : surfacePoint;

        switch (primitive.Kind)
        {
            case RenderPrimitiveKind.Line:
            case RenderPrimitiveKind.Path:
            case RenderPrimitiveKind.Graph:
            case RenderPrimitiveKind.Field:
                if (primitive.Points.Count < 2)
                {
                    return false;
                }

                var tolerance = Math.Max(6, StrokeScale(logicalSize, primitive.Style.StrokeWidth) / 2 + 4);
                var previous = Scale(logicalSize, PreviewPoint(primitive, preview, primitive.Points[0]));
                for (var index = 1; index < primitive.Points.Count; index++)
                {
                    var current = Scale(logicalSize, PreviewPoint(primitive, preview, primitive.Points[index]));
                    if (DistanceToSegment(testPoint, previous, current) <= tolerance)
                    {
                        return true;
                    }
                    previous = current;
                }
                return false;
            case RenderPrimitiveKind.Ellipse:
                var radiusX = Math.Max(surfaceBounds.Width / 2, 1);
                var radiusY = Math.Max(surfaceBounds.Height / 2, 1);
                var normalizedX = (testPoint.X - surfaceBounds.Center.X) / (radiusX + 5);
                var normalizedY = (testPoint.Y - surfaceBounds.Center.Y) / (radiusY + 5);
                return normalizedX * normalizedX + normalizedY * normalizedY <= 1;
            default:
                return surfaceBounds.Inflate(5).Contains(testPoint);
        }
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
                _interactionPreview.TryGetValue(primitive.Id, out var preview);
                DrawPrimitive(context, snapshot.LogicalSize, primitive, preview);
            }
        }

        if (IsAuthoringSurface)
        {
            DrawSelection(context);
            DrawSelectionMarquee(context);
        }
    }

    private void DrawPrimitive(
        DrawingContext context,
        RenderSize logicalSize,
        RenderPrimitiveSnapshot primitive,
        CanvasNodePreview? preview)
    {
        if (primitive.Opacity <= 0)
        {
            return;
        }

        var logicalBounds = preview?.Bounds ?? primitive.Bounds;
        var bounds = Scale(logicalSize, logicalBounds);
        var rotationDegrees = preview?.RotationDegrees ?? primitive.RotationDegrees;
        var style = primitive.Style;
        var fill = ParseOptionalBrush(style.FillColor);
        var stroke = ParseOptionalBrush(style.StrokeColor);
        var pen = stroke is null || style.StrokeWidth <= 0
            ? null
            : new Pen(stroke, StrokeScale(logicalSize, style.StrokeWidth), CreateDash(style.DashPattern), PenLineCap.Round, PenLineJoin.Round);

        using var opacity = context.PushOpacity(Math.Clamp(primitive.Opacity, 0, 1));
        using var rotation = context.PushTransform(Math.Abs(rotationDegrees) > .001
            ? Matrix.CreateRotation(rotationDegrees * Math.PI / 180, bounds.Center)
            : Matrix.Identity);
        switch (primitive.Kind)
        {
            case RenderPrimitiveKind.Ellipse:
                context.DrawEllipse(fill, pen, bounds.Center, bounds.Width / 2, bounds.Height / 2);
                break;
            case RenderPrimitiveKind.Line:
                DrawLine(context, logicalSize, primitive, preview, pen);
                break;
            case RenderPrimitiveKind.Path:
            case RenderPrimitiveKind.Graph:
            case RenderPrimitiveKind.Field:
                DrawPath(context, logicalSize, primitive, preview, fill, pen);
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

    private void DrawLine(
        DrawingContext context,
        RenderSize logicalSize,
        RenderPrimitiveSnapshot primitive,
        CanvasNodePreview? preview,
        IPen? pen)
    {
        if (pen is null || primitive.Points.Count < 2)
        {
            return;
        }

        context.DrawLine(
            pen,
            Scale(logicalSize, PreviewPoint(primitive, preview, primitive.Points[0])),
            Scale(logicalSize, PreviewPoint(primitive, preview, primitive.Points[^1])));
    }

    private void DrawPath(
        DrawingContext context,
        RenderSize logicalSize,
        RenderPrimitiveSnapshot primitive,
        CanvasNodePreview? preview,
        IBrush? fill,
        IPen? pen)
    {
        if (primitive.Points.Count < 2)
        {
            return;
        }

        var geometry = new StreamGeometry();
        using (var drawing = geometry.Open())
        {
            drawing.BeginFigure(Scale(logicalSize, PreviewPoint(primitive, preview, primitive.Points[0])), fill is not null);
            for (var index = 1; index < primitive.Points.Count; index++)
            {
                drawing.LineTo(Scale(logicalSize, PreviewPoint(primitive, preview, primitive.Points[index])));
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

    private void DrawSelection(DrawingContext context)
    {
        var bounds = GetSelectionSurfaceBounds();
        if (bounds is not Rect selection)
        {
            return;
        }

        var selectionPen = new Pen(Brush.Parse("#168CFF"), 1.5);
        context.DrawRectangle(null, selectionPen, selection);
        var rotationCenter = new Point(selection.Center.X, selection.Top - 26);
        context.DrawLine(selectionPen, new Point(selection.Center.X, selection.Top), rotationCenter);
        context.DrawEllipse(Brushes.White, selectionPen, rotationCenter, 5, 5);
        foreach (var point in new[] { selection.TopLeft, selection.TopRight, selection.BottomRight, selection.BottomLeft })
        {
            context.DrawRectangle(Brushes.White, selectionPen, new Rect(point.X - 4, point.Y - 4, 8, 8), 1, 1);
        }
    }

    private void DrawSelectionMarquee(DrawingContext context)
    {
        if (_selectionMarquee is not Rect marquee)
        {
            return;
        }

        var normalized = CanvasTransformGeometry.Normalize(marquee.TopLeft, marquee.BottomRight);
        var fill = Brush.Parse("#24168CFF");
        var pen = new Pen(Brush.Parse("#168CFF"), 1, new DashStyle([5, 3], 0));
        context.DrawRectangle(fill, pen, normalized);
    }

    private Rect? GetSelectionSurfaceBounds()
    {
        var snapshot = Snapshot;
        var selectedIds = SelectedNodeIds;
        if (snapshot is null || selectedIds is null || selectedIds.Count == 0)
        {
            return null;
        }

        Rect? union = null;
        foreach (var primitive in snapshot.Layers.SelectMany(layer => layer.Primitives)
                     .Where(primitive => selectedIds.Contains(primitive.Id)))
        {
            var logicalBounds = _interactionPreview.TryGetValue(primitive.Id, out var preview)
                ? preview.Bounds
                : primitive.Bounds;
            var surfaceBounds = Scale(snapshot.LogicalSize, logicalBounds);
            union = union is Rect accumulated ? accumulated.Union(surfaceBounds) : surfaceBounds;
        }
        return union;
    }

    private static RenderPoint PreviewPoint(
        RenderPrimitiveSnapshot primitive,
        CanvasNodePreview? preview,
        RenderPoint point)
    {
        if (preview is null)
        {
            return point;
        }

        var source = primitive.Bounds;
        var target = preview.Bounds;
        var normalizedX = Math.Abs(source.Width) < .001 ? 0 : (point.X - source.X) / source.Width;
        var normalizedY = Math.Abs(source.Height) < .001 ? 0 : (point.Y - source.Y) / source.Height;
        return new RenderPoint(
            target.X + normalizedX * target.Width,
            target.Y + normalizedY * target.Height);
    }

    private static double Distance(Point first, Point second)
    {
        var x = first.X - second.X;
        var y = first.Y - second.Y;
        return Math.Sqrt(x * x + y * y);
    }

    private static double DistanceToSegment(Point point, Point start, Point end)
    {
        var segmentX = end.X - start.X;
        var segmentY = end.Y - start.Y;
        var lengthSquared = segmentX * segmentX + segmentY * segmentY;
        if (lengthSquared < .001)
        {
            return Distance(point, start);
        }

        var projection = Math.Clamp(
            ((point.X - start.X) * segmentX + (point.Y - start.Y) * segmentY) / lengthSquared,
            0,
            1);
        return Distance(point, new Point(start.X + projection * segmentX, start.Y + projection * segmentY));
    }

    private static Point Rotate(Point point, Point center, double degrees)
    {
        var radians = degrees * Math.PI / 180;
        var cosine = Math.Cos(radians);
        var sine = Math.Sin(radians);
        var x = point.X - center.X;
        var y = point.Y - center.Y;
        return new Point(
            center.X + x * cosine - y * sine,
            center.Y + x * sine + y * cosine);
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
