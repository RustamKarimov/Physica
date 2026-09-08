using PhysicaStudio.Document;

namespace PhysicaStudio.Rendering2D;

public sealed record RenderBackgroundSnapshot(
    string Color,
    string? SecondaryColor,
    double Opacity);

public sealed record RenderStyleSnapshot(
    string? FillColor,
    string? StrokeColor,
    double StrokeWidth,
    double CornerRadius,
    IReadOnlyList<double> DashPattern,
    string FontFamily,
    double FontSize,
    SceneFontWeight FontWeight,
    bool IsItalic,
    string TextColor,
    SceneTextAlignment TextAlignment);

public sealed partial record RenderPrimitiveSnapshot
{
    public RenderStyleSnapshot Style { get; init; } = new(
        "#FFFFFF", "#253746", 1, 0, [], "Inter", 28,
        SceneFontWeight.Normal, false, "#22313D", SceneTextAlignment.Start);

    public double RotationDegrees { get; init; }

    public double Opacity { get; init; } = 1;
}

public sealed partial record SceneSnapshot
{
    public RenderBackgroundSnapshot Background { get; init; } = new("#F4F5F3", null, 1);
}
