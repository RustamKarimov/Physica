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
                index == 1)));

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
        new("Mass on spring", "Oscillations", "◉╱╲", "Planned · Pack 2"),
        new("Wave generator", "Waves", "≈", "Planned · Pack 2"),
        new("Projectile", "Mechanics", "●↗", "Planned · Pack 1"),
        new("Electric plates", "Fields", "▥ → ▥", "Planned · Pack 4"),
        new("Circuit source", "Electricity", "─| |─", "Planned · Pack 3"),
        new("Convex lens", "Optics", ")(", "Planned · Pack 6")
    ];

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
        if (normalized.Contains("save")) return "▣";
        if (normalized.Contains("open") || normalized.Contains("import")) return "↗";
        if (normalized.Contains("play") || normalized.Contains("preview") || normalized.Contains("present")) return "▶";
        if (normalized.Contains("pause")) return "Ⅱ";
        if (normalized.Contains("graph") || normalized.Contains("plot") || normalized.Contains("curve")) return "⌁";
        if (normalized.Contains("equation") || normalized.Contains("symbol")) return "∑";
        if (normalized.Contains("physics") || normalized.Contains("observable")) return "φ";
        if (normalized.Contains("camera")) return "◉";
        if (normalized.Contains("3d")) return "◇";
        if (normalized.Contains("text") || normalized.Contains("font") || normalized.Contains("title")) return "T";
        if (normalized.Contains("image") || normalized.Contains("svg") || normalized.Contains("icon")) return "▧";
        if (normalized.Contains("arrow") || normalized.Contains("vector") || normalized.Contains("path")) return "➜";
        if (normalized.Contains("align") || normalized.Contains("layout") || normalized.Contains("arrange")) return "▤";
        if (normalized.Contains("slide") || normalized.Contains("master")) return "▱";
        if (normalized.Contains("undo")) return "↶";
        if (normalized.Contains("redo")) return "↷";
        if (normalized.Contains("delete") || normalized.Contains("clear") || normalized.Contains("remove")) return "×";
        if (normalized.Contains("add") || normalized.Contains("new")) return "+";
        if (normalized.Contains("search") || normalized.Contains("find")) return "⌕";
        if (normalized.Contains("lock")) return "□";
        if (normalized.Contains("color") || normalized.Contains("fill") || normalized.Contains("theme")) return "●";
        if (normalized.Contains("time") || normalized.Contains("duration") || normalized.Contains("delay")) return "◷";
        if (normalized.Contains("control") || normalized.Contains("slider") || normalized.Contains("dial")) return "⌘";
        return "◆";
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

    public bool IsSelected
    {
        get => _isSelected;
        set
        {
            if (_isSelected == value) return;
            _isSelected = value;
            PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(nameof(IsSelected)));
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

public sealed record ObjectCardViewModel(string Name, string Category, string Glyph, string Status);

