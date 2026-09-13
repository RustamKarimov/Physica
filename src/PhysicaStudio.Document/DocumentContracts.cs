using System.Text.Json;
using System.Text.Json.Serialization;

namespace PhysicaStudio.Document;

public static class ProjectFormat
{
    public const int Current = 1;
    public const string FileExtension = ".physica";
    public const string ProjectEntryName = "project.json";
}

public sealed record LessonProject(
    Guid Id,
    string Title,
    int FormatVersion,
    DateTimeOffset CreatedUtc,
    DateTimeOffset ModifiedUtc,
    ProjectMetadata Metadata,
    ThemeDefinition Theme,
    CanvasDefinition Canvas,
    IReadOnlyList<SlideSection> Sections,
    IReadOnlyList<SlideDocument> Slides,
    IReadOnlyList<MasterSlide> Masters,
    IReadOnlyList<AssetReference> Assets)
{
    [JsonExtensionData]
    public Dictionary<string, JsonElement> Extensions { get; init; } = [];

    public static LessonProject Create(string title, DateTimeOffset? createdUtc = null)
    {
        var timestamp = createdUtc ?? DateTimeOffset.UtcNow;
        return new LessonProject(
            Guid.NewGuid(),
            title,
            ProjectFormat.Current,
            timestamp,
            timestamp,
            ProjectMetadata.Empty,
            ThemeDefinition.Default,
            CanvasDefinition.Widescreen,
            [],
            [SlideDocument.Create("Slide 1", DocumentNameKind.Automatic)],
            [],
            []);
    }
}

public sealed record ProjectMetadata(
    string? Author,
    string? Subject,
    string? Description,
    IReadOnlyList<string> Tags,
    string? ContentLocale)
{
    public static ProjectMetadata Empty { get; } = new(null, null, null, [], "en");
}

public enum DocumentNameKind
{
    Custom = 0,
    Automatic = 1,
}

public sealed record SlideSection(Guid Id, string Name, int Order)
{
    public DocumentNameKind NameKind { get; init; } = DocumentNameKind.Custom;

    public static SlideSection Create(
        string name,
        int order,
        DocumentNameKind nameKind = DocumentNameKind.Custom) =>
        new(Guid.NewGuid(), name, order) { NameKind = nameKind };
}

public sealed record SlideDocument(
    Guid Id,
    string Name,
    Guid? SectionId,
    string? LayoutId,
    bool IsHidden,
    SlideBackground Background,
    string SpeakerNotes,
    IReadOnlyList<GuideDefinition> Guides,
    SnapSettings SnapSettings,
    IReadOnlyList<SceneNode> Nodes)
{
    [JsonExtensionData]
    public Dictionary<string, JsonElement> Extensions { get; init; } = [];

    public DocumentNameKind NameKind { get; init; } = DocumentNameKind.Custom;

    public static SlideDocument Create(
        string name,
        DocumentNameKind nameKind = DocumentNameKind.Custom) => new(
            Guid.NewGuid(),
            name,
            null,
            null,
            false,
            SlideBackground.Default,
            string.Empty,
            [],
            SnapSettings.Default,
            [])
        { NameKind = nameKind };
}

public sealed record MasterSlide(
    Guid Id,
    string Name,
    SlideBackground Background,
    IReadOnlyList<SceneNode> Nodes);

