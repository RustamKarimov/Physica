using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Runtime.CompilerServices;
using PhysicaStudio.Authoring;
using PhysicaStudio.Desktop.Models;
using PhysicaStudio.Desktop.Resources;
using PhysicaStudio.Desktop.Services;
using PhysicaStudio.Document;
using PhysicaStudio.Rendering2D;

namespace PhysicaStudio.Desktop.ViewModels;

public sealed class StudioShellViewModel : INotifyPropertyChanged
{
    private static readonly HashSet<string> ImplementedPhase2Commands = new(StringComparer.Ordinal)
    {
        "New", "Open", "Recent", "Save", "Save As", "Save Copy", "Recover", "Close",
        "New Slide", "Duplicate Slide", "Delete Slide", "Section", "Undo", "Redo",
    };

    private RibbonTabViewModel? _selectedRibbonTab;
    private string _workspaceMode = "2D";
    private StudioWorkspace _studioWorkspace = StudioWorkspace.Authoring;
    private AuthoringSession _session;
    private string _statusMessage = AppText.ProjectFoundationReady;
    private bool _isProjectOpen = true;
    private readonly ISlideSceneSnapshotBuilder _sceneBuilder = new SlideSceneSnapshotBuilder();
    private readonly HashSet<Guid> _collapsedSectionIds = [];

    public StudioShellViewModel()
        : this(ManifestLoader.LoadRibbon(), ManifestLoader.LoadFeatures())
    {
    }

    public StudioShellViewModel(
        RibbonManifest ribbon,
        FeatureManifest featureManifest,
        AuthoringSession? session = null)
    {
        _session = session ?? CreateReferenceSession();
        _session.StateChanged += Session_StateChanged;

        RibbonTabs = new ObservableCollection<RibbonTabViewModel>(
            ribbon.Tabs.Select(tab => new RibbonTabViewModel(
                tab.Id,
                tab.Label,
                tab.Groups.Select(group => new RibbonGroupViewModel(
                    group.Label,
                    group.Commands.Select(command => RibbonCommandViewModel.Create(
                        $"{tab.Id}.{Slug(group.Label)}.{Slug(command)}",
                        command,
                        PhaseFor(tab.Id),
                        IconFor(command))).ToArray())).ToArray(),
                tab.Id == "physics")));

        ContextualTabs = ribbon.ContextualTabs;
        _selectedRibbonTab = RibbonTabs.FirstOrDefault(tab => tab.IsSelected) ?? RibbonTabs.First();
        _selectedRibbonTab.IsSelected = true;
        Features = featureManifest.Surfaces;
        Slides = new ObservableCollection<SlideItemViewModel>();
        RecentProjects = new ObservableCollection<RecentProjectItemViewModel>();
        RefreshFromSession();
    }

    public event PropertyChangedEventHandler? PropertyChanged;

