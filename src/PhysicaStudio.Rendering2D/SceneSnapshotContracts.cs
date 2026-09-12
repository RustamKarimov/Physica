namespace PhysicaStudio.Rendering2D;

public readonly record struct RenderPoint(double X, double Y);

public readonly record struct RenderSize(double Width, double Height);

public readonly record struct RenderBounds(double X, double Y, double Width, double Height);

public enum RenderPrimitiveKind
{
    Path,
    Line,
    Ellipse,
    Rectangle,
    Text,
    Image,
    Graph,
    Field
}

public sealed partial record RenderPrimitiveSnapshot(
    Guid Id,
    RenderPrimitiveKind Kind,
    RenderBounds Bounds,
    string StyleId,
    IReadOnlyList<RenderPoint> Points,
    string? Text,
    string? AssetId);

public sealed record RenderLayerSnapshot(
    Guid Id,
    string Name,
    int ZIndex,
    bool IsVisible,
    bool IsStatic,
    IReadOnlyList<RenderPrimitiveSnapshot> Primitives)
{
    public Guid? ParentId { get; init; }
    public bool IsGroup { get; init; }
    public bool IsLocked { get; init; }
    public int Depth { get; init; }
    public RenderBounds? SelectionBounds { get; init; }
    public double RotationDegrees { get; init; }
}

public sealed partial record SceneSnapshot(
    long Version,
    RenderSize LogicalSize,
    string BackgroundStyleId,
    IReadOnlyList<RenderLayerSnapshot> Layers);
