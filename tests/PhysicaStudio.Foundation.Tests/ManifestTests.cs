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
    public void FeatureManifest_ClaimsNoActiveOrValidatedProductCapability()
    {
        var root = FindRepositoryRoot();
        var path = Path.Combine(root, "src", "PhysicaStudio.Desktop", "Assets", "feature-manifest.json");
        var manifest = JsonSerializer.Deserialize<FeatureManifest>(File.ReadAllText(path), JsonOptions());

        Assert.NotNull(manifest);
        Assert.Equal(1, manifest.ActivePhase);
        Assert.DoesNotContain(manifest.Surfaces, feature => feature.Status is "Active" or "Validated");
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
        Assert.Contains("Auto-save activates in Phase 2", xaml, StringComparison.Ordinal);
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
    public void DesktopShell_StartsMaximizedWithExitAndPolishedInspectorSpacing()
    {
        var root = FindRepositoryRoot();
        var xaml = File.ReadAllText(
            Path.Combine(root, "src", "PhysicaStudio.Desktop", "Views", "MainWindow.axaml"));
        var theme = File.ReadAllText(
            Path.Combine(root, "src", "PhysicaStudio.Desktop", "Themes", "PhysicaTheme.axaml"));

        Assert.Contains("WindowState=\"Maximized\"", xaml, StringComparison.Ordinal);
        Assert.Contains("AutomationProperties.Name=\"Exit Physica Studio\"", xaml, StringComparison.Ordinal);
        Assert.Contains("x:Name=\"InspectorScrollViewer\"", xaml, StringComparison.Ordinal);
        Assert.Matches("InspectorScrollViewer[\\s\\S]*?VerticalScrollBarVisibility=\\\"Hidden\\\"", xaml);
        Assert.Contains("VerticalAlignment=\"Center\" Margin=\"2,1,0,0\"", xaml, StringComparison.Ordinal);
        Assert.Contains("<Setter Property=\"Margin\" Value=\"8,6,8,0\" />", theme, StringComparison.Ordinal);
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
