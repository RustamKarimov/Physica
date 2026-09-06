using Avalonia;
using Avalonia.Controls;
using Avalonia.Interactivity;
using PhysicaStudio.Desktop.ViewModels;

namespace PhysicaStudio.Desktop.Views;

public sealed partial class MainWindow : Window
{
    private readonly StudioShellViewModel _viewModel = new();

    public MainWindow()
    {
        InitializeComponent();
        DataContext = _viewModel;
    }

    private void RibbonTab_Click(object? sender, RoutedEventArgs e)
    {
        if (sender is RadioButton { DataContext: RibbonTabViewModel tab })
        {
            _viewModel.SelectRibbon(tab);
        }
    }

    private void ToggleLeftPanel_Click(object? sender, RoutedEventArgs e)
    {
        LeftPanel.IsVisible = !LeftPanel.IsVisible;
        ExpandLeftButton.IsVisible = !LeftPanel.IsVisible;
    }

    private void ToggleRightPanel_Click(object? sender, RoutedEventArgs e)
    {
        RightPanel.IsVisible = !RightPanel.IsVisible;
        ExpandRightButton.IsVisible = !RightPanel.IsVisible;
    }

    private void ToggleBottomPanel_Click(object? sender, RoutedEventArgs e)
    {
        BottomPanel.IsVisible = !BottomPanel.IsVisible;
        ExpandBottomButton.IsVisible = !BottomPanel.IsVisible;
    }

    private void Workspace2D_Click(object? sender, RoutedEventArgs e) => _viewModel.WorkspaceMode = "2D";

    private void Workspace3D_Click(object? sender, RoutedEventArgs e) => _viewModel.WorkspaceMode = "3D";

    private void ShowFeatureMap_Click(object? sender, RoutedEventArgs e)
    {
        var window = new FeatureMapWindow { DataContext = _viewModel };
        window.Show(this);
    }

    private void ShowPresenter_Click(object? sender, RoutedEventArgs e)
    {
        var window = new PresenterPreviewWindow();
        window.Show(this);
    }
}

