using System.Globalization;
using Avalonia;
using Avalonia.Automation;
using Avalonia.Controls;
using Avalonia.Input;
using Avalonia.Interactivity;
using Avalonia.Media;
using Avalonia.VisualTree;
using PhysicaStudio.Authoring;
using PhysicaStudio.Desktop.Controls;
using PhysicaStudio.Desktop.Resources;
using PhysicaStudio.Desktop.ViewModels;
using PhysicaStudio.Document;

namespace PhysicaStudio.Desktop.Views;

public sealed partial class MainWindow
{
    private bool _showCanvasRulers = true;
    private double _rulerMajorInterval;
    private GuideDragState? _guideDrag;
    private Window? _guidanceWindow;

    private void InitializeCanvasGuidance()
    {
        DockCanvasGuidance(selectWorkspace: false);
        SynchronizeCanvasGuidance();
        UpdateCanvasRulers();
    }

    private void SynchronizeCanvasGuidance()
    {
        if (!_viewModel.IsProjectOpen)
        {
            CanvasGuidancePanel.IsVisible = false;
            if (_guidanceWindow is not null)
            {
                DockCanvasGuidance(selectWorkspace: false);
            }
            return;
        }

        var slide = _viewModel.ActiveSlide;
        var settings = slide.SnapSettings;
        AuthoringCanvasSurface.Guidance = new CanvasGuidanceState(
            _viewModel.Session.CurrentProject.Canvas,
            slide.Guides,
            settings);
        ShowRulersCheckBox.IsChecked = _showCanvasRulers;
        ShowGridCheckBox.IsChecked = settings.ShowGrid;
        ShowGuidesCheckBox.IsChecked = settings.ShowGuides;
        ShowMarginsCheckBox.IsChecked = settings.ShowMargins;
        ShowSafeAreaCheckBox.IsChecked = settings.ShowSafeArea;
        SnapEnabledCheckBox.IsChecked = settings.Enabled;
        SnapObjectsCheckBox.IsChecked = settings.SnapToObjects;
        SnapGridCheckBox.IsChecked = settings.SnapToGrid;
        SnapGuidesCheckBox.IsChecked = settings.SnapToGuides;
        SnapSlideCheckBox.IsChecked = settings.SnapToSlide;
        GridSpacingTextBox.Text = settings.GridSpacing.ToString("0.##", CultureInfo.CurrentCulture);
        RulerIntervalTextBox.Text = _rulerMajorInterval > 0
            ? _rulerMajorInterval.ToString("0.##", CultureInfo.CurrentCulture)
            : AppText.Auto;
        UpdateCanvasRulers();
    }

    private void UpdateCanvasRulers()
    {
        var visible = _showCanvasRulers && _viewModel.IsProjectOpen;
        HorizontalCanvasRuler.IsVisible = visible;
        VerticalCanvasRuler.IsVisible = visible;
        CanvasRulerCorner.IsVisible = visible;
        if (!visible)
        {
            return;
        }

        HorizontalCanvasRuler.ViewportZoom = _canvasViewport.Zoom;
        HorizontalCanvasRuler.StartOffset = _canvasViewport.OffsetX - 22;
        HorizontalCanvasRuler.LogicalLength = _viewModel.SlideLogicalWidth;
        HorizontalCanvasRuler.MajorInterval = _rulerMajorInterval;
        VerticalCanvasRuler.ViewportZoom = _canvasViewport.Zoom;
        VerticalCanvasRuler.StartOffset = _canvasViewport.OffsetY - 22;
        VerticalCanvasRuler.LogicalLength = _viewModel.SlideLogicalHeight;
        VerticalCanvasRuler.MajorInterval = _rulerMajorInterval;
    }

    private void OpenCanvasGuidance()
    {
        SynchronizeCanvasGuidance();
        if (_guidanceWindow is not null)
        {
            _guidanceWindow.Activate();
            return;
        }
        EnsureRightPanelVisible();
        _viewModel.SelectRightPanelWorkspace(RightPanelWorkspace.Guides);
        CanvasGuidancePanel.IsVisible = true;
    }

