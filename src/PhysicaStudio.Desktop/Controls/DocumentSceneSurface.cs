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

public sealed record CanvasGuidanceState(
    CanvasDefinition Canvas,
    IReadOnlyList<GuideDefinition> Guides,
    SnapSettings SnapSettings);

public sealed record CanvasSnapLine(string Axis, string Source, double Position);

public sealed class DocumentSceneSurface : Control
{
    public static readonly StyledProperty<SceneSnapshot?> SnapshotProperty =
        AvaloniaProperty.Register<DocumentSceneSurface, SceneSnapshot?>(nameof(Snapshot));

    public static readonly StyledProperty<IReadOnlySet<Guid>?> SelectedNodeIdsProperty =
        AvaloniaProperty.Register<DocumentSceneSurface, IReadOnlySet<Guid>?>(nameof(SelectedNodeIds));

    public static readonly StyledProperty<bool> IsAuthoringSurfaceProperty =
        AvaloniaProperty.Register<DocumentSceneSurface, bool>(nameof(IsAuthoringSurface));

    public static readonly StyledProperty<double> ViewportZoomProperty =
        AvaloniaProperty.Register<DocumentSceneSurface, double>(nameof(ViewportZoom), 1);

    public static readonly StyledProperty<CanvasGuidanceState?> GuidanceProperty =
        AvaloniaProperty.Register<DocumentSceneSurface, CanvasGuidanceState?>(nameof(Guidance));

    private IReadOnlyDictionary<Guid, CanvasNodePreview> _interactionPreview =
        new Dictionary<Guid, CanvasNodePreview>();
    private Rect? _selectionMarquee;
    private IReadOnlyList<CanvasSnapLine> _snapLines = [];
    private Guid? _previewGuideId;
    private double _previewGuidePosition;

    static DocumentSceneSurface() => AffectsRender<DocumentSceneSurface>(
        SnapshotProperty,
        SelectedNodeIdsProperty,
        IsAuthoringSurfaceProperty,
        ViewportZoomProperty,
        GuidanceProperty);

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

    public double ViewportZoom
    {
        get => GetValue(ViewportZoomProperty);
        set => SetValue(ViewportZoomProperty, value);
    }

