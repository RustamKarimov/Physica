using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Runtime.CompilerServices;
using PhysicaStudio.Desktop.Resources;
using PhysicaStudio.Desktop.Services;

namespace PhysicaStudio.Desktop.ViewModels;

public sealed class StudioShellViewModel : INotifyPropertyChanged
{
    private RibbonTabViewModel? _selectedRibbonTab;
    private string _workspaceMode = "2D";
    private StudioWorkspace _studioWorkspace = StudioWorkspace.Authoring;

    public StudioShellViewModel()
    {
        var ribbon = ManifestLoader.LoadRibbon();
        RibbonTabs = new ObservableCollection<RibbonTabViewModel>(
            ribbon.Tabs.Select((tab, index) => new RibbonTabViewModel(
                tab.Id,
                tab.Label,
                tab.Groups.Select(group => new RibbonGroupViewModel(
                    group.Label,
                    group.Commands.Select(command => RibbonCommandViewModel.Planned(command, PhaseFor(tab.Id), IconFor(command))).ToArray())).ToArray(),
                tab.Id == "physics")));

        ContextualTabs = ribbon.ContextualTabs;
        _selectedRibbonTab = RibbonTabs.First(tab => tab.IsSelected);
        Features = ManifestLoader.LoadFeatures().Surfaces;
    }

    public event PropertyChangedEventHandler? PropertyChanged;

    public string ApplicationTitle => AppText.ApplicationTitle;
    public string DocumentTitle => AppText.DocumentTitle;
    public string DevelopmentBuild => AppText.DevelopmentBuild;
    public string FeatureMapLabel => AppText.FeatureMap;
    public string PresentPreviewLabel => AppText.PresentPreview;
    public ObservableCollection<RibbonTabViewModel> RibbonTabs { get; }
    public IReadOnlyList<string> ContextualTabs { get; }
    public IReadOnlyList<FeatureDefinition> Features { get; }

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
            if (ReferenceEquals(_selectedRibbonTab, value))
            {
                return;
            }

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
            if (_workspaceMode == value)
            {
                return;
            }

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
        if (normalized.Contains("open") || normalized.Contains("import")) return "open";
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
        if (normalized.Contains("delete") || normalized.Contains("clear") || normalized.Contains("remove")) return "delete";
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

public sealed record RibbonGroupViewModel(string Label, IReadOnlyList<RibbonCommandViewModel> Commands);

public sealed record RibbonCommandViewModel(
    string Label,
    string Icon,
    int Phase,
    string Status,
    string Tooltip,
    bool IsEnabled)
{
    public static RibbonCommandViewModel Planned(string label, int phase, string icon) =>
        new(label, icon, phase, "PLANNED", AppText.PlannedTooltip(label, phase), false);
}

public sealed record ObjectCardViewModel(string Name, string Category, string PreviewKind, string Status);

public enum StudioWorkspace
{
    Authoring,
    Animation,
    Graphs
}
