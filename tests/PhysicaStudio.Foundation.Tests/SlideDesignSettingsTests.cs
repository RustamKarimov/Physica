using PhysicaStudio.Authoring;
using PhysicaStudio.Desktop.Models;
using PhysicaStudio.Desktop.Services;
using PhysicaStudio.Desktop.ViewModels;
using PhysicaStudio.Document;
using PhysicaStudio.Rendering2D;

namespace PhysicaStudio.Foundation.Tests;

public sealed class SlideDesignSettingsTests
{
    [Fact]
    public void ScaleToFitPreservesModelAuthorityAndScalesRenderedTopLevelContent()
    {
        var node = SceneNode.Create("Cart", "shape.rectangle", new NodeGeometry(100, 50, 200, 100)) with
        {
            ModelTransform = new SpatialTransform2D(10, 20, 1.1, 1.2, 7),
            PresentationTransform = new PresentationTransform2D(5, 5, 1.2, .8, 3, 1),
        };
        var guide = new GuideDefinition(Guid.NewGuid(), GuideOrientation.Horizontal, 100, false);
        var slide = SlideDocument.Create("Resize") with { Nodes = [node], Guides = [guide] };
        var oldCanvas = new CanvasDefinition(
            1000, 500, SlideOrientation.Landscape,
            new ThicknessDefinition(20, 20, 20, 20),
            new ThicknessDefinition(20, 20, 20, 20));
        var session = new AuthoringSession(LessonProject.Create("Lesson") with
        {
            Canvas = oldCanvas,
            Slides = [slide],
        });
        var builder = new SlideSceneSnapshotBuilder();
        var before = Assert.Single(Assert.Single(builder.Build(session.CurrentProject, slide, 0).Layers).Primitives);

        session.Execute(ProjectCommands.ResizeCanvas(
            500, 1000, SlideOrientation.Portrait, CanvasResizePolicy.ScaleToFit));

        var resizedSlide = session.CurrentProject.Slides[0];
        var resizedNode = resizedSlide.Nodes[0];
        var after = Assert.Single(Assert.Single(
            builder.Build(session.CurrentProject, resizedSlide, session.Revision).Layers).Primitives);
        Assert.Equal(node.ModelTransform, resizedNode.ModelTransform);
        Assert.Equal(before.Bounds.X * .5, after.Bounds.X, 8);
        Assert.Equal(375 + before.Bounds.Y * .5, after.Bounds.Y, 8);
        Assert.Equal(before.Bounds.Width * .5, after.Bounds.Width, 8);
        Assert.Equal(before.Bounds.Height * .5, after.Bounds.Height, 8);
        Assert.Equal(425, resizedSlide.Guides[0].Position, 8);
        Assert.Equal(new RenderSize(500, 1000), session.CurrentProject.Canvas is { } canvas
            ? new RenderSize(canvas.Width, canvas.Height)
            : default);

        Assert.True(session.Undo());
        Assert.Equal(oldCanvas, session.CurrentProject.Canvas);
        Assert.Equal(node.ModelTransform, session.CurrentProject.Slides[0].Nodes[0].ModelTransform);
        Assert.Equal(node.PresentationTransform, session.CurrentProject.Slides[0].Nodes[0].PresentationTransform);
    }

