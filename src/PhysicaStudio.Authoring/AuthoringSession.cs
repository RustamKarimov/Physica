using PhysicaStudio.Document;

namespace PhysicaStudio.Authoring;

public interface IProjectCommand
{
    Guid Id { get; }
    string Description { get; }
    LessonProject Apply(LessonProject project);
}

public sealed class AuthoringCommandException : Exception
{
    public AuthoringCommandException(string message) : base(message)
    {
    }
}

public sealed record AuthoringStateChangedEventArgs(
    LessonProject Project,
    long Revision,
    bool CanUndo,
    bool CanRedo,
    bool HasUnsavedChanges,
    string Description);

public enum SlideSelectionMode
{
    Replace,
    Toggle,
    Range,
}

public sealed class AuthoringSession
{
    private readonly Func<DateTimeOffset> _clock;
    private readonly int _historyLimit;
    private readonly List<HistoryEntry> _undo = [];
    private readonly List<HistoryEntry> _redo = [];
    private Guid _currentStateId = Guid.NewGuid();
    private Guid _savedStateId;

    public AuthoringSession(
        LessonProject project,
        string? currentPath = null,
        Func<DateTimeOffset>? clock = null,
        int historyLimit = 250,
        bool isNew = false)
    {
        if (historyLimit <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(historyLimit));
        }

