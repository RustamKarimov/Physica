namespace PhysicaStudio.Document;

public enum SceneTextAlignment
{
    Start,
    Center,
    End
}

public enum SceneFontWeight
{
    Normal,
    Medium,
    SemiBold,
    Bold
}

/// <summary>
/// A point normalized to the node's geometry: (0,0) is its top-left and (1,1) its bottom-right.
/// Values outside that range are allowed for paths that intentionally extend beyond their bounds.
/// </summary>
public readonly record struct ScenePathPoint(double X, double Y);

public sealed record SceneNodeContent(
    string? Text,
    Guid? AssetId,
    IReadOnlyList<ScenePathPoint> Points)
{
    public static SceneNodeContent Empty { get; } = new(null, null, []);
}

public sealed record SceneNodeAppearance(
    string? FillColor,
    string? StrokeColor,
    double StrokeWidth,
    double CornerRadius,
    double Opacity,
    IReadOnlyList<double> DashPattern,
    string FontFamily,
    double FontSize,
    SceneFontWeight FontWeight,
    bool IsItalic,
    string TextColor,
    SceneTextAlignment TextAlignment)
{
    public static SceneNodeAppearance Default { get; } = new(
        "#FFFFFF",
        "#253746",
        1,
        0,
        1,
        [],
        "Inter",
        28,
        SceneFontWeight.Normal,
        false,
        "#22313D",
        SceneTextAlignment.Start);
}

public sealed partial record SceneNode
{
    public SceneNodeContent Content { get; init; } = SceneNodeContent.Empty;

    public SceneNodeAppearance Appearance { get; init; } = SceneNodeAppearance.Default;
}