    private void ToggleCanvasGuidanceDock_Click(object? sender, RoutedEventArgs e)
    {
        if (_guidanceWindow is null)
        {
            FloatCanvasGuidance();
        }
        else
        {
            DockCanvasGuidance(selectWorkspace: true);
        }
    }

    private void FloatCanvasGuidance()
    {
        if (!_viewModel.IsProjectOpen || _guidanceWindow is not null)
        {
            return;
        }

        DetachCanvasGuidancePanel();
        ApplyGuidanceHostStyle();
        GuidanceDockToggleIcon.IconKey = "dock";
        ToolTip.SetTip(GuidanceDockToggleButton, AppText.DockPanel);
        AutomationProperties.SetName(GuidanceDockToggleButton, AppText.DockPanel);

        var window = new Window
        {
            Title = AppText.CanvasGuidance,
            Width = 410,
            Height = 720,
            MinWidth = 360,
            MinHeight = 480,
            CanResize = true,
            ShowInTaskbar = false,
            WindowStartupLocation = WindowStartupLocation.CenterOwner,
            Background = Brush.Parse("#0C1821"),
            Content = CanvasGuidancePanel,
        };
        _guidanceWindow = window;
        window.Closed += (_, _) =>
        {
            if (!ReferenceEquals(_guidanceWindow, window))
            {
                return;
            }
            window.Content = null;
            _guidanceWindow = null;
            DockCanvasGuidance(selectWorkspace: true);
        };

        _viewModel.SelectRightPanelWorkspace(RightPanelWorkspace.Inspector);
        window.Show(this);
    }

    private void DockCanvasGuidance(bool selectWorkspace)
    {
        if (_guidanceWindow is { } window)
        {
            window.Content = null;
            _guidanceWindow = null;
            window.Close();
        }
        DetachCanvasGuidancePanel();
        if (!GuidanceDockHost.Children.Contains(CanvasGuidancePanel))
        {
            GuidanceDockHost.Children.Add(CanvasGuidancePanel);
        }
        ApplyGuidanceHostStyle();
        GuidanceDockToggleIcon.IconKey = "float";
        ToolTip.SetTip(GuidanceDockToggleButton, AppText.FloatPanel);
        AutomationProperties.SetName(GuidanceDockToggleButton, AppText.FloatPanel);

        if (selectWorkspace && _viewModel.IsProjectOpen)
        {
            EnsureRightPanelVisible();
            _viewModel.SelectRightPanelWorkspace(RightPanelWorkspace.Guides);
            CanvasGuidancePanel.IsVisible = true;
        }
    }

    private void DetachCanvasGuidancePanel()
    {
        if (CanvasGuidancePanel.GetVisualParent() is Panel panel)
        {
            panel.Children.Remove(CanvasGuidancePanel);
        }
        else if (CanvasGuidancePanel.GetVisualParent() is ContentControl contentControl)
        {
            contentControl.Content = null;
        }
    }

    private void ApplyGuidanceHostStyle()
    {
        CanvasGuidancePanel.Width = double.NaN;
        CanvasGuidancePanel.MaxHeight = double.PositiveInfinity;
        CanvasGuidancePanel.HorizontalAlignment = Avalonia.Layout.HorizontalAlignment.Stretch;
        CanvasGuidancePanel.VerticalAlignment = Avalonia.Layout.VerticalAlignment.Stretch;
        CanvasGuidancePanel.Margin = default;
        CanvasGuidancePanel.BorderThickness = default;
        CanvasGuidancePanel.CornerRadius = default;
        CanvasGuidancePanel.BoxShadow = default;
    }

    private void CloseFloatingGuidanceForApplicationExit()
    {
        if (_guidanceWindow is not { } window)
        {
            return;
        }
        window.Content = null;
        _guidanceWindow = null;
        window.Close();
    }

    private void ShowRulers_Click(object? sender, RoutedEventArgs e)
    {
        _showCanvasRulers = ShowRulersCheckBox.IsChecked == true;
        UpdateCanvasRulers();
    }

