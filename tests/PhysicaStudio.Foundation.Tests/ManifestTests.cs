using System.Text.Json;
using PhysicaStudio.Desktop.Models;
using PhysicaStudio.Desktop.Services;
using PhysicaStudio.Desktop.ViewModels;

namespace PhysicaStudio.Foundation.Tests;

public sealed class ManifestTests
{
    [Fact]
    public void RibbonManifest_CoversApprovedPrimaryAndContextualInventory()
    {
        var root = FindRepositoryRoot();
        var path = Path.Combine(root, "src", "PhysicaStudio.Desktop", "Assets", "ribbon-manifest.json");
        var manifest = JsonSerializer.Deserialize<RibbonManifest>(File.ReadAllText(path), JsonOptions());

        Assert.NotNull(manifest);
        Assert.Equal(13, manifest.Tabs.Count);
        Assert.Contains(manifest.Tabs, tab => tab.Id == "physics");
        Assert.Contains(manifest.Tabs, tab => tab.Id == "graphs");
        Assert.Contains(manifest.Tabs, tab => tab.Id == "present");
        Assert.Equal(15, manifest.ContextualTabs.Count);
        Assert.True(manifest.Tabs.SelectMany(tab => tab.Groups).SelectMany(group => group.Commands).Count() >= 250);
    }

    [Fact]
    public void FeatureManifest_ActivatesOnlyTheImplementedPhase2Foundation()
    {
        var root = FindRepositoryRoot();
        var path = Path.Combine(root, "src", "PhysicaStudio.Desktop", "Assets", "feature-manifest.json");
        var manifest = JsonSerializer.Deserialize<FeatureManifest>(File.ReadAllText(path), JsonOptions());

        Assert.NotNull(manifest);
        Assert.Equal(2, manifest.ActivePhase);
        Assert.DoesNotContain(manifest.Surfaces, feature => feature.Status == "Validated");
        Assert.Contains(manifest.Surfaces, feature => feature.Id == "authoring.project" && feature.Status == "Active");
        Assert.Contains(manifest.Surfaces, feature => feature.Id == "authoring.canvas" && feature.Status == "Preview");
        Assert.Contains(manifest.Surfaces, feature => feature.Id == "authoring.layers" && feature.Status == "Preview");
        Assert.Contains(manifest.Surfaces, feature => feature.Id == "physics.kernel" && feature.Status == "Planned");
        Assert.Contains(manifest.Surfaces, feature => feature.Id == "studio.presenter-preview" && feature.Status == "Shell ready");
    }

    [Fact]
    public void DesktopShell_ExposesCollapsiblePanelsAndQuietHonestReadiness()
    {
        var root = FindRepositoryRoot();
        var xaml = File.ReadAllText(Path.Combine(root, "src", "PhysicaStudio.Desktop", "Views", "MainWindow.axaml"));

        Assert.Contains("x:Name=\"LeftPanel\"", xaml, StringComparison.Ordinal);
        Assert.Contains("x:Name=\"RightPanel\"", xaml, StringComparison.Ordinal);
        Assert.Contains("x:Name=\"BottomPanel\"", xaml, StringComparison.Ordinal);
        Assert.Contains("Text=\"PREVIEW\"", xaml, StringComparison.Ordinal);
        Assert.Contains("Physics runtime: planned", xaml, StringComparison.Ordinal);
        Assert.Contains("Project recovery: active", xaml, StringComparison.Ordinal);
        Assert.Contains("ItemsSource=\"{Binding Slides}\"", xaml, StringComparison.Ordinal);
        Assert.Contains("Click=\"RibbonCommand_Click\"", xaml, StringComparison.Ordinal);
        Assert.DoesNotContain("SHELL PREVIEW", xaml, StringComparison.Ordinal);
    }

    [Fact]
    public void Desktop_UsesCompiledBindingsForQualificationBuild()
    {
        var root = FindRepositoryRoot();
        var project = File.ReadAllText(Path.Combine(root, "src", "PhysicaStudio.Desktop", "PhysicaStudio.Desktop.csproj"));

        Assert.Contains("<AvaloniaUseCompiledBindingsByDefault>true</AvaloniaUseCompiledBindingsByDefault>", project, StringComparison.Ordinal);
    }

