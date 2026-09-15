using Avalonia;
using Avalonia.Controls;
using Avalonia.Input;
using Avalonia.Media;

namespace PhysicaStudio.Desktop.Controls;

public sealed class PhysicaAngleChangedEventArgs(double value) : EventArgs
{
    public double Value { get; } = value;
}

/// <summary>
/// Reusable, theme-independent 0–360 degree rail for gradients, rotations,
/// cameras, vectors, and later presentation-object formatting.
/// </summary>
public sealed class PhysicaAngleSlider : Control
{
    public static readonly StyledProperty<double> ValueProperty =
        AvaloniaProperty.Register<PhysicaAngleSlider, double>(nameof(Value), 0, coerce: CoerceValue);

    private bool _dragging;

    public PhysicaAngleSlider()
    {
        Focusable = true;
        Cursor = new Cursor(StandardCursorType.Hand);
        MinWidth = 110;
        Height = 32;
    }

    public event EventHandler<PhysicaAngleChangedEventArgs>? ValueChanged;

    public double Value
    {
        get => GetValue(ValueProperty);
        set => SetValue(ValueProperty, value);
    }

    public override void Render(DrawingContext context)
    {
        base.Render(context);
        var rail = RailBounds;
        var centreY = rail.Center.Y;
        var progress = rail.Width * Value / 360;

        context.DrawRectangle(Brush.Parse("#405460"), null, rail, 2, 2);
        if (progress > 0)
        {
            var progressBrush = new LinearGradientBrush
            {
                StartPoint = new RelativePoint(0, .5, RelativeUnit.Relative),
                EndPoint = new RelativePoint(1, .5, RelativeUnit.Relative),
                GradientStops =
                {
                    new GradientStop(Color.Parse("#26C4C1"), 0),
                    new GradientStop(Color.Parse("#168CFF"), 1),
                },
            };
            context.DrawRectangle(progressBrush, null, new Rect(rail.X, rail.Y, progress, rail.Height), 2, 2);
        }

        for (var index = 0; index <= 4; index++)
        {
            var x = rail.X + rail.Width * index / 4;
            var tickPen = new Pen(Brush.Parse(index is 0 or 4 ? "#A8BAC4" : "#718692"), 1);
            context.DrawLine(tickPen, new Point(x, centreY + 6), new Point(x, centreY + (index is 0 or 4 ? 10 : 8)));
        }

        var thumb = new Point(rail.X + progress, centreY);
        if (IsFocused)
        {
            context.DrawEllipse(null, new Pen(Brush.Parse("#55BEFA"), 1.5), thumb, 7, 7);
        }
        context.DrawEllipse(Brush.Parse("#0C1922"), new Pen(Brush.Parse("#DCE9EF"), 1.25), thumb, 5.5, 5.5);
        context.DrawEllipse(Brush.Parse("#168CFF"), null, thumb, 3.4, 3.4);
    }

    protected override void OnPropertyChanged(AvaloniaPropertyChangedEventArgs change)
    {
        base.OnPropertyChanged(change);
        if (change.Property == ValueProperty)
        {
            InvalidateVisual();
            ValueChanged?.Invoke(this, new PhysicaAngleChangedEventArgs(Value));
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
        _dragging = true;
        SetFromX(point.Position.X);
        e.Pointer.Capture(this);
        e.Handled = true;
    }

    protected override void OnPointerMoved(PointerEventArgs e)
    {
        base.OnPointerMoved(e);
        if (!_dragging)
        {
            return;
        }
        SetFromX(e.GetPosition(this).X);
        e.Handled = true;
    }

    protected override void OnPointerReleased(PointerReleasedEventArgs e)
    {
        base.OnPointerReleased(e);
        if (_dragging)
        {
            SetFromX(e.GetPosition(this).X);
        }
        _dragging = false;
        e.Pointer.Capture(null);
        e.Handled = true;
    }

    protected override void OnPointerWheelChanged(PointerWheelEventArgs e)
    {
        base.OnPointerWheelChanged(e);
        Value = Math.Clamp(Value + Math.Sign(e.Delta.Y) * Step(e.KeyModifiers), 0, 360);
        e.Handled = true;
    }

    protected override void OnKeyDown(KeyEventArgs e)
    {
        base.OnKeyDown(e);
        var step = Step(e.KeyModifiers);
        Value = e.Key switch
        {
            Key.Left or Key.Down => Math.Max(0, Value - step),
            Key.Right or Key.Up => Math.Min(360, Value + step),
            Key.PageDown => Math.Max(0, Value - 15),
            Key.PageUp => Math.Min(360, Value + 15),
            Key.Home => 0,
            Key.End => 360,
            _ => Value,
        };
        if (e.Key is Key.Left or Key.Down or Key.Right or Key.Up or Key.PageDown or Key.PageUp or Key.Home or Key.End)
        {
            e.Handled = true;
        }
    }

    private Rect RailBounds => new(9, Math.Max(2, (Bounds.Height - 4) / 2 - 2), Math.Max(1, Bounds.Width - 18), 4);

    private void SetFromX(double x) => Value = Math.Round(Math.Clamp((x - RailBounds.X) / RailBounds.Width, 0, 1) * 360, 1);

    private static double Step(KeyModifiers modifiers) => modifiers.HasFlag(KeyModifiers.Shift) ? 15 : 1;

    private static double CoerceValue(AvaloniaObject owner, double value) =>
        double.IsFinite(value) ? Math.Clamp(value, 0, 360) : 0;
}
