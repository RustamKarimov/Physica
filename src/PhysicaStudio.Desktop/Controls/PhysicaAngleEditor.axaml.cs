using System.Globalization;
using Avalonia;
using Avalonia.Controls;
using Avalonia.Input;
using Avalonia.Interactivity;

namespace PhysicaStudio.Desktop.Controls;

public sealed partial class PhysicaAngleEditor : UserControl
{
    public static readonly StyledProperty<double> ValueProperty =
        AvaloniaProperty.Register<PhysicaAngleEditor, double>(nameof(Value), 0, coerce: CoerceValue);

    private bool _synchronizing;
    private bool _initialized;

    public PhysicaAngleEditor()
    {
        InitializeComponent();
        _initialized = true;
        SynchronizeChildren();
    }

    public event EventHandler<PhysicaAngleChangedEventArgs>? ValueChanged;

    public double Value
    {
        get => GetValue(ValueProperty);
        set => SetValue(ValueProperty, value);
    }

    protected override void OnPropertyChanged(AvaloniaPropertyChangedEventArgs change)
    {
        base.OnPropertyChanged(change);
        if (_initialized && change.Property == ValueProperty)
        {
            SynchronizeChildren();
            ValueChanged?.Invoke(this, new PhysicaAngleChangedEventArgs(Value));
        }
    }

    private void AngleSlider_ValueChanged(object? sender, PhysicaAngleChangedEventArgs e)
    {
        if (!_synchronizing)
        {
            Value = e.Value;
        }
    }

    private void AngleTextBox_KeyDown(object? sender, KeyEventArgs e)
    {
        var step = e.KeyModifiers.HasFlag(KeyModifiers.Shift) ? 15 : 1;
        if (e.Key == Key.Enter)
        {
            CommitText();
            e.Handled = true;
        }
        else if (e.Key is Key.Up or Key.Down or Key.PageUp or Key.PageDown)
        {
            var amount = e.Key is Key.PageUp or Key.PageDown ? 15 : step;
            Value = Math.Clamp(Value + (e.Key is Key.Up or Key.PageUp ? amount : -amount), 0, 360);
            AngleTextBox.SelectAll();
            e.Handled = true;
        }
    }

    private void AngleTextBox_LostFocus(object? sender, RoutedEventArgs e) => CommitText();

    private void AngleTextBox_PointerWheelChanged(object? sender, PointerWheelEventArgs e)
    {
        var step = e.KeyModifiers.HasFlag(KeyModifiers.Shift) ? 15 : 1;
        Value = Math.Clamp(Value + Math.Sign(e.Delta.Y) * step, 0, 360);
        AngleTextBox.SelectAll();
        e.Handled = true;
    }

    private void CommitText()
    {
        if (_synchronizing)
        {
            return;
        }
        if (double.TryParse(AngleTextBox.Text, NumberStyles.Float, CultureInfo.CurrentCulture, out var angle)
            && double.IsFinite(angle))
        {
            Value = Math.Clamp(angle, 0, 360);
        }
        SynchronizeChildren();
    }

    private void SynchronizeChildren()
    {
        if (!_initialized)
        {
            return;
        }
        _synchronizing = true;
        try
        {
            AngleSlider.Value = Value;
            AngleTextBox.Text = Value.ToString("0.#", CultureInfo.CurrentCulture);
        }
        finally
        {
            _synchronizing = false;
        }
    }

    private static double CoerceValue(AvaloniaObject owner, double value) =>
        double.IsFinite(value) ? Math.Clamp(value, 0, 360) : 0;
}