    public string ApplicationTitle => AppText.ApplicationTitle;
    public string DocumentTitle => IsProjectOpen
        ? $"{_session.CurrentProject.Title}{ProjectFormat.FileExtension}{(HasUnsavedChanges ? "*" : string.Empty)}"
        : ApplicationTitle;
    public string DevelopmentBuild => AppText.DevelopmentBuild;
    public string FeatureMapLabel => AppText.FeatureMap;
    public string PresentPreviewLabel => AppText.PresentPreview;
    public string NoLessonOpenLabel => AppText.NoLessonOpen;
    public string StartCenterDescriptionLabel => AppText.StartCenterDescription;
    public string CreateNewLessonLabel => AppText.CreateNewLesson;
    public string OpenExistingLessonLabel => AppText.OpenExistingLesson;
    public string RecentLessonsLabel => AppText.RecentLessons;
    public string NoRecentLessonsLabel => AppText.NoRecentLessons;
    public ObservableCollection<RibbonTabViewModel> RibbonTabs { get; }
    public IReadOnlyList<string> ContextualTabs { get; }
    public IReadOnlyList<FeatureDefinition> Features { get; }
    public ObservableCollection<SlideItemViewModel> Slides { get; }
    public ObservableCollection<RecentProjectItemViewModel> RecentProjects { get; }
    public AuthoringSession Session => _session;
    public bool CanUndo => _session.CanUndo;
    public bool CanRedo => _session.CanRedo;
    public bool CanSave => _session.HasUnsavedChanges || _session.CurrentPath is null;
    public bool HasUnsavedChanges => _session.HasUnsavedChanges;
    public bool ShowStandingWaveReference => ActiveSlide.Nodes.Any(node => node.Kind == "physics.standing-wave");
    public bool ShowGenericObjectContext => ActiveSlide.Nodes.Count > 0 && !ShowStandingWaveReference;
    public bool ShowEmptySlideContext => ActiveSlide.Nodes.Count == 0;
    public string SlideSurfaceColor => ActiveSlide.Background.Color;
    public string InspectorTitle => ShowStandingWaveReference
        ? "Standing Wave"
        : _session.SelectedNodeIds.Count switch
        {
            1 => ActiveSlide.Nodes.First(node => _session.SelectedNodeIds.Contains(node.Id)).Name,
            > 1 => SelectedObjectSummary,
            _ => "Slide",
        };
    public string CanvasInspectorMessage => _session.SelectedNodeIds.Count == 0
        ? AppText.SelectCanvasObject
        : SelectedObjectSummary;
    public string CanvasSelectionLabel => AppText.CanvasSelection;
    public string CanvasTransformHint => AppText.CanvasTransformHint;
    public string TimelineSummary => ShowStandingWaveReference ? "7 tracks · 23 keyframes" : "0 tracks · 0 keyframes";
    public SceneSnapshot ActiveScene =>
        Slides.FirstOrDefault(slide => slide.Id == _session.ActiveSlideId)?.Scene
        ?? _sceneBuilder.Build(_session.CurrentProject, ActiveSlide, _session.Revision);
    public double SlideLogicalWidth => ActiveScene.LogicalSize.Width;
    public double SlideLogicalHeight => ActiveScene.LogicalSize.Height;
    public double ThumbnailWidth => Math.Min(168, 94.5 * ActiveScene.LogicalSize.Width / ActiveScene.LogicalSize.Height);
    public double ThumbnailHeight => Math.Min(94.5, 168 * ActiveScene.LogicalSize.Height / ActiveScene.LogicalSize.Width);
    public bool IsProjectOpen => _isProjectOpen;
    public bool IsStartCenterVisible => !_isProjectOpen;
    public bool HasRecentProjects => RecentProjects.Count > 0;
    public bool HasNoRecentProjects => !HasRecentProjects;
    public IReadOnlySet<Guid> SelectedSlideIds => _session.SelectedSlideIds;
    public IReadOnlySet<Guid> SelectedNodeIds => _session.SelectedNodeIds;
    public string SelectedObjectSummary => AppText.SelectedObjectCount(_session.SelectedNodeIds.Count);

    public string StatusMessage
    {
        get => _statusMessage;
        private set
        {
            if (_statusMessage == value) return;
            _statusMessage = value;
            OnPropertyChanged();
        }
    }

    public SlideDocument ActiveSlide => _session.CurrentProject.Slides.Single(slide => slide.Id == _session.ActiveSlideId);

    public IReadOnlyList<string> PhysicsTopics { get; } =
    [
        "All physics topics", "Measurement & uncertainty", "Kinematics & dynamics", "Forces & equilibrium",
        "Momentum & collisions", "Energy, work & power", "Gravitation & orbits", "Fluids & pressure",
        "Oscillations & resonance", "Mechanical waves & sound", "Geometrical & wave optics",
        "Thermal physics & gases", "Electrostatics & fields", "Circuits & current electricity", "Capacitance",
        "Magnetism & charged particles", "Induction & alternating current", "Electronics & sensing",
        "Electromagnetic waves", "Atomic structure & spectra", "Quantum phenomena", "Nuclear & particle physics",
        "Medical physics", "Astronomy & cosmology", "Relativity foundations", "Practical physics & data"
    ];

    public IReadOnlyList<ObjectCardViewModel> ObjectCards { get; } =
    [
        new("Mass on spring", "Oscillations", "spring", "Planned · Pack 2"),
        new("Wave generator", "Waves", "wave", "Planned · Pack 2"),
        new("Projectile", "Mechanics", "projectile", "Planned · Pack 1"),
        new("Electric plates", "Fields", "plates", "Planned · Pack 4"),
        new("Circuit source", "Electricity", "circuit", "Planned · Pack 3"),
        new("Convex lens", "Optics", "lens", "Planned · Pack 6")
    ];

    public StudioWorkspace StudioWorkspace
    {
        get => _studioWorkspace;
        private set
        {
            if (_studioWorkspace == value) return;
            _studioWorkspace = value;
            OnPropertyChanged();
            OnPropertyChanged(nameof(IsAuthoringWorkspace));
            OnPropertyChanged(nameof(IsAnimationWorkspace));
            OnPropertyChanged(nameof(IsGraphWorkspace));
        }
    }

    public bool IsAuthoringWorkspace => StudioWorkspace == StudioWorkspace.Authoring;
    public bool IsAnimationWorkspace => StudioWorkspace == StudioWorkspace.Animation;
    public bool IsGraphWorkspace => StudioWorkspace == StudioWorkspace.Graphs;

