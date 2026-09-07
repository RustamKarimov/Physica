namespace PhysicaStudio.Document;

public enum DocumentIssueSeverity
{
    Warning,
    Error
}

public sealed record DocumentValidationIssue(
    DocumentIssueSeverity Severity,
    string Code,
    string Message,
    string Path);

public sealed record DocumentValidationResult(IReadOnlyList<DocumentValidationIssue> Issues)
{
    public bool IsValid => Issues.All(issue => issue.Severity != DocumentIssueSeverity.Error);
}

public static class DocumentValidator
{
    public static DocumentValidationResult Validate(LessonProject project)
    {
        ArgumentNullException.ThrowIfNull(project);
        var issues = new List<DocumentValidationIssue>();

        Require(project.Id != Guid.Empty, "project.id.empty", "Project ID cannot be empty.", "$.id", issues);
        Require(!string.IsNullOrWhiteSpace(project.Title), "project.title.empty", "Project title cannot be empty.", "$.title", issues);
        Require(project.FormatVersion is > 0 and <= ProjectFormat.Current, "project.version.unsupported", "Project format version is not supported.", "$.formatVersion", issues);
        Require(IsFinitePositive(project.Canvas.Width) && IsFinitePositive(project.Canvas.Height), "canvas.size.invalid", "Canvas dimensions must be finite and positive.", "$.canvas", issues);
        Require(project.Slides.Count > 0, "slides.empty", "A lesson must contain at least one slide.", "$.slides", issues);

        ValidateUniqueIds(project.Sections.Select(section => section.Id), "section", "$.sections", issues);
        ValidateUniqueIds(project.Slides.Select(slide => slide.Id), "slide", "$.slides", issues);
        ValidateUniqueIds(project.Masters.Select(master => master.Id), "master", "$.masters", issues);
        ValidateUniqueIds(project.Assets.Select(asset => asset.Id), "asset", "$.assets", issues);

        var sectionIds = project.Sections.Select(section => section.Id).ToHashSet();
        var allNodeIds = new HashSet<Guid>();
        for (var slideIndex = 0; slideIndex < project.Slides.Count; slideIndex++)
        {
            var slide = project.Slides[slideIndex];
            var slidePath = $"$.slides[{slideIndex}]";
            Require(slide.Id != Guid.Empty, "slide.id.empty", "Slide ID cannot be empty.", $"{slidePath}.id", issues);
            Require(!string.IsNullOrWhiteSpace(slide.Name), "slide.name.empty", "Slide name cannot be empty.", $"{slidePath}.name", issues);
            Require(slide.SectionId is null || sectionIds.Contains(slide.SectionId.Value), "slide.section.missing", "Slide references a section that does not exist.", $"{slidePath}.sectionId", issues);
            Require(IsFiniteInRange(slide.Background.Opacity, 0, 1), "slide.background.opacity", "Background opacity must be between 0 and 1.", $"{slidePath}.background.opacity", issues);
            Require(IsFinitePositive(slide.SnapSettings.GridSpacing), "slide.snap.grid", "Grid spacing must be finite and positive.", $"{slidePath}.snapSettings.gridSpacing", issues);
            Require(IsFiniteNonNegative(slide.SnapSettings.Threshold), "slide.snap.threshold", "Snap threshold must be finite and non-negative.", $"{slidePath}.snapSettings.threshold", issues);

            ValidateNodes(slide, slidePath, allNodeIds, issues);
        }

        return new DocumentValidationResult(issues);
    }

