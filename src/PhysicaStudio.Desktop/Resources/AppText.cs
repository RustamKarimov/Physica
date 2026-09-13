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
    public static string ObjectsGrouped => Get(nameof(ObjectsGrouped));
    public static string GroupsUngrouped => Get(nameof(GroupsUngrouped));
    public static string GroupObjects => Get(nameof(GroupObjects));
    public static string UngroupObjects => Get(nameof(UngroupObjects));
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
    public static string ZoomOut => Get(nameof(ZoomOut));
    public static string ZoomIn => Get(nameof(ZoomIn));
    public static string ZoomOptions => Get(nameof(ZoomOptions));
    public static string FitSlide => Get(nameof(FitSlide));
    public static string FitWidth => Get(nameof(FitWidth));
    public static string ActualSize => Get(nameof(ActualSize));
    public static string CanvasPanHint => Get(nameof(CanvasPanHint));
    public static string CanvasGuidance => Get(nameof(CanvasGuidance));
    public static string CanvasGuidanceUpdated => Get(nameof(CanvasGuidanceUpdated));
    public static string GridSpacingRange => Get(nameof(GridSpacingRange));
    public static string GuideAdded => Get(nameof(GuideAdded));
    public static string GuideMoved => Get(nameof(GuideMoved));
    public static string GuideRemoved => Get(nameof(GuideRemoved));
    public static string GuidesCleared => Get(nameof(GuidesCleared));
    public static string GuideLockChanged => Get(nameof(GuideLockChanged));
    public static string GuideUnavailable => Get(nameof(GuideUnavailable));
    public static string Rulers => Get(nameof(Rulers));
    public static string Grid => Get(nameof(Grid));
    public static string Guides => Get(nameof(Guides));
    public static string Margins => Get(nameof(Margins));
    public static string SafeArea => Get(nameof(SafeArea));
    public static string SnapObjects => Get(nameof(SnapObjects));
    public static string SnapGrid => Get(nameof(SnapGrid));
    public static string SnapGuides => Get(nameof(SnapGuides));
    public static string SnapSlide => Get(nameof(SnapSlide));
    public static string Snapping => Get(nameof(Snapping));
    public static string LockOrUnlockGuide => Get(nameof(LockOrUnlockGuide));
    public static string AddVerticalGuide => Get(nameof(AddVerticalGuide));
    public static string AddHorizontalGuide => Get(nameof(AddHorizontalGuide));
    public static string ClearGuides => Get(nameof(ClearGuides));
    public static string GridSpacing => Get(nameof(GridSpacing));
    public static string ClosePanel => Get(nameof(ClosePanel));
    public static string AltBypassSnap => Get(nameof(AltBypassSnap));
    public static string DisplayOptions => Get(nameof(DisplayOptions));
    public static string GridAndRuler => Get(nameof(GridAndRuler));
    public static string GridPresets => Get(nameof(GridPresets));
    public static string RulerInterval => Get(nameof(RulerInterval));
    public static string RulerIntervalRange => Get(nameof(RulerIntervalRange));
    public static string RulerPresets => Get(nameof(RulerPresets));
    public static string Auto => Get(nameof(Auto));
    public static string SlideUnits => Get(nameof(SlideUnits));
    public static string GuidePositions => Get(nameof(GuidePositions));
    public static string GuidePosition => Get(nameof(GuidePosition));
    public static string GuidePositionRange => Get(nameof(GuidePositionRange));
    public static string LockGuide => Get(nameof(LockGuide));
    public static string FloatPanel => Get(nameof(FloatPanel));
    public static string DockPanel => Get(nameof(DockPanel));
    public static string SlideDesign => Get(nameof(SlideDesign));
    public static string ProjectTheme => Get(nameof(ProjectTheme));
    public static string PhysicaLight => Get(nameof(PhysicaLight));
    public static string PhysicaDark => Get(nameof(PhysicaDark));
    public static string LaboratoryTheme => Get(nameof(LaboratoryTheme));
    public static string ThemeGalleryHint => Get(nameof(ThemeGalleryHint));
    public static string AzureVariant => Get(nameof(AzureVariant));
    public static string TealVariant => Get(nameof(TealVariant));
    public static string AmberVariant => Get(nameof(AmberVariant));
    public static string VioletVariant => Get(nameof(VioletVariant));
    public static string CopperVariant => Get(nameof(CopperVariant));
    public static string CobaltVariant => Get(nameof(CobaltVariant));
    public static string PlumVariant => Get(nameof(PlumVariant));
    public static string SlideBackground => Get(nameof(SlideBackground));
    public static string BackgroundType => Get(nameof(BackgroundType));
    public static string ThemeBackground => Get(nameof(ThemeBackground));
    public static string SolidBackground => Get(nameof(SolidBackground));
    public static string GradientBackground => Get(nameof(GradientBackground));
    public static string PrimaryColor => Get(nameof(PrimaryColor));
    public static string SecondaryColor => Get(nameof(SecondaryColor));
    public static string AdvancedColorEntry => Get(nameof(AdvancedColorEntry));
    public static string HexColor => Get(nameof(HexColor));
    public static string CustomBackgroundOverride => Get(nameof(CustomBackgroundOverride));
    public static string UseThemeBackground => Get(nameof(UseThemeBackground));
    public static string Transparency => Get(nameof(Transparency));
    public static string SlideCanvas => Get(nameof(SlideCanvas));
    public static string SizePreset => Get(nameof(SizePreset));
    public static string WidescreenPreset => Get(nameof(WidescreenPreset));
    public static string StandardPreset => Get(nameof(StandardPreset));
    public static string CustomPreset => Get(nameof(CustomPreset));
    public static string Width => Get(nameof(Width));
    public static string Height => Get(nameof(Height));
    public static string Orientation => Get(nameof(Orientation));
    public static string Landscape => Get(nameof(Landscape));
    public static string Portrait => Get(nameof(Portrait));
    public static string ResizeContent => Get(nameof(ResizeContent));
    public static string ScaleToFit => Get(nameof(ScaleToFit));
    public static string KeepSizeAndPosition => Get(nameof(KeepSizeAndPosition));
    public static string ApplySlideSize => Get(nameof(ApplySlideSize));
    public static string SlideInsets => Get(nameof(SlideInsets));
    public static string Left => Get(nameof(Left));
    public static string Top => Get(nameof(Top));
    public static string Right => Get(nameof(Right));
    public static string Bottom => Get(nameof(Bottom));
    public static string ApplyInsets => Get(nameof(ApplyInsets));
    public static string OpenGuidesWorkspace => Get(nameof(OpenGuidesWorkspace));
    public static string ThemeUnavailable => Get(nameof(ThemeUnavailable));
    public static string ThemeChanged => Get(nameof(ThemeChanged));
    public static string InvalidHexColor => Get(nameof(InvalidHexColor));
    public static string BackgroundOpacityRange => Get(nameof(BackgroundOpacityRange));
    public static string BackgroundChanged => Get(nameof(BackgroundChanged));
    public static string ApplyBackground => Get(nameof(ApplyBackground));
    public static string SlideSizeChanged => Get(nameof(SlideSizeChanged));
    public static string CanvasInsetsChanged => Get(nameof(CanvasInsetsChanged));
    public static string DesignSettingsHint => Get(nameof(DesignSettingsHint));
    public static string UiWired => Get(nameof(UiWired));

    public static string NumberRequired(string label) =>
        string.Format(CultureInfo.CurrentCulture, Get(nameof(NumberRequired)), label);

    public static string SectionSlideCount(int count) =>
        string.Format(CultureInfo.CurrentCulture, Get(count == 1 ? "SectionSlideCountSingular" : "SectionSlideCountPlural"), count);

    public static string SelectedObjectCount(int count) =>
        string.Format(CultureInfo.CurrentCulture, Get(count == 1 ? "SelectedObjectCountSingular" : "SelectedObjectCountPlural"), count);

    public static string LayerObjectCount(int count) =>
        string.Format(CultureInfo.CurrentCulture, Get(count == 1 ? "LayerObjectCountSingular" : "LayerObjectCountPlural"), count);

    public static string SectionName(int number) =>
        string.Format(CultureInfo.CurrentCulture, Get(nameof(SectionName)), number);

    public static string GroupName(int number) =>
        string.Format(CultureInfo.CurrentCulture, Get(nameof(GroupName)), number);

    public static string GroupItemCount(int count) =>
        string.Format(CultureInfo.CurrentCulture, Get(count == 1 ? "GroupItemCountSingular" : "GroupItemCountPlural"), count);

    public static string ExpandOrCollapseGroup => Get(nameof(ExpandOrCollapseGroup));

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
