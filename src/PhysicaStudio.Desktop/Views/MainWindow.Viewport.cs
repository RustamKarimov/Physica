using System.ComponentModel;
using System.Globalization;
using Avalonia;
using Avalonia.Controls;
using Avalonia.Input;
using Avalonia.Interactivity;
using Avalonia.Media;
using PhysicaStudio.Desktop.Controls;
using PhysicaStudio.Document;
using PhysicaStudio.Rendering2D;

namespace PhysicaStudio.Desktop.Views;

public sealed partial class MainWindow
{
    private const double ZoomStep = 1.2;
    private readonly CanvasViewportSession _canvasViewportSession = new();
    private readonly ScaleTransform _canvasScaleTransform = new();
    private CanvasViewportState _canvasViewport = CanvasViewportState.Initial;
    private Point? _canvasPanStart;
    private CanvasViewportState? _canvasPanOrigin;
    private Guid? _viewportProjectId;
    private Guid? _viewportSlideId;
    private RenderSize? _viewportLogicalSize;
    private bool _spacePanArmed;

    private void InitializeCanvasViewport()
    {
        AuthoringSlideFrame.RenderTransform = _canvasScaleTransform;
        _viewModel.PropertyChanged += ViewModel_ViewportPropertyChanged;
        SynchronizeCanvasViewport();
    }

    private void ViewModel_ViewportPropertyChanged(object? sender, PropertyChangedEventArgs e)
    {
        if (e.PropertyName is nameof(ViewModels.StudioShellViewModel.ActiveSlide)
            or nameof(ViewModels.StudioShellViewModel.ActiveScene)
            or nameof(ViewModels.StudioShellViewModel.IsProjectOpen))
        {
            SynchronizeCanvasViewport();
        }
    }

    private void SynchronizeCanvasViewport()
    {
        if (!_viewModel.IsProjectOpen)
        {
            return;
        }

        var project = _viewModel.Session.CurrentProject;
        var slide = _viewModel.ActiveSlide;
        var slideIds = project.Slides.Select(candidate => candidate.Id).ToHashSet();
        _canvasViewportSession.RetainSlides(slideIds);
        var identityChanged = _viewportProjectId != project.Id || _viewportSlideId != slide.Id;
        var logicalSize = new RenderSize(_viewModel.SlideLogicalWidth, _viewModel.SlideLogicalHeight);
        var sizeChanged = _viewportLogicalSize != logicalSize;
        if (identityChanged)
        {
            _canvasViewport = _canvasViewportSession.Activate(project.Id, slide.Id, _canvasViewport);
            _viewportProjectId = project.Id;
            _viewportSlideId = slide.Id;
        }

        _viewportLogicalSize = logicalSize;
        if (identityChanged || sizeChanged)
        {
            ApplyCanvasViewport(_canvasViewport);
        }
    }

    private void CanvasViewport_SizeChanged(object? sender, SizeChangedEventArgs e) =>
        ApplyCanvasViewport(_canvasViewport);

    private void CanvasViewport_PointerWheelChanged(object? sender, PointerWheelEventArgs e)
    {
        if (!_viewModel.IsProjectOpen || _canvasGesture is not null || _canvasPanStart is not null)
        {
            return;
        }

        AuthoringCanvasSurface.Focus();
        var commandModifier = e.KeyModifiers.HasFlag(KeyModifiers.Control)
            || e.KeyModifiers.HasFlag(KeyModifiers.Meta);
        if (commandModifier)
        {
            var factor = Math.Pow(1.12, e.Delta.Y);
            var anchor = e.GetPosition(CanvasViewportHost);
            ApplyCanvasViewport(CanvasViewportGeometry.ZoomAt(
                _canvasViewport,
                CurrentSlideSize(),
                CanvasViewportHost.Bounds.Size,
                anchor,
                _canvasViewport.Zoom * factor));
        }
        else
        {
            var deltaX = e.Delta.X * 48;
            var deltaY = e.Delta.Y * 48;
            if (e.KeyModifiers.HasFlag(KeyModifiers.Shift) && Math.Abs(deltaX) < .001)
            {
                deltaX = deltaY;
                deltaY = 0;
            }

            ApplyCanvasViewport(CanvasViewportGeometry.PanBy(
                _canvasViewport,
                CurrentSlideSize(),
                CanvasViewportHost.Bounds.Size,
                deltaX,
                deltaY));
        }

        e.Handled = true;
    }

    private bool TryBeginCanvasPan(DocumentSceneSurface surface, PointerPressedEventArgs e)
    {
        var properties = e.GetCurrentPoint(surface).Properties;
        var isPanGesture = properties.IsMiddleButtonPressed
            || (_spacePanArmed && properties.IsLeftButtonPressed);
        if (!isPanGesture)
        {
            return false;
        }

        surface.Focus();
        _canvasGesture = null;
        surface.SetInteractionPreview(null);
        surface.SetSelectionMarquee(null);
        _canvasPanStart = e.GetPosition(CanvasViewportHost);
        _canvasPanOrigin = _canvasViewport;
        e.Pointer.Capture(surface);
        return true;
    }

