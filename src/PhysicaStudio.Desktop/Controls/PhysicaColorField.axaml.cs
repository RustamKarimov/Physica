using Avalonia;
using Avalonia.Automation;
using Avalonia.Controls;
using Avalonia.Input;
using Avalonia.Interactivity;
using Avalonia.Media;

namespace PhysicaStudio.Desktop.Controls;

public sealed class PhysicaColorSelectedEventArgs(Color color) : EventArgs
{
    public Color Color { get; } = color;
}

public sealed partial class PhysicaColorField : UserControl
{
    private static readonly Color[] StandardColors =
    [
        Color.Parse("#FFFFFF"), Color.Parse("#D9DEE2"), Color.Parse("#98A6B0"), Color.Parse("#1D2B34"),
        Color.Parse("#111111"), Color.Parse("#D83B3B"), Color.Parse("#ED7F18"), Color.Parse("#E3B321"),
        Color.Parse("#168CFF"), Color.Parse("#118A82"),
    ];

    public static readonly StyledProperty<Color> ColorProperty =
        AvaloniaProperty.Register<PhysicaColorField, Color>(nameof(Color), Color.Parse("#FFFFFF"));

    private bool _initialized;
    private string _themeName = string.Empty;

    public PhysicaColorField()
    {
        InitializeComponent();
        _initialized = true;
        PickerButton.Flyout!.Opened += (_, _) => SynchronizeEditor();
        PopulateSwatches(StandardSwatchGrid, StandardColors);
        SynchronizeEditor();
    }

    public event EventHandler<PhysicaColorSelectedEventArgs>? ColorSelected;

    public Color Color
    {
        get => GetValue(ColorProperty);
        set => SetValue(ColorProperty, value);
    }

    public void SetThemePalette(string themeName, IEnumerable<Color> baseColors)
    {
        _themeName = themeName;
        var colors = baseColors.Distinct().Take(6).ToArray();
        var matrix = new List<Color>(30);
        foreach (var factor in new[] { .76, .48, .20, 0d, -.24 })
        {
            matrix.AddRange(colors.Select(color => Adjust(color, factor)));
        }
        while (matrix.Count < 30)
        {
            matrix.Add(Color.Parse("#FFFFFF"));
        }
        PopulateSwatches(ThemeSwatchGrid, matrix.Take(30));
        SynchronizeEditor();
    }

    protected override void OnPropertyChanged(AvaloniaPropertyChangedEventArgs change)
    {
        base.OnPropertyChanged(change);
        if (_initialized && change.Property == ColorProperty)
        {
            SynchronizeEditor();
        }
    }

    private void PopulateSwatches(Panel panel, IEnumerable<Color> colors)
    {
        panel.Children.Clear();
        foreach (var color in colors)
        {
            var captured = color;
            var button = new Button
            {
                Tag = captured,
                Background = new SolidColorBrush(captured),
            };
            button.Classes.Add("physica-color-swatch");
            ToolTip.SetTip(button, ToHex(captured));
            AutomationProperties.SetName(button, $"Colour {ToHex(captured)}");
            button.Click += (_, _) => SelectColor(captured);
            panel.Children.Add(button);
        }
    }

    private void SelectColor(Color color)
    {
        Color = color;
        HexErrorText.IsVisible = false;
        PickerButton.Flyout!.Hide();
        ColorSelected?.Invoke(this, new PhysicaColorSelectedEventArgs(color));
    }

    private void ApplyHex_Click(object? sender, RoutedEventArgs e) => ApplyHexValue();

    private void HexTextBox_KeyDown(object? sender, KeyEventArgs e)
    {
        if (e.Key != Key.Enter)
        {
            return;
        }
        ApplyHexValue();
        e.Handled = true;
    }

    private void ApplyHexValue()
    {
        var value = HexTextBox.Text?.Trim();
        if (value is null || !TryParseHex(value, out var color))
        {
            HexErrorText.IsVisible = true;
            HexTextBox.Classes.Add("invalid");
            return;
        }
        HexTextBox.Classes.Remove("invalid");
        SelectColor(color);
    }

    private void SynchronizeEditor()
    {
        if (!_initialized)
        {
            return;
        }
        var hex = ToHex(Color);
        CurrentSwatch.Background = new SolidColorBrush(Color);
        CurrentHexText.Text = hex;
        HexTextBox.Text = hex;
        ThemeNameText.Text = _themeName;
        HexErrorText.IsVisible = false;
        UpdateSelectedSwatches(ThemeSwatchGrid);
        UpdateSelectedSwatches(StandardSwatchGrid);
    }

    private void UpdateSelectedSwatches(Panel panel)
    {
        foreach (var button in panel.Children.OfType<Button>())
        {
            var selected = button.Tag is Color candidate && candidate == Color;
            if (selected && !button.Classes.Contains("selected"))
            {
                button.Classes.Add("selected");
            }
            else if (!selected)
            {
                button.Classes.Remove("selected");
            }
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

    private static bool TryParseHex(string value, out Color color)
    {
        var normalized = value.StartsWith('#') ? value : $"#{value}";
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