    [Fact]
    public void DesktopRibbon_UsesCompactGroupsWithActiveCompleteGalleries()
    {
        var root = FindRepositoryRoot();
        var xaml = File.ReadAllText(Path.Combine(root, "src", "PhysicaStudio.Desktop", "Views", "MainWindow.axaml"));

        Assert.Contains("ItemsSource=\"{Binding FeaturedCommands}\"", xaml, StringComparison.Ordinal);
        Assert.Contains("HorizontalAlignment=\"Left\"", xaml, StringComparison.Ordinal);
        Assert.Contains("<StackPanel Orientation=\"Horizontal\" />", xaml, StringComparison.Ordinal);
        Assert.DoesNotContain("<UniformGrid Rows=\"1\" />", xaml, StringComparison.Ordinal);
        Assert.Contains("Classes=\"ribbon-group-dropdown\"", xaml, StringComparison.Ordinal);
        Assert.Contains("Text=\"More\"", xaml, StringComparison.Ordinal);
        Assert.Contains("<Button.Flyout>", xaml, StringComparison.Ordinal);
        Assert.Contains("ItemsSource=\"{Binding Commands}\"", xaml, StringComparison.Ordinal);
        Assert.DoesNotContain("Classes=\"ribbon-group-dropdown\" IsEnabled=\"False\"", xaml, StringComparison.Ordinal);
    }

    [Fact]
    public void DesktopShell_StartsFullScreenWithExitAndCenteredInspectorHeaders()
    {
        var root = FindRepositoryRoot();
        var xaml = File.ReadAllText(
            Path.Combine(root, "src", "PhysicaStudio.Desktop", "Views", "MainWindow.axaml"));
        var theme = File.ReadAllText(
            Path.Combine(root, "src", "PhysicaStudio.Desktop", "Themes", "PhysicaTheme.axaml"));

        Assert.Contains("WindowState=\"FullScreen\"", xaml, StringComparison.Ordinal);
        Assert.Contains("AutomationProperties.Name=\"Exit Physica Studio\"", xaml, StringComparison.Ordinal);
        Assert.Contains("x:Name=\"InspectorScrollViewer\"", xaml, StringComparison.Ordinal);
        Assert.Matches("InspectorScrollViewer[\\s\\S]*?VerticalScrollBarVisibility=\\\"Hidden\\\"", xaml);
        Assert.Contains("VerticalAlignment=\"Center\" Margin=\"2,1,0,0\"", xaml, StringComparison.Ordinal);
        Assert.True(
            xaml.Split("<Grid ColumnDefinitions=\"Auto,*\" VerticalAlignment=\"Center\">", StringSplitOptions.None).Length - 1 >= 4,
            "Every inspector context must retain the vertically centered section-header structure.");
        Assert.Contains("<Setter Property=\"Margin\" Value=\"8,12,8,4\" />", theme, StringComparison.Ordinal);
        Assert.Contains("<Setter Property=\"CornerRadius\" Value=\"3\" />", theme, StringComparison.Ordinal);
    }

    [Fact]
    public void DesktopRibbon_FeaturesAtMostTwoCommandsWithoutLosingGroupInventory()
    {
        var commands = Enumerable.Range(1, 5)
            .Select(index => RibbonCommandViewModel.Planned($"Command {index}", 3, "gallery"))
            .ToArray();
        var group = new RibbonGroupViewModel("Test group", commands);

        Assert.Equal(2, group.FeaturedCommands.Count);
        Assert.Equal(commands.Take(2), group.FeaturedCommands);
        Assert.Equal(commands, group.Commands);
        Assert.Equal("Show all Test group commands", group.GalleryTooltip);
    }

