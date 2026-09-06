using System.Globalization;
using System.Resources;

namespace PhysicaStudio.Desktop.Resources;

public static class AppText
{
    private static readonly ResourceManager Manager =
        new("PhysicaStudio.Desktop.Resources.Strings", typeof(AppText).Assembly);

    public static string ApplicationTitle => Get(nameof(ApplicationTitle));
    public static string DocumentTitle => Get(nameof(DocumentTitle));
    public static string DevelopmentBuild => Get(nameof(DevelopmentBuild));
    public static string FeatureMap => Get(nameof(FeatureMap));
    public static string PresentPreview => Get(nameof(PresentPreview));

    public static string PlannedTooltip(string command, int phase) =>
        string.Format(CultureInfo.CurrentCulture, Get(nameof(PlannedTooltip)), command, phase);

    public static string ShellReadyTooltip(string command) =>
        string.Format(CultureInfo.CurrentCulture, Get(nameof(ShellReadyTooltip)), command);

    private static string Get(string key) => Manager.GetString(key, CultureInfo.CurrentUICulture) ?? key;
}

