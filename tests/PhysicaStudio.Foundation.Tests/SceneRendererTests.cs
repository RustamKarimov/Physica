using PhysicaStudio.Authoring;
using PhysicaStudio.Desktop.Controls;
using PhysicaStudio.Desktop.Models;
using PhysicaStudio.Desktop.Services;
using PhysicaStudio.Desktop.ViewModels;
using PhysicaStudio.Document;
using PhysicaStudio.Rendering2D;

namespace PhysicaStudio.Foundation.Tests;

public sealed class SceneRendererTests
{
    private static readonly DateTimeOffset FixedTime = new(2026, 9, 8, 12, 0, 0, TimeSpan.Zero);

    [Fact]
    public void SnapshotBuilder_UsesDocumentCanvasBackgroundContentAndAppearance()
    {
        var node = SceneNode.Create("Explanation", "shape.text", new NodeGeometry(100, 120, 600, 100)) with
        {
            Content = new SceneNodeContent("Newton's second law", null, []),
            Appearance = SceneNodeAppearance.Default with
            {
                FillColor = null,
                StrokeColor = null,
                FontSize = 44,
                FontWeight = SceneFontWeight.Bold,
                TextColor = "#123456",
            },
        };
        var slide = SlideDocument.Create("Forces") with
        {
            Background = new SlideBackground(SlideBackgroundKind.Solid, "#FAF1E8", null, null, .8),
            Nodes = [node],
        };
        var project = LessonProject.Create("Mechanics", FixedTime) with
        {
            Canvas = new CanvasDefinition(1600, 900, SlideOrientation.Landscape,
                new ThicknessDefinition(20, 20, 20, 20), new ThicknessDefinition(30, 30, 30, 30)),
            Slides = [slide],
        };

        var snapshot = new SlideSceneSnapshotBuilder().Build(project, slide, 17);

        Assert.Equal(17, snapshot.Version);
        Assert.Equal(new RenderSize(1600, 900), snapshot.LogicalSize);
        Assert.Equal("#FAF1E8", snapshot.Background.Color);
        Assert.Equal(.8, snapshot.Background.Opacity);
        var primitive = Assert.Single(Assert.Single(snapshot.Layers).Primitives);
        Assert.Equal(RenderPrimitiveKind.Text, primitive.Kind);
        Assert.Equal("Newton's second law", primitive.Text);
        Assert.Equal(new RenderBounds(100, 120, 600, 100), primitive.Bounds);
        Assert.Equal(44, primitive.Style.FontSize);
        Assert.Equal(SceneFontWeight.Bold, primitive.Style.FontWeight);
        Assert.Equal("#123456", primitive.Style.TextColor);
    }

    [Fact]
    public void DuplicateSlide_HasEquivalentSceneWithIndependentIds()
    {
        var node = SceneNode.Create("Card", "shape.rectangle", new NodeGeometry(120, 160, 640, 300)) with
        {
            Appearance = SceneNodeAppearance.Default with
            {
                FillColor = "#FFFFFF",
                StrokeColor = "#0878F9",
                StrokeWidth = 4,
                CornerRadius = 18,
            },
        };
        var source = SlideDocument.Create("Worked example") with { Nodes = [node] };
        var project = LessonProject.Create("Lesson", FixedTime) with { Slides = [source] };
        var session = new AuthoringSession(project);
        session.Execute(ProjectCommands.DuplicateSlide(source.Id));
        var duplicate = session.CurrentProject.Slides[1];
        var builder = new SlideSceneSnapshotBuilder();

        var originalScene = builder.Build(session.CurrentProject, session.CurrentProject.Slides[0], 1);
        var duplicateScene = builder.Build(session.CurrentProject, duplicate, 1);
        var originalPrimitive = Assert.Single(Assert.Single(originalScene.Layers).Primitives);
        var duplicatePrimitive = Assert.Single(Assert.Single(duplicateScene.Layers).Primitives);

        Assert.NotEqual(session.CurrentProject.Slides[0].Id, duplicate.Id);
        Assert.NotEqual(originalPrimitive.Id, duplicatePrimitive.Id);
        Assert.Equal(originalPrimitive.Kind, duplicatePrimitive.Kind);
        Assert.Equal(originalPrimitive.Bounds, duplicatePrimitive.Bounds);
        Assert.Equal(originalPrimitive.Style, duplicatePrimitive.Style);
        Assert.Equal(originalPrimitive.Text, duplicatePrimitive.Text);
        Assert.Equal(originalPrimitive.Points, duplicatePrimitive.Points);
    }

    [Fact]
    public void StudioViewModel_UsesDocumentScenesForEditorAndEveryThumbnail()
    {
        var ribbon = new RibbonManifest([new RibbonTabDefinition("home", "Home", [])], []);
        var viewModel = new StudioShellViewModel(ribbon, new FeatureManifest([], 2, []));

        Assert.Equal(viewModel.ActiveSlide.Nodes.Count, viewModel.ActiveScene.Layers.Count);
        Assert.Equal(viewModel.Session.CurrentProject.Canvas.Width, viewModel.ActiveScene.LogicalSize.Width);
        Assert.Equal(viewModel.Session.CurrentProject.Canvas.Height, viewModel.ActiveScene.LogicalSize.Height);
        Assert.All(viewModel.Slides, slide =>
        {
            var document = viewModel.Session.CurrentProject.Slides.Single(candidate => candidate.Id == slide.Id);
            Assert.Equal(document.Nodes.Count, slide.Scene.Layers.Count);
            Assert.Equal(16d / 9d, slide.PreviewAspectRatio, 8);
        });
    }

    [Fact]
    public void DocumentSceneSurface_ReceivesTheSameSnapshotInstance()
    {
        var slide = SlideDocument.Create("Blank");
        var project = LessonProject.Create("Lesson", FixedTime) with { Slides = [slide] };
        var snapshot = new SlideSceneSnapshotBuilder().Build(project, slide, 3);
        var surface = new DocumentSceneSurface { Snapshot = snapshot };

        Assert.Same(snapshot, surface.Snapshot);
    }
}
