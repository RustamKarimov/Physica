using Avalonia.Controls;
using Avalonia.Controls.Primitives;
using Avalonia.Interactivity;

namespace PhysicaStudio.Desktop.Views;

public sealed partial class PresenterPreviewWindow : Window
{
    private int _checkpoint = 2;

    public PresenterPreviewWindow() : this(PresenterPreviewMode.Dark)
    {
    }

    public PresenterPreviewWindow(PresenterPreviewMode mode)
    {
        InitializeComponent();
        SetMode(mode);
    }

    private void Close_Click(object? sender, RoutedEventArgs e) => Close();

    private void ShowDark_Click(object? sender, RoutedEventArgs e)
        => SetMode(PresenterPreviewMode.Dark);

    private void ShowInteractive_Click(object? sender, RoutedEventArgs e)
        => SetMode(PresenterPreviewMode.Interactive);

    private void SetMode(PresenterPreviewMode mode)
    {
        var isDark = mode == PresenterPreviewMode.Dark;
        DarkPresentation.IsVisible = isDark;
        InteractivePresentation.IsVisible = !isDark;
        DarkModeButton.Classes.Set("physica-primary", isDark);
        InteractiveModeButton.Classes.Set("physica-primary", !isDark);
    }

    private void SpeedSlider_ValueChanged(object? sender, RangeBaseValueChangedEventArgs e) =>
        SpeedValue.Text = $"{e.NewValue:0.0} m/s";

    private void AngleSlider_ValueChanged(object? sender, RangeBaseValueChangedEventArgs e) =>
        AngleValue.Text = $"{e.NewValue:0}°";

    private void ResetControls_Click(object? sender, RoutedEventArgs e)
    {
        SpeedSlider.Value = 18;
        AngleSlider.Value = 42;
    }

    private void PreviousCheckpoint_Click(object? sender, RoutedEventArgs e)
    {
        _checkpoint = Math.Max(1, _checkpoint - 1);
        UpdateCheckpoint();
    }

    private void NextCheckpoint_Click(object? sender, RoutedEventArgs e)
    {
        _checkpoint = Math.Min(5, _checkpoint + 1);
        UpdateCheckpoint();
    }

    private void PlayCheckpoint_Click(object? sender, RoutedEventArgs e)
    {
        _checkpoint = Math.Min(5, _checkpoint + 1);
        UpdateCheckpoint();
    }

    private void UpdateCheckpoint()
    {
        var names = new[] { "Launch", "Reveal vectors", "Turning point", "Compare values", "Summary" };
        CheckpointText.Text = $"Checkpoint {_checkpoint} of 5 · {names[_checkpoint - 1]}";
    }
}

public enum PresenterPreviewMode
{
    Dark,
    Interactive
}
