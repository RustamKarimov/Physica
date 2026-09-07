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
            [SlideDocument.Create("Slide 1")],
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

public sealed record SlideSection(Guid Id, string Name, int Order);

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

    public static SlideDocument Create(string name) => new(
        Guid.NewGuid(),
        name,
        null,
        null,
        false,
        SlideBackground.Default,
        string.Empty,
        [],
        SnapSettings.Default,
        []);
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
    double Threshold)
{
    public static SnapSettings Default { get; } = new(true, true, true, true, true, 20, 8);
}

public sealed record SceneNode(
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