    [Fact]
    public void NestedGroupIsScaledOnceAndDescendantStateRemainsUnchanged()
    {
        var group = SceneNode.Create("Group", SceneNodeHierarchy.GroupKind, new NodeGeometry(100, 100, 200, 100));
        var child = SceneNode.Create("Child", "shape.rectangle", new NodeGeometry(100, 100, 200, 100)) with
        {
            ParentId = group.Id,
            LayerIndex = 1,
            ModelTransform = new SpatialTransform2D(12, 8, 1, 1, 0),
            PresentationTransform = new PresentationTransform2D(4, 6, 1, 1, 0, 1),
        };
        var slide = SlideDocument.Create("Grouped") with { Nodes = [group, child] };
        var project = LessonProject.Create("Lesson") with
        {
            Canvas = new CanvasDefinition(
                1000, 500, SlideOrientation.Landscape,
                new ThicknessDefinition(20, 20, 20, 20),
                new ThicknessDefinition(20, 20, 20, 20)),
            Slides = [slide],
        };
        var builder = new SlideSceneSnapshotBuilder();
        var before = builder.Build(project, slide, 0).Layers.Single(layer => layer.Id == child.Id).SelectionBounds;
        Assert.NotNull(before);
        var session = new AuthoringSession(project);

        session.Execute(ProjectCommands.ResizeCanvas(
            500, 1000, SlideOrientation.Portrait, CanvasResizePolicy.ScaleToFit));

        var afterSlide = session.CurrentProject.Slides[0];
        var afterChild = afterSlide.Nodes.Single(node => node.Id == child.Id);
        var after = builder.Build(session.CurrentProject, afterSlide, 1)
            .Layers.Single(layer => layer.Id == child.Id).SelectionBounds;
        Assert.NotNull(after);
        Assert.Equal(child.ModelTransform, afterChild.ModelTransform);
        Assert.Equal(child.PresentationTransform, afterChild.PresentationTransform);
        Assert.Equal(before.Value.X * .5, after.Value.X, 8);
        Assert.Equal(375 + before.Value.Y * .5, after.Value.Y, 8);
        Assert.Equal(before.Value.Width * .5, after.Value.Width, 8);
        Assert.Equal(before.Value.Height * .5, after.Value.Height, 8);
    }

    [Fact]
    public void KeepSizeAndPositionOnlyClampsOutOfRangeGuides()
    {
        var node = SceneNode.Create("Card", "shape.rectangle", new NodeGeometry(700, 300, 200, 100));
        var slide = SlideDocument.Create("Keep") with
        {
            Nodes = [node],
            Guides =
            [
                new GuideDefinition(Guid.NewGuid(), GuideOrientation.Vertical, 900, false),
                new GuideDefinition(Guid.NewGuid(), GuideOrientation.Horizontal, 300, false),
            ],
        };
        var session = new AuthoringSession(LessonProject.Create("Lesson") with
        {
            Canvas = new CanvasDefinition(
                1000, 500, SlideOrientation.Landscape,
                new ThicknessDefinition(20, 20, 20, 20),
                new ThicknessDefinition(20, 20, 20, 20)),
            Slides = [slide],
        });

        session.Execute(ProjectCommands.ResizeCanvas(
            600, 250, SlideOrientation.Landscape, CanvasResizePolicy.KeepSizeAndPosition));

        Assert.Equal(node.Geometry, session.CurrentProject.Slides[0].Nodes[0].Geometry);
        Assert.Equal(node.ModelTransform, session.CurrentProject.Slides[0].Nodes[0].ModelTransform);
        Assert.Equal(node.PresentationTransform, session.CurrentProject.Slides[0].Nodes[0].PresentationTransform);
        Assert.Equal(600, session.CurrentProject.Slides[0].Guides[0].Position);
        Assert.Equal(250, session.CurrentProject.Slides[0].Guides[1].Position);
    }

    [Fact]
    public void ThemeBackgroundInsetsAndGradientRoundTripAndUndoAtomically()
    {
        var project = LessonProject.Create("Design");
        var slideId = project.Slides[0].Id;
        var session = new AuthoringSession(project);
        var margins = new ThicknessDefinition(80, 70, 60, 50);
        var safeArea = new ThicknessDefinition(100, 90, 80, 70);

        session.Execute(ProjectCommands.SetTheme(ThemeDefinition.Dark));
        session.Execute(ProjectCommands.SetSlideBackground(
            slideId,
            new SlideBackground(SlideBackgroundKind.Gradient, "#102030", "#405060", null, .75)));
        session.Execute(ProjectCommands.SetCanvasInsets(margins, safeArea));

        var reopened = ProjectJson.Deserialize(ProjectJson.Serialize(session.CurrentProject));
        var scene = new SlideSceneSnapshotBuilder().Build(reopened, reopened.Slides[0], 1);
        Assert.Equal(ThemeDefinition.Dark.Id, reopened.Theme.Id);
        Assert.Equal(margins, reopened.Canvas.Margins);
        Assert.Equal(safeArea, reopened.Canvas.SafeArea);
        Assert.Equal("#102030", scene.Background.Color);
        Assert.Equal("#405060", scene.Background.SecondaryColor);
        Assert.Equal(.75, scene.Background.Opacity);
        Assert.True(session.Undo());
        Assert.Equal(project.Canvas.Margins, session.CurrentProject.Canvas.Margins);
        Assert.Equal(project.Canvas.SafeArea, session.CurrentProject.Canvas.SafeArea);
    }

