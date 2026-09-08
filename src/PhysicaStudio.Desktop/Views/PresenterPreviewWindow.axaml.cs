using Avalonia.Controls;
using Avalonia.Controls.Primitives;
using Avalonia.Interactivity;
using PhysicaStudio.Rendering2D;

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

    public PresenterPreviewWindow(SceneSnapshot snapshot)
    {
        InitializeComponent();
        SetCurrentSlide(snapshot);
    }

    private void Close_Click(object? sender, RoutedEventArgs e) => Close();

    private void ShowDark_Click(object? sender, RoutedEventArgs e)
        => SetMode(PresenterPreviewMode.Dark);

    private void ShowInteractive_Click(object? sender, RoutedEventArgs e)
        => SetMode(PresenterPreviewMode.Interactive);

    private void SetMode(PresenterPreviewMode mode)
    {
        var isDark = mode == PresenterPreviewMode.Dark;
        CurrentSlidePresentation.IsVisible = false;
        DarkPresentation.IsVisible = isDark;
        InteractivePresentation.IsVisible = !isDark;
        QualificationModeButtons.IsVisible = true;
        QualificationFooter.IsVisible = true;
        CurrentSlideFooter.IsVisible = false;
        PreviewBadgeText.Text = "SHELL PREVIEW";
        DarkModeButton.Classes.Set("physica-primary", isDark);
        InteractiveModeButton.Classes.Set("physica-primary", !isDark);
    }

    private void SetCurrentSlide(SceneSnapshot snapshot)
    {
        ArgumentNullException.ThrowIfNull(snapshot);
        CurrentSlideSurface.Snapshot = snapshot;
        CurrentSlideFrame.Width = snapshot.LogicalSize.Width;
        CurrentSlideFrame.Height = snapshot.LogicalSize.Height;
        CurrentSlidePresentation.IsVisible = true;
        DarkPresentation.IsVisible = false;
        InteractivePresentation.IsVisible = false;
        QualificationModeButtons.IsVisible = false;
        QualificationFooter.IsVisible = false;
        CurrentSlideFooter.IsVisible = true;
        PreviewBadgeText.Text = "CURRENT SLIDE";
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
