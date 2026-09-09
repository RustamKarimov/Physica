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
    public static string SlideMoved => Get(nameof(SlideMoved));
    public static string SlideAlreadyAtEdge => Get(nameof(SlideAlreadyAtEdge));
    public static string SectionAdded => Get(nameof(SectionAdded));
    public static string SlideRenamed => Get(nameof(SlideRenamed));
    public static string SectionRenamed => Get(nameof(SectionRenamed));
    public static string SectionCollapsed => Get(nameof(SectionCollapsed));
    public static string SectionExpanded => Get(nameof(SectionExpanded));
    public static string SlidesAssignedToSection => Get(nameof(SlidesAssignedToSection));
    public static string SectionMoved => Get(nameof(SectionMoved));
    public static string SectionAlreadyAtEdge => Get(nameof(SectionAlreadyAtEdge));
    public static string SectionRemoved => Get(nameof(SectionRemoved));
    public static string ObjectSelectionChanged => Get(nameof(ObjectSelectionChanged));
    public static string ObjectsTransformed => Get(nameof(ObjectsTransformed));
    public static string ObjectsDeleted => Get(nameof(ObjectsDeleted));
    public static string SelectCanvasObject => Get(nameof(SelectCanvasObject));
    public static string CanvasSelection => Get(nameof(CanvasSelection));
    public static string CanvasTransformHint => Get(nameof(CanvasTransformHint));
    public static string InspectorPanel => Get(nameof(InspectorPanel));
    public static string LayersPanel => Get(nameof(LayersPanel));
    public static string NoLayerObjects => Get(nameof(NoLayerObjects));
    public static string ObjectRenamed => Get(nameof(ObjectRenamed));
    public static string ObjectsReordered => Get(nameof(ObjectsReordered));
    public static string ObjectHidden => Get(nameof(ObjectHidden));
    public static string ObjectShown => Get(nameof(ObjectShown));
    public static string ObjectLocked => Get(nameof(ObjectLocked));
    public static string ObjectUnlocked => Get(nameof(ObjectUnlocked));
    public static string MoveSelectedSlidesHere => Get(nameof(MoveSelectedSlidesHere));
    public static string MoveSectionUp => Get(nameof(MoveSectionUp));
    public static string MoveSectionDown => Get(nameof(MoveSectionDown));
    public static string RemoveSection => Get(nameof(RemoveSection));
    public static string UntitledLesson => Get(nameof(UntitledLesson));
    public static string OpenLessonTitle => Get(nameof(OpenLessonTitle));
    public static string SaveLessonTitle => Get(nameof(SaveLessonTitle));
    public static string SaveCopyLessonTitle => Get(nameof(SaveCopyLessonTitle));
    public static string PhysicaLessonFileType => Get(nameof(PhysicaLessonFileType));
    public static string OpenCancelled => Get(nameof(OpenCancelled));
    public static string SaveCancelled => Get(nameof(SaveCancelled));
    public static string ProjectCopySaved => Get(nameof(ProjectCopySaved));
    public static string NoRecoveryAvailable => Get(nameof(NoRecoveryAvailable));
    public static string ProjectClosed => Get(nameof(ProjectClosed));
    public static string NoLessonOpen => Get(nameof(NoLessonOpen));
    public static string StartCenterDescription => Get(nameof(StartCenterDescription));
    public static string CreateNewLesson => Get(nameof(CreateNewLesson));
    public static string OpenExistingLesson => Get(nameof(OpenExistingLesson));
    public static string RecentLessons => Get(nameof(RecentLessons));
    public static string NoRecentLessons => Get(nameof(NoRecentLessons));

    public static string SectionSlideCount(int count) =>
        string.Format(CultureInfo.CurrentCulture, Get(count == 1 ? "SectionSlideCountSingular" : "SectionSlideCountPlural"), count);

    public static string SelectedObjectCount(int count) =>
        string.Format(CultureInfo.CurrentCulture, Get(count == 1 ? "SelectedObjectCountSingular" : "SelectedObjectCountPlural"), count);

    public static string LayerObjectCount(int count) =>
        string.Format(CultureInfo.CurrentCulture, Get(count == 1 ? "LayerObjectCountSingular" : "LayerObjectCountPlural"), count);

    public static string SectionName(int number) =>
        string.Format(CultureInfo.CurrentCulture, Get(nameof(SectionName)), number);

    public static string RecoveryPreserveFailed(string message) =>
        string.Format(CultureInfo.CurrentCulture, Get(nameof(RecoveryPreserveFailed)), message);

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