    public RibbonTabViewModel SelectedRibbonTab
    {
        get => _selectedRibbonTab ?? RibbonTabs[0];
        private set
        {
            if (ReferenceEquals(_selectedRibbonTab, value)) return;
            _selectedRibbonTab = value;
            OnPropertyChanged();
            OnPropertyChanged(nameof(SelectedRibbonGroups));
        }
    }

    public IReadOnlyList<RibbonGroupViewModel> SelectedRibbonGroups => SelectedRibbonTab.Groups;

    public string WorkspaceMode
    {
        get => _workspaceMode;
        set
        {
            if (_workspaceMode == value) return;
            _workspaceMode = value;
            OnPropertyChanged();
            OnPropertyChanged(nameof(WorkspaceModeDescription));
        }
    }

    public string WorkspaceModeDescription => WorkspaceMode == "2D"
        ? "2D vector workspace · retained scene preview"
        : "3D workspace reserved · WebGPU activation planned";

    public void SelectRibbon(RibbonTabViewModel tab)
    {
        foreach (var candidate in RibbonTabs)
        {
            candidate.IsSelected = ReferenceEquals(candidate, tab);
        }

        SelectedRibbonTab = tab;
    }

    public void SelectWorkspace(StudioWorkspace workspace) => StudioWorkspace = workspace;

    public void NewProject(string? title = null) =>
        ReplaceSession(AuthoringSession.CreateNew(title ?? AppText.UntitledLesson), AppText.NewProjectCreated);

    public void LoadProject(LessonProject project, string path) =>
        ReplaceSession(new AuthoringSession(project, path), AppText.ProjectOpened);

    public void LoadRecovery(RecoverySnapshot snapshot) =>
        ReplaceSession(new AuthoringSession(snapshot.Project, snapshot.OriginalPath, isNew: true), AppText.RecoveryOpened);

    public void MarkSaved(string path)
    {
        _session.MarkSaved(path);
        StatusMessage = AppText.ProjectSaved;
    }

    public void SetStatus(string status) => StatusMessage = status;

    public void SelectSlide(Guid slideId, SlideSelectionMode mode = SlideSelectionMode.Replace) =>
        _session.SelectSlide(slideId, mode);

    public void SelectNode(Guid nodeId, NodeSelectionMode mode = NodeSelectionMode.Replace)
    {
        _session.SelectNode(nodeId, mode);
        StatusMessage = AppText.ObjectSelectionChanged;
    }

    public void ClearNodeSelection() => _session.ClearNodeSelection();

    public void SelectNodes(IEnumerable<Guid> nodeIds, NodeSelectionMode mode = NodeSelectionMode.Replace)
    {
        var requested = nodeIds.Distinct().ToHashSet();
        var selection = mode switch
        {
            NodeSelectionMode.Replace => requested,
            NodeSelectionMode.Add => _session.SelectedNodeIds.Concat(requested).ToHashSet(),
            NodeSelectionMode.Toggle => _session.SelectedNodeIds
                .Where(id => !requested.Contains(id))
                .Concat(requested.Where(id => !_session.SelectedNodeIds.Contains(id)))
                .ToHashSet(),
            _ => throw new ArgumentOutOfRangeException(nameof(mode)),
        };
        _session.SelectNodes(selection);
        StatusMessage = AppText.ObjectSelectionChanged;
    }

    public void SelectAllVisibleNodes() => SelectNodes(
        ActiveSlide.Nodes.Where(node => node.IsVisible).Select(node => node.Id));

    public void CommitNodeTransforms(IReadOnlyDictionary<Guid, PresentationTransform2D> transforms)
    {
        _session.Execute(ProjectCommands.SetNodesPresentationTransforms(ActiveSlide.Id, transforms));
        StatusMessage = AppText.ObjectsTransformed;
    }

    public void NudgeSelectedNodes(double offsetX, double offsetY)
    {
        if (_session.SelectedNodeIds.Count == 0)
        {
            return;
        }

        var transforms = ActiveSlide.Nodes
            .Where(node => _session.SelectedNodeIds.Contains(node.Id))
            .ToDictionary(
                node => node.Id,
                node => node.PresentationTransform with
                {
                    OffsetX = node.PresentationTransform.OffsetX + offsetX,
                    OffsetY = node.PresentationTransform.OffsetY + offsetY,
                });
        CommitNodeTransforms(transforms);
    }

    public void DeleteSelectedNodes()
    {
        if (_session.SelectedNodeIds.Count == 0)
        {
            return;
        }

        _session.Execute(ProjectCommands.DeleteNodes(ActiveSlide.Id, _session.SelectedNodeIds));
        StatusMessage = AppText.ObjectsDeleted;
    }

    public void CloseProject()
    {
        _isProjectOpen = false;
        StatusMessage = AppText.ProjectClosed;
        RefreshFromSession();
    }