        _clock = clock ?? (() => DateTimeOffset.UtcNow);
        _historyLimit = historyLimit;
        CurrentProject = ValidateAndNormalize(project);
        CurrentPath = currentPath;
        ActiveSlideId = CurrentProject.Slides[0].Id;
        SelectedSlideIds = new HashSet<Guid> { ActiveSlideId };
        SelectionAnchorSlideId = ActiveSlideId;
        _savedStateId = isNew ? Guid.Empty : _currentStateId;
    }

    public event EventHandler<AuthoringStateChangedEventArgs>? StateChanged;

    public LessonProject CurrentProject { get; private set; }
    public string? CurrentPath { get; private set; }
    public Guid ActiveSlideId { get; private set; }
    public IReadOnlySet<Guid> SelectedSlideIds { get; private set; }
    public Guid SelectionAnchorSlideId { get; private set; }
    public IReadOnlySet<Guid> SelectedNodeIds { get; private set; } = new HashSet<Guid>();
    public long Revision { get; private set; }
    public bool CanUndo => _undo.Count > 0;
    public bool CanRedo => _redo.Count > 0;
    public bool HasUnsavedChanges => _currentStateId != _savedStateId;
    public string? UndoDescription => CanUndo ? _undo[^1].Description : null;
    public string? RedoDescription => CanRedo ? _redo[^1].Description : null;

    public static AuthoringSession CreateNew(string title, Func<DateTimeOffset>? clock = null) =>
        new(LessonProject.Create(title, clock?.Invoke()), clock: clock, isNew: true);

    public void Execute(IProjectCommand command)
    {
        ArgumentNullException.ThrowIfNull(command);
        var before = CurrentProject;
        var beforeStateId = _currentStateId;
        var updated = command.Apply(before) ?? throw new AuthoringCommandException("The command returned no project state.");
        updated = updated with { ModifiedUtc = _clock() };
        updated = ValidateAndNormalize(updated);

        var afterStateId = Guid.NewGuid();
        _undo.Add(new HistoryEntry(before, updated, beforeStateId, afterStateId, command.Description));
        if (_undo.Count > _historyLimit)
        {
            _undo.RemoveAt(0);
        }

        _redo.Clear();
        CurrentProject = updated;
        _currentStateId = afterStateId;
        Revision++;
        ReconcileSessionState();
        RaiseStateChanged(command.Description);
    }

    public bool Undo()
    {
        if (!CanUndo)
        {
            return false;
        }

        var entry = _undo[^1];
        _undo.RemoveAt(_undo.Count - 1);
        _redo.Add(entry);
        CurrentProject = entry.Before;
        _currentStateId = entry.BeforeStateId;
        Revision++;
        ReconcileSessionState();
        RaiseStateChanged($"Undo {entry.Description}");
        return true;
    }

    public bool Redo()
    {
        if (!CanRedo)
        {
            return false;
        }

        var entry = _redo[^1];
        _redo.RemoveAt(_redo.Count - 1);
        _undo.Add(entry);
        CurrentProject = entry.After;
        _currentStateId = entry.AfterStateId;
        Revision++;
        ReconcileSessionState();
        RaiseStateChanged($"Redo {entry.Description}");
        return true;
    }

    public void MarkSaved(string path)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(path);
        CurrentPath = Path.GetFullPath(path);
        _savedStateId = _currentStateId;
        RaiseStateChanged("Project saved");
    }

    public void SelectSlide(Guid slideId, SlideSelectionMode mode = SlideSelectionMode.Replace)
    {
        var targetIndex = CurrentProject.Slides.ToList().FindIndex(slide => slide.Id == slideId);
        if (targetIndex < 0)
        {
            throw new AuthoringCommandException("The selected slide does not exist.");
        }

        var selected = SelectedSlideIds.ToHashSet();
        switch (mode)
        {
            case SlideSelectionMode.Replace:
                selected = [slideId];
                SelectionAnchorSlideId = slideId;
                break;
            case SlideSelectionMode.Toggle:
                if (!selected.Remove(slideId))
                {
                    selected.Add(slideId);
                }
                if (selected.Count == 0)
                {
                    selected.Add(slideId);
                }
                SelectionAnchorSlideId = slideId;
                break;
            case SlideSelectionMode.Range:
                var anchorIndex = CurrentProject.Slides.ToList().FindIndex(slide => slide.Id == SelectionAnchorSlideId);
                if (anchorIndex < 0)
                {
                    anchorIndex = targetIndex;
                    SelectionAnchorSlideId = slideId;
                }
                selected = CurrentProject.Slides
                    .Skip(Math.Min(anchorIndex, targetIndex))
                    .Take(Math.Abs(targetIndex - anchorIndex) + 1)
                    .Select(slide => slide.Id)
                    .ToHashSet();
                break;
            default:
                throw new ArgumentOutOfRangeException(nameof(mode));
        }

        SelectedSlideIds = selected;
        ActiveSlideId = selected.Contains(slideId)
            ? slideId
            : CurrentProject.Slides.Last(slide => selected.Contains(slide.Id)).Id;
        SelectedNodeIds = new HashSet<Guid>();
        RaiseStateChanged("Slide selected");
    }

    public void SelectNodes(IEnumerable<Guid> nodeIds)
    {
        var validIds = CurrentProject.Slides
            .Single(slide => slide.Id == ActiveSlideId)
            .Nodes
            .Select(node => node.Id)
            .ToHashSet();
        var selection = nodeIds.Distinct().ToHashSet();
        if (!selection.IsSubsetOf(validIds))
        {
            throw new AuthoringCommandException("The selection contains a node that is not on the active slide.");
        }

        SelectedNodeIds = selection;
        RaiseStateChanged("Selection changed");
    }

    private static LessonProject ValidateAndNormalize(LessonProject project)
    {
        var normalized = DocumentNormalizer.Normalize(project);
        var validation = DocumentValidator.Validate(normalized);
        if (!validation.IsValid)
        {
            throw new AuthoringCommandException(string.Join(Environment.NewLine, validation.Issues.Select(issue => $"{issue.Path}: {issue.Message}")));
        }

        return normalized;
    }

    private void ReconcileSessionState()
    {
        if (CurrentProject.Slides.All(slide => slide.Id != ActiveSlideId))
        {
            ActiveSlideId = CurrentProject.Slides[0].Id;
        }

        var validSlideIds = CurrentProject.Slides.Select(slide => slide.Id).ToHashSet();
        SelectedSlideIds = SelectedSlideIds.Where(validSlideIds.Contains).ToHashSet();
        if (SelectedSlideIds.Count == 0)
        {
            SelectedSlideIds = new HashSet<Guid> { ActiveSlideId };
        }
        if (!validSlideIds.Contains(SelectionAnchorSlideId))
        {
            SelectionAnchorSlideId = ActiveSlideId;
        }

        var activeNodeIds = CurrentProject.Slides
            .Single(slide => slide.Id == ActiveSlideId)
            .Nodes
            .Select(node => node.Id)
            .ToHashSet();
        SelectedNodeIds = SelectedNodeIds.Where(activeNodeIds.Contains).ToHashSet();
    }

    private void RaiseStateChanged(string description) =>
        StateChanged?.Invoke(this, new AuthoringStateChangedEventArgs(
            CurrentProject,
            Revision,
            CanUndo,
            CanRedo,
            HasUnsavedChanges,
            description));

    private sealed record HistoryEntry(
        LessonProject Before,
        LessonProject After,
        Guid BeforeStateId,
        Guid AfterStateId,
        string Description);
}
