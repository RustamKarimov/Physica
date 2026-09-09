using Avalonia;
using Avalonia.Controls;
using Avalonia.Input;
using Avalonia.Interactivity;
using Avalonia.Platform.Storage;
using Avalonia.VisualTree;
using PhysicaStudio.Authoring;
using PhysicaStudio.Desktop.Controls;
using PhysicaStudio.Desktop.Resources;
using PhysicaStudio.Desktop.Services;
using PhysicaStudio.Desktop.ViewModels;
using PhysicaStudio.Document;
using PhysicaStudio.Rendering2D;

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
    private Guid? _sectionActionTargetId;
    private CanvasGestureState? _canvasGesture;

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

    private void ToggleSection_Click(object? sender, RoutedEventArgs e)
    {
        if (TryGetSectionId(sender, out var sectionId))
        {
            _viewModel.ToggleSectionCollapsed(sectionId);
        }
        e.Handled = true;
    }

    private void SectionActions_Click(object? sender, RoutedEventArgs e)
    {
        if (sender is Control { DataContext: SlideItemViewModel { SectionId: Guid sectionId } })
        {
            _sectionActionTargetId = sectionId;
        }
    }

    private void AssignSelectedSlidesToSection_Click(object? sender, RoutedEventArgs e)
    {
        ExecuteSectionAction(sender, _viewModel.AssignSelectedSlidesToSection);
    }

    private void MoveSectionUp_Click(object? sender, RoutedEventArgs e) =>
        ExecuteSectionAction(sender, sectionId => _viewModel.MoveSection(sectionId, -1));

    private void MoveSectionDown_Click(object? sender, RoutedEventArgs e) =>
        ExecuteSectionAction(sender, sectionId => _viewModel.MoveSection(sectionId, 1));

    private void RemoveSection_Click(object? sender, RoutedEventArgs e) =>
        ExecuteSectionAction(sender, _viewModel.RemoveSection);

    private void ExecuteSectionAction(object? sender, Action<Guid> action)
    {
        if (!TryGetSectionId(sender, out var sectionId))
        {
            return;
        }

        try
        {
            action(sectionId);
        }
        catch (AuthoringCommandException exception)
        {
            _viewModel.SetStatus(exception.Message);
        }
    }

    private bool TryGetSectionId(object? sender, out Guid sectionId)
    {
        if (sender is Control { DataContext: SlideItemViewModel { SectionId: Guid id } })
        {
            sectionId = id;
            return true;
        }

        if (_sectionActionTargetId is Guid targetId)
        {
            sectionId = targetId;
            return true;
        }

        sectionId = default;
        return false;
    }

    private void DuplicateSlide_Click(object? sender, RoutedEventArgs e) => _viewModel.DuplicateActiveSlide();
    private void DeleteSlide_Click(object? sender, RoutedEventArgs e) => _viewModel.DeleteActiveSlide();
    private void MoveSlideUp_Click(object? sender, RoutedEventArgs e) => _viewModel.MoveActiveSlide(-1);
    private void MoveSlideDown_Click(object? sender, RoutedEventArgs e) => _viewModel.MoveActiveSlide(1);
    private void Undo_Click(object? sender, RoutedEventArgs e) => _viewModel.Undo();
    private void Redo_Click(object? sender, RoutedEventArgs e) => _viewModel.Redo();
    private async void SaveProject_Click(object? sender, RoutedEventArgs e) =>
        await SaveProjectAsync(forcePicker: false, saveCopy: false);

    private void AuthoringCanvas_PointerPressed(object? sender, PointerPressedEventArgs e)
    {
        if (sender is not DocumentSceneSurface surface
            || !e.GetCurrentPoint(surface).Properties.IsLeftButtonPressed)
        {
            return;
        }

        surface.Focus();
        var surfacePoint = e.GetPosition(surface);
        var handle = surface.HitTestSelectionHandle(surfacePoint);
        var hitNodeId = handle is CanvasSelectionHandle.ResizeNorthWest
            or CanvasSelectionHandle.ResizeNorthEast
            or CanvasSelectionHandle.ResizeSouthEast
            or CanvasSelectionHandle.ResizeSouthWest
            or CanvasSelectionHandle.Rotate
                ? null
                : surface.HitTestNode(surfacePoint);
        try
        {
            if (handle is CanvasSelectionHandle.None or CanvasSelectionHandle.Body
                && hitNodeId is Guid nodeId)
            {
                var selectionMode = NodeSelectionModeFor(e.KeyModifiers);
                if (selectionMode != NodeSelectionMode.Replace || !_viewModel.SelectedNodeIds.Contains(nodeId))
                {
                    _viewModel.SelectNode(nodeId, selectionMode);
                }
                if (_viewModel.SelectedNodeIds.Contains(nodeId))
                {
                    handle = CanvasSelectionHandle.Body;
                }
                else
                {
                    handle = CanvasSelectionHandle.None;
                }
            }
            else if (handle == CanvasSelectionHandle.None)
            {
                if (e.KeyModifiers == KeyModifiers.None)
                {
                    _viewModel.ClearNodeSelection();
                }
                e.Handled = true;
                return;
            }

            if (handle == CanvasSelectionHandle.None)
            {
                e.Handled = true;
                return;
            }

            _canvasGesture = CreateCanvasGesture(
                surface,
                handle,
                hitNodeId,
                e.KeyModifiers,
                surfacePoint);
            if (_canvasGesture is not null)
            {
                e.Pointer.Capture(surface);
            }
        }
        catch (AuthoringCommandException exception)
        {
            _viewModel.SetStatus(exception.Message);
            _canvasGesture = null;
        }
        e.Handled = true;
    }

    private void AuthoringCanvas_PointerMoved(object? sender, PointerEventArgs e)
    {
        if (sender is not DocumentSceneSurface surface
            || _canvasGesture is not { } gesture
            || !e.GetCurrentPoint(surface).Properties.IsLeftButtonPressed)
        {
            return;
        }

        var surfacePoint = e.GetPosition(surface);
        if (!gesture.HasMoved && Distance(surfacePoint, gesture.StartSurfacePoint) < 4)
        {
            return;
        }

        gesture.HasMoved = true;
        UpdateCanvasGesture(surface, gesture, surface.ToLogical(surfacePoint));
        e.Handled = true;
    }

    private void AuthoringCanvas_PointerReleased(object? sender, PointerReleasedEventArgs e)
    {
        if (sender is not DocumentSceneSurface surface)
        {
            return;
        }

        var gesture = _canvasGesture;
        _canvasGesture = null;
        surface.SetInteractionPreview(null);
        e.Pointer.Capture(null);

        try
        {
            if (gesture is { HasMoved: true } && gesture.CurrentTransforms.Count > 0)
            {
                _viewModel.CommitNodeTransforms(gesture.CurrentTransforms);
            }
            else if (gesture is { PressedNodeId: Guid nodeId, PressModifiers: KeyModifiers.None }
                     && _viewModel.SelectedNodeIds.Count > 1)
            {
                _viewModel.SelectNode(nodeId);
            }
        }
        catch (AuthoringCommandException exception)
        {
            _viewModel.SetStatus(exception.Message);
        }
        e.Handled = true;
    }

    private void AuthoringCanvas_PointerCaptureLost(object? sender, PointerCaptureLostEventArgs e)
    {
        _canvasGesture = null;
        if (sender is DocumentSceneSurface surface)
        {
            surface.SetInteractionPreview(null);
        }
    }

    private CanvasGestureState? CreateCanvasGesture(
        DocumentSceneSurface surface,
        CanvasSelectionHandle handle,
        Guid? pressedNodeId,
        KeyModifiers modifiers,
        Point startSurfacePoint)
    {
        var selectedIds = _viewModel.SelectedNodeIds.ToHashSet();
        var selectedNodes = _viewModel.ActiveSlide.Nodes
            .Where(node => selectedIds.Contains(node.Id))
            .ToArray();
        var bounds = selectedNodes
            .Select(node => (node.Id, Bounds: surface.GetNodeLogicalBounds(node.Id)))
            .Where(item => item.Bounds.HasValue)
            .ToDictionary(item => item.Id, item => item.Bounds!.Value);
        if (bounds.Count == 0)
        {
            return null;
        }

        return new CanvasGestureState(
            handle,
            pressedNodeId,
            modifiers,
            startSurfacePoint,
            surface.ToLogical(startSurfacePoint),
            Union(bounds.Values),
            bounds,
            selectedNodes.ToDictionary(node => node.Id, node => node.PresentationTransform),
            selectedNodes.ToDictionary(
                node => node.Id,
                node => node.ModelTransform.RotationDegrees + node.PresentationTransform.RotationDegrees));
    }

    private static void UpdateCanvasGesture(
        DocumentSceneSurface surface,
        CanvasGestureState gesture,
        Point currentLogicalPoint)
    {
        var preview = new Dictionary<Guid, CanvasNodePreview>();
        var transforms = new Dictionary<Guid, PresentationTransform2D>();
        var deltaX = currentLogicalPoint.X - gesture.StartLogicalPoint.X;
        var deltaY = currentLogicalPoint.Y - gesture.StartLogicalPoint.Y;

        if (gesture.Handle == CanvasSelectionHandle.Body)
        {
            foreach (var (id, bounds) in gesture.OriginalBounds)
            {
                var target = bounds with { X = bounds.X + deltaX, Y = bounds.Y + deltaY };
                var original = gesture.OriginalTransforms[id];
                preview[id] = new CanvasNodePreview(target, gesture.OriginalRotations[id]);
                transforms[id] = original with
                {
                    OffsetX = original.OffsetX + deltaX,
                    OffsetY = original.OffsetY + deltaY,
                };
            }
        }
        else if (gesture.Handle == CanvasSelectionHandle.Rotate)
        {
            var center = new Point(gesture.GroupBounds.X + gesture.GroupBounds.Width / 2,
                gesture.GroupBounds.Y + gesture.GroupBounds.Height / 2);
            var startAngle = Math.Atan2(gesture.StartLogicalPoint.Y - center.Y, gesture.StartLogicalPoint.X - center.X);
            var currentAngle = Math.Atan2(currentLogicalPoint.Y - center.Y, currentLogicalPoint.X - center.X);
            var angleDelta = (currentAngle - startAngle) * 180 / Math.PI;
            foreach (var (id, bounds) in gesture.OriginalBounds)
            {
                var nodeCenter = new Point(bounds.X + bounds.Width / 2, bounds.Y + bounds.Height / 2);
                var rotatedCenter = Rotate(nodeCenter, center, angleDelta);
                var target = bounds with
                {
                    X = rotatedCenter.X - bounds.Width / 2,
                    Y = rotatedCenter.Y - bounds.Height / 2,
                };
                var original = gesture.OriginalTransforms[id];
                preview[id] = new CanvasNodePreview(target, gesture.OriginalRotations[id] + angleDelta);
                transforms[id] = original with
                {
                    OffsetX = original.OffsetX + target.X - bounds.X,
                    OffsetY = original.OffsetY + target.Y - bounds.Y,
                    RotationDegrees = original.RotationDegrees + angleDelta,
                };
            }
        }
        else
        {
            var targetGroup = ResizeBounds(gesture.GroupBounds, gesture.Handle, currentLogicalPoint);
            var scaleX = targetGroup.Width / gesture.GroupBounds.Width;
            var scaleY = targetGroup.Height / gesture.GroupBounds.Height;
            foreach (var (id, bounds) in gesture.OriginalBounds)
            {
                var target = new RenderBounds(
                    targetGroup.X + (bounds.X - gesture.GroupBounds.X) * scaleX,
                    targetGroup.Y + (bounds.Y - gesture.GroupBounds.Y) * scaleY,
                    bounds.Width * scaleX,
                    bounds.Height * scaleY);
                var original = gesture.OriginalTransforms[id];
                preview[id] = new CanvasNodePreview(target, gesture.OriginalRotations[id]);
                transforms[id] = original with
                {
                    OffsetX = original.OffsetX + target.X - bounds.X,
                    OffsetY = original.OffsetY + target.Y - bounds.Y,
                    ScaleX = original.ScaleX * scaleX,
                    ScaleY = original.ScaleY * scaleY,
                };
            }
        }

        gesture.CurrentTransforms = transforms;
        surface.SetInteractionPreview(preview);
    }

    private static RenderBounds ResizeBounds(
        RenderBounds original,
        CanvasSelectionHandle handle,
        Point current)
    {
        const double minimum = 20;
        var left = original.X;
        var top = original.Y;
        var right = original.X + original.Width;
        var bottom = original.Y + original.Height;

        if (handle is CanvasSelectionHandle.ResizeNorthWest or CanvasSelectionHandle.ResizeSouthWest)
        {
            left = Math.Min(current.X, right - minimum);
        }
        if (handle is CanvasSelectionHandle.ResizeNorthEast or CanvasSelectionHandle.ResizeSouthEast)
        {
            right = Math.Max(current.X, left + minimum);
        }
        if (handle is CanvasSelectionHandle.ResizeNorthWest or CanvasSelectionHandle.ResizeNorthEast)
        {
            top = Math.Min(current.Y, bottom - minimum);
        }
        if (handle is CanvasSelectionHandle.ResizeSouthWest or CanvasSelectionHandle.ResizeSouthEast)
        {
            bottom = Math.Max(current.Y, top + minimum);
        }

        return new RenderBounds(left, top, right - left, bottom - top);
    }

    private static RenderBounds Union(IEnumerable<RenderBounds> bounds)
    {
        var values = bounds.ToArray();
        var left = values.Min(value => value.X);
        var top = values.Min(value => value.Y);
        var right = values.Max(value => value.X + value.Width);
        var bottom = values.Max(value => value.Y + value.Height);
        return new RenderBounds(left, top, right - left, bottom - top);
    }

    private static Point Rotate(Point point, Point center, double degrees)
    {
        var radians = degrees * Math.PI / 180;
        var cosine = Math.Cos(radians);
        var sine = Math.Sin(radians);
        var x = point.X - center.X;
        var y = point.Y - center.Y;
        return new Point(
            center.X + x * cosine - y * sine,
            center.Y + x * sine + y * cosine);
    }

    private static NodeSelectionMode NodeSelectionModeFor(KeyModifiers modifiers) =>
        modifiers.HasFlag(KeyModifiers.Control) || modifiers.HasFlag(KeyModifiers.Meta)
            ? NodeSelectionMode.Toggle
            : modifiers.HasFlag(KeyModifiers.Shift)
                ? NodeSelectionMode.Add
                : NodeSelectionMode.Replace;

    private static double Distance(Point first, Point second)
    {
        var x = first.X - second.X;
        var y = first.Y - second.Y;
        return Math.Sqrt(x * x + y * y);
    }

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
            try
            {
                if (AuthoringCanvasSurface.IsKeyboardFocusWithin && _viewModel.SelectedNodeIds.Count > 0)
                {
                    _viewModel.DeleteSelectedNodes();
                }
                else
                {
                    _viewModel.DeleteSelectedSlides();
                }
            }
            catch (AuthoringCommandException exception)
            {
                _viewModel.SetStatus(exception.Message);
            }
            e.Handled = true;
            return;
        }

        if (e.Key == Key.Escape && AuthoringCanvasSurface.IsKeyboardFocusWithin)
        {
            _viewModel.ClearNodeSelection();
            e.Handled = true;
            return;
        }

        if (AuthoringCanvasSurface.IsKeyboardFocusWithin
            && !e.KeyModifiers.HasFlag(KeyModifiers.Control)
            && !e.KeyModifiers.HasFlag(KeyModifiers.Meta)
            && !e.KeyModifiers.HasFlag(KeyModifiers.Alt)
            && e.Key is Key.Left or Key.Right or Key.Up or Key.Down)
        {
            var distance = e.KeyModifiers.HasFlag(KeyModifiers.Shift) ? 10d : 1d;
            var (x, y) = e.Key switch
            {
                Key.Left => (-distance, 0d),
                Key.Right => (distance, 0d),
                Key.Up => (0d, -distance),
                _ => (0d, distance),
            };
            try
            {
                _viewModel.NudgeSelectedNodes(x, y);
            }
            catch (AuthoringCommandException exception)
            {
                _viewModel.SetStatus(exception.Message);
            }
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
            case Key.A when AuthoringCanvasSurface.IsKeyboardFocusWithin:
                _viewModel.SelectAllVisibleNodes();
                e.Handled = true;
                break;
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

    private sealed class CanvasGestureState
    {
        public CanvasGestureState(
            CanvasSelectionHandle handle,
            Guid? pressedNodeId,
            KeyModifiers pressModifiers,
            Point startSurfacePoint,
            Point startLogicalPoint,
            RenderBounds groupBounds,
            IReadOnlyDictionary<Guid, RenderBounds> originalBounds,
            IReadOnlyDictionary<Guid, PresentationTransform2D> originalTransforms,
            IReadOnlyDictionary<Guid, double> originalRotations)
        {
            Handle = handle;
            PressedNodeId = pressedNodeId;
            PressModifiers = pressModifiers;
            StartSurfacePoint = startSurfacePoint;
            StartLogicalPoint = startLogicalPoint;
            GroupBounds = groupBounds;
            OriginalBounds = originalBounds;
            OriginalTransforms = originalTransforms;
            OriginalRotations = originalRotations;
        }

        public CanvasSelectionHandle Handle { get; }
        public Guid? PressedNodeId { get; }
        public KeyModifiers PressModifiers { get; }
        public Point StartSurfacePoint { get; }
        public Point StartLogicalPoint { get; }
        public RenderBounds GroupBounds { get; }
        public IReadOnlyDictionary<Guid, RenderBounds> OriginalBounds { get; }
        public IReadOnlyDictionary<Guid, PresentationTransform2D> OriginalTransforms { get; }
        public IReadOnlyDictionary<Guid, double> OriginalRotations { get; }
        public bool HasMoved { get; set; }
        public IReadOnlyDictionary<Guid, PresentationTransform2D> CurrentTransforms { get; set; } =
            new Dictionary<Guid, PresentationTransform2D>();
    }
}