public sealed record ThemeDefinition(
    string Id,
    string DisplayName,
    IReadOnlyDictionary<string, string> Colors,
    IReadOnlyDictionary<string, string> Fonts,
    IReadOnlyDictionary<string, string> Effects)
{
    public static ThemeDefinition Default { get; } = new(
        "physica-light",
        "Physica Light",
        new Dictionary<string, string>(StringComparer.Ordinal)
        {
            ["background"] = "#F4F5F3",
            ["surface"] = "#FFFFFF",
            ["heading"] = "#11284B",
            ["body"] = "#34424D",
            ["accent"] = "#0878F9",
            ["secondaryAccent"] = "#ED7F18",
        },
        new Dictionary<string, string>(StringComparer.Ordinal)
        {
            ["interface"] = "Inter",
            ["heading"] = "Source Serif 4",
            ["mathematics"] = "STIX Two Math",
        },
        new Dictionary<string, string>(StringComparer.Ordinal));

    public static ThemeDefinition Dark { get; } = new(
        "physica-dark",
        "Physica Dark",
        new Dictionary<string, string>(StringComparer.Ordinal)
        {
            ["background"] = "#07121B",
            ["surface"] = "#10222F",
            ["heading"] = "#F1F7FA",
            ["body"] = "#C3D2DC",
            ["accent"] = "#31A3FF",
            ["secondaryAccent"] = "#FF9B42",
        },
        new Dictionary<string, string>(StringComparer.Ordinal)
        {
            ["interface"] = "Inter",
            ["heading"] = "Source Serif 4",
            ["mathematics"] = "STIX Two Math",
        },
        new Dictionary<string, string>(StringComparer.Ordinal));

    public static ThemeDefinition Laboratory { get; } = new(
        "physica-laboratory",
        "Laboratory",
        new Dictionary<string, string>(StringComparer.Ordinal)
        {
            ["background"] = "#F7FAFC",
            ["surface"] = "#FFFFFF",
            ["heading"] = "#17344A",
            ["body"] = "#354D5E",
            ["accent"] = "#007F82",
            ["secondaryAccent"] = "#E67E22",
        },
        new Dictionary<string, string>(StringComparer.Ordinal)
        {
            ["interface"] = "Inter",
            ["heading"] = "Source Serif 4",
            ["mathematics"] = "STIX Two Math",
        },
        new Dictionary<string, string>(StringComparer.Ordinal));

    public static ThemeDefinition LightTeal { get; } = CreateVariant(
        "physica-light-teal", "Physica Light — Teal",
        "#F2F8F7", "#FFFFFF", "#12383D", "#385054", "#008C88", "#E0783C");

    public static ThemeDefinition LightAmber { get; } = CreateVariant(
        "physica-light-amber", "Physica Light — Amber",
        "#FAF7EF", "#FFFDF8", "#3B2D20", "#57483B", "#D67708", "#127E8D");

    public static ThemeDefinition DarkViolet { get; } = CreateVariant(
        "physica-dark-violet", "Physica Dark — Violet",
        "#100D19", "#1B1728", "#F6F1FF", "#D2C9E4", "#9B7CFF", "#43C5B5");

    public static ThemeDefinition DarkCopper { get; } = CreateVariant(
        "physica-dark-copper", "Physica Dark — Copper",
        "#17100C", "#271B14", "#FFF4E8", "#E2CCBA", "#F18B45", "#55B8C9");

    public static ThemeDefinition LaboratoryCobalt { get; } = CreateVariant(
        "physica-laboratory-cobalt", "Laboratory — Cobalt",
        "#F4F7FC", "#FFFFFF", "#173157", "#384B62", "#2F6FE4", "#EA7C29");

    public static ThemeDefinition LaboratoryPlum { get; } = CreateVariant(
        "physica-laboratory-plum", "Laboratory — Plum",
        "#FAF6FB", "#FFFFFF", "#402548", "#59465D", "#9848A3", "#198A87");

    public static IReadOnlyList<ThemeDefinition> BuiltInThemes { get; } =
    [
        Default, LightTeal, LightAmber,
        Dark, DarkViolet, DarkCopper,
        Laboratory, LaboratoryCobalt, LaboratoryPlum,
    ];

    public static ThemeDefinition? FindBuiltIn(string id) =>
        BuiltInThemes.FirstOrDefault(theme => string.Equals(theme.Id, id, StringComparison.Ordinal));

    private static ThemeDefinition CreateVariant(
        string id,
        string displayName,
        string background,
        string surface,
        string heading,
        string body,
        string accent,
        string secondaryAccent) => new(
            id,
            displayName,
            new Dictionary<string, string>(StringComparer.Ordinal)
            {
                ["background"] = background,
                ["surface"] = surface,
                ["heading"] = heading,
                ["body"] = body,
                ["accent"] = accent,
                ["secondaryAccent"] = secondaryAccent,
            },
            new Dictionary<string, string>(Default.Fonts, StringComparer.Ordinal),
            new Dictionary<string, string>(StringComparer.Ordinal));
}

