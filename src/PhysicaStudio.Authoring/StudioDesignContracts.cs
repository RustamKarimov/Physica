namespace PhysicaStudio.Authoring;

public sealed record DesignTokenSet(
    string Id,
    IReadOnlyDictionary<string, string> Colors,
    IReadOnlyDictionary<string, double> Typography,
    IReadOnlyDictionary<string, double> Spacing,
    IReadOnlyDictionary<string, double> CornerRadii);

public enum IconSourceKind
{
    VectorPath,
    EmbeddedSvg,
    GeneratedScientific
}

public sealed record IconDescriptor(
    string Id,
    IconSourceKind SourceKind,
    string Source,
    string AccessibleName);

public enum RibbonCommandSize
{
    Small,
    Medium,
    Large,
    Gallery
}

public enum RibbonOverflowBehavior
{
    Never,
    CollapseLabel,
    MoveToOverflow,
    CollapseGroup
}

public sealed record RibbonCommandDescriptor(
    string Id,
    string LabelResourceId,
    string IconId,
    RibbonCommandSize PreferredSize,
    int Priority,
    RibbonOverflowBehavior OverflowBehavior,
    string? KeyTip,
    string Readiness);

public readonly record struct BackgroundJobVersion(long Value);

public sealed record BackgroundJobRequest(
    Guid Id,
    string Kind,
    BackgroundJobVersion Version,
    IReadOnlyDictionary<string, string> Parameters);

public sealed record BackgroundJobResult(
    Guid Id,
    BackgroundJobVersion Version,
    bool Succeeded,
    string? Diagnostic);
