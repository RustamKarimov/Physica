using System.ComponentModel;
using System.Globalization;
using Avalonia.Controls;
using Avalonia.Interactivity;
using Avalonia.Media;
using Avalonia.Threading;
using PhysicaStudio.Authoring;
using PhysicaStudio.Desktop.Controls;
using PhysicaStudio.Desktop.Resources;
using PhysicaStudio.Desktop.ViewModels;
using PhysicaStudio.Document;

namespace PhysicaStudio.Desktop.Views;

public sealed partial class MainWindow
{
    private enum SlideDesignSection
    {
        Themes,
        Background,
        Canvas,
        Insets,
    }

    private bool _synchronizingSlideDesign;
    private string _backgroundPrimaryColor = "#F4F5F3";

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

    private void OpenSlideDesign(SlideDesignSection section = SlideDesignSection.Themes, SlideBackgroundKind? requestedBackground = null)
    {
        EnsureRightPanelVisible();
        _viewModel.OpenSlideDesignInspector();
        SynchronizeSlideDesign();
        if (requestedBackground is not null)
        {
            SelectByTag(BackgroundTypeComboBox, requestedBackground.Value.ToString());
            UpdateBackgroundFieldAvailability();
        }

        Dispatcher.UIThread.Post(() =>
        {
            var target = section switch
            {
                SlideDesignSection.Background => BackgroundSection,
                SlideDesignSection.Canvas => CanvasSection,
                SlideDesignSection.Insets => InsetsSection,
                _ => ThemeGallerySection,
            };
            target.BringIntoView();
        });
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
            BackgroundPrimaryColorField.Color = Color.Parse(_backgroundPrimaryColor);
            var defaultSecondary = project.Theme.Colors.TryGetValue("accent", out var accent)
                ? accent
                : "#CFE8FF";
            BackgroundGradientEditor.SetGradient(background.Kind == SlideBackgroundKind.Gradient
                ? background.ResolveGradient()
                : GradientDefinition.CreateDefault(_backgroundPrimaryColor, defaultSecondary));
            ThemeBackgroundOverrideNotice.IsVisible = background.Kind != SlideBackgroundKind.Theme;
            ConfigureColorPalettes(project.Theme);
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

    private void BackgroundColorField_ColorSelected(object? sender, PhysicaColorSelectedEventArgs e)
    {
        if (_synchronizingSlideDesign || sender is not PhysicaColorField)
        {
            return;
        }

        var color = ToHex(e.Color);
        _backgroundPrimaryColor = color;
    }

    private void UseThemeBackground_Click(object? sender, RoutedEventArgs e)
    {
        ExecuteDesignChange(() =>
        {
            var themeColor = _viewModel.Session.CurrentProject.Theme.Colors["background"];
            _viewModel.SetSlideBackground(
                SlideBackgroundKind.Theme,
                themeColor,
                null,
                _viewModel.ActiveSlide.Background.Opacity);
        });
    }

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
            var gradient = kind == SlideBackgroundKind.Gradient
                ? BackgroundGradientEditor.Gradient
                : null;
            var orderedStops = gradient?.Stops.OrderBy(stop => stop.Position).ToArray();
            _viewModel.SetSlideBackground(
                kind,
                orderedStops?[0].Color ?? ToHex(BackgroundPrimaryColorField.Color),
                orderedStops?[^1].Color,
                1 - transparency / 100,
                gradient);
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
        var customColor = kind != nameof(SlideBackgroundKind.Theme);
        var gradient = kind == nameof(SlideBackgroundKind.Gradient);
        SolidColorRow.IsVisible = customColor && !gradient;
        BackgroundGradientEditor.IsVisible = gradient;
        ThemeBackgroundOverrideNotice.IsVisible = customColor;
    }

    private void ConfigureColorPalettes(ThemeDefinition theme)
    {
        var palette = new[] { "background", "surface", "heading", "body", "accent", "secondaryAccent" }
            .Select(role => theme.Colors.TryGetValue(role, out var value) ? value : null)
            .Where(value => IsHexColor(value))
            .Select(value => value!)
            .Select(Color.Parse)
            .Distinct()
            .ToArray();
        BackgroundPrimaryColorField.SetThemePalette(theme.DisplayName, palette);
        BackgroundGradientEditor.SetThemePalette(theme.DisplayName, palette);
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

    private static bool IsHexColor(string? value) =>
        value is { Length: 7 }
        && value[0] == '#'
        && value.AsSpan(1).ToArray().All(Uri.IsHexDigit);

    private static string ToHex(Color color) => $"#{color.R:X2}{color.G:X2}{color.B:X2}";

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
