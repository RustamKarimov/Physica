using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Runtime.CompilerServices;
using PhysicaStudio.Authoring;
using PhysicaStudio.Desktop.Controls;
using PhysicaStudio.Desktop.Models;
using PhysicaStudio.Desktop.Resources;
using PhysicaStudio.Desktop.Services;
using PhysicaStudio.Document;

namespace PhysicaStudio.Desktop.ViewModels;

public sealed class StudioShellViewModel : INotifyPropertyChanged
{
    private static readonly HashSet<string> ImplementedPhase2Commands = new(StringComparer.Ordinal)
    {
        "New", "Open", "Save", "Save As", "Save Copy", "Recover", "Close",
        "New Slide", "Duplicate Slide", "Delete Slide", "Section", "Undo", "Redo",
    };

    private RibbonTabViewModel? _selectedRibbonTab;
    private string _workspaceMode = "2D";
    private StudioWorkspace _studioWorkspace = StudioWorkspace.Authoring;
    private AuthoringSession _session;
    private string _statusMessage = AppText.ProjectFoundationReady;

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
        _selectedRibbonTab = RibbonTabs.First(tab => tab.IsSelected);
        Features = featureManifest.Surfaces;
        Slides = new ObservableCollection<SlideItemViewModel>();
        RefreshFromSession();
    }

    public event PropertyChangedEventHandler? PropertyChanged;

    public string ApplicationTitle => AppText.ApplicationTitle;
    public string DocumentTitle => $"{_session.CurrentProject.Title}{ProjectFormat.FileExtension}{(HasUnsavedChanges ? "*" : string.Empty)}";
    public string DevelopmentBuild => AppText.DevelopmentBuild;
    public string FeatureMapLabel => AppText.FeatureMap;
    public string PresentPreviewLabel => AppText.PresentPreview;
    public ObservableCollection<RibbonTabViewModel> RibbonTabs { get; }
    public IReadOnlyList<string> ContextualTabs { get; }
    public IReadOnlyList<FeatureDefinition> Features { get; }
    public ObservableCollection<SlideItemViewModel> Slides { get; }
    public AuthoringSession Session => _session;
    public bool CanUndo => _session.CanUndo;
    public bool CanRedo => _session.CanRedo;
    public bool CanSave => _session.HasUnsavedChanges || _session.CurrentPath is null;
    public bool HasUnsavedChanges => _session.HasUnsavedChanges;
    public bool ShowStandingWaveReference => ActiveSlide.Name.Contains("Standing", StringComparison.OrdinalIgnoreCase);
    public string SlideSurfaceColor => ActiveSlide.Background.Color;

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
        RefreshFromSession();
    }

    public void SetStatus(string status) => StatusMessage = status;

    public void SelectSlide(Guid slideId)
    {
        _session.SelectSlide(slideId);
        RefreshFromSession();
    }

    public void AddSlide()
    {
        var number = _session.CurrentProject.Slides.Count + 1;
        _session.Execute(ProjectCommands.AddSlide($"Slide {number}", _session.ActiveSlideId, ActiveSlide.SectionId));
        var index = _session.CurrentProject.Slides.ToList().FindIndex(slide => slide.Id == _session.ActiveSlideId);
        _session.SelectSlide(_session.CurrentProject.Slides[index + 1].Id);
        StatusMessage = AppText.SlideAdded;
        RefreshFromSession();
    }

    public void DuplicateActiveSlide()
    {
        var sourceIndex = _session.CurrentProject.Slides.ToList().FindIndex(slide => slide.Id == _session.ActiveSlideId);
        _session.Execute(ProjectCommands.DuplicateSlide(_session.ActiveSlideId));
        _session.SelectSlide(_session.CurrentProject.Slides[sourceIndex + 1].Id);
        StatusMessage = AppText.SlideDuplicated;
        RefreshFromSession();
    }

    public void DeleteActiveSlide()
    {
        if (_session.CurrentProject.Slides.Count == 1)
        {
            StatusMessage = AppText.LastSlideRequired;
            return;
        }

        _session.Execute(ProjectCommands.DeleteSlide(_session.ActiveSlideId));
        StatusMessage = AppText.SlideDeleted;
        RefreshFromSession();
    }

    public void MoveActiveSlide(int offset)
    {
        var currentIndex = _session.CurrentProject.Slides.ToList().FindIndex(slide => slide.Id == _session.ActiveSlideId);
        var destination = currentIndex + offset;
        if (destination < 0 || destination >= _session.CurrentProject.Slides.Count)
        {
            StatusMessage = AppText.SlideAlreadyAtEdge;
            return;
        }

        _session.Execute(ProjectCommands.MoveSlide(_session.ActiveSlideId, destination));
        StatusMessage = AppText.SlideMoved;
        RefreshFromSession();
    }

    public void AddSectionForActiveSlide()
    {
        var name = AppText.SectionName(_session.CurrentProject.Sections.Count + 1);
        _session.Execute(ProjectCommands.AddSectionAndAssignSlide(name, _session.ActiveSlideId));
        StatusMessage = AppText.SectionAdded;
        RefreshFromSession();
    }

    public void Undo()
    {
        if (_session.Undo()) StatusMessage = AppText.UndoCompleted;
        RefreshFromSession();
    }

    public void Redo()
    {
        if (_session.Redo()) StatusMessage = AppText.RedoCompleted;
        RefreshFromSession();
    }

    private static AuthoringSession CreateReferenceSession()
    {
        var names = new[] { "Introduction", "Harmonics", "Standing Waves", "Energy in a standing wave", "Applications" };
        var project = LessonProject.Create("Standing Waves Lesson") with
        {
            Slides = names.Select(SlideDocument.Create).ToArray(),
        };
        var session = new AuthoringSession(project, isNew: true);
        session.SelectSlide(project.Slides[2].Id);
        return session;
    }

    private void ReplaceSession(AuthoringSession session, string status)
    {
        _session.StateChanged -= Session_StateChanged;
        _session = session;
        _session.StateChanged += Session_StateChanged;
        StatusMessage = status;
        RefreshFromSession();
    }

    private void Session_StateChanged(object? sender, AuthoringStateChangedEventArgs e) => RefreshFromSession();

    private void RefreshFromSession()
    {
        Slides.Clear();
        for (var index = 0; index < _session.CurrentProject.Slides.Count; index++)
        {
            var slide = _session.CurrentProject.Slides[index];
            Slides.Add(new SlideItemViewModel(
                slide.Id,
                index + 1,
                slide.Name,
                VariantFor(slide.Name, index),
                slide.Id == _session.ActiveSlideId,
                slide.IsHidden));
        }

        RefreshCommandAvailability();
        OnPropertyChanged(nameof(DocumentTitle));
        OnPropertyChanged(nameof(CanUndo));
        OnPropertyChanged(nameof(CanRedo));
        OnPropertyChanged(nameof(CanSave));
        OnPropertyChanged(nameof(HasUnsavedChanges));
        OnPropertyChanged(nameof(ActiveSlide));
        OnPropertyChanged(nameof(ShowStandingWaveReference));
        OnPropertyChanged(nameof(SlideSurfaceColor));
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
                "Undo" => CanUndo,
                "Redo" => CanRedo,
                "Save" => CanSave,
                "Delete Slide" => _session.CurrentProject.Slides.Count > 1,
                _ => true,
            };
            command.SetActive(enabled);
        }
    }

    private static SlideThumbnailVariant VariantFor(string name, int index)
    {
        if (name.Contains("Harmonic", StringComparison.OrdinalIgnoreCase)) return SlideThumbnailVariant.Harmonics;
        if (name.Contains("Standing", StringComparison.OrdinalIgnoreCase)) return SlideThumbnailVariant.StandingWave;
        if (name.Contains("Energy", StringComparison.OrdinalIgnoreCase)) return SlideThumbnailVariant.Energy;
        if (name.Contains("Application", StringComparison.OrdinalIgnoreCase)) return SlideThumbnailVariant.Applications;
        return index == 0 ? SlideThumbnailVariant.Introduction : SlideThumbnailVariant.Introduction;
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

public sealed record SlideItemViewModel(
    Guid Id,
    int Number,
    string Name,
    SlideThumbnailVariant Variant,
    bool IsSelected,
    bool IsHidden)
{
    public string Background => IsSelected ? "#132433" : "#101D27";
    public string BorderBrush => IsSelected ? "#168CFF" : "Transparent";
    public string NumberForeground => IsSelected ? "#168CFF" : "#8EA0AC";
    public string TextForeground => IsSelected ? "#EDF3F7" : "#C8D2D9";
    public double Opacity => IsHidden ? 0.55 : 1;
}

public sealed record ObjectCardViewModel(string Name, string Category, string PreviewKind, string Status);

public enum StudioWorkspace
{
    Authoring,
    Animation,
    Graphs
}
