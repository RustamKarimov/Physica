using Avalonia;
using PhysicaStudio.Desktop.Controls;
using PhysicaStudio.Rendering2D;

namespace PhysicaStudio.Foundation.Tests;

public sealed class CanvasViewportTests
{
    private static readonly RenderSize Widescreen = new(1600, 900);

    [Fact]
    public void FitSlideUsesBothDimensionsAndCentersTheSlide()
    {
        var viewport = new Size(1000, 700);

        var state = CanvasViewportGeometry.SetMode(
            CanvasViewportMode.FitSlide,
            Widescreen,
            viewport);

        Assert.Equal(0.59, state.Zoom, 8);
        Assert.Equal(28, state.OffsetX, 8);
        Assert.Equal((viewport.Height - Widescreen.Height * state.Zoom) / 2, state.OffsetY, 8);
        Assert.Equal(CanvasViewportMode.FitSlide, state.Mode);
    }

    [Fact]
    public void FitWidthUsesWorkspacePaddingAndKeepsTallSlideReachable()
    {
        var state = CanvasViewportGeometry.SetMode(
            CanvasViewportMode.FitWidth,
            Widescreen,
            new Size(1000, 500));

        Assert.Equal(0.59, state.Zoom, 8);
        Assert.Equal(28, state.OffsetX, 8);
        Assert.Equal(CanvasViewportGeometry.WorkspacePadding, state.OffsetY, 8);
        Assert.Equal(CanvasViewportMode.FitWidth, state.Mode);
    }

    [Fact]
    public void PointerAnchoredZoomPreservesTheLogicalPointUnderThePointer()
    {
        var viewport = new Size(1100, 700);
        var current = CanvasViewportGeometry.SetMode(
            CanvasViewportMode.FitSlide,
            Widescreen,
            viewport);
        var anchor = new Point(327, 214);
        var logicalBefore = new Point(
            (anchor.X - current.OffsetX) / current.Zoom,
            (anchor.Y - current.OffsetY) / current.Zoom);

        var zoomed = CanvasViewportGeometry.ZoomAt(
            current,
            Widescreen,
            viewport,
            anchor,
            current.Zoom * 1.6);
        var logicalAfter = new Point(
            (anchor.X - zoomed.OffsetX) / zoomed.Zoom,
            (anchor.Y - zoomed.OffsetY) / zoomed.Zoom);

        Assert.Equal(logicalBefore.X, logicalAfter.X, 8);
        Assert.Equal(logicalBefore.Y, logicalAfter.Y, 8);
        Assert.Equal(CanvasViewportMode.Custom, zoomed.Mode);
    }

    [Fact]
    public void ManualPanKeepsARecoverablePartOfTheSlideVisible()
    {
        var viewport = new Size(1000, 600);
        var actual = CanvasViewportGeometry.SetMode(
            CanvasViewportMode.ActualSize,
            Widescreen,
            viewport);

        var farRight = CanvasViewportGeometry.PanBy(
            actual,
            Widescreen,
            viewport,
            10000,
            10000);
        var farLeft = CanvasViewportGeometry.PanBy(
            actual,
            Widescreen,
            viewport,
            -10000,
            -10000);

        Assert.Equal(viewport.Width - CanvasViewportGeometry.MinimumVisibleExtent, farRight.OffsetX, 8);
        Assert.Equal(viewport.Height - CanvasViewportGeometry.MinimumVisibleExtent, farRight.OffsetY, 8);
        Assert.Equal(CanvasViewportGeometry.MinimumVisibleExtent - Widescreen.Width, farLeft.OffsetX, 8);
        Assert.Equal(CanvasViewportGeometry.MinimumVisibleExtent - Widescreen.Height, farLeft.OffsetY, 8);
    }

    [Fact]
    public void ViewportSessionRestoresEachSlideAndResetsForAnotherProject()
    {
        var session = new CanvasViewportSession();
        var project = Guid.NewGuid();
        var firstSlide = Guid.NewGuid();
        var secondSlide = Guid.NewGuid();
        var firstCustom = new CanvasViewportState(CanvasViewportMode.Custom, 1.7, -120, 44);

        Assert.Equal(CanvasViewportState.Initial,
            session.Activate(project, firstSlide, CanvasViewportState.Initial));
        Assert.Equal(CanvasViewportState.Initial,
            session.Activate(project, secondSlide, firstCustom));
        var secondCustom = new CanvasViewportState(CanvasViewportMode.Custom, .8, 28, 31);
        Assert.Equal(firstCustom, session.Activate(project, firstSlide, secondCustom));
        Assert.Equal(CanvasViewportState.Initial,
            session.Activate(Guid.NewGuid(), firstSlide, firstCustom));
    }

    [Theory]
    [InlineData(0.001, 0.1)]
    [InlineData(20, 8)]
    public void ZoomIsClampedToTheSupportedRange(double requested, double expected)
    {
        var state = CanvasViewportGeometry.ZoomAt(
            CanvasViewportState.Initial,
            Widescreen,
            new Size(1000, 700),
            new Point(500, 350),
            requested);

        Assert.Equal(expected, state.Zoom, 8);
    }

    [Theory]
    [InlineData(0.5)]
    [InlineData(1)]
    [InlineData(4)]
    public void AuthoringOverlayMeasurementsRemainConstantInScreenPixels(double zoom)
    {
        var localMeasurement = CanvasViewportGeometry.ScreenPixels(9, zoom);

        Assert.Equal(9, localMeasurement * zoom, 8);
    }
}