    public void SetRecentProjects(IEnumerable<RecentProjectEntry> entries)
    {
        RecentProjects.Clear();
        foreach (var entry in entries)
        {
            RecentProjects.Add(new RecentProjectItemViewModel(entry.Path, entry.DisplayName, entry.LastOpenedUtc));
        }
        OnPropertyChanged(nameof(HasRecentProjects));
        OnPropertyChanged(nameof(HasNoRecentProjects));
    }

    public void AddSlide()
    {
        _session.Execute(ProjectCommands.AddAutomaticSlide(_session.ActiveSlideId, ActiveSlide.SectionId));
        var index = _session.CurrentProject.Slides.ToList().FindIndex(slide => slide.Id == _session.ActiveSlideId);
        _session.SelectSlide(_session.CurrentProject.Slides[index + 1].Id);
        StatusMessage = AppText.SlideAdded;
    }

    public void DuplicateActiveSlide()
    {
        var sourceIndex = _session.CurrentProject.Slides.ToList().FindIndex(slide => slide.Id == _session.ActiveSlideId);
        _session.Execute(ProjectCommands.DuplicateSlide(_session.ActiveSlideId));
        _session.SelectSlide(_session.CurrentProject.Slides[sourceIndex + 1].Id);
        StatusMessage = AppText.SlideDuplicated;
    }

    public void DeleteActiveSlide() => DeleteSelectedSlides();

    public void DeleteSelectedSlides()
    {
        if (_session.CurrentProject.Slides.Count - _session.SelectedSlideIds.Count < 1)
        {
            StatusMessage = AppText.LastSlideRequired;
            return;
        }

        _session.Execute(ProjectCommands.DeleteSlides(_session.SelectedSlideIds));
        StatusMessage = AppText.SlideDeleted;
    }

    public void MoveActiveSlide(int offset)
    {
        var slides = _session.CurrentProject.Slides;
        var selectedIndexes = slides
            .Select((slide, index) => (slide, index))
            .Where(item => _session.SelectedSlideIds.Contains(item.slide.Id))
            .Select(item => item.index)
            .ToArray();
        var edgeIndex = offset < 0 ? selectedIndexes.Min() : selectedIndexes.Max();
        var targetIndex = edgeIndex + offset;
        if (targetIndex < 0 || targetIndex >= slides.Count)
        {
            StatusMessage = AppText.SlideAlreadyAtEdge;
            return;
        }

        _session.Execute(ProjectCommands.MoveSlides(
            _session.SelectedSlideIds,
            slides[targetIndex].Id,
            placeAfterTarget: offset > 0));
        StatusMessage = AppText.SlideMoved;
    }

    public void MoveSelectedSlides(Guid targetSlideId, bool placeAfterTarget)
    {
        if (_session.SelectedSlideIds.Contains(targetSlideId))
        {
            return;
        }

        _session.Execute(ProjectCommands.MoveSlides(_session.SelectedSlideIds, targetSlideId, placeAfterTarget));
        StatusMessage = AppText.SlideMoved;
    }

    public void AddSectionForActiveSlide()
    {
        _session.Execute(ProjectCommands.AddAutomaticSectionAndAssignSlides(_session.SelectedSlideIds));
        StatusMessage = AppText.SectionAdded;
    }

    public void RenameSlide(Guid slideId, string name)
    {
        _session.Execute(ProjectCommands.RenameSlide(slideId, name));
        StatusMessage = AppText.SlideRenamed;
    }

    public void RenameSection(Guid sectionId, string name)
    {
        _session.Execute(ProjectCommands.RenameSection(sectionId, name));
        StatusMessage = AppText.SectionRenamed;
    }

    public void ToggleSectionCollapsed(Guid sectionId)
    {
        var collapsed = !_collapsedSectionIds.Remove(sectionId);
        if (collapsed)
        {
            _collapsedSectionIds.Add(sectionId);
        }

        foreach (var slide in Slides.Where(slide => slide.SectionId == sectionId))
        {
            slide.SetSectionCollapsed(collapsed);
        }
        StatusMessage = collapsed ? AppText.SectionCollapsed : AppText.SectionExpanded;
    }

    public void AssignSelectedSlidesToSection(Guid sectionId)
    {
        _session.Execute(ProjectCommands.AssignSlidesToSection(_session.SelectedSlideIds, sectionId));
        StatusMessage = AppText.SlidesAssignedToSection;
    }

