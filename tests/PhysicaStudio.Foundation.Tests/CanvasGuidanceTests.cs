using System.Text.Json.Nodes;
using Avalonia;
using PhysicaStudio.Authoring;
using PhysicaStudio.Desktop.Controls;
using PhysicaStudio.Document;
using PhysicaStudio.Rendering2D;

namespace PhysicaStudio.Foundation.Tests;

public sealed class CanvasGuidanceTests
{
    [Fact]
    public void OlderProjectJsonReceivesNonIntrusiveOverlayDefaults()
    {
        var json = JsonNode.Parse(ProjectJson.Serialize(LessonProject.Create("Compatible")))!.AsObject();
        var settings = json["slides"]![0]!["snapSettings"]!.AsObject();
        settings.Remove("showGrid");
        settings.Remove("showGuides");
        settings.Remove("showMargins");
        settings.Remove("showSafeArea");

        var loaded = ProjectJson.Deserialize(json.ToJsonString());

        Assert.False(loaded.Slides[0].SnapSettings.ShowGrid);
        Assert.True(loaded.Slides[0].SnapSettings.ShowGuides);
        Assert.False(loaded.Slides[0].SnapSettings.ShowMargins);
        Assert.False(loaded.Slides[0].SnapSettings.ShowSafeArea);
    }

    [Fact]
    public void GuideAndGridChangesRoundTripAndUndoWithoutChangingModelTransform()
    {
        var node = SceneNode.Create("Card", "shape.rectangle", new NodeGeometry(100, 100, 200, 120)) with
        {
            ModelTransform = new SpatialTransform2D(8, 12, 1, 1, 5),
        };
        var slide = SlideDocument.Create("Guided") with { Nodes = [node] };
        var session = new AuthoringSession(LessonProject.Create("Lesson") with { Slides = [slide] });
        var guide = new GuideDefinition(Guid.NewGuid(), GuideOrientation.Vertical, 700, false);

        session.Execute(ProjectCommands.SetSlideGuides(slide.Id, [guide]));
        session.Execute(ProjectCommands.SetSnapSettings(slide.Id,
            slide.SnapSettings with { ShowGrid = true, ShowMargins = true, GridSpacing = 25 }));
        var serialized = ProjectJson.Serialize(session.CurrentProject);
        var loaded = ProjectJson.Deserialize(serialized);

        Assert.Equal(guide, loaded.Slides[0].Guides.Single());
        Assert.True(loaded.Slides[0].SnapSettings.ShowGrid);
        Assert.True(loaded.Slides[0].SnapSettings.ShowMargins);
        Assert.Equal(25, loaded.Slides[0].SnapSettings.GridSpacing);
        Assert.Equal(node.ModelTransform, loaded.Slides[0].Nodes[0].ModelTransform);
        Assert.True(session.Undo());
        Assert.False(session.CurrentProject.Slides[0].SnapSettings.ShowGrid);
        Assert.True(session.Undo());
        Assert.Empty(session.CurrentProject.Slides[0].Guides);
    }

    [Fact]
    public void GridSnapEvaluatesTheCompleteMovingBounds()
    {
        var settings = SnapSettings.Default with
        {
            SnapToGuides = false,
            SnapToSlide = false,
            SnapToObjects = false,
            GridSpacing = 100,
            Threshold = 8,
        };

        var result = SnapEngine.Snap(
            new NodeBounds(0, 0, 196, 80),
            103,
            45,
            CanvasDefinition.Widescreen,
            [],
            [],
            settings);

        Assert.Equal(102, result.X);
        Assert.Contains(result.Matches, match =>
            match.Axis == "X" && match.Source == "Grid" && match.Position == 200);
    }

    [Fact]
    public void EqualSnapOffsetsUseStableSemanticPriority()
    {
        var settings = SnapSettings.Default with
        {
            SnapToGrid = false,
            SnapToSlide = false,
            Threshold = 5,
        };
        var guide = new GuideDefinition(Guid.NewGuid(), GuideOrientation.Vertical, 100, false);

        var result = SnapEngine.Snap(
            new NodeBounds(0, 0, 0, 0),
            98,
            40,
            CanvasDefinition.Widescreen,
            [guide],
            [new NodeBounds(100, 200, 50, 50)],
            settings);

        Assert.Contains(result.Matches, match => match.Axis == "X" && match.Source == "Guide");
    }

