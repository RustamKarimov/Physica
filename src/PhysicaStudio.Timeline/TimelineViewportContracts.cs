namespace PhysicaStudio.Timeline;

public sealed record TimelineViewportQuery(
    TimeSpan Start,
    TimeSpan End,
    int FirstVisibleTrack,
    int VisibleTrackCount,
    double PixelsPerSecond,
    double TrackHeight);

public enum TimelineVisualKind
{
    Clip,
    Keyframe,
    Condition,
    Pause,
    PassThrough,
    InteractionWait,
    Density
}

public sealed record TimelineVisual(
    Guid Id,
    Guid TrackId,
    TimelineVisualKind Kind,
    TimeSpan Start,
    TimeSpan Duration,
    string StyleId,
    string? Label);

public sealed record TimelineTrackHeader(
    Guid Id,
    string Name,
    int Depth,
    bool IsExpanded,
    bool IsVisible,
    bool IsLocked,
    bool IsMuted,
    bool IsSolo);

public sealed record TimelineRenderBatch(
    TimelineViewportQuery Query,
    IReadOnlyList<TimelineTrackHeader> Headers,
    IReadOnlyList<TimelineVisual> Visuals);
