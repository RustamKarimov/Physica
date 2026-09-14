using Avalonia;
using Avalonia.Controls;
using Avalonia.Input;
using Avalonia.Media;

namespace PhysicaStudio.Desktop.Controls;

public sealed partial class PhysicaEyedropperOverlay : Window
{
    private readonly IScreenColorSampler? _sampler;
    private Color? _sampledColor;

    public PhysicaEyedropperOverlay()
    {
        InitializeComponent();
    }

    internal PhysicaEyedropperOverlay(IScreenColorSampler sampler, PixelRect screenBounds, double scaling)
        : this()
    {
        _sampler = sampler;
        Position = screenBounds.Position;
        Width = screenBounds.Width / scaling;
        Height = screenBounds.Height / scaling;
        Cursor = new Cursor(StandardCursorType.Cross);
    }

    protected override void OnOpened(EventArgs e)
    {
        base.OnOpened(e);
        Activate();
        Focus();
    }

    protected override void OnKeyDown(KeyEventArgs e)
    {
        if (e.Key == Key.Escape)
        {
            Close((Color?)null);
            e.Handled = true;
            return;
        }
        base.OnKeyDown(e);
    }

    private void Overlay_PointerMoved(object? sender, PointerEventArgs e)
    {
        UpdateSample(e.GetPosition(this));
    }

    private void Overlay_PointerPressed(object? sender, PointerPressedEventArgs e)
    {
        if (!e.GetCurrentPoint(this).Properties.IsLeftButtonPressed)
        {
            return;
        }

        UpdateSample(e.GetPosition(this));
        if (_sampledColor is Color selected)
        {
            Close((Color?)selected);
        }
        e.Handled = true;
    }

    private void UpdateSample(Point localPoint)
    {
        var screenPoint = new PixelPoint(
            Position.X + (int)Math.Round(localPoint.X * RenderScaling),
            Position.Y + (int)Math.Round(localPoint.Y * RenderScaling));
        if (_sampler is null || !_sampler.TrySample(screenPoint, out var color))
        {
            return;
        }

        _sampledColor = color;
        SamplePreview.Background = new SolidColorBrush(color);
        SampleHex.Text = $"#{color.R:X2}{color.G:X2}{color.B:X2}";

        const double gap = 18;
        var left = localPoint.X + gap;
        var top = localPoint.Y + gap;
        if (left + PreviewBubble.Width > Bounds.Width)
        {
            left = localPoint.X - PreviewBubble.Width - gap;
        }
        if (top + PreviewBubble.Height > Bounds.Height)
        {
            top = localPoint.Y - PreviewBubble.Height - gap;
        }
        Canvas.SetLeft(PreviewBubble, Math.Max(8, left));
        Canvas.SetTop(PreviewBubble, Math.Max(8, top));
    }
}
