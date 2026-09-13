using System.ComponentModel;
using System.Globalization;
using Avalonia.Controls;
using Avalonia.Interactivity;
using PhysicaStudio.Authoring;
using PhysicaStudio.Desktop.Resources;
using PhysicaStudio.Desktop.ViewModels;
using PhysicaStudio.Document;

namespace PhysicaStudio.Desktop.Views;

public sealed partial class MainWindow
{
    private bool _synchronizingSlideDesign;

    private void InitializeSlideDesign()
    {
        _viewModel.PropertyChanged += ViewModel_SlideDesignPropertyChanged;
        SynchronizeSlideDesign();
    }

    private void ViewModel_SlideDesignPropertyChanged(object? sender, PropertyChangedEventArgs e)
    {
        if (e.PropertyName is nameof(StudioShellViewModel.ActiveSlide)
            or nameof(StudioShellViewModel.ActiveScene)
            or nameof(StudioShellViewModel.IsProjectOpen)
            or nameof(StudioShellViewModel.ShowSlideDesignInspector))
        {
            SynchronizeSlideDesign();
        }
    }

    private void OpenSlideDesign(SlideBackgroundKind? requestedBackground = null)
    {
        EnsureRightPanelVisible();
        _viewModel.OpenSlideDesignInspector();
        SynchronizeSlideDesign();
        if (requestedBackground is not null)
        {
            SelectByTag(BackgroundTypeComboBox, requestedBackground.Value.ToString());
            UpdateBackgroundFieldAvailability();
        }
    }

    private void SynchronizeSlideDesign()
    {
        if (!_viewModel.IsProjectOpen)
        {
            return;
        }

        _synchronizingSlideDesign = true;
        try
        {
            var project = _viewModel.Session.CurrentProject;
            var canvas = project.Canvas;
            var background = _viewModel.ActiveSlide.Background;
            SelectByTag(ThemePresetComboBox, project.Theme.Id);
            SelectByTag(BackgroundTypeComboBox, background.Kind.ToString());
            BackgroundPrimaryColorTextBox.Text = background.Color;
            BackgroundSecondaryColorTextBox.Text = background.SecondaryColor ?? "#CFE8FF";
            BackgroundTransparencyTextBox.Text = ((1 - background.Opacity) * 100)
                .ToString("0.#", CultureInfo.CurrentCulture);

            CanvasWidthTextBox.Text = canvas.Width.ToString("0.##", CultureInfo.CurrentCulture);
            CanvasHeightTextBox.Text = canvas.Height.ToString("0.##", CultureInfo.CurrentCulture);
            SelectByTag(CanvasOrientationComboBox, canvas.Orientation.ToString());
            SelectByTag(CanvasPresetComboBox, ResolveCanvasPreset(canvas));

            SetThicknessText(canvas.Margins, MarginLeftTextBox, MarginTopTextBox, MarginRightTextBox, MarginBottomTextBox);
            SetThicknessText(canvas.SafeArea, SafeLeftTextBox, SafeTopTextBox, SafeRightTextBox, SafeBottomTextBox);
            UpdateBackgroundFieldAvailability();
        }
        finally
        {
            _synchronizingSlideDesign = false;
        }
    }

    private void ThemePreset_SelectionChanged(object? sender, SelectionChangedEventArgs e)
    {
        if (_synchronizingSlideDesign || SelectedTag(ThemePresetComboBox) is not { } themeId)
        {
            return;
        }

        ExecuteDesignChange(() => _viewModel.SetThemePreset(themeId));
    }

    private void BackgroundType_SelectionChanged(object? sender, SelectionChangedEventArgs e) =>
        UpdateBackgroundFieldAvailability();

    private void ApplyBackground_Click(object? sender, RoutedEventArgs e)
    {
        ExecuteDesignChange(() =>
        {
            if (!Enum.TryParse<SlideBackgroundKind>(SelectedTag(BackgroundTypeComboBox), out var kind)
                || kind == SlideBackgroundKind.Image)
            {
                throw new AuthoringCommandException(AppText.ThemeUnavailable);
            }
            var transparency = ReadNumber(BackgroundTransparencyTextBox, AppText.Transparency);
            if (transparency is < 0 or > 100)
            {
                throw new AuthoringCommandException(AppText.BackgroundOpacityRange);
            }
            _viewModel.SetSlideBackground(
                kind,
                BackgroundPrimaryColorTextBox.Text ?? string.Empty,
                kind == SlideBackgroundKind.Gradient
                    ? BackgroundSecondaryColorTextBox.Text ?? string.Empty
                    : null,
                1 - transparency / 100);
        });
    }

    private void CanvasPreset_SelectionChanged(object? sender, SelectionChangedEventArgs e)
    {
        if (_synchronizingSlideDesign)
        {
            return;
        }

        var portrait = SelectedTag(CanvasOrientationComboBox) == nameof(SlideOrientation.Portrait);
        switch (SelectedTag(CanvasPresetComboBox))
        {
            case "Widescreen":
                SetCanvasDimensions(portrait ? 1080 : 1920, portrait ? 1920 : 1080);
                break;
            case "Standard":
                SetCanvasDimensions(portrait ? 1200 : 1600, portrait ? 1600 : 1200);
                break;
        }
    }

