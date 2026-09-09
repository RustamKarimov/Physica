using Avalonia;
using PhysicaStudio.Desktop.Controls;
using PhysicaStudio.Rendering2D;

namespace PhysicaStudio.Foundation.Tests;

public sealed class CanvasInteractionTests
{
    [Fact]
    public void SurfaceHitTestingUsesTopmostDocumentPrimitiveAndLogicalCoordinates()
    {
        var lowerId = Guid.NewGuid();
        var upperId = Guid.NewGuid();
        var surface = CreateSurface(
            Primitive(lowerId, new RenderBounds(100, 100, 300, 200)),
            Primitive(upperId, new RenderBounds(200, 150, 300, 200)));

        Assert.Equal(upperId, surface.HitTestNode(new Point(250, 200)));
        Assert.Equal(lowerId, surface.HitTestNode(new Point(120, 120)));
        Assert.Null(surface.HitTestNode(new Point(20, 20)));
        Assert.Equal(new Point(500, 250), surface.ToLogical(new Point(500, 250)));
    }

    [Fact]
    public void PathHitTestingFollowsVisibleStrokeRatherThanItsBoundingRectangle()
    {
        var pathId = Guid.NewGuid();
        var surface = CreateSurface(
            new RenderPrimitiveSnapshot(
                pathId,
                RenderPrimitiveKind.Path,
                new RenderBounds(100, 100, 800, 300),
                "path",
                [new RenderPoint(100, 250), new RenderPoint(900, 250)],
                null,
                null)
            {
                Style = new RenderStyleSnapshot(
                    null,
                    "#168CFF",
                    4,
                    0,
                    [],
                    "Inter",
                    28,
                    PhysicaStudio.Document.SceneFontWeight.Normal,
                    false,
                    "#22313D",
                    PhysicaStudio.Document.SceneTextAlignment.Start),
            });

        Assert.Equal(pathId, surface.HitTestNode(new Point(500, 250)));
        Assert.Null(surface.HitTestNode(new Point(500, 110)));
    }

    [Fact]
    public void SelectionHandlesAndTransientPreviewFollowSelectedDocumentNode()
    {
        var nodeId = Guid.NewGuid();
        var surface = CreateSurface(Primitive(nodeId, new RenderBounds(100, 100, 300, 200)));
        surface.SelectedNodeIds = new HashSet<Guid> { nodeId };

        Assert.Equal(CanvasSelectionHandle.ResizeNorthWest,
            surface.HitTestSelectionHandle(new Point(100, 100)));
        Assert.Equal(CanvasSelectionHandle.Body,
            surface.HitTestSelectionHandle(new Point(180, 160)));
        Assert.Equal(CanvasSelectionHandle.Rotate,
            surface.HitTestSelectionHandle(new Point(250, 74)));

        surface.SetInteractionPreview(new Dictionary<Guid, CanvasNodePreview>
        {
            [nodeId] = new(new RenderBounds(500, 200, 150, 100), 30),
        });

        Assert.Equal(new RenderBounds(500, 200, 150, 100), surface.GetNodeLogicalBounds(nodeId));
        Assert.Equal(nodeId, surface.HitTestNode(new Point(550, 250)));
        Assert.Equal(CanvasSelectionHandle.ResizeSouthEast,
            surface.HitTestSelectionHandle(new Point(650, 300)));
    }

    [Fact]
    public void MarqueeSelectionIncludesOnlyFullyEnclosedVisibleObjects()
    {
        var enclosedId = Guid.NewGuid();
        var partialId = Guid.NewGuid();
        var surface = CreateSurface(
            Primitive(enclosedId, new RenderBounds(100, 100, 100, 100)),
            Primitive(partialId, new RenderBounds(250, 100, 100, 100)));

        var selected = surface.GetNodeIdsInsideMarquee(new Rect(80, 80, 220, 160));

        Assert.Contains(enclosedId, selected);
        Assert.DoesNotContain(partialId, selected);
    }

    [Theory]
    [InlineData(false, false, 100, 100, 200, 200)]
    [InlineData(true, false, 100, 100, 240, 120)]
    [InlineData(false, true, 100, 0, 200, 300)]
    [InlineData(true, true, 60, 80, 280, 140)]
    public void CornerResizeHonorsAspectAndCenterModifiers(
        bool preserveAspect,
        bool fromCenter,
        double expectedX,
        double expectedY,
        double expectedWidth,
        double expectedHeight)
    {
        var resized = CanvasTransformGeometry.ResizeBounds(
            new RenderBounds(100, 100, 200, 100),
            CanvasSelectionHandle.ResizeSouthEast,
            new Point(300, 300),
            preserveAspect,
            fromCenter);

        Assert.Equal(expectedX, resized.X, 6);
        Assert.Equal(expectedY, resized.Y, 6);
        Assert.Equal(expectedWidth, resized.Width, 6);
        Assert.Equal(expectedHeight, resized.Height, 6);
    }

    private static DocumentSceneSurface CreateSurface(params RenderPrimitiveSnapshot[] primitives)
    {
        var layers = primitives.Select((primitive, index) =>
            new RenderLayerSnapshot(primitive.Id, $"Layer {index + 1}", index, true, true, [primitive])).ToArray();
        var surface = new DocumentSceneSurface
        {
            Snapshot = new SceneSnapshot(1, new RenderSize(1000, 500), "background", layers),
            IsAuthoringSurface = true,
        };
        surface.Measure(new Size(1000, 500));
        surface.Arrange(new Rect(0, 0, 1000, 500));
        return surface;
    }

    private static RenderPrimitiveSnapshot Primitive(Guid id, RenderBounds bounds) =>
        new(id, RenderPrimitiveKind.Rectangle, bounds, "test", [], null, null);
}
