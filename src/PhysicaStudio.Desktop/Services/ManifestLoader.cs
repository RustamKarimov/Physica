using System.Text.Json;
using Avalonia.Platform;
using PhysicaStudio.Desktop.Models;

namespace PhysicaStudio.Desktop.Services;

public static class ManifestLoader
{
    private static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web)
    {
        PropertyNameCaseInsensitive = true
    };

    public static RibbonManifest LoadRibbon()
    {
        using var stream = AssetLoader.Open(new Uri("avares://PhysicaStudio.Desktop/Assets/ribbon-manifest.json"));
        return JsonSerializer.Deserialize<RibbonManifest>(stream, Options)
               ?? throw new InvalidDataException("Ribbon manifest is empty.");
    }

    public static FeatureManifest LoadFeatures()
    {
        using var stream = AssetLoader.Open(new Uri("avares://PhysicaStudio.Desktop/Assets/feature-manifest.json"));
        return JsonSerializer.Deserialize<FeatureManifest>(stream, Options)
               ?? throw new InvalidDataException("Feature manifest is empty.");
    }
}

public sealed record FeatureManifest(
    IReadOnlyList<string> FeatureStates,
    int ActivePhase,
    IReadOnlyList<FeatureDefinition> Surfaces);

public sealed record FeatureDefinition(string Id, string Name, int Phase, string Status);

