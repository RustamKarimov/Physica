using System.ComponentModel;
using System.Globalization;
using Avalonia.Controls;
using Avalonia.Interactivity;
using Avalonia.Media;
using PhysicaStudio.Authoring;
using PhysicaStudio.Desktop.Resources;
using PhysicaStudio.Desktop.ViewModels;
using PhysicaStudio.Document;

namespace PhysicaStudio.Desktop.Views;

public sealed partial class MainWindow
{
    private bool _synchronizingSlideDesign;
    private bool _editingPrimaryBackgroundColor = true;
    private string _backgroundPrimaryColor = "#F4F5F3";
    private string _backgroundSecondaryColor = "#CFE8FF";

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
            UpdateThemeSelection(project.Theme.Id);
            SelectByTag(BackgroundTypeComboBox, background.Kind.ToString());
            _backgroundPrimaryColor = background.Color.ToUpperInvariant();
            _backgroundSecondaryColor = (background.SecondaryColor ?? "#CFE8FF").ToUpperInvariant();
            BackgroundTransparencyTextBox.Text = ((1 - background.Opacity) * 100)
                .ToString("0.#", CultureInfo.CurrentCulture);

            CanvasWidthTextBox.Text = canvas.Width.ToString("0.##", CultureInfo.CurrentCulture);
            CanvasHeightTextBox.Text = canvas.Height.ToString("0.##", CultureInfo.CurrentCulture);
            SelectByTag(CanvasOrientationComboBox, canvas.Orientation.ToString());
            SelectByTag(CanvasPresetComboBox, ResolveCanvasPreset(canvas));