    private static void ValidateNodes(
        SlideDocument slide,
        string slidePath,
        HashSet<Guid> allNodeIds,
        List<DocumentValidationIssue> issues)
    {
        var localIds = slide.Nodes.Select(node => node.Id).ToHashSet();
        var layerIndexes = new HashSet<int>();

        for (var nodeIndex = 0; nodeIndex < slide.Nodes.Count; nodeIndex++)
        {
            var node = slide.Nodes[nodeIndex];
            var nodePath = $"{slidePath}.nodes[{nodeIndex}]";
            Require(node.Id != Guid.Empty, "node.id.empty", "Scene node ID cannot be empty.", $"{nodePath}.id", issues);
            Require(allNodeIds.Add(node.Id), "node.id.duplicate", "Scene node IDs must be unique throughout a project.", $"{nodePath}.id", issues);
            Require(!string.IsNullOrWhiteSpace(node.Name), "node.name.empty", "Scene node name cannot be empty.", $"{nodePath}.name", issues);
            Require(!string.IsNullOrWhiteSpace(node.Kind), "node.kind.empty", "Scene node kind cannot be empty.", $"{nodePath}.kind", issues);
            Require(node.ParentId is null || node.ParentId != node.Id && localIds.Contains(node.ParentId.Value), "node.parent.invalid", "Node parent must be another node on the same slide.", $"{nodePath}.parentId", issues);
            Require(node.LayerIndex >= 0 && layerIndexes.Add(node.LayerIndex), "node.layer.invalid", "Layer indexes must be unique and non-negative within a slide.", $"{nodePath}.layerIndex", issues);
            Require(IsFiniteNonNegative(node.Geometry.Width) && IsFiniteNonNegative(node.Geometry.Height) && IsFinite(node.Geometry.X) && IsFinite(node.Geometry.Y), "node.geometry.invalid", "Node geometry must contain finite coordinates and non-negative dimensions.", $"{nodePath}.geometry", issues);
            Require(IsValid(node.ModelTransform), "node.modelTransform.invalid", "Model transform contains an invalid value.", $"{nodePath}.modelTransform", issues);
            Require(IsValid(node.PresentationTransform), "node.presentationTransform.invalid", "Presentation transform contains an invalid value.", $"{nodePath}.presentationTransform", issues);
        }

        foreach (var node in slide.Nodes)
        {
            Require(!HasParentCycle(node, slide.Nodes), "node.parent.cycle", "Node parent relationships cannot form a cycle.", $"{slidePath}.nodes", issues);
        }
    }

    private static bool HasParentCycle(SceneNode start, IReadOnlyList<SceneNode> nodes)
    {
        var byId = nodes.ToDictionary(node => node.Id);
        var visited = new HashSet<Guid>();
        var current = start;
        while (current.ParentId is Guid parentId && byId.TryGetValue(parentId, out current!))
        {
            if (!visited.Add(parentId))
            {
                return true;
            }
        }

        return false;
    }

    private static void ValidateUniqueIds(
        IEnumerable<Guid> ids,
        string kind,
        string path,
        List<DocumentValidationIssue> issues)
    {
        var seen = new HashSet<Guid>();
        foreach (var id in ids)
        {
            Require(id != Guid.Empty, $"{kind}.id.empty", $"{kind} ID cannot be empty.", path, issues);
            Require(seen.Add(id), $"{kind}.id.duplicate", $"{kind} IDs must be unique.", path, issues);
        }
    }

    private static bool IsValid(SpatialTransform2D transform) =>
        IsFinite(transform.X) && IsFinite(transform.Y) && IsFinitePositive(transform.ScaleX) &&
        IsFinitePositive(transform.ScaleY) && IsFinite(transform.RotationDegrees);

    private static bool IsValid(PresentationTransform2D transform) =>
        IsFinite(transform.OffsetX) && IsFinite(transform.OffsetY) && IsFinitePositive(transform.ScaleX) &&
        IsFinitePositive(transform.ScaleY) && IsFinite(transform.RotationDegrees) &&
        IsFiniteInRange(transform.Opacity, 0, 1);

    private static bool IsFinite(double value) => !double.IsNaN(value) && !double.IsInfinity(value);
    private static bool IsFinitePositive(double value) => IsFinite(value) && value > 0;
    private static bool IsFiniteNonNegative(double value) => IsFinite(value) && value >= 0;
    private static bool IsFiniteInRange(double value, double minimum, double maximum) => IsFinite(value) && value >= minimum && value <= maximum;

    private static void Require(
        bool condition,
        string code,
        string message,
        string path,
        List<DocumentValidationIssue> issues)
    {
        if (!condition)
        {
            issues.Add(new DocumentValidationIssue(DocumentIssueSeverity.Error, code, message, path));
        }
    }
}

public static class DocumentNormalizer
{
    public static LessonProject Normalize(LessonProject project)
    {
        var sections = project.Sections
            .Select((section, index) => section with { Name = section.Name.Trim(), Order = index })
            .ToArray();
        var slides = project.Slides
            .Select(slide => slide with
            {
                Name = slide.Name.Trim(),
                Nodes = slide.Nodes
                    .Select((node, index) => node with { Name = node.Name.Trim(), Kind = node.Kind.Trim(), LayerIndex = index })
                    .ToArray(),
            })
            .ToArray();

        return project with
        {
            Title = project.Title.Trim(),
            Sections = sections,
            Slides = slides,
        };
    }
}
