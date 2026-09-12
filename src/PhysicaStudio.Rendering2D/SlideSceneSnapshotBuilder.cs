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
        var nodesById = slide.Nodes.ToDictionary(node => node.Id);
        var states = slide.Nodes.ToDictionary(
            node => node.Id,
            node => CreateVisualState(node, nodesById));
        var layers = SceneNodeHierarchy.FlattenByLayer(slide.Nodes)
            .Select(node => CreateLayer(node, slide.Nodes, nodesById, states))
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

    private static RenderLayerSnapshot CreateLayer(
        SceneNode node,
        IReadOnlyList<SceneNode> nodes,
        IReadOnlyDictionary<Guid, SceneNode> nodesById,
        IReadOnlyDictionary<Guid, NodeVisualState> states)
    {
        var state = states[node.Id];
        var isGroup = SceneNodeHierarchy.IsGroup(node);
        var selectionBounds = isGroup
            ? UnionDescendantBounds(node.Id, nodes, states) ?? state.Bounds
            : state.Bounds;
        return new RenderLayerSnapshot(
            node.Id,
            node.Name,
            node.LayerIndex,
            state.IsVisible,
            IsStatic: true,
            isGroup ? [] : [CreatePrimitive(node, state)])
        {
            ParentId = node.ParentId,
            IsGroup = isGroup,
            IsLocked = state.IsLocked,
            Depth = SceneNodeHierarchy.Depth(nodesById, node),
            SelectionBounds = selectionBounds,
            RotationDegrees = state.RotationDegrees,
        };
    }

    private static RenderPrimitiveSnapshot CreatePrimitive(SceneNode node, NodeVisualState state)
    {
        var geometry = state.Bounds;
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
            RotationDegrees = state.RotationDegrees,
            Opacity = state.Opacity,
        };
    }

    private static NodeVisualState CreateVisualState(
        SceneNode node,
        IReadOnlyDictionary<Guid, SceneNode> nodesById)
    {
        var model = node.ModelTransform;
        var presentation = node.PresentationTransform;
        var state = new NodeVisualState(
            new RenderBounds(
                node.Geometry.X + model.X + presentation.OffsetX,
                node.Geometry.Y + model.Y + presentation.OffsetY,
                node.Geometry.Width * model.ScaleX * presentation.ScaleX,
                node.Geometry.Height * model.ScaleY * presentation.ScaleY),
            model.RotationDegrees + presentation.RotationDegrees,
            node.Appearance.Opacity * presentation.Opacity,
            node.IsVisible,
            node.IsLocked);

        var ancestors = new List<SceneNode>();
        var visited = new HashSet<Guid> { node.Id };
        var current = node;
        while (current.ParentId is Guid parentId
               && nodesById.TryGetValue(parentId, out var parent)
               && visited.Add(parentId))
        {
            ancestors.Add(parent);
            current = parent;
        }

        foreach (var ancestor in ancestors)
        {
            state = ApplyContainerTransform(state, ancestor);
        }
        return state;
    }

    private static NodeVisualState ApplyContainerTransform(NodeVisualState state, SceneNode group)
    {
        var scaleX = group.ModelTransform.ScaleX * group.PresentationTransform.ScaleX;
        var scaleY = group.ModelTransform.ScaleY * group.PresentationTransform.ScaleY;
        var offsetX = group.ModelTransform.X + group.PresentationTransform.OffsetX;
        var offsetY = group.ModelTransform.Y + group.PresentationTransform.OffsetY;
        var rotation = group.ModelTransform.RotationDegrees + group.PresentationTransform.RotationDegrees;
        var sourceCenterX = state.Bounds.X + state.Bounds.Width / 2;
        var sourceCenterY = state.Bounds.Y + state.Bounds.Height / 2;
        var targetGroupCenterX = group.Geometry.X + offsetX + group.Geometry.Width * scaleX / 2;
        var targetGroupCenterY = group.Geometry.Y + offsetY + group.Geometry.Height * scaleY / 2;
        var scaledCenterX = group.Geometry.X + offsetX + (sourceCenterX - group.Geometry.X) * scaleX;
        var scaledCenterY = group.Geometry.Y + offsetY + (sourceCenterY - group.Geometry.Y) * scaleY;
        var radians = rotation * Math.PI / 180;
        var cosine = Math.Cos(radians);
        var sine = Math.Sin(radians);
        var deltaX = scaledCenterX - targetGroupCenterX;
        var deltaY = scaledCenterY - targetGroupCenterY;
        var targetCenterX = targetGroupCenterX + deltaX * cosine - deltaY * sine;
        var targetCenterY = targetGroupCenterY + deltaX * sine + deltaY * cosine;
        var width = state.Bounds.Width * scaleX;
        var height = state.Bounds.Height * scaleY;
        return state with
        {
            Bounds = new RenderBounds(targetCenterX - width / 2, targetCenterY - height / 2, width, height),
            RotationDegrees = state.RotationDegrees + rotation,
            Opacity = state.Opacity * group.Appearance.Opacity * group.PresentationTransform.Opacity,
            IsVisible = state.IsVisible && group.IsVisible,
            IsLocked = state.IsLocked || group.IsLocked,
        };
    }

    private static RenderBounds? UnionDescendantBounds(
        Guid groupId,
        IReadOnlyList<SceneNode> nodes,
        IReadOnlyDictionary<Guid, NodeVisualState> states)
    {
        var descendantIds = SceneNodeHierarchy.SubtreeIds(nodes, groupId);
        RenderBounds? result = null;
        foreach (var node in nodes.Where(node =>
                     node.Id != groupId
                     && descendantIds.Contains(node.Id)
                     && !SceneNodeHierarchy.IsGroup(node)))
        {
            var bounds = states[node.Id].Bounds;
            result = result is RenderBounds accumulated
                ? Union(accumulated, bounds)
                : bounds;
        }
        return result;
    }

    private static RenderBounds Union(RenderBounds first, RenderBounds second)
    {
        var left = Math.Min(first.X, second.X);
        var top = Math.Min(first.Y, second.Y);
        var right = Math.Max(first.X + first.Width, second.X + second.Width);
        var bottom = Math.Max(first.Y + first.Height, second.Y + second.Height);
        return new RenderBounds(left, top, right - left, bottom - top);
    }

    private sealed record NodeVisualState(
        RenderBounds Bounds,
        double RotationDegrees,
        double Opacity,
        bool IsVisible,
        bool IsLocked);

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
