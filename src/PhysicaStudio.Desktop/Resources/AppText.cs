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
    public static string ProjectFoundationReady => Get(nameof(ProjectFoundationReady));
    public static string NewProjectCreated => Get(nameof(NewProjectCreated));
    public static string ProjectOpened => Get(nameof(ProjectOpened));
    public static string ProjectSaved => Get(nameof(ProjectSaved));
    public static string RecoveryOpened => Get(nameof(RecoveryOpened));
    public static string SlideAdded => Get(nameof(SlideAdded));
    public static string SlideDuplicated => Get(nameof(SlideDuplicated));
    public static string SlideDeleted => Get(nameof(SlideDeleted));
    public static string LastSlideRequired => Get(nameof(LastSlideRequired));
    public static string UndoCompleted => Get(nameof(UndoCompleted));
    public static string RedoCompleted => Get(nameof(RedoCompleted));

    public static string PlannedTooltip(string command, int phase) =>
        string.Format(CultureInfo.CurrentCulture, Get(nameof(PlannedTooltip)), command, phase);

    public static string ShellReadyTooltip(string command) =>
        string.Format(CultureInfo.CurrentCulture, Get(nameof(ShellReadyTooltip)), command);

    public static string ActiveTooltip(string command) =>
        string.Format(CultureInfo.CurrentCulture, Get(nameof(ActiveTooltip)), command);

    public static string ActiveUnavailableTooltip(string command) =>
        string.Format(CultureInfo.CurrentCulture, Get(nameof(ActiveUnavailableTooltip)), command);

    private static string Get(string key) => Manager.GetString(key, CultureInfo.CurrentUICulture) ?? key;
}
