using Avalonia;
using Avalonia.Controls;
using Avalonia.Input;
using Avalonia.Interactivity;
using Avalonia.Platform.Storage;
using Avalonia.VisualTree;
using PhysicaStudio.Authoring;
using PhysicaStudio.Desktop.Resources;
using PhysicaStudio.Desktop.Services;
using PhysicaStudio.Desktop.ViewModels;
using PhysicaStudio.Document;

namespace PhysicaStudio.Desktop.Views;

public sealed partial class MainWindow : Window
{
    private readonly StudioShellViewModel _viewModel = new();
    private readonly ProjectRecoveryStore _recoveryStore;
    private readonly RecentProjectStore _recentProjectStore;
    private bool _closeAuthorized;
    private bool _closeInProgress;
    private Guid? _pendingSlideDragId;
    private Point? _slideDragStart;
    private KeyModifiers _slidePressModifiers;
    private bool _slideDragStarted;
    private Guid? _slideDropTargetId;
    private bool _slideDropAfter;

    public MainWindow() : this(null)
    {
    }

    public MainWindow(string? previewMode)
    {
        InitializeComponent();
        DataContext = _viewModel;
        var applicationData = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "PhysicaStudio");
        _recoveryStore = new ProjectRecoveryStore(Path.Combine(applicationData, "Recovery"));
        _recentProjectStore = new RecentProjectStore(Path.Combine(applicationData, "recent-projects.json"));
        RefreshRecentProjects();