    private void ShowGrid_Click(object? sender, RoutedEventArgs e) =>
        UpdateGuidance(settings => settings with { ShowGrid = ShowGridCheckBox.IsChecked == true });

    private void ShowGuides_Click(object? sender, RoutedEventArgs e) =>
        UpdateGuidance(settings => settings with { ShowGuides = ShowGuidesCheckBox.IsChecked == true });

    private void ShowMargins_Click(object? sender, RoutedEventArgs e) =>
        UpdateGuidance(settings => settings with { ShowMargins = ShowMarginsCheckBox.IsChecked == true });

    private void ShowSafeArea_Click(object? sender, RoutedEventArgs e) =>
        UpdateGuidance(settings => settings with { ShowSafeArea = ShowSafeAreaCheckBox.IsChecked == true });

    private void SnapEnabled_Click(object? sender, RoutedEventArgs e) =>
        UpdateGuidance(settings => settings with { Enabled = SnapEnabledCheckBox.IsChecked == true });

    private void SnapObjects_Click(object? sender, RoutedEventArgs e) =>
        UpdateGuidance(settings => settings with { SnapToObjects = SnapObjectsCheckBox.IsChecked == true });

    private void SnapGrid_Click(object? sender, RoutedEventArgs e) =>
        UpdateGuidance(settings => settings with { SnapToGrid = SnapGridCheckBox.IsChecked == true });

    private void SnapGuides_Click(object? sender, RoutedEventArgs e) =>
        UpdateGuidance(settings => settings with { SnapToGuides = SnapGuidesCheckBox.IsChecked == true });

    private void SnapSlide_Click(object? sender, RoutedEventArgs e) =>
        UpdateGuidance(settings => settings with { SnapToSlide = SnapSlideCheckBox.IsChecked == true });

    private void UpdateGuidance(Func<SnapSettings, SnapSettings> update)
    {
        try
        {
            _viewModel.UpdateSnapSettings(update);
        }
        catch (AuthoringCommandException exception)
        {
            _viewModel.SetStatus(exception.Message);
            SynchronizeCanvasGuidance();
        }
    }

    private void GridSpacing_KeyDown(object? sender, KeyEventArgs e)
    {
        if (e.Key == Key.Enter)
        {
            CommitGridSpacing();
            AuthoringCanvasSurface.Focus();
            e.Handled = true;
        }
        else if (e.Key == Key.Escape)
        {
            SynchronizeCanvasGuidance();
            AuthoringCanvasSurface.Focus();
            e.Handled = true;
        }
    }

    private void GridSpacing_LostFocus(object? sender, RoutedEventArgs e) => CommitGridSpacing();

    private void GridPreset_Click(object? sender, RoutedEventArgs e)
    {
        if (sender is Button { Tag: string value }
            && double.TryParse(value, NumberStyles.Float, CultureInfo.InvariantCulture, out var spacing))
        {
            SetGridSpacing(spacing);
        }
    }

    private void CommitGridSpacing()
    {
        if (!_viewModel.IsProjectOpen)
        {
            return;
        }
        if (!double.TryParse(GridSpacingTextBox.Text, NumberStyles.Float, CultureInfo.CurrentCulture, out var spacing))
        {
            _viewModel.SetStatus(AppText.GridSpacingRange);
            SynchronizeCanvasGuidance();
            return;
        }
        if (Math.Abs(spacing - _viewModel.ActiveSlide.SnapSettings.GridSpacing) < .001)
        {
            return;
        }
        SetGridSpacing(spacing);
    }

    private void SetGridSpacing(double spacing)
    {
        try
        {
            _viewModel.SetGridSpacing(spacing);
        }
        catch (AuthoringCommandException exception)
        {
            _viewModel.SetStatus(exception.Message);
            SynchronizeCanvasGuidance();
        }
    }

    private void RulerInterval_KeyDown(object? sender, KeyEventArgs e)
    {
        if (e.Key == Key.Enter)
        {
            CommitRulerInterval();
            AuthoringCanvasSurface.Focus();
            e.Handled = true;
        }
        else if (e.Key == Key.Escape)
        {
            SynchronizeCanvasGuidance();
            AuthoringCanvasSurface.Focus();
            e.Handled = true;
        }
    }