    [Theory]
    [InlineData(.5, 12, true)]
    [InlineData(4, 1.5, true)]
    [InlineData(4, 2, false)]
    public void GuideHitToleranceRemainsScreenConsistent(double zoom, double logicalDistance, bool expectedHit)
    {
        var guide = new GuideDefinition(Guid.NewGuid(), GuideOrientation.Vertical, 500, false);
        var surface = new DocumentSceneSurface
        {
            Snapshot = new SceneSnapshot(1, new RenderSize(1000, 500), "background", []),
            IsAuthoringSurface = true,
            ViewportZoom = zoom,
            Guidance = new CanvasGuidanceState(
                new CanvasDefinition(1000, 500, SlideOrientation.Landscape,
                    new ThicknessDefinition(20, 20, 20, 20),
                    new ThicknessDefinition(20, 20, 20, 20)),
                [guide],
                SnapSettings.Default),
        };
        surface.Measure(new Size(1000, 500));
        surface.Arrange(new Rect(0, 0, 1000, 500));

        var hit = surface.HitTestGuide(new Point(500 + logicalDistance, 200));

        Assert.Equal(expectedHit, hit is not null);
    }

    [Fact]
    public void RealWorkspaceContainsGuidanceControlsAndPointerRoutes()
    {
        var root = FindRepositoryRoot();
        var xaml = File.ReadAllText(Path.Combine(root, "src", "PhysicaStudio.Desktop", "Views", "MainWindow.axaml"));
        var code = File.ReadAllText(Path.Combine(root, "src", "PhysicaStudio.Desktop", "Views", "MainWindow.axaml.cs"));

        Assert.Contains("CanvasGuidancePanel", xaml, StringComparison.Ordinal);
        Assert.Contains("HorizontalCanvasRuler", xaml, StringComparison.Ordinal);
        Assert.Contains("AddVerticalGuide_Click", xaml, StringComparison.Ordinal);
        Assert.Contains("TryBeginGuideDrag(surface, e)", code, StringComparison.Ordinal);
        Assert.Contains("SnapCanvasBounds(", code, StringComparison.Ordinal);
    }

    [Fact]
    public void RulerMajorIntervalSupportsExplicitAndAutomaticModes()
    {
        var ruler = new CanvasRulerSurface();

        Assert.Equal(0, ruler.MajorInterval);

        ruler.MajorInterval = 100;

        Assert.Equal(100, ruler.MajorInterval);
    }

    [Fact]
    public void RejectedGuidanceReviewHasStructuralRegressionCoverage()
    {
        var root = FindRepositoryRoot();
        var xaml = File.ReadAllText(Path.Combine(root, "src", "PhysicaStudio.Desktop", "Views", "MainWindow.axaml"));
        var guidanceCode = File.ReadAllText(Path.Combine(root, "src", "PhysicaStudio.Desktop", "Views", "MainWindow.Guidance.cs"));
        var surfaceCode = File.ReadAllText(Path.Combine(root, "src", "PhysicaStudio.Desktop", "Controls", "DocumentSceneSurface.cs"));
        var iconCode = File.ReadAllText(Path.Combine(root, "src", "PhysicaStudio.Desktop", "Controls", "PhysicaIcon.cs"));

        Assert.Contains("RulerIntervalTextBox", xaml, StringComparison.Ordinal);
        Assert.Contains("GuidePosition_KeyDown", xaml, StringComparison.Ordinal);
        Assert.Contains("GridPreset_Click", xaml, StringComparison.Ordinal);
        Assert.Contains("RulerPreset_Click", xaml, StringComparison.Ordinal);
        Assert.Contains("GridAndRuler", xaml, StringComparison.Ordinal);
        Assert.Contains("MajorInterval = _rulerMajorInterval", guidanceCode, StringComparison.Ordinal);
        Assert.Contains("var spacing = settings.GridSpacing", surfaceCode, StringComparison.Ordinal);
        Assert.DoesNotContain("while (spacing * ViewportZoom < 10)", surfaceCode, StringComparison.Ordinal);
        Assert.Contains("case \"grid\"", iconCode, StringComparison.Ordinal);
        Assert.Contains("case \"close\"", iconCode, StringComparison.Ordinal);
    }

    private static string FindRepositoryRoot()
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);
        while (directory is not null && !File.Exists(Path.Combine(directory.FullName, "PhysicaStudio.slnx")))
        {
            directory = directory.Parent;
        }
        return directory?.FullName ?? throw new DirectoryNotFoundException("Repository root was not found.");
    }
}