    public void MoveSection(Guid sectionId, int offset)
    {
        var populatedSectionIds = _session.CurrentProject.Sections
            .Where(section => _session.CurrentProject.Slides.Any(slide => slide.SectionId == section.Id))
            .Select(section => section.Id)
            .ToArray();
        var sourceIndex = Array.IndexOf(populatedSectionIds, sectionId);
        var targetIndex = sourceIndex + offset;
        if (sourceIndex < 0 || targetIndex < 0 || targetIndex >= populatedSectionIds.Length)
        {
            StatusMessage = AppText.SectionAlreadyAtEdge;
            return;
        }

        _session.Execute(ProjectCommands.MoveSection(
            sectionId,
            populatedSectionIds[targetIndex],
            placeAfterTarget: offset > 0));
        StatusMessage = AppText.SectionMoved;
    }

    public void RemoveSection(Guid sectionId)
    {
        _session.Execute(ProjectCommands.RemoveSection(sectionId));
        _collapsedSectionIds.Remove(sectionId);
        StatusMessage = AppText.SectionRemoved;
    }

    public void Undo()
    {
        if (_session.Undo()) StatusMessage = AppText.UndoCompleted;
    }

    public void Redo()
    {
        if (_session.Redo()) StatusMessage = AppText.RedoCompleted;
    }

    private static AuthoringSession CreateReferenceSession()
    {
        var project = ReferenceLessonFactory.Create();
        var session = new AuthoringSession(project, isNew: true);
        session.SelectSlide(project.Slides[2].Id);
        return session;
    }

    private void ReplaceSession(AuthoringSession session, string status)
    {
        _session.StateChanged -= Session_StateChanged;
        _session = session;
        _session.StateChanged += Session_StateChanged;
        _collapsedSectionIds.Clear();
        _isProjectOpen = true;
        StatusMessage = status;
        RefreshFromSession();
    }

    private void Session_StateChanged(object? sender, AuthoringStateChangedEventArgs e)
    {
        if (e.Kind == AuthoringStateChangeKind.Selection)
        {
            RefreshSelectionFromSession();
            return;
        }

        if (e.Kind == AuthoringStateChangeKind.Persistence)
        {
            RefreshPersistenceFromSession();
            return;
        }

        RefreshFromSession();
    }

    private void RefreshSelectionFromSession()
    {
        foreach (var slide in Slides)
        {
            slide.SetSelected(_session.SelectedSlideIds.Contains(slide.Id));
        }

        RefreshCommandAvailability();
        OnPropertyChanged(nameof(SelectedSlideIds));
        OnPropertyChanged(nameof(SelectedNodeIds));
        OnPropertyChanged(nameof(SelectedObjectSummary));
        OnPropertyChanged(nameof(ActiveSlide));
        OnPropertyChanged(nameof(ShowStandingWaveReference));
        OnPropertyChanged(nameof(ShowGenericObjectContext));
        OnPropertyChanged(nameof(ShowEmptySlideContext));
        OnPropertyChanged(nameof(CanvasInspectorMessage));
        OnPropertyChanged(nameof(SlideSurfaceColor));
        OnPropertyChanged(nameof(ActiveScene));
        OnPropertyChanged(nameof(SlideLogicalWidth));
        OnPropertyChanged(nameof(SlideLogicalHeight));
        OnPropertyChanged(nameof(ThumbnailWidth));
        OnPropertyChanged(nameof(ThumbnailHeight));
        OnPropertyChanged(nameof(InspectorTitle));
        OnPropertyChanged(nameof(TimelineSummary));
    }

    private void RefreshPersistenceFromSession()
    {
        RefreshCommandAvailability();
        OnPropertyChanged(nameof(DocumentTitle));
        OnPropertyChanged(nameof(CanUndo));
        OnPropertyChanged(nameof(CanRedo));
        OnPropertyChanged(nameof(CanSave));
        OnPropertyChanged(nameof(HasUnsavedChanges));
    }