    private void RulerInterval_LostFocus(object? sender, RoutedEventArgs e) => CommitRulerInterval();

    private void AutoRulerInterval_Click(object? sender, RoutedEventArgs e) => SetRulerInterval(0);

    private void RulerPreset_Click(object? sender, RoutedEventArgs e)
    {
        if (sender is Button { Tag: string value }
            && double.TryParse(value, NumberStyles.Float, CultureInfo.InvariantCulture, out var interval))
        {
            SetRulerInterval(interval);
        }
    }

    private void CommitRulerInterval()
    {
        var text = RulerIntervalTextBox.Text?.Trim();
        if (string.Equals(text, AppText.Auto, StringComparison.CurrentCultureIgnoreCase))
        {
            SetRulerInterval(0);
            return;
        }
        if (!double.TryParse(text, NumberStyles.Float, CultureInfo.CurrentCulture, out var interval)
            || interval < 5
            || interval > 1000)
        {
            _viewModel.SetStatus(AppText.RulerIntervalRange);
            SynchronizeCanvasGuidance();
            return;
        }
        SetRulerInterval(interval);
    }

    private void SetRulerInterval(double interval)
    {
        _rulerMajorInterval = interval;
        RulerIntervalTextBox.Text = interval > 0
            ? interval.ToString("0.##", CultureInfo.CurrentCulture)
            : AppText.Auto;
        UpdateCanvasRulers();
    }

    private void AddVerticalGuide_Click(object? sender, RoutedEventArgs e) =>
        ExecuteGuideAction(() => _viewModel.AddGuide(GuideOrientation.Vertical));

    private void AddHorizontalGuide_Click(object? sender, RoutedEventArgs e) =>
        ExecuteGuideAction(() => _viewModel.AddGuide(GuideOrientation.Horizontal));

    private void ClearGuides_Click(object? sender, RoutedEventArgs e) =>
        ExecuteGuideAction(_viewModel.ClearGuides);

    private void ToggleGuideLock_Click(object? sender, RoutedEventArgs e)
    {
        if (sender is Control { DataContext: GuideDefinition guide })
        {
            ExecuteGuideAction(() => _viewModel.ToggleGuideLock(guide.Id));
        }
    }

    private void GuidePosition_KeyDown(object? sender, KeyEventArgs e)
    {
        if (sender is not TextBox textBox)
        {
            return;
        }
        if (e.Key == Key.Enter)
        {
            CommitGuidePosition(textBox);
            AuthoringCanvasSurface.Focus();
            e.Handled = true;
        }
        else if (e.Key == Key.Escape)
        {
            RestoreGuidePosition(textBox);
            AuthoringCanvasSurface.Focus();
            e.Handled = true;
        }
    }

    private void GuidePosition_LostFocus(object? sender, RoutedEventArgs e)
    {
        if (sender is TextBox textBox)
        {
            CommitGuidePosition(textBox);
        }
    }

    private void CommitGuidePosition(TextBox textBox)
    {
        if (textBox.DataContext is not GuideDefinition guide)
        {
            return;
        }
        var limit = guide.Orientation == GuideOrientation.Vertical
            ? _viewModel.SlideLogicalWidth
            : _viewModel.SlideLogicalHeight;
        if (!double.TryParse(textBox.Text, NumberStyles.Float, CultureInfo.CurrentCulture, out var position)
            || position < 0
            || position > limit)
        {
            _viewModel.SetStatus(AppText.GuidePositionRange);
            RestoreGuidePosition(textBox);
            return;
        }
        if (Math.Abs(position - guide.Position) < .001)
        {
            return;
        }
        ExecuteGuideAction(() => _viewModel.MoveGuide(guide.Id, position));
    }

    private static void RestoreGuidePosition(TextBox textBox)
    {
        if (textBox.DataContext is GuideDefinition guide)
        {
            textBox.Text = guide.Position.ToString("0.##", CultureInfo.CurrentCulture);
        }
    }

