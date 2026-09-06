using Avalonia.Controls;
using Avalonia.Interactivity;

namespace PhysicaStudio.Desktop.Views;

public sealed partial class PresenterPreviewWindow : Window
{
    public PresenterPreviewWindow() => InitializeComponent();

    private void Close_Click(object? sender, RoutedEventArgs e) => Close();
}

