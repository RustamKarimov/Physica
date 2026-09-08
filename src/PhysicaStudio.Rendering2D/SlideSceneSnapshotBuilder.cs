using PhysicaStudio.Document;

namespace PhysicaStudio.Rendering2D;

public interface ISlideSceneSnapshotBuilder
{
    SceneSnapshot Build(LessonProject project, SlideDocument slide, long version);
}

public sealed class SlideSceneSnapshotBuilder : ISlideSceneSnapshotBuilder
{
    public SceneSnapshot Build(LessonProject project, SlideDocument slide, long version)
    {
        ArgumentNullException.ThrowIfNull(project);
        ArgumentNullException.ThrowIfNull(slide);
        if (project.Slides.All(candidate => candidate.Id != slide.Id))
        {
            throw new ArgumentException("The slide does not belong to the supplied project.", nameof(slide));
        }

        var background = ResolveBackground(project.Theme, slide.Background);
        var layers = slide.Nodes
            .OrderBy(node => node.LayerIndex)
            .Select(CreateLayer)
            .ToArray();

        return new SceneSnapshot(
            version,
            new RenderSize(project.Canvas.Width, project.Canvas.Height),
            slide.Background.Kind == SlideBackgroundKind.Theme ? project.Theme.Id : "slide-background",
            layers)
        {
            Background = background,
        };
    }

    private static RenderLayerSnapshot CreateLayer(SceneNode node)
    {
        var primitive = CreatePrimitive(node);
        return new RenderLayerSnapshot(
            node.Id,
            node.Name,
            node.LayerIndex,
            node.IsVisible,
            IsStatic: true,
            [primitive]);
    }

    private static RenderPrimitiveSnapshot CreatePrimitive(SceneNode node)
    {
        var geometry = TransformBounds(node);
        var points = node.Content.Points
            .Select(point => new RenderPoint(
                geometry.X + point.X * geometry.Width,
                geometry.Y + point.Y * geometry.Height))
            .ToArray();
        var appearance = node.Appearance;

        return new RenderPrimitiveSnapshot(
            node.Id,
            ResolveKind(node.Kind, points.Length),
            geometry,
            node.StyleId ?? "document-node",
            points,
            node.Content.Text,
            node.Content.AssetId?.ToString("D"))
        {
            Style = new RenderStyleSnapshot(
                appearance.FillColor,
                appearance.StrokeColor,
                appearance.StrokeWidth,
                appearance.CornerRadius,
                appearance.DashPattern,
                appearance.FontFamily,
                appearance.FontSize,
                appearance.FontWeight,
                appearance.IsItalic,
                appearance.TextColor,
                appearance.TextAlignment),
            RotationDegrees = node.ModelTransform.RotationDegrees + node.PresentationTransform.RotationDegrees,
            Opacity = appearance.Opacity * node.PresentationTransform.Opacity,
        };
    }

    private static RenderBounds TransformBounds(SceneNode node)
    {
        var model = node.ModelTransform;
        var presentation = node.PresentationTransform;
        return new RenderBounds(
            node.Geometry.X + model.X + presentation.OffsetX,
            node.Geometry.Y + model.Y + presentation.OffsetY,
            node.Geometry.Width * model.ScaleX * presentation.ScaleX,
            node.Geometry.Height * model.ScaleY * presentation.ScaleY);
    }

    private static RenderPrimitiveKind ResolveKind(string kind, int pointCount) => kind switch
    {
        "shape.line" => RenderPrimitiveKind.Line,
        "shape.ellipse" => RenderPrimitiveKind.Ellipse,
        "shape.text" => RenderPrimitiveKind.Text,
        "shape.image" => RenderPrimitiveKind.Image,
        "graph" => RenderPrimitiveKind.Graph,
        "field" => RenderPrimitiveKind.Field,
        "shape.path" or "physics.standing-wave" => RenderPrimitiveKind.Path,
        _ when pointCount > 1 => RenderPrimitiveKind.Path,
        _ => RenderPrimitiveKind.Rectangle,
    };

    private static RenderBackgroundSnapshot ResolveBackground(ThemeDefinition theme, SlideBackground background)
    {
        var color = background.Kind == SlideBackgroundKind.Theme
            && theme.Colors.TryGetValue("background", out var themeColor)
                ? themeColor
                : background.Color;
        return new RenderBackgroundSnapshot(color, background.SecondaryColor, background.Opacity);
    }
}
