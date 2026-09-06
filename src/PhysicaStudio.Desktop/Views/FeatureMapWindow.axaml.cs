using Avalonia.Controls;
using Avalonia.Interactivity;

namespace PhysicaStudio.Desktop.Views;

public sealed partial class FeatureMapWindow : Window
{
    public FeatureMapWindow() => InitializeComponent();

    private void Close_Click(object? sender, RoutedEventArgs e) => Close();
}