    private void RefreshFromSession()
    {
        _collapsedSectionIds.RemoveWhere(sectionId =>
            _session.CurrentProject.Sections.All(section => section.Id != sectionId));
        Slides.Clear();
        Guid? previousSectionId = null;
        for (var index = 0; index < _session.CurrentProject.Slides.Count; index++)
        {
            var slide = _session.CurrentProject.Slides[index];
            var section = slide.SectionId is Guid sectionId
                ? _session.CurrentProject.Sections.FirstOrDefault(candidate => candidate.Id == sectionId)
                : null;
            var scene = _sceneBuilder.Build(_session.CurrentProject, slide, _session.Revision);
            Slides.Add(new SlideItemViewModel(
                slide.Id,
                index + 1,
                slide.Name,
                scene,
                scene.LogicalSize.Width / scene.LogicalSize.Height,
                _session.SelectedSlideIds.Contains(slide.Id),
                slide.IsHidden,
                section?.Id,
                section?.Name,
                section is not null && section.Id != previousSectionId,
                section is not null && _collapsedSectionIds.Contains(section.Id),
                section is null
                    ? 0
                    : _session.CurrentProject.Slides.Count(candidate => candidate.SectionId == section.Id)));
            previousSectionId = slide.SectionId;
        }

        RefreshCommandAvailability();
        OnPropertyChanged(nameof(DocumentTitle));
        OnPropertyChanged(nameof(CanUndo));
        OnPropertyChanged(nameof(CanRedo));
        OnPropertyChanged(nameof(CanSave));
        OnPropertyChanged(nameof(HasUnsavedChanges));
        OnPropertyChanged(nameof(ActiveSlide));
        OnPropertyChanged(nameof(SelectedSlideIds));
        OnPropertyChanged(nameof(SelectedNodeIds));
        OnPropertyChanged(nameof(SelectedObjectSummary));
        OnPropertyChanged(nameof(ShowStandingWaveReference));
        OnPropertyChanged(nameof(ShowGenericObjectContext));
        OnPropertyChanged(nameof(ShowEmptySlideContext));
        OnPropertyChanged(nameof(CanvasInspectorMessage));
        OnPropertyChanged(nameof(SlideSurfaceColor));
        OnPropertyChanged(nameof(ActiveScene));
        OnPropertyChanged(nameof(SlideLogicalWidth));
        OnPropertyChanged(nameof(SlideLogicalHeight));
        OnPropertyChanged(nameof(ThumbnailWidth));
        OnPropertyChanged(nameof(ThumbnailHeight));
        OnPropertyChanged(nameof(InspectorTitle));
        OnPropertyChanged(nameof(TimelineSummary));
        OnPropertyChanged(nameof(IsProjectOpen));
        OnPropertyChanged(nameof(IsStartCenterVisible));
    }

    private void RefreshCommandAvailability()
    {
        foreach (var command in RibbonTabs.SelectMany(tab => tab.Groups).SelectMany(group => group.Commands))
        {
            if (!ImplementedPhase2Commands.Contains(command.Label))
            {
                command.SetPlanned();
                continue;
            }

            var enabled = command.Label switch
            {
                "New" or "Open" or "Recent" or "Recover" => true,
                _ when !IsProjectOpen => false,
                "Undo" => CanUndo,
                "Redo" => CanRedo,
                "Save" => CanSave,
                "Delete Slide" => _session.CurrentProject.Slides.Count > 1,
                _ => true,
            };
            command.SetActive(enabled);
        }
    }

    private static int PhaseFor(string tabId) => tabId switch
    {
        "file" or "home" or "design" or "view" => 2,
        "insert" or "equations" => 3,
        "transitions" or "animate" => 4,
        "present" or "draw" => 5,
        "graphs" => 6,
        "physics" => 7,
        _ => 1
    };

    private static string Slug(string value)
    {
        var slug = new string(value
            .ToLowerInvariant()
            .Select(character => char.IsLetterOrDigit(character) ? character : '-')
            .ToArray());
        while (slug.Contains("--", StringComparison.Ordinal))
        {
            slug = slug.Replace("--", "-", StringComparison.Ordinal);
        }

        return slug.Trim('-');
    }

