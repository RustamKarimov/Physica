using Avalonia;
using Avalonia.Controls;
using Avalonia.Input;
using Avalonia.Interactivity;
using Avalonia.Platform.Storage;
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
        if (sender is Button { DataContext: SlideItemViewModel slide }
            && e.GetCurrentPoint(this).Properties.IsLeftButtonPressed)
        {
            var mode = e.KeyModifiers.HasFlag(KeyModifiers.Shift)
                ? SlideSelectionMode.Range
                : e.KeyModifiers.HasFlag(KeyModifiers.Control) || e.KeyModifiers.HasFlag(KeyModifiers.Meta)
                    ? SlideSelectionMode.Toggle
                    : SlideSelectionMode.Replace;
            _viewModel.SelectSlide(slide.Id, mode);
            e.Handled = true;
        }
    }

    private async void SlideDragHandle_PointerPressed(object? sender, PointerPressedEventArgs e)
    {
        if (sender is not Control { DataContext: SlideItemViewModel slide }
            || !e.GetCurrentPoint(this).Properties.IsLeftButtonPressed)
        {
            return;
        }

        if (!_viewModel.SelectedSlideIds.Contains(slide.Id))
        {
            _viewModel.SelectSlide(slide.Id);
        }

        var data = new DataTransfer();
        data.Add(DataTransferItem.CreateText($"physica-slide:{slide.Id:D}"));
        await DragDrop.DoDragDropAsync(e, data, DragDropEffects.Move);
    }

    private void SlideItem_DragOver(object? sender, DragEventArgs e)
    {
        e.DragEffects = IsSlideDrag(e.DataTransfer) ? DragDropEffects.Move : DragDropEffects.None;
    }

    private void SlideItem_Drop(object? sender, DragEventArgs e)
    {
        if (sender is not Control { DataContext: SlideItemViewModel target } || !IsSlideDrag(e.DataTransfer))
        {
            e.DragEffects = DragDropEffects.None;
            return;
        }

        _viewModel.MoveSelectedSlides(target.Id, e.GetPosition((Control)sender).Y >= ((Control)sender).Bounds.Height / 2);
        e.DragEffects = DragDropEffects.Move;
    }

    private static bool IsSlideDrag(IDataTransfer dataTransfer) =>
        dataTransfer.TryGetText()?.StartsWith("physica-slide:", StringComparison.Ordinal) == true;

    private void NewSlide_Click(object? sender, RoutedEventArgs e) => _viewModel.AddSlide();
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
        var window = new PresenterPreviewWindow();
        window.Show(this);
    }
}
