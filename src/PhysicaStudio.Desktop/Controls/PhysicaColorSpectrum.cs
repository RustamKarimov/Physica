using Avalonia;
using Avalonia.Controls;
using Avalonia.Input;
using Avalonia.Media;

namespace PhysicaStudio.Desktop.Controls;

public sealed class PhysicaColorSpectrum : Control
{
    private const double HueHeight = 16;
    private const double Gap = 14;
    private double _hue;
    private double _saturation;
    private double _value = 1;
    private DragTarget _dragTarget;

    public PhysicaColorSpectrum()
    {
        Focusable = true;
        Cursor = new Cursor(StandardCursorType.Cross);
    }

    public event EventHandler<PhysicaColorSelectedEventArgs>? ColorChanged;

    public Color SelectedColor => FromHsv(_hue, _saturation, _value);

    public void SetColor(Color color, bool notify = false)
    {
        (_hue, _saturation, _value) = ToHsv(color);
        InvalidateVisual();
        if (notify)
        {
            ColorChanged?.Invoke(this, new PhysicaColorSelectedEventArgs(SelectedColor));
        }
    }

    public override void Render(DrawingContext context)
    {
        base.Render(context);
        var spectrum = SpectrumBounds;
        var hue = HueBounds;
        if (spectrum.Width <= 0 || spectrum.Height <= 0)
        {
            return;
        }

        var saturationBrush = new LinearGradientBrush
        {
            StartPoint = new RelativePoint(0, .5, RelativeUnit.Relative),
            EndPoint = new RelativePoint(1, .5, RelativeUnit.Relative),
            GradientStops =
            {
                new GradientStop(Colors.White, 0),
                new GradientStop(FromHsv(_hue, 1, 1), 1),
            },
        };
        var valueBrush = new LinearGradientBrush
        {
            StartPoint = new RelativePoint(.5, 0, RelativeUnit.Relative),
            EndPoint = new RelativePoint(.5, 1, RelativeUnit.Relative),
            GradientStops =
            {
                new GradientStop(Color.FromArgb(0, 0, 0, 0), 0),
                new GradientStop(Colors.Black, 1),
            },
        };
        context.DrawRectangle(saturationBrush, null, spectrum, 4, 4);
        context.DrawRectangle(valueBrush, new Pen(Brush.Parse("#607786"), 1), spectrum, 4, 4);

        var hueBrush = new LinearGradientBrush
        {
            StartPoint = new RelativePoint(0, .5, RelativeUnit.Relative),
            EndPoint = new RelativePoint(1, .5, RelativeUnit.Relative),
            GradientStops =
            {
                new GradientStop(Color.Parse("#FF3B30"), 0),
                new GradientStop(Color.Parse("#FFD60A"), 1d / 6),
                new GradientStop(Color.Parse("#34C759"), 2d / 6),
                new GradientStop(Color.Parse("#32D6E8"), 3d / 6),
                new GradientStop(Color.Parse("#1677FF"), 4d / 6),
                new GradientStop(Color.Parse("#AF52DE"), 5d / 6),
                new GradientStop(Color.Parse("#FF3B30"), 1),
            },
        };
        context.DrawRectangle(hueBrush, new Pen(Brush.Parse("#607786"), 1), hue, 4, 4);

        var markerX = spectrum.X + _saturation * spectrum.Width;
        var markerY = spectrum.Y + (1 - _value) * spectrum.Height;
        context.DrawEllipse(null, new Pen(Brushes.Black, 3), new Point(markerX, markerY), 7, 7);
        context.DrawEllipse(null, new Pen(Brushes.White, 2), new Point(markerX, markerY), 6, 6);

        var hueX = hue.X + _hue / 360 * hue.Width;
        context.DrawRectangle(Brushes.White, new Pen(Brushes.Black, 1.5), new Rect(hueX - 3, hue.Y - 3, 6, hue.Height + 6), 2, 2);

        if (IsFocused)
        {
            context.DrawRectangle(null, new Pen(Brush.Parse("#32A8F4"), 1.5), Bounds.Deflate(1), 5, 5);
        }
    }

    protected override void OnPointerPressed(PointerPressedEventArgs e)
    {
        base.OnPointerPressed(e);
        var point = e.GetCurrentPoint(this);
        if (!point.Properties.IsLeftButtonPressed)
        {
            return;
        }

        Focus();
        _dragTarget = SpectrumBounds.Contains(point.Position) ? DragTarget.Spectrum
            : HueBounds.Contains(point.Position) ? DragTarget.Hue
            : DragTarget.None;
        if (_dragTarget == DragTarget.None)
        {
            return;
        }

        UpdateFromPoint(point.Position);
        e.Pointer.Capture(this);
        e.Handled = true;
    }