    private static string IconFor(string command)
    {
        var normalized = command.ToLowerInvariant();
        if (normalized == "mass" || normalized.Contains("point mass")) return "mass";
        if (normalized == "string") return "wave";
        if (normalized == "rod") return "rod";
        if (normalized == "block") return "block";
        if (normalized.Contains("gravity")) return "gravity";
        if (normalized.Contains("air resistance") || normalized.Contains("air drag")) return "air";
        if (normalized == "medium") return "medium";
        if (normalized.Contains("wall")) return "wall";
        if (normalized.Contains("ruler")) return "ruler";
        if (normalized.Contains("protractor")) return "protractor";
        if (normalized.Contains("sensor")) return "sensor";
        if (normalized == "trace") return "trace";
        if (normalized == "path") return "path";
        if (normalized == "field") return "field";
        if (normalized.Contains("fixed point")) return "pin";
        if (normalized == "guide") return "guide";
        if (normalized == "limit") return "limit";
        if (normalized == "joint") return "joint";
        if (normalized.Contains("check model") || normalized.Contains("validate")) return "check";
        if (normalized.Contains("diagnostic")) return "diagnostics";
        if (normalized.Contains("paste")) return "paste";
        if (normalized.Contains("cut")) return "cut";
        if (normalized.Contains("copy")) return "copy";
        if (normalized.Contains("duplicate")) return "duplicate";
        if (normalized.Contains("format painter") || normalized.Contains("clear formatting")) return "format";
        if (normalized.Contains("bold")) return "bold";
        if (normalized.Contains("italic")) return "italic";
        if (normalized.Contains("underline")) return "underline";
        if (normalized.Contains("bullet") || normalized.Contains("numbering") || normalized.Contains("section")) return "list";
        if (normalized.Contains("save")) return "save";
        if (normalized.Contains("open") || normalized.Contains("import") || normalized.Contains("recover")) return "open";
        if (normalized.Contains("play") || normalized.Contains("preview") || normalized.Contains("present")) return "play";
        if (normalized.Contains("pause")) return "pause";
        if (normalized.Contains("graph") || normalized.Contains("plot") || normalized.Contains("curve")) return "graph";
        if (normalized.Contains("equation") || normalized.Contains("symbol")) return "equation";
        if (normalized.Contains("physics") || normalized.Contains("observable")) return "physics";
        if (normalized.Contains("camera")) return "camera";
        if (normalized.Contains("3d")) return "cube";
        if (normalized.Contains("text") || normalized.Contains("font") || normalized.Contains("title")) return "text";
        if (normalized.Contains("image") || normalized.Contains("svg") || normalized.Contains("icon")) return "image";
        if (normalized.Contains("arrow") || normalized.Contains("vector") || normalized.Contains("path")) return "arrow";
        if (normalized.Contains("align") || normalized.Contains("layout") || normalized.Contains("arrange")) return "align";
        if (normalized.Contains("slide") || normalized.Contains("master")) return "slide";
        if (normalized.Contains("undo")) return "undo";
        if (normalized.Contains("redo")) return "redo";
        if (normalized.Contains("delete") || normalized.Contains("clear") || normalized.Contains("remove") || normalized == "close") return "delete";
        if (normalized.Contains("add") || normalized.Contains("new")) return "add";
        if (normalized.Contains("search") || normalized.Contains("find")) return "search";
        if (normalized.Contains("lock")) return "lock";
        if (normalized.Contains("color") || normalized.Contains("fill") || normalized.Contains("theme")) return "palette";
        if (normalized.Contains("time") || normalized.Contains("duration") || normalized.Contains("delay")) return "clock";
        if (normalized.Contains("control") || normalized.Contains("slider") || normalized.Contains("dial")) return "control";
        return (normalized.GetHashCode(StringComparison.Ordinal) % 3) switch
        {
            0 => "control",
            1 => "align",
            _ => "command"
        };
    }

    private void OnPropertyChanged([CallerMemberName] string? name = null) =>
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(name));
}

public sealed class RibbonTabViewModel : INotifyPropertyChanged
{
    private bool _isSelected;

    public RibbonTabViewModel(string id, string label, IReadOnlyList<RibbonGroupViewModel> groups, bool isSelected)
    {
        Id = id;
        Label = label;
        Groups = groups;
        _isSelected = isSelected;
    }

    public event PropertyChangedEventHandler? PropertyChanged;
    public string Id { get; }
    public string Label { get; }
    public IReadOnlyList<RibbonGroupViewModel> Groups { get; }
    public string Background => IsSelected ? "#1D3243" : "Transparent";
    public string Foreground => IsSelected ? "#FFFFFF" : "#A8B9C9";

    public bool IsSelected
    {
        get => _isSelected;
        set
        {
            if (_isSelected == value) return;
            _isSelected = value;
            PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(nameof(IsSelected)));
            PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(nameof(Background)));
            PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(nameof(Foreground)));
        }
    }
}

public sealed class RibbonGroupViewModel : INotifyPropertyChanged
{
    public RibbonGroupViewModel(string label, IReadOnlyList<RibbonCommandViewModel> commands)
    {
        Label = label;
        Commands = commands;
        FeaturedCommands = commands.Take(2).ToArray();
        foreach (var command in commands)
        {
            command.PropertyChanged += (_, _) =>
            {
                PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(nameof(GalleryStatus)));
                PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(nameof(GallerySummary)));
            };
        }
    }

    public event PropertyChangedEventHandler? PropertyChanged;
    public string Label { get; }
    public IReadOnlyList<RibbonCommandViewModel> Commands { get; }
    public IReadOnlyList<RibbonCommandViewModel> FeaturedCommands { get; }
    public string GalleryTooltip => $"Show all {Label} commands";
    public string GalleryStatus => Commands.Any(command => command.IsImplemented) ? "MIXED" : "PLANNED";
    public string GallerySummary => $"{Commands.Count} commands · {Commands.Count(command => command.IsEnabled)} available";
}

public sealed class RibbonCommandViewModel : INotifyPropertyChanged
{
    private string _status;
    private string _tooltip;
    private bool _isEnabled;
    private bool _isImplemented;

    private RibbonCommandViewModel(string id, string label, string icon, int phase)
    {
        Id = id;
        Label = label;
        Icon = icon;
        Phase = phase;
        _status = "PLANNED";
        _tooltip = AppText.PlannedTooltip(label, phase);
    }

