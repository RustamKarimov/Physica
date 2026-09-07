using System.Text.Json;
using PhysicaStudio.Desktop.Models;
using PhysicaStudio.Desktop.Services;

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
