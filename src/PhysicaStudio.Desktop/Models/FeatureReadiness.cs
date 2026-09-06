namespace PhysicaStudio.Desktop.Models;

public enum FeatureReadiness
{
    Planned,
    ShellReady,
    Preview,
    Active,
    Validated
}

public static class FeatureReadinessExtensions
{
    public static string DisplayName(this FeatureReadiness value) => value switch
    {
        FeatureReadiness.ShellReady => "Shell ready",
        _ => value.ToString()
    };
}

