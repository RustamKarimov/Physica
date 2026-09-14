using Avalonia;
using Avalonia.Automation;
using Avalonia.Controls;
using Avalonia.Media;
using Avalonia.VisualTree;
using PhysicaStudio.Desktop.Resources;

namespace PhysicaStudio.Desktop.Controls;

public sealed class PhysicaColorSelectedEventArgs(Color color) : EventArgs
{
    public Color Color { get; } = color;
}

public sealed partial class PhysicaColorField : UserControl
{
    private static readonly Color[] StandardColors =
    [
        Color.Parse("#D83B3B"), Color.Parse("#F04A36"), Color.Parse("#ED7F18"), Color.Parse("#E3B321"),
        Color.Parse("#8EBF42"), Color.Parse("#24A56A"), Color.Parse("#20A7CF"), Color.Parse("#168CFF"),
        Color.Parse("#4059B8"), Color.Parse("#8B4BB3"),
    ];

    private static readonly List<Color> RecentColors = [];
    private const int RecentColorLimit = 10;

    public static readonly StyledProperty<Color> ColorProperty =
        AvaloniaProperty.Register<PhysicaColorField, Color>(nameof(Color), Color.Parse("#FFFFFF"));

    private bool _initialized;
    private string _themeName = string.Empty;

    public PhysicaColorField()
    {
        InitializeComponent();
        _initialized = true;
        PickerButton.Flyout!.Opened += (_, _) =>
        {
            PopulateRecentSwatches();
            SynchronizeEditor();
        };
        PopulateSwatches(StandardSwatchGrid, StandardColors);
        PopulateRecentSwatches();
        ScreenPickerButton.IsEnabled = PhysicaScreenEyedropper.IsSupported;
        if (!ScreenPickerButton.IsEnabled)
        {
            ToolTip.SetTip(ScreenPickerButton, AppText.ScreenPickerUnavailable);
        }
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
        foreach (var factor in new[] { .82, .58, .32, 0d, -.28 })
        {
            matrix.AddRange(colors.Select(color => Adjust(color, factor)));
        }
        while (matrix.Count < 30)
        {
            matrix.Add(Color.Parse("#F4F7F9"));
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
        var swatchWidth = ReferenceEquals(panel, ThemeSwatchGrid) ? 44d : 25.2d;
        foreach (var color in colors)
        {
            var captured = color;
            var check = new PhysicaIcon
            {
                IconKey = "check",
                Width = 12,
                Height = 12,
                Stroke = ContrastStroke(captured),
                IsVisible = false,
                HorizontalAlignment = Avalonia.Layout.HorizontalAlignment.Center,
                VerticalAlignment = Avalonia.Layout.VerticalAlignment.Center,
            };
            var button = new Button
            {
                Tag = captured,
                Background = new SolidColorBrush(captured),
                Content = check,
                Width = swatchWidth,
                HorizontalAlignment = Avalonia.Layout.HorizontalAlignment.Center,
            };
            button.Classes.Add("physica-color-swatch");
            ToolTip.SetTip(button, ToHex(captured));
            AutomationProperties.SetName(button, $"Colour {ToHex(captured)}");
            button.Click += (_, _) => SelectColor(captured);
            panel.Children.Add(button);
        }
    }

    private void PopulateRecentSwatches()
    {
        var colors = RecentColors.ToArray();
        RecentEmptyText.IsVisible = colors.Length == 0;
        RecentSwatchGrid.IsVisible = colors.Length > 0;
        PopulateSwatches(RecentSwatchGrid, colors);
    }

    private void SelectColor(Color color)
    {
        RememberColor(color);
        Color = color;
        PickerButton.Flyout!.Hide();
        ColorSelected?.Invoke(this, new PhysicaColorSelectedEventArgs(color));
    }

    private async void MoreColors_Click(object? sender, Avalonia.Interactivity.RoutedEventArgs e)
    {
        PickerButton.Flyout!.Hide();
        if (TopLevel.GetTopLevel(this) is not Window owner)
        {
            return;
        }

        var dialog = new PhysicaColorDialog(Color);
        var result = await dialog.ShowDialog<Color?>(owner);
        if (result is Color selected)
        {
            SelectColor(selected);
        }
    }

    private async void PickFromScreen_Click(object? sender, Avalonia.Interactivity.RoutedEventArgs e)
    {
        PickerButton.Flyout!.Hide();
        if (TopLevel.GetTopLevel(this) is not Window owner)
        {
            return;
        }

        var result = await PhysicaScreenEyedropper.PickAsync(owner);
        if (result is Color selected)
        {
            SelectColor(selected);
        }
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
        ThemeNameText.Text = _themeName;
        UpdateSelectedSwatches(ThemeSwatchGrid);
        UpdateSelectedSwatches(StandardSwatchGrid);
        UpdateSelectedSwatches(RecentSwatchGrid);
    }

    private void UpdateSelectedSwatches(Panel panel)
    {
        foreach (var button in panel.Children.OfType<Button>())
        {
            var selected = button.Tag is Color candidate && candidate == Color;
            SetSelectedClass(button, selected);
            if (button.Content is PhysicaIcon check)
            {
                check.IsVisible = selected;
            }
        }
    }

    private static void SetSelectedClass(Button button, bool selected)
    {
        if (selected && !button.Classes.Contains("selected"))
        {
            button.Classes.Add("selected");
        }
        else if (!selected)
        {
            button.Classes.Remove("selected");
        }
    }

    private static void RememberColor(Color color)
    {
        RecentColors.RemoveAll(candidate => candidate == color);
        RecentColors.Insert(0, color);
        if (RecentColors.Count > RecentColorLimit)
        {
            RecentColors.RemoveRange(RecentColorLimit, RecentColors.Count - RecentColorLimit);
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

    private static string ToHex(Color color) => $"#{color.R:X2}{color.G:X2}{color.B:X2}";
}