    private bool TryUpdateCanvasPan(DocumentSceneSurface surface, PointerEventArgs e)
    {
        if (_canvasPanStart is not Point start || _canvasPanOrigin is not CanvasViewportState origin)
        {
            return false;
        }

        var current = e.GetPosition(CanvasViewportHost);
        ApplyCanvasViewport(CanvasViewportGeometry.PanBy(
            origin,
            CurrentSlideSize(),
            CanvasViewportHost.Bounds.Size,
            current.X - start.X,
            current.Y - start.Y));
        return true;
    }

    private bool TryEndCanvasPan(DocumentSceneSurface surface, PointerReleasedEventArgs e)
    {
        if (_canvasPanStart is null)
        {
            return false;
        }

        _canvasPanStart = null;
        _canvasPanOrigin = null;
        e.Pointer.Capture(null);
        return true;
    }

    private void CancelCanvasPan()
    {
        _canvasPanStart = null;
        _canvasPanOrigin = null;
    }

    private bool TryHandleViewportKeyDown(KeyEventArgs e)
    {
        if (e.Source is TextBox || !AuthoringCanvasSurface.IsKeyboardFocusWithin)
        {
            return false;
        }

        if (e.Key == Key.Space)
        {
            _spacePanArmed = true;
            e.Handled = true;
            return true;
        }

        var commandModifier = e.KeyModifiers.HasFlag(KeyModifiers.Control)
            || e.KeyModifiers.HasFlag(KeyModifiers.Meta);
        if (!commandModifier)
        {
            return false;
        }

        if (e.Key == Key.D0)
        {
            SetCanvasViewportMode(CanvasViewportMode.FitSlide);
            e.Handled = true;
            return true;
        }

        if (e.Key == Key.D1)
        {
            SetCanvasViewportMode(CanvasViewportMode.ActualSize);
            e.Handled = true;
            return true;
        }

        return false;
    }

    private void Window_KeyUp(object? sender, KeyEventArgs e)
    {
        if (e.Key == Key.Space)
        {
            _spacePanArmed = false;
            e.Handled = AuthoringCanvasSurface.IsKeyboardFocusWithin;
        }
    }

    private void ZoomOut_Click(object? sender, RoutedEventArgs e) =>
        ZoomAroundViewportCenter(_canvasViewport.Zoom / ZoomStep);

    private void ZoomIn_Click(object? sender, RoutedEventArgs e) =>
        ZoomAroundViewportCenter(_canvasViewport.Zoom * ZoomStep);

    private void FitSlide_Click(object? sender, RoutedEventArgs e) =>
        SetCanvasViewportMode(CanvasViewportMode.FitSlide);

    private void ZoomPreset_Click(object? sender, RoutedEventArgs e)
    {
        if (sender is not Control { Tag: string tag })
        {
            return;
        }

        switch (tag)
        {
            case "FitSlide":
                SetCanvasViewportMode(CanvasViewportMode.FitSlide);
                return;
            case "FitWidth":
                SetCanvasViewportMode(CanvasViewportMode.FitWidth);
                return;
            case "ActualSize":
                SetCanvasViewportMode(CanvasViewportMode.ActualSize);
                return;
        }

        if (double.TryParse(tag, NumberStyles.Float, CultureInfo.InvariantCulture, out var zoom))
        {
            ZoomAroundViewportCenter(zoom);
        }
    }

    private void OpenZoomOptions() => ZoomMenuButton.Flyout?.ShowAt(ZoomMenuButton);

    private void SetCanvasViewportMode(CanvasViewportMode mode) =>
        ApplyCanvasViewport(CanvasViewportGeometry.SetMode(
            mode,
            CurrentSlideSize(),
            CanvasViewportHost.Bounds.Size));

    private void ZoomAroundViewportCenter(double zoom) =>
        ApplyCanvasViewport(CanvasViewportGeometry.ZoomAt(
            _canvasViewport,
            CurrentSlideSize(),
            CanvasViewportHost.Bounds.Size,
            new Point(CanvasViewportHost.Bounds.Width / 2, CanvasViewportHost.Bounds.Height / 2),
            zoom));

    private void ApplyCanvasViewport(CanvasViewportState requested)
    {
        if (!_viewModel.IsProjectOpen
            || CanvasViewportHost.Bounds.Width <= 0
            || CanvasViewportHost.Bounds.Height <= 0)
        {
            return;
        }

        _canvasViewport = CanvasViewportGeometry.Resolve(
            requested,
            CurrentSlideSize(),
            CanvasViewportHost.Bounds.Size);
        _canvasScaleTransform.ScaleX = _canvasViewport.Zoom;
        _canvasScaleTransform.ScaleY = _canvasViewport.Zoom;
        AuthoringCanvasSurface.ViewportZoom = _canvasViewport.Zoom;
        Canvas.SetLeft(AuthoringSlideFrame, _canvasViewport.OffsetX);
        Canvas.SetTop(AuthoringSlideFrame, _canvasViewport.OffsetY);
        ZoomPercentText.Text = string.Create(
            CultureInfo.CurrentCulture,
            $"{Math.Round(_canvasViewport.Zoom * 100):0}%");
        _canvasViewportSession.SaveCurrent(_canvasViewport);
    }

    private RenderSize CurrentSlideSize() =>
        new(_viewModel.SlideLogicalWidth, _viewModel.SlideLogicalHeight);
}
