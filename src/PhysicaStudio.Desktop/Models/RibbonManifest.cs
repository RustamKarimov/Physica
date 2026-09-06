using System.Text.Json.Serialization;

namespace PhysicaStudio.Desktop.Models;

public sealed record RibbonManifest(
    [property: JsonPropertyName("tabs")] IReadOnlyList<RibbonTabDefinition> Tabs,
    [property: JsonPropertyName("contextualTabs")] IReadOnlyList<string> ContextualTabs);

public sealed record RibbonTabDefinition(
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("label")] string Label,
    [property: JsonPropertyName("groups")] IReadOnlyList<RibbonGroupDefinition> Groups);

public sealed record RibbonGroupDefinition(
    [property: JsonPropertyName("label")] string Label,
    [property: JsonPropertyName("commands")] IReadOnlyList<string> Commands);