    [Fact]
    public void ThemeBackgroundUsesThemeColourInEverySharedSnapshot()
    {
        var slide = SlideDocument.Create("Theme");
        var project = LessonProject.Create("Lesson") with { Theme = ThemeDefinition.Dark, Slides = [slide] };
        var scene = new SlideSceneSnapshotBuilder().Build(project, slide, 4);

        Assert.Equal(ThemeDefinition.Dark.Colors["background"], scene.Background.Color);
        Assert.Null(scene.Background.SecondaryColor);
    }

    [Fact]
    public void DesktopExposesDesignCommandsThroughContextualInspector()
    {
        var root = FindRepositoryRoot();
        var xaml = File.ReadAllText(Path.Combine(root, "src", "PhysicaStudio.Desktop", "Views", "MainWindow.axaml"));
        var code = File.ReadAllText(Path.Combine(root, "src", "PhysicaStudio.Desktop", "Views", "MainWindow.Design.cs"));
        var viewModel = new StudioShellViewModel(
            new RibbonManifest([new RibbonTabDefinition("design", "Design",
                [new RibbonGroupDefinition("Canvas", ["Slide Size", "Orientation", "Margins"])])], []),
            new FeatureManifest([], 2, []));

        viewModel.OpenSlideDesignInspector();

        Assert.True(viewModel.ShowSlideDesignInspector);
        Assert.False(viewModel.ShowStandingWaveInspector);
        Assert.Contains("ThemeLightAzureButton", xaml, StringComparison.Ordinal);
        Assert.Contains("ThemeLaboratoryPlumButton", xaml, StringComparison.Ordinal);
        Assert.Contains("BackgroundColorPickerPanel", xaml, StringComparison.Ordinal);
        Assert.Contains("IsVisible=\"{Binding ShowStandingWaveInspector}\"", xaml, StringComparison.Ordinal);
        Assert.Contains("CanvasResizePolicyComboBox", xaml, StringComparison.Ordinal);
        Assert.Contains("ApplyCanvasSize_Click", xaml, StringComparison.Ordinal);
        Assert.Contains("ApplyInsets_Click", xaml, StringComparison.Ordinal);
        Assert.Contains("SynchronizeSlideDesign", code, StringComparison.Ordinal);
        Assert.All(viewModel.RibbonTabs.SelectMany(tab => tab.Groups).SelectMany(group => group.Commands),
            command => Assert.True(command.IsImplemented));
    }

    [Fact]
    public void BuiltInThemeVariantsPublishDistinctPalettes()
    {
        Assert.Equal(9, ThemeDefinition.BuiltInThemes.Count);
        Assert.Equal(9, ThemeDefinition.BuiltInThemes.Select(theme => theme.Id).Distinct().Count());
        Assert.Equal(9, ThemeDefinition.BuiltInThemes
            .Select(theme => string.Join('|', theme.Colors.OrderBy(pair => pair.Key).Select(pair => pair.Value)))
            .Distinct()
            .Count());
        Assert.All(ThemeDefinition.BuiltInThemes, theme =>
        {
            Assert.NotNull(ThemeDefinition.FindBuiltIn(theme.Id));
            Assert.Matches("^#[0-9A-Fa-f]{6}$", theme.Colors["background"]);
            Assert.Matches("^#[0-9A-Fa-f]{6}$", theme.Colors["accent"]);
        });
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
