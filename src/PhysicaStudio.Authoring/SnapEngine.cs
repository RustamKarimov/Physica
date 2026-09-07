using PhysicaStudio.Document;

namespace PhysicaStudio.Authoring;

public readonly record struct NodeBounds(double X, double Y, double Width, double Height)
{
    public double Left => X;
    public double Top => Y;
    public double Right => X + Width;
    public double Bottom => Y + Height;
    public double CenterX => X + Width / 2;
    public double CenterY => Y + Height / 2;
}

public sealed record SnapResult(double X, double Y, IReadOnlyList<SnapMatch> Matches);

public sealed record SnapMatch(string Axis, string Source, double Position);

public static class SnapEngine
{
    public static SnapResult Snap(
        NodeBounds moving,
        double desiredX,
        double desiredY,
        CanvasDefinition canvas,
        IReadOnlyList<GuideDefinition> guides,
        IReadOnlyList<NodeBounds> peers,
        SnapSettings settings)
    {
        if (!settings.Enabled)
        {
            return new SnapResult(desiredX, desiredY, []);
        }

        var translated = moving with { X = desiredX, Y = desiredY };
        var xCandidates = new List<SnapCandidate>();
        var yCandidates = new List<SnapCandidate>();

        if (settings.SnapToGrid)
        {
            AddCandidate(xCandidates, desiredX, Math.Round(desiredX / settings.GridSpacing) * settings.GridSpacing, "Grid");
            AddCandidate(yCandidates, desiredY, Math.Round(desiredY / settings.GridSpacing) * settings.GridSpacing, "Grid");
        }

        if (settings.SnapToSlide)
        {
            AddEdgeCandidates(translated, desiredX, desiredY, [0, canvas.Width / 2, canvas.Width], [0, canvas.Height / 2, canvas.Height], "Slide", xCandidates, yCandidates);
        }

        if (settings.SnapToGuides)
        {
            AddEdgeCandidates(
                translated,
                desiredX,
                desiredY,
                guides.Where(guide => guide.Orientation == GuideOrientation.Vertical).Select(guide => guide.Position),
                guides.Where(guide => guide.Orientation == GuideOrientation.Horizontal).Select(guide => guide.Position),
                "Guide",
                xCandidates,
                yCandidates);
        }

        if (settings.SnapToObjects)
        {
            AddEdgeCandidates(
                translated,
                desiredX,
                desiredY,
                peers.SelectMany(peer => new[] { peer.Left, peer.CenterX, peer.Right }),
                peers.SelectMany(peer => new[] { peer.Top, peer.CenterY, peer.Bottom }),
                "Object",
                xCandidates,
                yCandidates);
        }

        var bestX = SelectCandidate(xCandidates, settings.Threshold);
        var bestY = SelectCandidate(yCandidates, settings.Threshold);
        var matches = new List<SnapMatch>();
        if (bestX is not null)
        {
            desiredX += bestX.Offset;
            matches.Add(new SnapMatch("X", bestX.Source, bestX.Target));
        }

        if (bestY is not null)
        {
            desiredY += bestY.Offset;
            matches.Add(new SnapMatch("Y", bestY.Source, bestY.Target));
        }

        return new SnapResult(desiredX, desiredY, matches);
    }

    private static void AddEdgeCandidates(
        NodeBounds moving,
        double desiredX,
        double desiredY,
        IEnumerable<double> xTargets,
        IEnumerable<double> yTargets,
        string source,
        List<SnapCandidate> xCandidates,
        List<SnapCandidate> yCandidates)
    {
        foreach (var target in xTargets)
        {
            AddCandidate(xCandidates, moving.Left, target, source);
            AddCandidate(xCandidates, moving.CenterX, target, source);
            AddCandidate(xCandidates, moving.Right, target, source);
        }

        foreach (var target in yTargets)
        {
            AddCandidate(yCandidates, moving.Top, target, source);
            AddCandidate(yCandidates, moving.CenterY, target, source);
            AddCandidate(yCandidates, moving.Bottom, target, source);
        }
    }

    private static void AddCandidate(List<SnapCandidate> candidates, double sourcePosition, double target, string source) =>
        candidates.Add(new SnapCandidate(target - sourcePosition, target, source));

    private static SnapCandidate? SelectCandidate(IEnumerable<SnapCandidate> candidates, double threshold) =>
        candidates
            .Where(candidate => Math.Abs(candidate.Offset) <= threshold)
            .OrderBy(candidate => Math.Abs(candidate.Offset))
            .ThenBy(candidate => candidate.Source, StringComparer.Ordinal)
            .FirstOrDefault();

    private sealed record SnapCandidate(double Offset, double Target, string Source);
}