            SetThicknessText(canvas.Margins, MarginLeftTextBox, MarginTopTextBox, MarginRightTextBox, MarginBottomTextBox);
            SetThicknessText(canvas.SafeArea, SafeLeftTextBox, SafeTopTextBox, SafeRightTextBox, SafeBottomTextBox);
            UpdateBackgroundFieldAvailability();
            UpdateColorEditorFromTarget();
        }
        finally
        {
            _synchronizingSlideDesign = false;
        }
    }

    private void ThemePreset_Click(object? sender, RoutedEventArgs e)
    {
        if (_synchronizingSlideDesign || sender is not Button { Tag: { } tag })
        {
            return;
        }

        ExecuteDesignChange(() => _viewModel.SetThemePreset(tag.ToString()!));
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
                _backgroundPrimaryColor,
                kind == SlideBackgroundKind.Gradient
                    ? _backgroundSecondaryColor
                    : null,
                1 - transparency / 100);
        });
    }

    private void BackgroundColorTarget_Click(object? sender, RoutedEventArgs e)
    {
        if (sender is not Button { Tag: { } tag })
        {
            return;
        }

        _editingPrimaryBackgroundColor = !string.Equals(tag.ToString(), "Secondary", StringComparison.Ordinal);
        UpdateColorEditorFromTarget();
    }

    private void BackgroundSwatch_Click(object? sender, RoutedEventArgs e)
    {
        if (sender is Button { Tag: { } tag } && IsHexColor(tag.ToString()))
        {
            SetActiveBackgroundColor(tag.ToString()!.ToUpperInvariant());
            UpdateColorEditorFromTarget();
        }
    }

    private void CustomColorSlider_ValueChanged(object? sender, Avalonia.Controls.Primitives.RangeBaseValueChangedEventArgs e)
    {
        if (_synchronizingSlideDesign)
        {
            return;
        }

        SetActiveBackgroundColor(HslToHex(
            BackgroundHueSlider.Value,
            BackgroundSaturationSlider.Value / 100,
            BackgroundLightnessSlider.Value / 100));
        UpdateColorPreviews();
        ActiveColorHexTextBox.Text = ActiveBackgroundColor;
        UpdateColorChannelLabels();
    }

    private void ActiveColorHex_TextChanged(object? sender, TextChangedEventArgs e)
    {
        if (_synchronizingSlideDesign || !IsHexColor(ActiveColorHexTextBox.Text))
        {
            return;
        }

        SetActiveBackgroundColor(ActiveColorHexTextBox.Text!.ToUpperInvariant());
        UpdateColorEditorFromTarget();
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
        var customColor = kind != nameof(SlideBackgroundKind.Theme);
        var gradient = kind == nameof(SlideBackgroundKind.Gradient);
        BackgroundPrimaryColorButton.IsEnabled = customColor;
        BackgroundSecondaryColorButton.IsEnabled = gradient;
        BackgroundColorPickerPanel.IsEnabled = customColor;
        if (!gradient && !_editingPrimaryBackgroundColor)
        {
            _editingPrimaryBackgroundColor = true;
        }
    }

    private string ActiveBackgroundColor =>
        _editingPrimaryBackgroundColor ? _backgroundPrimaryColor : _backgroundSecondaryColor;

    private void SetActiveBackgroundColor(string color)
    {
        if (_editingPrimaryBackgroundColor)
        {
            _backgroundPrimaryColor = color;
        }
        else
        {
            _backgroundSecondaryColor = color;
        }
    }

    private void UpdateColorEditorFromTarget()
    {
        var wasSynchronizing = _synchronizingSlideDesign;
        _synchronizingSlideDesign = true;
        try
        {
            SetSelectedClass(BackgroundPrimaryColorButton, _editingPrimaryBackgroundColor);
            SetSelectedClass(BackgroundSecondaryColorButton, !_editingPrimaryBackgroundColor);
            BackgroundColorTargetLabel.Text = _editingPrimaryBackgroundColor
                ? AppText.PrimaryColor
                : AppText.SecondaryColor;

            var (hue, saturation, lightness) = HexToHsl(ActiveBackgroundColor);
            BackgroundHueSlider.Value = hue;
            BackgroundSaturationSlider.Value = saturation * 100;
            BackgroundLightnessSlider.Value = lightness * 100;
            ActiveColorHexTextBox.Text = ActiveBackgroundColor;
            UpdateColorPreviews();
            UpdateColorChannelLabels();
        }
        finally
        {
            _synchronizingSlideDesign = wasSynchronizing;
        }
    }

    private void UpdateColorPreviews()
    {
        BackgroundPrimaryColorPreview.Background = ToBrush(_backgroundPrimaryColor);
        BackgroundSecondaryColorPreview.Background = ToBrush(_backgroundSecondaryColor);
        BackgroundPrimaryColorValue.Text = _backgroundPrimaryColor;
        BackgroundSecondaryColorValue.Text = _backgroundSecondaryColor;
        CustomColorPreview.Background = ToBrush(ActiveBackgroundColor);
    }

    private void UpdateColorChannelLabels()
    {
        BackgroundHueValue.Text = $"{BackgroundHueSlider.Value:0}°";
        BackgroundSaturationValue.Text = $"{BackgroundSaturationSlider.Value:0}%";
        BackgroundLightnessValue.Text = $"{BackgroundLightnessSlider.Value:0}%";
    }

    private void UpdateThemeSelection(string selectedThemeId)
    {
        foreach (var button in ThemePresetButtons())
        {
            SetSelectedClass(button, string.Equals(button.Tag?.ToString(), selectedThemeId, StringComparison.Ordinal));
        }
    }

    private IEnumerable<Button> ThemePresetButtons()
    {
        yield return ThemeLightAzureButton;
        yield return ThemeLightTealButton;
        yield return ThemeLightAmberButton;
        yield return ThemeDarkAzureButton;
        yield return ThemeDarkVioletButton;
        yield return ThemeDarkCopperButton;
        yield return ThemeLaboratoryTealButton;
        yield return ThemeLaboratoryCobaltButton;
        yield return ThemeLaboratoryPlumButton;
    }

    private static void SetSelectedClass(Control control, bool selected)
    {
        if (selected && !control.Classes.Contains("selected"))
        {
            control.Classes.Add("selected");
        }
        else if (!selected)
        {
            control.Classes.Remove("selected");
        }
    }

    private static IBrush ToBrush(string color) => new SolidColorBrush(Color.Parse(color));

    private static bool IsHexColor(string? value) =>
        value is { Length: 7 }
        && value[0] == '#'
        && value.AsSpan(1).ToArray().All(Uri.IsHexDigit);

    private static (double Hue, double Saturation, double Lightness) HexToHsl(string color)
    {
        var parsed = Color.Parse(color);
        var red = parsed.R / 255d;
        var green = parsed.G / 255d;
        var blue = parsed.B / 255d;
        var maximum = Math.Max(red, Math.Max(green, blue));
        var minimum = Math.Min(red, Math.Min(green, blue));
        var lightness = (maximum + minimum) / 2;
        if (Math.Abs(maximum - minimum) < .000001)
        {
            return (0, 0, lightness);
        }

        var difference = maximum - minimum;
        var saturation = lightness > .5
            ? difference / (2 - maximum - minimum)
            : difference / (maximum + minimum);
        var hue = maximum == red
            ? (green - blue) / difference + (green < blue ? 6 : 0)
            : maximum == green
                ? (blue - red) / difference + 2
                : (red - green) / difference + 4;
        return (hue * 60, saturation, lightness);
    }

    private static string HslToHex(double hue, double saturation, double lightness)
    {
        hue = ((hue % 360) + 360) % 360 / 360;
        double red;
        double green;
        double blue;
        if (saturation <= .000001)
        {
            red = green = blue = lightness;
        }
        else
        {
            var q = lightness < .5
                ? lightness * (1 + saturation)
                : lightness + saturation - lightness * saturation;
            var p = 2 * lightness - q;
            red = HueToRgb(p, q, hue + 1d / 3);
            green = HueToRgb(p, q, hue);
            blue = HueToRgb(p, q, hue - 1d / 3);
        }

        return $"#{(byte)Math.Round(red * 255):X2}{(byte)Math.Round(green * 255):X2}{(byte)Math.Round(blue * 255):X2}";
    }

    private static double HueToRgb(double p, double q, double value)
    {
        if (value < 0) value += 1;
        if (value > 1) value -= 1;
        if (value < 1d / 6) return p + (q - p) * 6 * value;
        if (value < 1d / 2) return q;
        if (value < 2d / 3) return p + (q - p) * (2d / 3 - value) * 6;
        return p;
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