    public event PropertyChangedEventHandler? PropertyChanged;
    public string Id { get; }
    public string Label { get; }
    public string Icon { get; }
    public int Phase { get; }
    public string Status => _status;
    public string Tooltip => _tooltip;
    public bool IsEnabled => _isEnabled;
    public bool IsImplemented => _isImplemented;

    public static RibbonCommandViewModel Create(string id, string label, int phase, string icon) => new(id, label, icon, phase);

    public static RibbonCommandViewModel Planned(string label, int phase, string icon) =>
        new($"planned.{SlugForTest(label)}", label, icon, phase);

    public void SetActive(bool enabled)
    {
        SetState(true, enabled, "ACTIVE", enabled ? AppText.ActiveTooltip(Label) : AppText.ActiveUnavailableTooltip(Label));
    }

    public void SetPlanned() => SetState(false, false, "PLANNED", AppText.PlannedTooltip(Label, Phase));

    private void SetState(bool implemented, bool enabled, string status, string tooltip)
    {
        if (_isImplemented == implemented && _isEnabled == enabled && _status == status && _tooltip == tooltip) return;
        _isImplemented = implemented;
        _isEnabled = enabled;
        _status = status;
        _tooltip = tooltip;
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(nameof(IsImplemented)));
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(nameof(IsEnabled)));
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(nameof(Status)));
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(nameof(Tooltip)));
    }

    private static string SlugForTest(string value) => value.ToLowerInvariant().Replace(' ', '-');
}

public sealed class SlideItemViewModel : INotifyPropertyChanged
{
    private bool _isSelected;
    private bool _isSectionCollapsed;

    public SlideItemViewModel(
        Guid id,
        int number,
        string name,
        SceneSnapshot scene,
        double previewAspectRatio,
        bool isSelected,
        bool isHidden,
        Guid? sectionId = null,
        string? sectionName = null,
        bool showSectionHeader = false,
        bool isSectionCollapsed = false,
        int sectionSlideCount = 0)
    {
        Id = id;
        Number = number;
        Name = name;
        Scene = scene;
        PreviewAspectRatio = previewAspectRatio;
        _isSelected = isSelected;
        IsHidden = isHidden;
        SectionName = sectionName;
        SectionId = sectionId;
        ShowSectionHeader = showSectionHeader;
        _isSectionCollapsed = isSectionCollapsed;
        SectionSlideCount = sectionSlideCount;
    }

    public event PropertyChangedEventHandler? PropertyChanged;

    public Guid Id { get; }
    public int Number { get; }
    public string Name { get; }
    public SceneSnapshot Scene { get; }
    public double PreviewAspectRatio { get; }
    public bool IsSelected => _isSelected;
    public bool IsHidden { get; }
    public string? SectionName { get; }
    public bool ShowSectionHeader { get; }
    public Guid? SectionId { get; }
    public bool IsSectionCollapsed => _isSectionCollapsed;
    public bool ShowSlideCard => SectionId is null || !_isSectionCollapsed;
    public double SectionChevronAngle => _isSectionCollapsed ? 0 : 90;
    public int SectionSlideCount { get; }
    public string SectionSummary => AppText.SectionSlideCount(SectionSlideCount);
    public string Background => IsSelected ? "#132433" : "#101D27";
    public string BorderBrush => IsSelected ? "#168CFF" : "Transparent";
    public string NumberForeground => IsSelected ? "#168CFF" : "#8EA0AC";
    public string TextForeground => IsSelected ? "#EDF3F7" : "#C8D2D9";
    public double Opacity => IsHidden ? 0.55 : 1;

    public void SetSelected(bool isSelected)
    {
        if (_isSelected == isSelected)
        {
            return;
        }

        _isSelected = isSelected;
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(nameof(IsSelected)));
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(nameof(Background)));
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(nameof(BorderBrush)));
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(nameof(NumberForeground)));
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(nameof(TextForeground)));
    }

    public void SetSectionCollapsed(bool isCollapsed)
    {
        if (_isSectionCollapsed == isCollapsed)
        {
            return;
        }

        _isSectionCollapsed = isCollapsed;
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(nameof(IsSectionCollapsed)));
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(nameof(ShowSlideCard)));
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(nameof(SectionChevronAngle)));
    }
}

public sealed record ObjectCardViewModel(string Name, string Category, string PreviewKind, string Status);

public sealed record RecentProjectItemViewModel(string Path, string DisplayName, DateTimeOffset LastOpenedUtc)
{
    public string Location => System.IO.Path.GetDirectoryName(Path) ?? Path;
}

public enum StudioWorkspace
{
    Authoring,
    Animation,
    Graphs
}
