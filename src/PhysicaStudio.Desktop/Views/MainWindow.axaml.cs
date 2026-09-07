using Avalonia;
using Avalonia.Controls;
using Avalonia.Input;
using Avalonia.Interactivity;
using PhysicaStudio.Desktop.ViewModels;

namespace PhysicaStudio.Desktop.Views;

public sealed partial class MainWindow : Window
{
    private readonly StudioShellViewModel _viewModel = new();

    public MainWindow() : this(null)
    {
    }

    public MainWindow(string? previewMode)
    {
        InitializeComponent();
        DataContext = _viewModel;

        _viewModel.SelectWorkspace(previewMode switch
        {
            "animation" => StudioWorkspace.Animation,
            "graphs" => StudioWorkspace.Graphs,
            _ => StudioWorkspace.Authoring
        });
    }

    private void WindowTitleBar_PointerPressed(object? sender, PointerPressedEventArgs e)
    {
        if (e.GetCurrentPoint(this).Properties.IsLeftButtonPressed)
        {
            if (e.ClickCount == 2)
            {
                ToggleMaximize();
            }
            else
            {
                BeginMoveDrag(e);
            }
        }
    }

    private void MinimizeWindow_Click(object? sender, RoutedEventArgs e) =>
        WindowState = WindowState.Minimized;

    private void MaximizeWindow_Click(object? sender, RoutedEventArgs e) => ToggleMaximize();

    private void CloseWindow_Click(object? sender, RoutedEventArgs e) => Close();

    private void ToggleMaximize() =>
        WindowState = WindowState == WindowState.Maximized ? WindowState.Normal : WindowState.Maximized;

    private void RibbonTab_Click(object? sender, RoutedEventArgs e)
    {
        if (sender is Button { DataContext: RibbonTabViewModel tab })
        {
            _viewModel.SelectRibbon(tab);
        }
    }

    private void ToggleLeftPanel_Click(object? sender, RoutedEventArgs e)
    {
        LeftPanel.IsVisible = !LeftPanel.IsVisible;
        ExpandLeftButton.IsVisible = !LeftPanel.IsVisible;
        LeftSplitter.IsVisible = LeftPanel.IsVisible;
        WorkspaceGrid.ColumnDefinitions[0].Width = LeftPanel.IsVisible ? new GridLength(242) : new GridLength(0);
    }

    private void ToggleRightPanel_Click(object? sender, RoutedEventArgs e)
    {
        RightPanel.IsVisible = !RightPanel.IsVisible;
        ExpandRightButton.IsVisible = !RightPanel.IsVisible;
        RightSplitter.IsVisible = RightPanel.IsVisible;
        WorkspaceGrid.ColumnDefinitions[4].Width = RightPanel.IsVisible ? new GridLength(296) : new GridLength(0);
    }

    private void ToggleBottomPanel_Click(object? sender, RoutedEventArgs e)
    {
        BottomPanel.IsVisible = !BottomPanel.IsVisible;
        ExpandBottomButton.IsVisible = !BottomPanel.IsVisible;
        BottomSplitter.IsVisible = BottomPanel.IsVisible;
        CenterGrid.RowDefinitions[2].Height = BottomPanel.IsVisible ? new GridLength(260) : new GridLength(32);
    }

    private void Workspace2D_Click(object? sender, RoutedEventArgs e) => _viewModel.WorkspaceMode = "2D";

    private void Workspace3D_Click(object? sender, RoutedEventArgs e) => _viewModel.WorkspaceMode = "3D";

    private void ShowAuthoringWorkspace_Click(object? sender, RoutedEventArgs e) =>
        _viewModel.SelectWorkspace(StudioWorkspace.Authoring);

    private void ShowAnimationWorkspace_Click(object? sender, RoutedEventArgs e) =>
        _viewModel.SelectWorkspace(StudioWorkspace.Animation);

    private void ShowGraphWorkspace_Click(object? sender, RoutedEventArgs e) =>
        _viewModel.SelectWorkspace(StudioWorkspace.Graphs);

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
