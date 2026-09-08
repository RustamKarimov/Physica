using PhysicaStudio.Authoring;
using PhysicaStudio.Desktop.Models;
using PhysicaStudio.Desktop.Services;
using PhysicaStudio.Desktop.ViewModels;
using PhysicaStudio.Document;
using PhysicaStudio.Rendering2D;

namespace PhysicaStudio.Foundation.Tests;

public sealed class SceneRendererInvalidationTests
{
    private static readonly DateTimeOffset FixedTime = new(2026, 9, 8, 12, 0, 0, TimeSpan.Zero);

    [Fact]
    public void VisibleMutationsUndoAndRedoRebuildEditorAndThumbnailSnapshots()
    {
        var node = SceneNode.Create("Card", "shape.rectangle", new NodeGeometry(100, 120, 400, 240)) with
        {
            Appearance = SceneNodeAppearance.Default with { FillColor = "#FFFFFF", StrokeColor = "#0878F9" },
        };
        var slide = SlideDocument.Create("Scene") with { Nodes = [node] };
        var project = LessonProject.Create("Lesson", FixedTime) with { Slides = [slide] };
        var session = new AuthoringSession(project);
        var viewModel = CreateViewModel(session);

        var initialVersion = viewModel.ActiveScene.Version;
        var initialBounds = SinglePrimitive(viewModel.ActiveScene).Bounds;
        session.Execute(ProjectCommands.SetNodeGeometry(slide.Id, node.Id, new NodeGeometry(260, 180, 500, 300)));

        Assert.True(viewModel.ActiveScene.Version > initialVersion);
        Assert.Equal(new RenderBounds(260, 180, 500, 300), SinglePrimitive(viewModel.ActiveScene).Bounds);
        Assert.Equal(SinglePrimitive(viewModel.ActiveScene).Bounds, SinglePrimitive(viewModel.Slides[0].Scene).Bounds);

        session.Execute(ProjectCommands.SetSlideBackground(slide.Id,
            new SlideBackground(SlideBackgroundKind.Solid, "#102030", null, null, 1)));
        Assert.Equal("#102030", viewModel.ActiveScene.Background.Color);
        Assert.Equal("#102030", viewModel.Slides[0].Scene.Background.Color);

        Assert.True(session.Undo());
        Assert.NotEqual("#102030", viewModel.ActiveScene.Background.Color);
        Assert.True(session.Undo());
        Assert.Equal(initialBounds, SinglePrimitive(viewModel.ActiveScene).Bounds);
        Assert.True(session.Redo());
        Assert.Equal(new RenderBounds(260, 180, 500, 300), SinglePrimitive(viewModel.ActiveScene).Bounds);
    }

    [Fact]
    public void BlankAlternateCanvasAndImageReferenceRemainDocumentDriven()
    {
        var assetId = Guid.NewGuid();
        var image = SceneNode.Create("Diagram", "shape.image", new NodeGeometry(80, 90, 640, 360)) with
        {
            Content = new SceneNodeContent(null, assetId, []),
            Appearance = SceneNodeAppearance.Default with { Opacity = .75 },
        };
        var blank = SlideDocument.Create("Blank");
        var illustrated = SlideDocument.Create("Illustrated") with { Nodes = [image] };
        var project = LessonProject.Create("Lesson", FixedTime) with
        {
            Canvas = new CanvasDefinition(1200, 900, SlideOrientation.Landscape,
                new ThicknessDefinition(40, 40, 40, 40), new ThicknessDefinition(30, 30, 30, 30)),
            Slides = [blank, illustrated],
            Assets = [new AssetReference(assetId, "sha256:test", "image/png", AssetStorageKind.External, "diagram.png")],
        };
        var builder = new SlideSceneSnapshotBuilder();

        var blankScene = builder.Build(project, blank, 1);
        var imageScene = builder.Build(project, illustrated, 1);

        Assert.Empty(blankScene.Layers);
        Assert.Equal(4d / 3d, blankScene.LogicalSize.Width / blankScene.LogicalSize.Height, 8);
        var primitive = SinglePrimitive(imageScene);
        Assert.Equal(RenderPrimitiveKind.Image, primitive.Kind);
        Assert.Equal(assetId.ToString("D"), primitive.AssetId);
        Assert.Equal(.75, primitive.Opacity);
    }

    private static StudioShellViewModel CreateViewModel(AuthoringSession session) =>
        new(new RibbonManifest([new RibbonTabDefinition("home", "Home", [])], []),
            new FeatureManifest([], 2, []), session);

    private static RenderPrimitiveSnapshot SinglePrimitive(SceneSnapshot snapshot) =>
        Assert.Single(Assert.Single(snapshot.Layers).Primitives);
}