public enum SlideOrientation
{
    Landscape,
    Portrait
}

public sealed record CanvasDefinition(
    double Width,
    double Height,
    SlideOrientation Orientation,
    ThicknessDefinition SafeArea,
    ThicknessDefinition Margins)
{
    public static CanvasDefinition Widescreen { get; } = new(
        1920,
        1080,
        SlideOrientation.Landscape,
        new ThicknessDefinition(64, 64, 64, 64),
        new ThicknessDefinition(48, 48, 48, 48));
}

public readonly record struct ThicknessDefinition(double Left, double Top, double Right, double Bottom);

public enum SlideBackgroundKind
{
    Solid,
    Gradient,
    Image,
    Theme
}

public sealed record SlideBackground(
    SlideBackgroundKind Kind,
    string Color,
    string? SecondaryColor,
    Guid? AssetId,
    double Opacity)
{
    public static SlideBackground Default { get; } = new(SlideBackgroundKind.Theme, "#F4F5F3", null, null, 1);
}

public enum GuideOrientation
{
    Horizontal,
    Vertical
}

public sealed record GuideDefinition(Guid Id, GuideOrientation Orientation, double Position, bool IsLocked);

public sealed record SnapSettings(
    bool Enabled,
    bool SnapToGrid,
    bool SnapToGuides,
    bool SnapToSlide,
    bool SnapToObjects,
    double GridSpacing,
    double Threshold,
    bool ShowGrid = false,
    bool ShowGuides = true,
    bool ShowMargins = false,
    bool ShowSafeArea = false)
{
    public static SnapSettings Default { get; } = new(true, true, true, true, true, 20, 8);
}

public sealed partial record SceneNode(
    Guid Id,
    string Name,
    string Kind,
    Guid? ParentId,
    int LayerIndex,
    bool IsVisible,
    bool IsLocked,
    NodeGeometry Geometry,
    SpatialTransform2D ModelTransform,
    PresentationTransform2D PresentationTransform,
    string? StyleId)
{
    [JsonExtensionData]
    public Dictionary<string, JsonElement> Extensions { get; init; } = [];

    public static SceneNode Create(string name, string kind, NodeGeometry geometry) => new(
        Guid.NewGuid(),
        name,
        kind,
        null,
        0,
        true,
        false,
        geometry,
        SpatialTransform2D.Identity,
        PresentationTransform2D.Identity,
        null);
}

public readonly record struct NodeGeometry(double X, double Y, double Width, double Height);

public readonly record struct SpatialTransform2D(double X, double Y, double ScaleX, double ScaleY, double RotationDegrees)
{
    public static SpatialTransform2D Identity { get; } = new(0, 0, 1, 1, 0);
}

public readonly record struct PresentationTransform2D(
    double OffsetX,
    double OffsetY,
    double ScaleX,
    double ScaleY,
    double RotationDegrees,
    double Opacity)
{
    public static PresentationTransform2D Identity { get; } = new(0, 0, 1, 1, 0, 1);
}

public sealed record PhysicsEntity(Guid Id, string ModelId);

public sealed record PhysicsSystem(Guid Id, string ModelId);

public sealed record ObservableDefinition(string Id, string QuantityKind, string UnitSymbol);

public sealed record RepresentationBinding(Guid NodeId, string ObservableId);

public sealed record AnimationTrack(Guid Id, Guid? TargetId, string Kind);

public sealed record AnimationClip(Guid Id, TimeSpan Start, TimeSpan Duration, string EffectId);

public sealed record Keyframe(Guid Id, TimeSpan PresentationTime, string PropertyPath);

public sealed record PhysicsCondition(string ObservableId, string Operator, double Value);

public sealed record InteractiveControl(Guid Id, string Kind, string BindingId);

public sealed record PresentationCheckpoint(Guid Id, string Name, PhysicsCondition? Condition, bool Pause);

public sealed record Camera2D(double X, double Y, double Zoom);

public sealed record Camera3D(double X, double Y, double Z, double Yaw, double Pitch, double FieldOfView);

public sealed record PresenterConfiguration(bool ShowNotes, bool ShowNextCheckpoint, bool EnableInk);