    private void CanvasOrientation_SelectionChanged(object? sender, SelectionChangedEventArgs e)
    {
        if (_synchronizingSlideDesign
            || !TryReadNumber(CanvasWidthTextBox, out var width)
            || !TryReadNumber(CanvasHeightTextBox, out var height))
        {
            return;
        }

        var portrait = SelectedTag(CanvasOrientationComboBox) == nameof(SlideOrientation.Portrait);
        if (portrait == (width > height))
        {
            SetCanvasDimensions(height, width);
        }
    }

    private void ApplyCanvasSize_Click(object? sender, RoutedEventArgs e)
    {
        ExecuteDesignChange(() =>
        {
            var width = ReadNumber(CanvasWidthTextBox, AppText.Width);
            var height = ReadNumber(CanvasHeightTextBox, AppText.Height);
            if (!Enum.TryParse<SlideOrientation>(SelectedTag(CanvasOrientationComboBox), out var orientation))
            {
                throw new AuthoringCommandException(AppText.ThemeUnavailable);
            }
            if (!Enum.TryParse<CanvasResizePolicy>(SelectedTag(CanvasResizePolicyComboBox), out var policy))
            {
                policy = CanvasResizePolicy.ScaleToFit;
            }
            _viewModel.ResizeCanvas(width, height, orientation, policy);
        });
    }

    private void ApplyInsets_Click(object? sender, RoutedEventArgs e)
    {
        ExecuteDesignChange(() => _viewModel.SetCanvasInsets(
            ReadThickness(MarginLeftTextBox, MarginTopTextBox, MarginRightTextBox, MarginBottomTextBox),
            ReadThickness(SafeLeftTextBox, SafeTopTextBox, SafeRightTextBox, SafeBottomTextBox)));
    }

    private void OpenGuidesWorkspace_Click(object? sender, RoutedEventArgs e) => OpenCanvasGuidance();

    private void ExecuteDesignChange(Action action)
    {
        try
        {
            action();
            SynchronizeSlideDesign();
        }
        catch (Exception exception) when (exception is AuthoringCommandException or ProjectPackageException)
        {
            _viewModel.SetStatus(exception.Message);
            SynchronizeSlideDesign();
        }
    }

    private void UpdateBackgroundFieldAvailability()
    {
        var kind = SelectedTag(BackgroundTypeComboBox);
        BackgroundPrimaryColorTextBox.IsEnabled = kind != nameof(SlideBackgroundKind.Theme);
        BackgroundSecondaryColorTextBox.IsEnabled = kind == nameof(SlideBackgroundKind.Gradient);
    }

    private void SetCanvasDimensions(double width, double height)
    {
        CanvasWidthTextBox.Text = width.ToString("0.##", CultureInfo.CurrentCulture);
        CanvasHeightTextBox.Text = height.ToString("0.##", CultureInfo.CurrentCulture);
    }

    private static string ResolveCanvasPreset(CanvasDefinition canvas)
    {
        var longSide = Math.Max(canvas.Width, canvas.Height);
        var shortSide = Math.Min(canvas.Width, canvas.Height);
        if (Math.Abs(longSide - 1920) < .01 && Math.Abs(shortSide - 1080) < .01)
        {
            return "Widescreen";
        }
        if (Math.Abs(longSide - 1600) < .01 && Math.Abs(shortSide - 1200) < .01)
        {
            return "Standard";
        }
        return "Custom";
    }

    private static void SelectByTag(ComboBox comboBox, string tag)
    {
        comboBox.SelectedItem = comboBox.Items
            .OfType<ComboBoxItem>()
            .FirstOrDefault(item => string.Equals(item.Tag?.ToString(), tag, StringComparison.Ordinal));
    }

    private static string? SelectedTag(ComboBox comboBox) =>
        (comboBox.SelectedItem as ComboBoxItem)?.Tag?.ToString();

    private static bool TryReadNumber(TextBox textBox, out double value) =>
        double.TryParse(textBox.Text, NumberStyles.Float, CultureInfo.CurrentCulture, out value)
        && double.IsFinite(value);

    private static double ReadNumber(TextBox textBox, string label)
    {
        if (!TryReadNumber(textBox, out var value))
        {
            throw new AuthoringCommandException(AppText.NumberRequired(label));
        }
        return value;
    }

    private static ThicknessDefinition ReadThickness(
        TextBox left,
        TextBox top,
        TextBox right,
        TextBox bottom) => new(
        ReadNumber(left, AppText.Left),
        ReadNumber(top, AppText.Top),
        ReadNumber(right, AppText.Right),
        ReadNumber(bottom, AppText.Bottom));

    private static void SetThicknessText(
        ThicknessDefinition thickness,
        TextBox left,
        TextBox top,
        TextBox right,
        TextBox bottom)
    {
        left.Text = thickness.Left.ToString("0.##", CultureInfo.CurrentCulture);
        top.Text = thickness.Top.ToString("0.##", CultureInfo.CurrentCulture);
        right.Text = thickness.Right.ToString("0.##", CultureInfo.CurrentCulture);
        bottom.Text = thickness.Bottom.ToString("0.##", CultureInfo.CurrentCulture);
    }
}