    private void RemoveGuide_Click(object? sender, RoutedEventArgs e)
    {
        if (sender is Control { DataContext: GuideDefinition guide })
        {
            ExecuteGuideAction(() => _viewModel.RemoveGuide(guide.Id));
        }
    }

    private void ExecuteGuideAction(Action action)
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

    private bool TryBeginGuideDrag(DocumentSceneSurface surface, PointerPressedEventArgs e)
    {
        if (!e.GetCurrentPoint(surface).Properties.IsLeftButtonPressed
            || surface.HitTestGuide(e.GetPosition(surface)) is not { } guide)
        {
            return false;
        }

        _canvasGesture = null;
        _guideDrag = new GuideDragState(guide.Id, guide.Orientation, guide.Position);
        surface.Focus();
        e.Pointer.Capture(surface);
        return true;
    }

    private bool TryUpdateGuideDrag(DocumentSceneSurface surface, PointerEventArgs e)
    {
        if (_guideDrag is not { } drag || !e.GetCurrentPoint(surface).Properties.IsLeftButtonPressed)
        {
            return false;
        }
        var logical = surface.ToLogical(e.GetPosition(surface));
        var limit = drag.Orientation == GuideOrientation.Vertical
            ? _viewModel.SlideLogicalWidth
            : _viewModel.SlideLogicalHeight;
        var position = Math.Clamp(
            drag.Orientation == GuideOrientation.Vertical ? logical.X : logical.Y,
            0,
            limit);
        drag.CurrentPosition = position;
        drag.HasMoved = Math.Abs(position - drag.OriginalPosition) > .001;
        surface.SetGuidePreview(drag.Id, position);
        return true;
    }

    private bool TryEndGuideDrag(DocumentSceneSurface surface, PointerReleasedEventArgs e)
    {
        if (_guideDrag is not { } drag)
        {
            return false;
        }
        _guideDrag = null;
        surface.SetGuidePreview(null);
        e.Pointer.Capture(null);
        if (drag.HasMoved)
        {
            ExecuteGuideAction(() => _viewModel.MoveGuide(drag.Id, drag.CurrentPosition));
        }
        return true;
    }

    private void CancelGuideDrag(DocumentSceneSurface surface)
    {
        _guideDrag = null;
        surface.SetGuidePreview(null);
    }

    private SnapResult SnapCanvasBounds(
        DocumentSceneSurface surface,
        NodeBounds moving,
        double desiredX,
        double desiredY,
        KeyModifiers modifiers)
    {
        var settings = _viewModel.ActiveSlide.SnapSettings;
        if (modifiers.HasFlag(KeyModifiers.Alt))
        {
            settings = settings with { Enabled = false };
        }
        settings = settings with { Threshold = settings.Threshold / Math.Max(_canvasViewport.Zoom, .001) };

        var selected = _viewModel.SelectedNodeIds;
        var peers = _viewModel.ActiveSlide.Nodes
            .Where(node => node.ParentId is null && node.IsVisible && !selected.Contains(node.Id))
            .Select(node => surface.GetNodeLogicalBounds(node.Id))
            .Where(bounds => bounds.HasValue)
            .Select(bounds => new NodeBounds(bounds!.Value.X, bounds.Value.Y, bounds.Value.Width, bounds.Value.Height))
            .ToArray();
        return SnapEngine.Snap(
            moving,
            desiredX,
            desiredY,
            _viewModel.Session.CurrentProject.Canvas,
            _viewModel.ActiveSlide.Guides,
            peers,
            settings);
    }

    private static IReadOnlyList<CanvasSnapLine> SnapLines(SnapResult result) =>
        result.Matches.Select(match => new CanvasSnapLine(match.Axis, match.Source, match.Position)).ToArray();

    private sealed class GuideDragState(Guid id, GuideOrientation orientation, double originalPosition)
    {
        public Guid Id { get; } = id;
        public GuideOrientation Orientation { get; } = orientation;
        public double OriginalPosition { get; } = originalPosition;
        public double CurrentPosition { get; set; } = originalPosition;
        public bool HasMoved { get; set; }
    }
}
