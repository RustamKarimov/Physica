using Avalonia;
using Avalonia.Automation;
using Avalonia.Controls;
using Avalonia.Input;
using Avalonia.Interactivity;
using Avalonia.Media;

namespace PhysicaStudio.Desktop.Controls;

public sealed partial class PhysicaColorDialog : Window
{
    private static readonly Color[] PaletteBases =
    [
        Color.Parse("#D73A49"), Color.Parse("#F0652F"), Color.Parse("#E5A400"), Color.Parse("#B7B900"),
        Color.Parse("#4FAF55"), Color.Parse("#079E8C"), Color.Parse("#159FC4"), Color.Parse("#3478D4"),
        Color.Parse("#5D58B8"), Color.Parse("#A449A2"),
    ];

    private readonly Color _originalColor;
    private Color _selectedColor;
    private bool _synchronizing;

    public PhysicaColorDialog() : this(Color.Parse("#168CFF"))
    {
    }

    public PhysicaColorDialog(Color initialColor)
    {
        InitializeComponent();
        _originalColor = initialColor;
        _selectedColor = initialColor;
        PopulateExtendedPalette();
        Spectrum.SetColor(initialColor);
        SynchronizeFields();
    }

    private void PopulateExtendedPalette()
    {
        var colors = new List<Color>(60);
        foreach (var factor in new[] { .84, .62, .38, .12, -.18, -.44 })
        {
            colors.AddRange(PaletteBases.Select(color => Adjust(color, factor)));
        }

        foreach (var color in colors)
        {
            var captured = color;
            var check = new PhysicaIcon
            {
                IconKey = "check",
                Width = 13,
                Height = 13,
                Stroke = ContrastStroke(captured),
                IsVisible = captured == _selectedColor,
            };
            var button = new Button
            {
                Tag = captured,
                Background = new SolidColorBrush(captured),
                Content = check,
                Width = 44,
                HorizontalAlignment = Avalonia.Layout.HorizontalAlignment.Center,
            };
            button.Classes.Add("physica-color-swatch");
            button.Classes.Add("extended");
            ToolTip.SetTip(button, ToHex(captured));
            AutomationProperties.SetName(button, $"Colour {ToHex(captured)}");
            button.Click += (_, _) => SetSelectedColor(captured, updateSpectrum: true);
            button.DoubleTapped += (_, _) =>
            {
                SetSelectedColor(captured, updateSpectrum: true);
                Close((Color?)_selectedColor);
            };
            ExtendedPaletteGrid.Children.Add(button);
        }
    }

    private void TitleBar_PointerPressed(object? sender, PointerPressedEventArgs e)
    {
        if (e.GetCurrentPoint(this).Properties.IsLeftButtonPressed)
        {
            BeginMoveDrag(e);
        }
    }

    private void StandardTab_Click(object? sender, RoutedEventArgs e) => SelectTab(custom: false);

    private void CustomTab_Click(object? sender, RoutedEventArgs e) => SelectTab(custom: true);

    private void SelectTab(bool custom)
    {
        StandardPanel.IsVisible = !custom;
        CustomPanel.IsVisible = custom;
        SetSelectedClass(StandardTabButton, !custom);
        SetSelectedClass(CustomTabButton, custom);
        if (custom)
        {
            Spectrum.Focus();
        }
    }

    private void Spectrum_ColorChanged(object? sender, PhysicaColorSelectedEventArgs e)
    {
        if (!_synchronizing)
        {
            SetSelectedColor(e.Color, updateSpectrum: false);
        }
    }

    private void ColorValue_KeyDown(object? sender, KeyEventArgs e)
    {
        if (e.Key == Key.Enter)
        {
            ApplyTextFields();
            e.Handled = true;
        }
    }

    private void ColorValue_LostFocus(object? sender, RoutedEventArgs e) => ApplyTextFields();

    private void ApplyTextFields()
    {
        if (_synchronizing)
        {
            return;
        }

        var hex = HexTextBox.Text?.Trim();
        if (!string.Equals(hex, ToHex(_selectedColor), StringComparison.OrdinalIgnoreCase)
            && TryParseHex(hex, out var hexColor))
        {
            ValidationText.IsVisible = false;
            SetSelectedColor(hexColor, updateSpectrum: true);
            return;
        }

        if (byte.TryParse(RedTextBox.Text, out var red)
            && byte.TryParse(GreenTextBox.Text, out var green)
            && byte.TryParse(BlueTextBox.Text, out var blue))
        {
            ValidationText.IsVisible = false;
            SetSelectedColor(Color.FromRgb(red, green, blue), updateSpectrum: true);
            return;
        }

        ValidationText.IsVisible = true;
        SynchronizeFields(preserveValidation: true);
    }

    private void Apply_Click(object? sender, RoutedEventArgs e) => Close((Color?)_selectedColor);

    private void Cancel_Click(object? sender, RoutedEventArgs e) => Close((Color?)null);

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

    private void SetSelectedColor(Color color, bool updateSpectrum)
    {
        _selectedColor = color;
        if (updateSpectrum)
        {
            Spectrum.SetColor(color);
        }
        SynchronizeFields();
        UpdatePaletteSelection();
    }

    private void SynchronizeFields(bool preserveValidation = false)
    {
        _synchronizing = true;
        try
        {
            OriginalPreview.Background = new SolidColorBrush(_originalColor);
            SelectedPreview.Background = new SolidColorBrush(_selectedColor);
            SelectedHexText.Text = ToHex(_selectedColor);
            RedTextBox.Text = _selectedColor.R.ToString();
            GreenTextBox.Text = _selectedColor.G.ToString();
            BlueTextBox.Text = _selectedColor.B.ToString();
            HexTextBox.Text = ToHex(_selectedColor);
            if (!preserveValidation)
            {
                ValidationText.IsVisible = false;
            }
        }
        finally
        {
            _synchronizing = false;
        }
    }

    private void UpdatePaletteSelection()
    {
        foreach (var button in ExtendedPaletteGrid.Children.OfType<Button>())
        {
            var selected = button.Tag is Color color && color == _selectedColor;
            SetSelectedClass(button, selected);
            if (button.Content is PhysicaIcon check)
            {
                check.IsVisible = selected;
            }
        }
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

    private static Color Adjust(Color color, double factor)
    {
        static byte Blend(byte component, byte target, double amount) =>
            (byte)Math.Clamp(Math.Round(component + (target - component) * amount), 0, 255);
        var target = factor >= 0 ? (byte)255 : (byte)0;
        var amount = Math.Abs(factor);
        return Color.FromRgb(
            Blend(color.R, target, amount),
            Blend(color.G, target, amount),
            Blend(color.B, target, amount));
    }

    private static IBrush ContrastStroke(Color color)
    {
        var luminance = (.2126 * color.R + .7152 * color.G + .0722 * color.B) / 255;
        return luminance > .62 ? Brushes.Black : Brushes.White;
    }

    private static bool TryParseHex(string? value, out Color color)
    {
        var normalized = value?.Trim();
        if (string.IsNullOrEmpty(normalized))
        {
            color = default;
            return false;
        }
        normalized = normalized.StartsWith('#') ? normalized : $"#{normalized}";
        if (normalized.Length is not 4 and not 7
            || normalized.AsSpan(1).ToArray().Any(character => !Uri.IsHexDigit(character)))
        {
            color = default;
            return false;
        }
        color = Color.Parse(normalized);
        return true;
    }

    private static string ToHex(Color color) => $"#{color.R:X2}{color.G:X2}{color.B:X2}";
}