    protected override void OnPointerMoved(PointerEventArgs e)
    {
        base.OnPointerMoved(e);
        if (_dragTarget == DragTarget.None)
        {
            return;
        }
        UpdateFromPoint(e.GetPosition(this));
        e.Handled = true;
    }

    protected override void OnPointerReleased(PointerReleasedEventArgs e)
    {
        base.OnPointerReleased(e);
        if (_dragTarget != DragTarget.None)
        {
            UpdateFromPoint(e.GetPosition(this));
        }
        _dragTarget = DragTarget.None;
        e.Pointer.Capture(null);
        e.Handled = true;
    }

    protected override void OnKeyDown(KeyEventArgs e)
    {
        base.OnKeyDown(e);
        var step = e.KeyModifiers.HasFlag(KeyModifiers.Shift) ? .05 : .01;
        switch (e.Key)
        {
            case Key.Left:
                _saturation = Math.Clamp(_saturation - step, 0, 1);
                break;
            case Key.Right:
                _saturation = Math.Clamp(_saturation + step, 0, 1);
                break;
            case Key.Up:
                _value = Math.Clamp(_value + step, 0, 1);
                break;
            case Key.Down:
                _value = Math.Clamp(_value - step, 0, 1);
                break;
            case Key.PageUp:
                _hue = (_hue + (e.KeyModifiers.HasFlag(KeyModifiers.Shift) ? 30 : 5)) % 360;
                break;
            case Key.PageDown:
                _hue = (_hue + 360 - (e.KeyModifiers.HasFlag(KeyModifiers.Shift) ? 30 : 5)) % 360;
                break;
            default:
                return;
        }
        PublishChange();
        e.Handled = true;
    }

    private Rect SpectrumBounds => new(1, 1, Math.Max(0, Bounds.Width - 2), Math.Max(0, Bounds.Height - HueHeight - Gap - 2));
    private Rect HueBounds => new(1, Math.Max(1, Bounds.Height - HueHeight - 1), Math.Max(0, Bounds.Width - 2), HueHeight);

    private void UpdateFromPoint(Point point)
    {
        if (_dragTarget == DragTarget.Spectrum)
        {
            var bounds = SpectrumBounds;
            _saturation = Math.Clamp((point.X - bounds.X) / Math.Max(1, bounds.Width), 0, 1);
            _value = 1 - Math.Clamp((point.Y - bounds.Y) / Math.Max(1, bounds.Height), 0, 1);
        }
        else if (_dragTarget == DragTarget.Hue)
        {
            var bounds = HueBounds;
            _hue = Math.Clamp((point.X - bounds.X) / Math.Max(1, bounds.Width), 0, 1) * 359.999;
        }
        PublishChange();
    }

    private void PublishChange()
    {
        InvalidateVisual();
        ColorChanged?.Invoke(this, new PhysicaColorSelectedEventArgs(SelectedColor));
    }

    private static (double Hue, double Saturation, double Value) ToHsv(Color color)
    {
        var r = color.R / 255d;
        var g = color.G / 255d;
        var b = color.B / 255d;
        var max = Math.Max(r, Math.Max(g, b));
        var min = Math.Min(r, Math.Min(g, b));
        var delta = max - min;
        var hue = 0d;
        if (delta > .00001)
        {
            if (Math.Abs(max - r) < .00001)
            {
                hue = 60 * (((g - b) / delta) % 6);
            }
            else if (Math.Abs(max - g) < .00001)
            {
                hue = 60 * ((b - r) / delta + 2);
            }
            else
            {
                hue = 60 * ((r - g) / delta + 4);
            }
        }
        if (hue < 0)
        {
            hue += 360;
        }
        return (hue, max <= .00001 ? 0 : delta / max, max);
    }

    private static Color FromHsv(double hue, double saturation, double value)
    {
        var chroma = value * saturation;
        var x = chroma * (1 - Math.Abs((hue / 60) % 2 - 1));
        var m = value - chroma;
        var (r, g, b) = hue switch
        {
            < 60 => (chroma, x, 0d),
            < 120 => (x, chroma, 0d),
            < 180 => (0d, chroma, x),
            < 240 => (0d, x, chroma),
            < 300 => (x, 0d, chroma),
            _ => (chroma, 0d, x),
        };
        return Color.FromRgb(
            (byte)Math.Clamp(Math.Round((r + m) * 255), 0, 255),
            (byte)Math.Clamp(Math.Round((g + m) * 255), 0, 255),
            (byte)Math.Clamp(Math.Round((b + m) * 255), 0, 255));
    }

    private enum DragTarget
    {
        None,
        Spectrum,
        Hue,
    }
}