    [Fact]
    public void ProjectProgressDashboard_CoversEveryPhaseAndCurrentPhase2Gaps()
    {
        var root = FindRepositoryRoot();
        var html = File.ReadAllText(Path.Combine(root, "PROJECT_PROGRESS.html"));
        var css = File.ReadAllText(Path.Combine(root, "project-progress.css"));

        for (var phase = 0; phase <= 20; phase++)
        {
            Assert.Contains($"Phase {phase}", html, StringComparison.Ordinal);
        }

        Assert.Contains("RC 1.0", html, StringComparison.Ordinal);
        Assert.Contains("Document-rendered thumbnails", html, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("Zoom and pan", html, StringComparison.Ordinal);
        Assert.Contains("Guides, grid, and snapping", html, StringComparison.Ordinal);
        Assert.Contains("Phase 2 is not complete", html, StringComparison.Ordinal);
        Assert.DoesNotContain("https://", html, StringComparison.OrdinalIgnoreCase);
        Assert.Contains(".feature-list", css, StringComparison.Ordinal);
    }


    [Fact]
    public void SlideNavigatorExposesDiscoverableSlideAndSectionRenameControls()
    {
        var root = FindRepositoryRoot();
        var xaml = File.ReadAllText(
            Path.Combine(root, "src", "PhysicaStudio.Desktop", "Views", "MainWindow.axaml"));
        var code = File.ReadAllText(
            Path.Combine(root, "src", "PhysicaStudio.Desktop", "Views", "MainWindow.axaml.cs"));

        Assert.Contains("x:Name=\"SlideNameEditor\"", xaml, StringComparison.Ordinal);
        Assert.Contains("x:Name=\"SectionNameEditor\"", xaml, StringComparison.Ordinal);
        Assert.Contains("PointerPressed=\"SlideName_PointerPressed\"", xaml, StringComparison.Ordinal);
        Assert.Contains("PointerPressed=\"SectionName_PointerPressed\"", xaml, StringComparison.Ordinal);
        Assert.Contains("AutomationProperties.Name=\"Rename slide\"", xaml, StringComparison.Ordinal);
        Assert.Contains("AutomationProperties.Name=\"Rename section\"", xaml, StringComparison.Ordinal);
        Assert.Contains("e.Key == Key.F2", code, StringComparison.Ordinal);
        Assert.Contains("_viewModel.RenameSlide", code, StringComparison.Ordinal);
        Assert.Contains("_viewModel.RenameSection", code, StringComparison.Ordinal);
    }

    [Fact]
    public void SlideNavigatorExposesCompleteSectionControlsAndRoutesEveryAction()
    {
        var root = FindRepositoryRoot();
        var xaml = File.ReadAllText(
            Path.Combine(root, "src", "PhysicaStudio.Desktop", "Views", "MainWindow.axaml"));
        var code = File.ReadAllText(
            Path.Combine(root, "src", "PhysicaStudio.Desktop", "Views", "MainWindow.axaml.cs"));

        Assert.Contains("Click=\"ToggleSection_Click\"", xaml, StringComparison.Ordinal);
        Assert.Contains("Click=\"AssignSelectedSlidesToSection_Click\"", xaml, StringComparison.Ordinal);
        Assert.Contains("Click=\"MoveSectionUp_Click\"", xaml, StringComparison.Ordinal);
        Assert.Contains("Click=\"MoveSectionDown_Click\"", xaml, StringComparison.Ordinal);
        Assert.Contains("Click=\"RemoveSection_Click\"", xaml, StringComparison.Ordinal);
        Assert.Contains("IsVisible=\"{Binding ShowSlideCard}\"", xaml, StringComparison.Ordinal);
        Assert.Contains("_viewModel.ToggleSectionCollapsed", code, StringComparison.Ordinal);
        Assert.Contains("_viewModel.AssignSelectedSlidesToSection", code, StringComparison.Ordinal);
        Assert.Contains("_viewModel.MoveSection", code, StringComparison.Ordinal);
        Assert.Contains("_viewModel.RemoveSection", code, StringComparison.Ordinal);
    }

    [Fact]
    public void AuthoringCanvasWiresPointerKeyboardSelectionAndTransformCommit()
    {
        var root = FindRepositoryRoot();
        var xaml = File.ReadAllText(
            Path.Combine(root, "src", "PhysicaStudio.Desktop", "Views", "MainWindow.axaml"));
        var code = File.ReadAllText(
            Path.Combine(root, "src", "PhysicaStudio.Desktop", "Views", "MainWindow.axaml.cs"));

        Assert.Contains("x:Name=\"AuthoringCanvasSurface\"", xaml, StringComparison.Ordinal);
        Assert.Contains("SelectedNodeIds=\"{Binding SelectedNodeIds}\"", xaml, StringComparison.Ordinal);
        Assert.Contains("PointerPressed=\"AuthoringCanvas_PointerPressed\"", xaml, StringComparison.Ordinal);
        Assert.Contains("PointerMoved=\"AuthoringCanvas_PointerMoved\"", xaml, StringComparison.Ordinal);
        Assert.Contains("PointerReleased=\"AuthoringCanvas_PointerReleased\"", xaml, StringComparison.Ordinal);
        Assert.Contains("_viewModel.CommitNodeTransforms", code, StringComparison.Ordinal);
        Assert.Contains("AuthoringCanvasSurface.IsKeyboardFocusWithin", code, StringComparison.Ordinal);
        Assert.Contains("_viewModel.DeleteSelectedNodes", code, StringComparison.Ordinal);
    }

    [Fact]
    public void LayersWorkspaceWiresSelectionVisibilityLockRenameAndDirectReordering()
    {
        var root = FindRepositoryRoot();
        var xaml = File.ReadAllText(
            Path.Combine(root, "src", "PhysicaStudio.Desktop", "Views", "MainWindow.axaml"));
        var code = File.ReadAllText(
            Path.Combine(root, "src", "PhysicaStudio.Desktop", "Views", "MainWindow.Layers.cs"));

        Assert.Contains("x:Name=\"LayerItemsControl\"", xaml, StringComparison.Ordinal);
        Assert.Contains("ItemsSource=\"{Binding Layers}\"", xaml, StringComparison.Ordinal);
        Assert.Contains("PointerPressed=\"LayerItem_PointerPressed\"", xaml, StringComparison.Ordinal);
        Assert.Contains("PointerMoved=\"LayerItem_PointerMoved\"", xaml, StringComparison.Ordinal);
        Assert.Contains("PointerReleased=\"LayerItem_PointerReleased\"", xaml, StringComparison.Ordinal);
        Assert.Contains("Click=\"LayerVisibility_Click\"", xaml, StringComparison.Ordinal);
        Assert.Contains("Click=\"LayerLock_Click\"", xaml, StringComparison.Ordinal);
        Assert.Contains("x:Name=\"LayerNameEditor\"", xaml, StringComparison.Ordinal);
        Assert.Contains("NodeSelectionMode.Range", code, StringComparison.Ordinal);
        Assert.Contains("MoveSelectedNodesRelative", code, StringComparison.Ordinal);
        Assert.Contains("e.ClickCount == 2", code, StringComparison.Ordinal);
        Assert.Contains("var shouldReorder", code, StringComparison.Ordinal);
        Assert.Contains("if (!IsLayerRenameActive(control))", code, StringComparison.Ordinal);
        Assert.Contains("editor.Name == \"LayerNameEditor\" && editor.IsVisible", code, StringComparison.Ordinal);
        Assert.Contains("Click=\"LayerGroupToggle_Click\"", xaml, StringComparison.Ordinal);
        Assert.Contains("Click=\"GroupLayers_Click\"", xaml, StringComparison.Ordinal);
        Assert.Contains("Click=\"UngroupLayers_Click\"", xaml, StringComparison.Ordinal);
        Assert.Contains("IsEnabled=\"{Binding CanGroup}\"", xaml, StringComparison.Ordinal);
        Assert.Contains("_viewModel.GroupSelectedNodes", code, StringComparison.Ordinal);
        Assert.Contains("_viewModel.UngroupSelectedNodes", code, StringComparison.Ordinal);
        Assert.Contains("RenameNode", code, StringComparison.Ordinal);
    }
    private static JsonSerializerOptions JsonOptions() => new(JsonSerializerDefaults.Web)
    {
        PropertyNameCaseInsensitive = true
    };

    private static string FindRepositoryRoot()
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);
        while (directory is not null && !File.Exists(Path.Combine(directory.FullName, "PhysicaStudio.slnx")))
        {
            directory = directory.Parent;
        }

        return directory?.FullName ?? throw new DirectoryNotFoundException("Could not locate PhysicaStudio.slnx.");
    }
}