    public CanvasGuidanceState? Guidance
    {
        get => GetValue(GuidanceProperty);
        set => SetValue(GuidanceProperty, value);
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

    public void SetSnapLines(IReadOnlyList<CanvasSnapLine>? lines)
    {
        _snapLines = lines ?? [];
        InvalidateVisual();
    }

    public void SetGuidePreview(Guid? guideId, double position = 0)
    {
        _previewGuideId = guideId;
        _previewGuidePosition = position;
        InvalidateVisual();
    }

    public GuideDefinition? HitTestGuide(Point surfacePoint)
    {
        var snapshot = Snapshot;
        var guidance = Guidance;
        if (!IsAuthoringSurface || snapshot is null || guidance is null || !guidance.SnapSettings.ShowGuides)
        {
            return null;
        }

        var logical = ToLogical(surfacePoint);
        var tolerance = 7 / Math.Max(ViewportZoom, .001);
        return guidance.Guides
            .Where(guide => !guide.IsLocked)
            .Select(guide => (Guide: guide, Distance: guide.Orientation == GuideOrientation.Vertical
                ? Math.Abs(logical.X - guide.Position)
                : Math.Abs(logical.Y - guide.Position)))
            .Where(item => item.Distance <= tolerance)
            .OrderBy(item => item.Distance)
            .Select(item => item.Guide)
            .FirstOrDefault();
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
            .Where(layer => layer.ParentId is null && layer.IsVisible)
            .Where(layer => LayerLogicalBounds(layer) is RenderBounds logicalBounds
                && normalized.Contains(Scale(snapshot.LogicalSize, logicalBounds).TopLeft)
                && normalized.Contains(Scale(snapshot.LogicalSize, logicalBounds).BottomRight))
            .Select(layer => layer.Id)
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
                var preview = ResolveInteractionPreview(snapshot, layer, primitive);
                if (primitive.Opacity > 0 && HitTestPrimitive(snapshot.LogicalSize, primitive, preview, surfacePoint))
                {
                    return TopLevelLayerId(snapshot, layer.Id);
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

        var hitRadius = ScreenPixels(9);
        var rotationCenter = new Point(bounds.Center.X, bounds.Top - ScreenPixels(26));
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
            foreach (var layer in snapshot.Layers.Where(layer => LayerBelongsToSelection(snapshot, layer, selectedIds)))
            {
                foreach (var primitive in layer.Primitives)
                {
                    var preview = ResolveInteractionPreview(snapshot, layer, primitive);
                    if (primitive.Opacity > 0 && HitTestPrimitive(snapshot.LogicalSize, primitive, preview, surfacePoint))
                    {
                        return CanvasSelectionHandle.Body;
                    }
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

        var layer = Snapshot?.Layers.FirstOrDefault(candidate => candidate.Id == nodeId);
        return layer is null ? null : LayerLogicalBounds(layer);
    }

    public double GetNodeLogicalRotation(Guid nodeId)
    {
        if (_interactionPreview.TryGetValue(nodeId, out var preview))
        {
            return preview.RotationDegrees;
        }

        return Snapshot?.Layers.FirstOrDefault(candidate => candidate.Id == nodeId)?.RotationDegrees ?? 0;
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

                var tolerance = Math.Max(
                    ScreenPixels(6),
                    StrokeScale(logicalSize, primitive.Style.StrokeWidth) / 2 + ScreenPixels(4));
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
                var normalizedX = (testPoint.X - surfaceBounds.Center.X) / (radiusX + ScreenPixels(5));
                var normalizedY = (testPoint.Y - surfaceBounds.Center.Y) / (radiusY + ScreenPixels(5));
                return normalizedX * normalizedX + normalizedY * normalizedY <= 1;
            default:
                return surfaceBounds.Inflate(ScreenPixels(5)).Contains(testPoint);
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
            context.DrawRectangle(CreateBackgroundBrush(snapshot.Background), null, Bounds);
        }

        if (IsAuthoringSurface)
        {
            DrawGrid(context, snapshot.LogicalSize);
        }

        foreach (var layer in snapshot.Layers.Where(layer => layer.IsVisible).OrderBy(layer => layer.ZIndex))
        {
            foreach (var primitive in layer.Primitives)
            {
                var preview = ResolveInteractionPreview(snapshot, layer, primitive);
                DrawPrimitive(context, snapshot.LogicalSize, primitive, preview);
            }
        }

        if (IsAuthoringSurface)
        {
            DrawGuidance(context, snapshot.LogicalSize);
            DrawSnapLines(context, snapshot.LogicalSize);
            DrawSelection(context);
            DrawSelectionMarquee(context);
        }
    }

    private void DrawGrid(DrawingContext context, RenderSize logicalSize)
    {
        var settings = Guidance?.SnapSettings;
        if (settings is null || !settings.ShowGrid || settings.GridSpacing <= 0)
        {
            return;
        }

        // Render the authored interval exactly. Coalescing small intervals made the
        // 10, 20, and 40 presets visually indistinguishable at ordinary zoom levels.
        var spacing = settings.GridSpacing;
        var projectedSpacing = spacing * ViewportZoom;
        var minorOpacity = projectedSpacing < 4 ? "#123D718A" : "#203D718A";
        var minor = new Pen(Brush.Parse(minorOpacity), ScreenPixels(projectedSpacing < 4 ? .7 : 1));
        var major = new Pen(Brush.Parse("#3A4E8298"), ScreenPixels(1));
        var index = 0;
        for (var x = spacing; x < logicalSize.Width; x += spacing, index++)
        {
            var sx = x / logicalSize.Width * Bounds.Width;
            context.DrawLine(index % 5 == 4 ? major : minor, new Point(sx, 0), new Point(sx, Bounds.Height));
        }
        index = 0;
        for (var y = spacing; y < logicalSize.Height; y += spacing, index++)
        {
            var sy = y / logicalSize.Height * Bounds.Height;
            context.DrawLine(index % 5 == 4 ? major : minor, new Point(0, sy), new Point(Bounds.Width, sy));
        }
    }

    private void DrawGuidance(DrawingContext context, RenderSize logicalSize)
    {
        var guidance = Guidance;
        if (guidance is null)
        {
            return;
        }

        if (guidance.SnapSettings.ShowMargins)
        {
            DrawInset(context, logicalSize, guidance.Canvas.Margins,
                new Pen(Brush.Parse("#B57F92A0"), ScreenPixels(1), new DashStyle([ScreenPixels(6), ScreenPixels(4)], 0)));
        }
        if (guidance.SnapSettings.ShowSafeArea)
        {
            DrawInset(context, logicalSize, guidance.Canvas.SafeArea,
                new Pen(Brush.Parse("#C8D18A23"), ScreenPixels(1), new DashStyle([ScreenPixels(3), ScreenPixels(3)], 0)));
        }
        if (!guidance.SnapSettings.ShowGuides)
        {
            return;
        }

        foreach (var guide in guidance.Guides)
        {
            var position = guide.Id == _previewGuideId ? _previewGuidePosition : guide.Position;
            var pen = new Pen(
                Brush.Parse(guide.IsLocked ? "#A4698BA0" : "#D91FB7D4"),
                ScreenPixels(1),
                guide.IsLocked ? new DashStyle([ScreenPixels(4), ScreenPixels(3)], 0) : null);
            if (guide.Orientation == GuideOrientation.Vertical)
            {
                var x = position / logicalSize.Width * Bounds.Width;
                context.DrawLine(pen, new Point(x, 0), new Point(x, Bounds.Height));
            }
            else
            {
                var y = position / logicalSize.Height * Bounds.Height;
                context.DrawLine(pen, new Point(0, y), new Point(Bounds.Width, y));
            }
        }
    }

    private void DrawSnapLines(DrawingContext context, RenderSize logicalSize)
    {
        foreach (var line in _snapLines)
        {
            var color = line.Source == "Guide" ? "#FF22D3EE" : "#FFB040D9";
            var pen = new Pen(Brush.Parse(color), ScreenPixels(1.35));
            if (line.Axis == "X")
            {
                var x = line.Position / logicalSize.Width * Bounds.Width;
                context.DrawLine(pen, new Point(x, 0), new Point(x, Bounds.Height));
            }
            else
            {
                var y = line.Position / logicalSize.Height * Bounds.Height;
                context.DrawLine(pen, new Point(0, y), new Point(Bounds.Width, y));
            }
        }
    }

    private void DrawInset(DrawingContext context, RenderSize logicalSize, ThicknessDefinition inset, Pen pen)
    {
        var rect = new Rect(
            inset.Left / logicalSize.Width * Bounds.Width,
            inset.Top / logicalSize.Height * Bounds.Height,
            Math.Max(0, (logicalSize.Width - inset.Left - inset.Right) / logicalSize.Width * Bounds.Width),
            Math.Max(0, (logicalSize.Height - inset.Top - inset.Bottom) / logicalSize.Height * Bounds.Height));
        context.DrawRectangle(null, pen, rect);
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

        var selectionPen = new Pen(Brush.Parse("#168CFF"), ScreenPixels(1.5));
        context.DrawRectangle(null, selectionPen, selection);
        var rotationCenter = new Point(selection.Center.X, selection.Top - ScreenPixels(26));
        context.DrawLine(selectionPen, new Point(selection.Center.X, selection.Top), rotationCenter);
        var rotationRadius = ScreenPixels(5);
        context.DrawEllipse(Brushes.White, selectionPen, rotationCenter, rotationRadius, rotationRadius);
        var handleRadius = ScreenPixels(4);
        foreach (var point in new[] { selection.TopLeft, selection.TopRight, selection.BottomRight, selection.BottomLeft })
        {
            context.DrawRectangle(
                Brushes.White,
                selectionPen,
                new Rect(point.X - handleRadius, point.Y - handleRadius, handleRadius * 2, handleRadius * 2),
                ScreenPixels(1),
                ScreenPixels(1));
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
        var pen = new Pen(
            Brush.Parse("#168CFF"),
            ScreenPixels(1),
            new DashStyle([ScreenPixels(5), ScreenPixels(3)], 0));
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
        foreach (var layer in snapshot.Layers.Where(layer => selectedIds.Contains(layer.Id)))
        {
            var logicalBounds = LayerLogicalBounds(layer);
            if (logicalBounds is null)
            {
                continue;
            }
            var surfaceBounds = Scale(snapshot.LogicalSize, logicalBounds.Value);
            union = union is Rect accumulated ? accumulated.Union(surfaceBounds) : surfaceBounds;
        }
        return union;
    }

    private RenderBounds? LayerLogicalBounds(RenderLayerSnapshot layer)
    {
        if (_interactionPreview.TryGetValue(layer.Id, out var preview))
        {
            return preview.Bounds;
        }
        if (layer.SelectionBounds is RenderBounds selectionBounds)
        {
            return selectionBounds;
        }

        RenderBounds? result = null;
        foreach (var primitive in layer.Primitives)
        {
            result = result is RenderBounds accumulated
                ? Union(accumulated, primitive.Bounds)
                : primitive.Bounds;
        }
        return result;
    }

    private CanvasNodePreview? ResolveInteractionPreview(
        SceneSnapshot snapshot,
        RenderLayerSnapshot layer,
        RenderPrimitiveSnapshot primitive)
    {
        if (_interactionPreview.TryGetValue(primitive.Id, out var direct))
        {
            return direct;
        }

        var layersById = snapshot.Layers.ToDictionary(candidate => candidate.Id);
        var current = layer;
        var visited = new HashSet<Guid> { current.Id };
        while (current.ParentId is Guid parentId
               && layersById.TryGetValue(parentId, out var parent)
               && visited.Add(parentId))
        {
            if (_interactionPreview.TryGetValue(parentId, out var groupPreview)
                && parent.SelectionBounds is RenderBounds groupBounds)
            {
                return TransformThroughGroupPreview(
                    primitive.Bounds,
                    primitive.RotationDegrees,
                    groupBounds,
                    parent.RotationDegrees,
                    groupPreview);
            }
            current = parent;
        }
        return null;
    }

    private static CanvasNodePreview TransformThroughGroupPreview(
        RenderBounds childBounds,
        double childRotation,
        RenderBounds groupBounds,
        double groupRotation,
        CanvasNodePreview preview)
    {
        var scaleX = Math.Abs(groupBounds.Width) < .001 ? 1 : preview.Bounds.Width / groupBounds.Width;
        var scaleY = Math.Abs(groupBounds.Height) < .001 ? 1 : preview.Bounds.Height / groupBounds.Height;
        var childCenter = new Point(
            preview.Bounds.X + (childBounds.X + childBounds.Width / 2 - groupBounds.X) * scaleX,
            preview.Bounds.Y + (childBounds.Y + childBounds.Height / 2 - groupBounds.Y) * scaleY);
        var rotationDelta = preview.RotationDegrees - groupRotation;
        var rotatedCenter = Math.Abs(rotationDelta) < .001
            ? childCenter
            : Rotate(childCenter, new Point(
                preview.Bounds.X + preview.Bounds.Width / 2,
                preview.Bounds.Y + preview.Bounds.Height / 2), rotationDelta);
        var width = childBounds.Width * scaleX;
        var height = childBounds.Height * scaleY;
        return new CanvasNodePreview(
            new RenderBounds(rotatedCenter.X - width / 2, rotatedCenter.Y - height / 2, width, height),
            childRotation + rotationDelta);
    }

    private static bool LayerBelongsToSelection(
        SceneSnapshot snapshot,
        RenderLayerSnapshot layer,
        IReadOnlySet<Guid> selectedIds)
    {
        if (selectedIds.Contains(layer.Id))
        {
            return true;
        }

        var layersById = snapshot.Layers.ToDictionary(candidate => candidate.Id);
        var current = layer;
        var visited = new HashSet<Guid> { current.Id };
        while (current.ParentId is Guid parentId
               && layersById.TryGetValue(parentId, out current!)
               && visited.Add(parentId))
        {
            if (selectedIds.Contains(parentId))
            {
                return true;
            }
        }
        return false;
    }

    private static Guid TopLevelLayerId(SceneSnapshot snapshot, Guid layerId)
    {
        var layersById = snapshot.Layers.ToDictionary(candidate => candidate.Id);
        if (!layersById.TryGetValue(layerId, out var current))
        {
            return layerId;
        }

        var visited = new HashSet<Guid> { current.Id };
        while (current.ParentId is Guid parentId
               && layersById.TryGetValue(parentId, out var parent)
               && visited.Add(parentId))
        {
            current = parent;
        }
        return current.Id;
    }

    private static RenderBounds Union(RenderBounds first, RenderBounds second)
    {
        var left = Math.Min(first.X, second.X);
        var top = Math.Min(first.Y, second.Y);
        var right = Math.Max(first.X + first.Width, second.X + second.Width);
        var bottom = Math.Max(first.Y + first.Height, second.Y + second.Height);
        return new RenderBounds(left, top, right - left, bottom - top);
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

    private double ScreenPixels(double value) =>
        CanvasViewportGeometry.ScreenPixels(value, ViewportZoom);

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

    private static IBrush CreateBackgroundBrush(RenderBackgroundSnapshot background)
    {
        var stops = background.GradientStops;
        if (stops is null || stops.Count < 2)
        {
            if (string.IsNullOrWhiteSpace(background.SecondaryColor))
            {
                return ParseBrush(background.Color, Brushes.White);
            }
            stops =
            [
                new RenderGradientStopSnapshot(0, background.Color),
                new RenderGradientStopSnapshot(1, background.SecondaryColor),
            ];
        }

        try
        {
            GradientBrush brush;
            if (background.GradientKind == SlideGradientKind.Radial)
            {
                brush = new RadialGradientBrush
                {
                    Center = new RelativePoint(.5, .5, RelativeUnit.Relative),
                    GradientOrigin = new RelativePoint(.5, .5, RelativeUnit.Relative),
                    RadiusX = new RelativeScalar(.707, RelativeUnit.Relative),
                    RadiusY = new RelativeScalar(.707, RelativeUnit.Relative),
                };
            }
            else
            {
                var radians = background.GradientAngleDegrees * Math.PI / 180;
                var dx = Math.Cos(radians) * .5;
                var dy = Math.Sin(radians) * .5;
                brush = new LinearGradientBrush
                {
                    StartPoint = new RelativePoint(.5 - dx, .5 - dy, RelativeUnit.Relative),
                    EndPoint = new RelativePoint(.5 + dx, .5 + dy, RelativeUnit.Relative),
                };
            }

            foreach (var stop in stops.OrderBy(stop => stop.Position))
            {
                brush.GradientStops.Add(new GradientStop(Color.Parse(stop.Color), stop.Position));
            }
            return brush;
        }
        catch (FormatException)
        {
            return Brushes.White;
        }
    }
}
