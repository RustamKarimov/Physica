namespace PhysicaStudio.Desktop.Models;

public sealed record PerformanceScenario(
    string Id,
    int TrackCount,
    int KeyframeCount,
    int AssetCount,
    long ProjectBytes,
    TimeSpan InteractiveOpenTarget,
    double MinimumFramesPerSecond);
