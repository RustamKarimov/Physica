using System.Globalization;
using Avalonia.Controls;
using Avalonia.Controls.Primitives;
using Avalonia.Input;
using Avalonia.Interactivity;
using Avalonia.Media;
using PhysicaStudio.Document;

namespace PhysicaStudio.Desktop.Controls;

public sealed partial class PhysicaGradientEditor : UserControl
{
    private bool _synchronizing;
    private SlideGradientKind _kind = SlideGradientKind.Linear;
    private double _angle;

    public PhysicaGradientEditor()
    {
        InitializeComponent();
        SetGradient(GradientDefinition.CreateDefault("#F4F5F3", "#CFE8FF"));
    }

    public GradientDefinition Gradient => new(
        _kind,
        _angle,
        StopSurface.Stops.OrderBy(stop => stop.Position).ToArray());

    public void SetGradient(GradientDefinition gradient)
    {
        _synchronizing = true;
        try
        {
            _kind = gradient.Kind;
            _angle = NormalizeAngle(gradient.AngleDegrees);
            SelectByTag(GradientKindComboBox, _kind.ToString());
            GradientAngleSlider.Value = _angle;
            GradientAngleTextBox.Text = _angle.ToString("0.#", CultureInfo.CurrentCulture);
            StopSurface.SetStops(gradient.Stops);
            SynchronizeSelectedStop();
            UpdateKindAvailability();
        }
        finally
        {
            _synchronizing = false;
        }
    }

    public void SetThemePalette(string themeName, IEnumerable<Color> colors) =>
        StopColorField.SetThemePalette(themeName, colors);

    private void GradientKind_SelectionChanged(object? sender, SelectionChangedEventArgs e)
    {
        if (_synchronizing)
        {
            return;
        }
        if (Enum.TryParse<SlideGradientKind>((GradientKindComboBox.SelectedItem as ComboBoxItem)?.Tag?.ToString(), out var kind))
        {
            _kind = kind;
            UpdateKindAvailability();
        }
    }

    private void GradientAngle_ValueChanged(object? sender, RangeBaseValueChangedEventArgs e)
    {
        if (_synchronizing)
        {
            return;
        }
        _angle = NormalizeAngle(e.NewValue);
        GradientAngleTextBox.Text = _angle.ToString("0.#", CultureInfo.CurrentCulture);
    }

    private void GradientAngle_KeyDown(object? sender, KeyEventArgs e)
    {
        if (e.Key == Key.Enter)
        {
            ApplyAngleText();
            e.Handled = true;
        }
    }

    private void GradientAngle_LostFocus(object? sender, RoutedEventArgs e) => ApplyAngleText();

    private void ApplyAngleText()
    {
        if (_synchronizing)
        {
            return;
        }
        if (double.TryParse(GradientAngleTextBox.Text, NumberStyles.Float, CultureInfo.CurrentCulture, out var angle)
            && double.IsFinite(angle))
        {
            _angle = NormalizeAngle(angle);
            GradientAngleSlider.Value = _angle;
        }
        GradientAngleTextBox.Text = _angle.ToString("0.#", CultureInfo.CurrentCulture);
    }

    private void AddStop_Click(object? sender, RoutedEventArgs e) => StopSurface.AddStop();
    private void RemoveStop_Click(object? sender, RoutedEventArgs e) => StopSurface.RemoveSelectedStop();

    private void StopSurface_StopsChanged(object? sender, GradientStopsChangedEventArgs e) => SynchronizeSelectedStop();

    private void StopColor_ColorSelected(object? sender, PhysicaColorSelectedEventArgs e)
    {
        if (!_synchronizing)
        {
            StopSurface.SetSelectedColor(e.Color);
        }
    }

    private void StopPosition_KeyDown(object? sender, KeyEventArgs e)
    {
        if (e.Key == Key.Enter)
        {
            ApplyStopPosition();
            e.Handled = true;
        }
    }

    private void StopPosition_LostFocus(object? sender, RoutedEventArgs e) => ApplyStopPosition();

    private void ApplyStopPosition()
    {
        if (_synchronizing || StopSurface.Stops.Count == 0)
        {
            return;
        }
        if (double.TryParse(StopPositionTextBox.Text, NumberStyles.Float, CultureInfo.CurrentCulture, out var percent)
            && double.IsFinite(percent))
        {
            StopSurface.SetSelectedPosition(Math.Clamp(percent / 100, 0, 1));
        }
        SynchronizeSelectedStop();
    }

    private void SynchronizeSelectedStop()
    {
        if (StopSurface.Stops.Count == 0)
        {
            return;
        }
        _synchronizing = true;
        try
        {
            var stop = StopSurface.SelectedStop;
            StopColorField.Color = Color.Parse(stop.Color);
            StopPositionTextBox.Text = (stop.Position * 100).ToString("0.#", CultureInfo.CurrentCulture);
            RemoveStopButton.IsEnabled = StopSurface.Stops.Count > 2;
        }
        finally
        {
            _synchronizing = false;
        }
    }

    private void UpdateKindAvailability()
    {
        var linear = _kind == SlideGradientKind.Linear;
        GradientAngleLabel.IsVisible = linear;
        GradientAngleControls.IsVisible = linear;
    }

    private static void SelectByTag(ComboBox comboBox, string tag) =>
        comboBox.SelectedItem = comboBox.Items.OfType<ComboBoxItem>()
            .FirstOrDefault(item => string.Equals(item.Tag?.ToString(), tag, StringComparison.Ordinal));

    private static double NormalizeAngle(double angle)
    {
        var normalized = angle % 360;
        return normalized < 0 ? normalized + 360 : normalized;
    }
}