        _viewModel.SelectWorkspace(previewMode switch
        {
            "animation" => StudioWorkspace.Animation,
            "graphs" => StudioWorkspace.Graphs,
            _ => StudioWorkspace.Authoring
        });
    }

    private void WindowTitleBar_PointerPressed(object? sender, PointerPressedEventArgs e)
    {
        if (e.GetCurrentPoint(this).Properties.IsLeftButtonPressed)
        {
            if (e.ClickCount == 2)
            {
                ToggleMaximize();
            }
            else
            {
                BeginMoveDrag(e);
            }
        }
    }

    private void MinimizeWindow_Click(object? sender, RoutedEventArgs e) =>
        WindowState = WindowState.Minimized;

    private void MaximizeWindow_Click(object? sender, RoutedEventArgs e) => ToggleMaximize();

    private async void CloseWindow_Click(object? sender, RoutedEventArgs e) => await CloseWithRecoveryAsync();

    protected override void OnClosing(WindowClosingEventArgs e)
    {
        if (!_closeAuthorized && _viewModel.HasUnsavedChanges)
        {
            e.Cancel = true;
            _ = CloseWithRecoveryAsync();
        }

        base.OnClosing(e);
    }

    private void ToggleMaximize()
    {
        WindowState = WindowState switch
        {
            WindowState.FullScreen => WindowState.Normal,
            WindowState.Maximized => WindowState.Normal,
            _ => WindowState.Maximized,
        };
    }

    private void RibbonTab_Click(object? sender, RoutedEventArgs e)
    {
        if (sender is Button { DataContext: RibbonTabViewModel tab })
        {
            _viewModel.SelectRibbon(tab);
        }
    }

    private async void RibbonCommand_Click(object? sender, RoutedEventArgs e)
    {
        if (sender is not Button { DataContext: RibbonCommandViewModel command } || !command.IsEnabled)
        {
            return;
        }

        try
        {
            switch (command.Label)
            {
                case "New":
                    await SaveRecoveryIfNeededAsync();
                    _viewModel.NewProject();
                    break;
                case "Open":
                    await OpenProjectAsync();
                    break;
                case "Recent":
                    await CloseProjectAsync();
                    break;
                case "Save":
                    await SaveProjectAsync(forcePicker: false, saveCopy: false);
                    break;
                case "Save As":
                    await SaveProjectAsync(forcePicker: true, saveCopy: false);
                    break;
                case "Save Copy":
                    await SaveProjectAsync(forcePicker: true, saveCopy: true);
                    break;
                case "Recover":
                    await RecoverLatestAsync();
                    break;
                case "Close":
                    await CloseProjectAsync();
                    break;
                case "New Slide":
                    _viewModel.AddSlide();
                    break;
                case "Duplicate Slide":
                    _viewModel.DuplicateActiveSlide();
                    break;
                case "Delete Slide":
                    _viewModel.DeleteActiveSlide();
                    break;
                case "Section":
                    _viewModel.AddSectionForActiveSlide();
                    break;
                case "Undo":
                    _viewModel.Undo();
                    break;
                case "Redo":
                    _viewModel.Redo();
                    break;
            }
        }
        catch (Exception exception) when (exception is AuthoringCommandException or ProjectPackageException or IOException or UnauthorizedAccessException)
        {
            _viewModel.SetStatus(exception.Message);
        }
    }

    private void SlideItem_PointerPressed(object? sender, PointerPressedEventArgs e)
    {
        if (e.Source is TextBox)
        {
            return;
        }

        if (sender is not Control { DataContext: SlideItemViewModel slide } control
            || !e.GetCurrentPoint(control).Properties.IsLeftButtonPressed)
        {
            return;
        }

        control.Focus();
        _pendingSlideDragId = slide.Id;
        _slideDragStart = e.GetPosition(this);
        e.Pointer.Capture(control);
        _slidePressModifiers = e.KeyModifiers;
        _slideDragStarted = false;

        var mode = SelectionModeFor(e.KeyModifiers);
        if (mode != SlideSelectionMode.Replace || !_viewModel.SelectedSlideIds.Contains(slide.Id))
        {
            _viewModel.SelectSlide(slide.Id, mode);
        }
        e.Handled = true;
    }

    private void SlideItem_PointerMoved(object? sender, PointerEventArgs e)
    {
        if (sender is not Control { DataContext: SlideItemViewModel slide } control
            || _pendingSlideDragId != slide.Id
            || _slideDragStart is not Point start
            || !e.GetCurrentPoint(control).Properties.IsLeftButtonPressed)
        {
            return;
        }

        var current = e.GetPosition(this);
        if (!_slideDragStarted
            && Math.Abs(current.X - start.X) < 6
            && Math.Abs(current.Y - start.Y) < 6)
        {
            return;
        }

        if (!_slideDragStarted)
        {
            _slideDragStarted = true;
            if (!_viewModel.SelectedSlideIds.Contains(slide.Id))
            {
                _viewModel.SelectSlide(slide.Id);
            }
        }

        try
        {
            AutoScrollSlideNavigator(e.GetPosition(SlideNavigatorScrollViewer));
            UpdateSlideDropTarget(current);
            e.Handled = true;
        }
        catch (Exception exception)
        {
            ClearSlideDropIndicators();
            ResetSlidePointerState();
            e.Pointer.Capture(null);
            _viewModel.SetStatus(exception.Message);
            e.Handled = true;
        }
    }

    private void SlideItem_PointerReleased(object? sender, PointerReleasedEventArgs e)
    {
        var targetSlideId = _slideDropTargetId;
        var placeAfterTarget = _slideDropAfter;
        var shouldMove = _slideDragStarted && targetSlideId.HasValue;
        if (sender is Control { DataContext: SlideItemViewModel slide }
            && _pendingSlideDragId == slide.Id
            && !_slideDragStarted
            && SelectionModeFor(_slidePressModifiers) == SlideSelectionMode.Replace)
        {
            _viewModel.SelectSlide(slide.Id);
        }

        ClearSlideDropIndicators();
        ResetSlidePointerState();
        e.Pointer.Capture(null);

        if (shouldMove)
        {
            try
            {
                _viewModel.MoveSelectedSlides(targetSlideId!.Value, placeAfterTarget);
            }
            catch (AuthoringCommandException exception)
            {
                _viewModel.SetStatus(exception.Message);
            }
        }

        e.Handled = true;
    }

    private void SlideItem_PointerCaptureLost(object? sender, PointerCaptureLostEventArgs e)
    {
        ClearSlideDropIndicators();
        ResetSlidePointerState();
    }

    private void AutoScrollSlideNavigator(Point pointerPosition)
    {
        const double edge = 32;
        const double step = 18;
        var offset = SlideNavigatorScrollViewer.Offset;
        var nextY = offset.Y;
        if (pointerPosition.Y < edge)
        {
            nextY -= step;
        }
        else if (pointerPosition.Y > SlideNavigatorScrollViewer.Bounds.Height - edge)
        {
            nextY += step;
        }

        var maximum = Math.Max(0, SlideNavigatorScrollViewer.Extent.Height - SlideNavigatorScrollViewer.Viewport.Height);
        nextY = Math.Clamp(nextY, 0, maximum);
        if (!nextY.Equals(offset.Y))
        {
            SlideNavigatorScrollViewer.Offset = new Vector(offset.X, nextY);
        }
    }

    private void UpdateSlideDropTarget(Point pointerPosition)
    {
        ClearSlideDropIndicators();
        _slideDropTargetId = null;

        Border? closestControl = null;
        SlideItemViewModel? closestSlide = null;
        var closestDistance = double.MaxValue;
        var placeAfter = false;

        foreach (var candidate in this.GetVisualDescendants()
                     .OfType<Border>()
                     .Where(control => control.Classes.Contains("slide-navigator-item"))
                     .Where(control => control.DataContext is SlideItemViewModel))
        {
            var slide = (SlideItemViewModel)candidate.DataContext!;
            var origin = candidate.TranslatePoint(default, this);
            if (origin is not Point topLeft)
            {
                continue;
            }

            var top = topLeft.Y;
            var bottom = top + candidate.Bounds.Height;
            if (_viewModel.SelectedSlideIds.Contains(slide.Id))
            {
                if (pointerPosition.Y >= top && pointerPosition.Y <= bottom)
                {
                    return;
                }
                continue;
            }

            var distance = pointerPosition.Y < top
                ? top - pointerPosition.Y
                : pointerPosition.Y > bottom
                    ? pointerPosition.Y - bottom
                    : 0;
            if (distance >= closestDistance)
            {
                continue;
            }

            closestDistance = distance;
            closestControl = candidate;
            closestSlide = slide;
            placeAfter = pointerPosition.Y >= top + candidate.Bounds.Height / 2;
        }

        if (closestControl is null || closestSlide is null)
        {
            return;
        }

        _slideDropTargetId = closestSlide.Id;
        _slideDropAfter = placeAfter;
        SetDropIndicator(closestControl, true, !placeAfter);
    }

    private void ClearSlideDropIndicators()
    {
        foreach (var candidate in this.GetVisualDescendants()
                     .OfType<Border>()
                     .Where(control => control.Classes.Contains("slide-navigator-item")))
        {
            SetDropIndicator(candidate, false, false);
        }
    }

    private static SlideSelectionMode SelectionModeFor(KeyModifiers modifiers) =>
        modifiers.HasFlag(KeyModifiers.Shift)
            ? SlideSelectionMode.Range
            : modifiers.HasFlag(KeyModifiers.Control) || modifiers.HasFlag(KeyModifiers.Meta)
                ? SlideSelectionMode.Toggle
                : SlideSelectionMode.Replace;

    private static void SetDropIndicator(Control control, bool isVisible, bool before)
    {
        var beforeIndicator = control.FindControl<Border>("DropBeforeIndicator");
        var afterIndicator = control.FindControl<Border>("DropAfterIndicator");
        if (beforeIndicator is not null)
        {
            beforeIndicator.IsVisible = isVisible && before;
        }

        if (afterIndicator is not null)
        {
            afterIndicator.IsVisible = isVisible && !before;
        }
    }

    private void ResetSlidePointerState()
    {
        _pendingSlideDragId = null;
        _slideDragStart = null;
        _slidePressModifiers = KeyModifiers.None;
        _slideDragStarted = false;
        _slideDropTargetId = null;
        _slideDropAfter = false;
    }
    private void SlideName_PointerPressed(object? sender, PointerPressedEventArgs e)
    {
        if (sender is TextBlock label && e.ClickCount == 2 && e.GetCurrentPoint(label).Properties.IsLeftButtonPressed)
        {
            BeginInlineRename(label);
            e.Handled = true;
        }
    }

    private void SectionName_PointerPressed(object? sender, PointerPressedEventArgs e)
    {
        if (sender is TextBlock label && e.ClickCount == 2 && e.GetCurrentPoint(label).Properties.IsLeftButtonPressed)
        {
            BeginInlineRename(label);
            e.Handled = true;
        }
    }

    private static void InlineNameEditor_PointerPressed(object? sender, PointerPressedEventArgs e) =>
        e.Handled = true;

    private void SlideNameEditor_KeyDown(object? sender, KeyEventArgs e)
    {
        if (sender is not TextBox editor)
        {
            return;
        }

        if (e.Key == Key.Enter)
        {
            CommitSlideRename(editor);
            e.Handled = true;
        }
        else if (e.Key == Key.Escape)
        {
            CancelInlineRename(editor);
            e.Handled = true;
        }
    }

    private void SectionNameEditor_KeyDown(object? sender, KeyEventArgs e)
    {
        if (sender is not TextBox editor)
        {
            return;
        }

        if (e.Key == Key.Enter)
        {
            CommitSectionRename(editor);
            e.Handled = true;
        }
        else if (e.Key == Key.Escape)
        {
            CancelInlineRename(editor);
            e.Handled = true;
        }
    }

    private void SlideNameEditor_LostFocus(object? sender, RoutedEventArgs e)
    {
        if (sender is TextBox { IsVisible: true } editor)
        {
            CommitSlideRename(editor);
        }
    }

    private void SectionNameEditor_LostFocus(object? sender, RoutedEventArgs e)
    {
        if (sender is TextBox { IsVisible: true } editor)
        {
            CommitSectionRename(editor);
        }
    }

    private static void BeginInlineRename(TextBlock label)
    {
        if (label.Parent is not Panel panel || panel.Children.OfType<TextBox>().FirstOrDefault() is not { } editor)
        {
            return;
        }

        editor.Text = label.Text;
        label.IsVisible = false;
        editor.IsVisible = true;
        editor.Focus();
        editor.SelectAll();
    }

    private void CommitSlideRename(TextBox editor)
    {
        var slide = editor.DataContext as SlideItemViewModel;
        var value = editor.Text ?? string.Empty;
        FinishInlineRename(editor);
        if (slide is not null)
        {
            ExecuteNamingAction(() => _viewModel.RenameSlide(slide.Id, value));
        }
    }
    private void ExecuteNamingAction(Action action)
    {
        try
        {
            action();
        }
        catch (AuthoringCommandException exception)
        {
            _viewModel.SetStatus(exception.Message);
        }
    }

    private static void CancelInlineRename(TextBox editor) => FinishInlineRename(editor);

    private static void FinishInlineRename(TextBox editor)
    {
        if (!editor.IsVisible)
        {
            return;
        }

        if (editor.Parent is Panel panel && panel.Children.OfType<TextBlock>().FirstOrDefault() is { } label)
        {
            label.IsVisible = true;
        }

        editor.IsVisible = false;
    }

    private void BeginActiveSlideRename()
    {
        var slideControl = this.GetVisualDescendants()
            .OfType<Border>()
            .FirstOrDefault(control => control.Classes.Contains("slide-navigator-item")
                && control.DataContext is SlideItemViewModel slide
                && slide.Id == _viewModel.ActiveSlide.Id);
        if (slideControl?.FindControl<TextBlock>("SlideNameLabel") is { } label)
        {
            BeginInlineRename(label);
        }
    }
    private void BeginSectionRename(Guid sectionId)
    {
        var label = this.GetVisualDescendants()
            .OfType<TextBlock>()
            .FirstOrDefault(control => control.Name == "SectionNameLabel"
                && control.DataContext is SlideItemViewModel slide
                && slide.SectionId == sectionId
                && slide.ShowSectionHeader);
        if (label is not null)
        {
            BeginInlineRename(label);
        }
    }

    private void CommitSectionRename(TextBox editor)
    {
        var slide = editor.DataContext as SlideItemViewModel;
        var value = editor.Text ?? string.Empty;
        FinishInlineRename(editor);
        if (slide?.SectionId is Guid sectionId)
        {
            ExecuteNamingAction(() => _viewModel.RenameSection(sectionId, value));
        }
    }

    private void NewSlide_Click(object? sender, RoutedEventArgs e) => _viewModel.AddSlide();
    private void RenameSlide_Click(object? sender, RoutedEventArgs e) => BeginActiveSlideRename();

    private void RenameSection_Click(object? sender, RoutedEventArgs e)
    {
        if (sender is Control { DataContext: SlideItemViewModel { SectionId: Guid sectionId } })
        {
            BeginSectionRename(sectionId);
        }
    }

    private void DuplicateSlide_Click(object? sender, RoutedEventArgs e) => _viewModel.DuplicateActiveSlide();
    private void DeleteSlide_Click(object? sender, RoutedEventArgs e) => _viewModel.DeleteActiveSlide();
    private void MoveSlideUp_Click(object? sender, RoutedEventArgs e) => _viewModel.MoveActiveSlide(-1);
    private void MoveSlideDown_Click(object? sender, RoutedEventArgs e) => _viewModel.MoveActiveSlide(1);
    private void Undo_Click(object? sender, RoutedEventArgs e) => _viewModel.Undo();
    private void Redo_Click(object? sender, RoutedEventArgs e) => _viewModel.Redo();
    private async void SaveProject_Click(object? sender, RoutedEventArgs e) =>
        await SaveProjectAsync(forcePicker: false, saveCopy: false);

    private async void Window_KeyDown(object? sender, KeyEventArgs e)
    {
        if (e.Key == Key.F2 && e.Source is not TextBox && _viewModel.IsProjectOpen)
        {
            BeginActiveSlideRename();
            e.Handled = true;
            return;
        }

        if (e.Key == Key.Delete && e.Source is not TextBox && _viewModel.IsProjectOpen)
        {
            _viewModel.DeleteSelectedSlides();
            e.Handled = true;
            return;
        }

        var hasPlatformCommandModifier = e.KeyModifiers.HasFlag(KeyModifiers.Control)
            || e.KeyModifiers.HasFlag(KeyModifiers.Meta);
        if (!hasPlatformCommandModifier)
        {
            return;
        }

        switch (e.Key)
        {
            case Key.S when e.KeyModifiers.HasFlag(KeyModifiers.Shift):
                await SaveProjectAsync(forcePicker: true, saveCopy: false);
                e.Handled = true;
                break;
            case Key.S:
                await SaveProjectAsync(forcePicker: false, saveCopy: false);
                e.Handled = true;
                break;
            case Key.Z:
                _viewModel.Undo();
                e.Handled = true;
                break;
            case Key.Y:
                _viewModel.Redo();
                e.Handled = true;
                break;
            case Key.N:
                await SaveRecoveryIfNeededAsync();
                _viewModel.NewProject();
                e.Handled = true;
                break;
            case Key.O:
                await OpenProjectAsync();
                e.Handled = true;
                break;
            case Key.Up when e.KeyModifiers.HasFlag(KeyModifiers.Shift):
                _viewModel.MoveActiveSlide(-1);
                e.Handled = true;
                break;
            case Key.Down when e.KeyModifiers.HasFlag(KeyModifiers.Shift):
                _viewModel.MoveActiveSlide(1);
                e.Handled = true;
                break;
        }
    }

    private async Task OpenProjectAsync()
    {
        var files = await StorageProvider.OpenFilePickerAsync(new FilePickerOpenOptions
        {
            Title = AppText.OpenLessonTitle,
            AllowMultiple = false,
            FileTypeFilter = [PhysicaProjectFileType],
        });
        var path = files.FirstOrDefault()?.TryGetLocalPath();
        if (path is null)
        {
            _viewModel.SetStatus(AppText.OpenCancelled);
            return;
        }

        await SaveRecoveryIfNeededAsync();
        var project = await PhysicaProjectPackage.LoadAsync(path);
        _viewModel.LoadProject(project, path);
        RecordRecentProject(path);
    }

    private async Task SaveProjectAsync(bool forcePicker, bool saveCopy)
    {
        var path = forcePicker ? null : _viewModel.Session.CurrentPath;
        if (path is null)
        {
            var file = await StorageProvider.SaveFilePickerAsync(new FilePickerSaveOptions
            {
                Title = saveCopy ? AppText.SaveCopyLessonTitle : AppText.SaveLessonTitle,
                SuggestedFileName = $"{SanitizeFileName(_viewModel.Session.CurrentProject.Title)}{ProjectFormat.FileExtension}",
                DefaultExtension = ProjectFormat.FileExtension.TrimStart('.'),
                FileTypeChoices = [PhysicaProjectFileType],
                ShowOverwritePrompt = true,
            });
            path = file?.TryGetLocalPath();
        }

        if (path is null)
        {
            _viewModel.SetStatus(AppText.SaveCancelled);
            return;
        }

        await PhysicaProjectPackage.SaveAsync(_viewModel.Session.CurrentProject, path);
        if (saveCopy)
        {
            _viewModel.SetStatus(AppText.ProjectCopySaved);
            RecordRecentProject(path);
            return;
        }

        _viewModel.MarkSaved(path);
        RecordRecentProject(path);
        _recoveryStore.Delete(_viewModel.Session.CurrentProject.Id);
    }

    private async Task OpenRecentProjectAsync(string path)
    {
        await SaveRecoveryIfNeededAsync();
        var project = await PhysicaProjectPackage.LoadAsync(path);
        _viewModel.LoadProject(project, path);
        RecordRecentProject(path);
    }

    private async void OpenRecentProject_Click(object? sender, RoutedEventArgs e)
    {
        if (sender is Button { DataContext: RecentProjectItemViewModel recent })
        {
            await OpenRecentProjectAsync(recent.Path);
        }
    }

    private void NewFromStartCenter_Click(object? sender, RoutedEventArgs e) => _viewModel.NewProject();
    private async void OpenFromStartCenter_Click(object? sender, RoutedEventArgs e) => await OpenProjectAsync();

    private async Task CloseProjectAsync()
    {
        await SaveRecoveryIfNeededAsync();
        _viewModel.CloseProject();
    }

    private void RecordRecentProject(string path)
    {
        _recentProjectStore.Record(path, _viewModel.Session.CurrentProject.Title);
        RefreshRecentProjects();
    }

    private void RefreshRecentProjects() => _viewModel.SetRecentProjects(_recentProjectStore.Load());

    private async Task RecoverLatestAsync()
    {
        await SaveRecoveryIfNeededAsync();
        var snapshot = (await _recoveryStore.ListAsync()).FirstOrDefault();
        if (snapshot is null)
        {
            _viewModel.SetStatus(AppText.NoRecoveryAvailable);
            return;
        }

        _viewModel.LoadRecovery(snapshot);
    }

    private async Task SaveRecoveryIfNeededAsync()
    {
        if (!_viewModel.HasUnsavedChanges)
        {
            return;
        }

        await _recoveryStore.SaveAsync(
            _viewModel.Session.CurrentProject,
            _viewModel.Session.Revision,
            _viewModel.Session.CurrentPath);
    }

    private async Task CloseWithRecoveryAsync()
    {
        if (_closeAuthorized || _closeInProgress)
        {
            return;
        }

        _closeInProgress = true;
        try
        {
            await SaveRecoveryIfNeededAsync();
            _closeAuthorized = true;
            Close();
        }
        catch (Exception exception) when (exception is IOException or UnauthorizedAccessException)
        {
            _closeInProgress = false;
            _viewModel.SetStatus(AppText.RecoveryPreserveFailed(exception.Message));
        }
    }

    private static string SanitizeFileName(string value)
    {
        var invalid = Path.GetInvalidFileNameChars().ToHashSet();
        var sanitized = new string(value.Select(character => invalid.Contains(character) ? '-' : character).ToArray()).Trim();
        return string.IsNullOrWhiteSpace(sanitized) ? AppText.UntitledLesson : sanitized;
    }

    private static FilePickerFileType PhysicaProjectFileType { get; } = new(AppText.PhysicaLessonFileType)
    {
        Patterns = ["*.physica"],
        MimeTypes = ["application/vnd.physica.lesson"],
        AppleUniformTypeIdentifiers = ["com.physicastudio.lesson"],
    };

    private void ToggleLeftPanel_Click(object? sender, RoutedEventArgs e)
    {
        LeftPanel.IsVisible = !LeftPanel.IsVisible;
        ExpandLeftButton.IsVisible = !LeftPanel.IsVisible;
        LeftSplitter.IsVisible = LeftPanel.IsVisible;
        WorkspaceGrid.ColumnDefinitions[0].Width = LeftPanel.IsVisible ? new GridLength(242) : new GridLength(0);
    }

    private void ToggleRightPanel_Click(object? sender, RoutedEventArgs e)
    {
        RightPanel.IsVisible = !RightPanel.IsVisible;
        ExpandRightButton.IsVisible = !RightPanel.IsVisible;
        RightSplitter.IsVisible = RightPanel.IsVisible;
        WorkspaceGrid.ColumnDefinitions[4].Width = RightPanel.IsVisible ? new GridLength(296) : new GridLength(0);
    }

    private void ToggleBottomPanel_Click(object? sender, RoutedEventArgs e)
    {
        BottomPanel.IsVisible = !BottomPanel.IsVisible;
        ExpandBottomButton.IsVisible = !BottomPanel.IsVisible;
        BottomSplitter.IsVisible = BottomPanel.IsVisible;
        CenterGrid.RowDefinitions[2].Height = BottomPanel.IsVisible ? new GridLength(260) : new GridLength(32);
    }

    private void Workspace2D_Click(object? sender, RoutedEventArgs e) => _viewModel.WorkspaceMode = "2D";

    private void Workspace3D_Click(object? sender, RoutedEventArgs e) => _viewModel.WorkspaceMode = "3D";

    private void ShowAuthoringWorkspace_Click(object? sender, RoutedEventArgs e) =>
        _viewModel.SelectWorkspace(StudioWorkspace.Authoring);

    private void ShowAnimationWorkspace_Click(object? sender, RoutedEventArgs e) =>
        _viewModel.SelectWorkspace(StudioWorkspace.Animation);

    private void ShowGraphWorkspace_Click(object? sender, RoutedEventArgs e) =>
        _viewModel.SelectWorkspace(StudioWorkspace.Graphs);

    private void ShowFeatureMap_Click(object? sender, RoutedEventArgs e)
    {
        var window = new FeatureMapWindow { DataContext = _viewModel };
        window.Show(this);
    }

    private void ShowPresenter_Click(object? sender, RoutedEventArgs e)
    {
        var window = new PresenterPreviewWindow(_viewModel.ActiveScene);
        window.Show(this);
    }
}
