using Avalonia;
using PhysicaStudio.Rendering2D;

namespace PhysicaStudio.Desktop.Controls;

public enum CanvasViewportMode
{
    FitSlide,
    FitWidth,
    ActualSize,
    Custom,
}

public sealed record CanvasViewportState(
    CanvasViewportMode Mode,
    double Zoom,
    double OffsetX,
    double OffsetY)
{
    public static CanvasViewportState Initial { get; } =
        new(CanvasViewportMode.FitSlide, 1, 0, 0);
}

public sealed class CanvasViewportSession
{
    private readonly Dictionary<Guid, CanvasViewportState> _states = [];
    private Guid? _projectId;
    private Guid? _activeSlideId;

    public CanvasViewportState Activate(
        Guid projectId,
        Guid slideId,
        CanvasViewportState currentState)
    {
        if (_projectId != projectId)
        {
            _states.Clear();
            _projectId = projectId;
            _activeSlideId = slideId;
            return CanvasViewportState.Initial;
        }

        if (_activeSlideId == slideId)
        {
            return currentState;
        }

        if (_activeSlideId is Guid previousSlideId)
        {
            _states[previousSlideId] = currentState;
        }

        _activeSlideId = slideId;
        return _states.GetValueOrDefault(slideId, CanvasViewportState.Initial);
    }

    public void SaveCurrent(CanvasViewportState state)
    {
        if (_activeSlideId is Guid slideId)
        {
            _states[slideId] = state;
        }
    }

    public void RetainSlides(IReadOnlySet<Guid> slideIds)
    {
        foreach (var removed in _states.Keys.Where(id => !slideIds.Contains(id)).ToArray())
        {
            _states.Remove(removed);
        }
    }
}

public static class CanvasViewportGeometry
{
    public const double MinimumZoom = 0.1;
    public const double MaximumZoom = 8;
    public const double WorkspacePadding = 28;
    public const double MinimumVisibleExtent = 56;

    public static CanvasViewportState Resolve(
        CanvasViewportState requested,
        RenderSize slide,
        Size viewport)
    {
        if (!IsUsable(slide, viewport))
        {
            return requested;
        }

        return requested.Mode switch
        {
            CanvasViewportMode.FitSlide => FitSlide(slide, viewport),
            CanvasViewportMode.FitWidth => FitWidth(slide, viewport),
            CanvasViewportMode.ActualSize => CenterAtZoom(slide, viewport, 1, CanvasViewportMode.ActualSize),
            _ => Clamp(requested with
            {
                Mode = CanvasViewportMode.Custom,
                Zoom = ClampZoom(requested.Zoom),
            }, slide, viewport),
        };
    }

    public static CanvasViewportState ZoomAt(
        CanvasViewportState current,
        RenderSize slide,
        Size viewport,
        Point anchor,
        double requestedZoom)
    {
        var resolved = Resolve(current, slide, viewport);
        var zoom = ClampZoom(requestedZoom);
        var logicalX = (anchor.X - resolved.OffsetX) / resolved.Zoom;
        var logicalY = (anchor.Y - resolved.OffsetY) / resolved.Zoom;
        return Clamp(new CanvasViewportState(
            CanvasViewportMode.Custom,
            zoom,
            anchor.X - logicalX * zoom,
            anchor.Y - logicalY * zoom), slide, viewport);
    }

    public static CanvasViewportState PanBy(
        CanvasViewportState current,
        RenderSize slide,
        Size viewport,
        double deltaX,
        double deltaY)
    {
        var resolved = Resolve(current, slide, viewport);
        return Clamp(resolved with
        {
            Mode = CanvasViewportMode.Custom,
            OffsetX = resolved.OffsetX + deltaX,
            OffsetY = resolved.OffsetY + deltaY,
        }, slide, viewport);
    }

    public static CanvasViewportState SetMode(
        CanvasViewportMode mode,
        RenderSize slide,
        Size viewport) =>
        Resolve(new CanvasViewportState(mode, 1, 0, 0), slide, viewport);

    public static double ScreenPixels(double pixels, double zoom) =>
        pixels / Math.Max(Math.Abs(zoom), .001);

    private static CanvasViewportState FitSlide(RenderSize slide, Size viewport)
    {
        var availableWidth = Math.Max(1, viewport.Width - WorkspacePadding * 2);
        var availableHeight = Math.Max(1, viewport.Height - WorkspacePadding * 2);
        var zoom = ClampZoom(Math.Min(availableWidth / slide.Width, availableHeight / slide.Height));
        return CenterAtZoom(slide, viewport, zoom, CanvasViewportMode.FitSlide);
    }

    private static CanvasViewportState FitWidth(RenderSize slide, Size viewport)
    {
        var availableWidth = Math.Max(1, viewport.Width - WorkspacePadding * 2);
        var zoom = ClampZoom(availableWidth / slide.Width);
        var renderedHeight = slide.Height * zoom;
        var y = renderedHeight <= viewport.Height - WorkspacePadding * 2
            ? (viewport.Height - renderedHeight) / 2
            : WorkspacePadding;
        return new CanvasViewportState(
            CanvasViewportMode.FitWidth,
            zoom,
            (viewport.Width - slide.Width * zoom) / 2,
            y);
    }

    private static CanvasViewportState CenterAtZoom(
        RenderSize slide,
        Size viewport,
        double zoom,
        CanvasViewportMode mode) =>
        new(
            mode,
            ClampZoom(zoom),
            (viewport.Width - slide.Width * ClampZoom(zoom)) / 2,
            (viewport.Height - slide.Height * ClampZoom(zoom)) / 2);

    private static CanvasViewportState Clamp(
        CanvasViewportState state,
        RenderSize slide,
        Size viewport)
    {
        if (!IsUsable(slide, viewport))
        {
            return state;
        }

        var renderedWidth = slide.Width * state.Zoom;
        var renderedHeight = slide.Height * state.Zoom;
        var minimumX = MinimumVisibleExtent - renderedWidth;
        var maximumX = viewport.Width - MinimumVisibleExtent;
        var minimumY = MinimumVisibleExtent - renderedHeight;
        var maximumY = viewport.Height - MinimumVisibleExtent;
        return state with
        {
            OffsetX = Math.Clamp(state.OffsetX, minimumX, maximumX),
            OffsetY = Math.Clamp(state.OffsetY, minimumY, maximumY),
        };
    }

    private static double ClampZoom(double zoom) =>
        Math.Clamp(double.IsFinite(zoom) ? zoom : 1, MinimumZoom, MaximumZoom);

    private static bool IsUsable(RenderSize slide, Size viewport) =>
        slide.Width > 0 && slide.Height > 0 && viewport.Width > 0 && viewport.Height > 0;
}
