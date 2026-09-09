using Avalonia;
using Avalonia.Controls;
using Avalonia.Input;
using Avalonia.Interactivity;
using Avalonia.VisualTree;
using PhysicaStudio.Authoring;
using PhysicaStudio.Desktop.ViewModels;

namespace PhysicaStudio.Desktop.Views;

public sealed partial class MainWindow
{
    private Guid? _pendingLayerDragId;
    private Point? _layerDragStart;
    private bool _layerDragStarted;
    private Guid? _layerDropTargetId;
    private bool _layerDropAfter;

    private void ShowInspectorPanel_Click(object? sender, RoutedEventArgs e)
    {
        EnsureRightPanelVisible();
        _viewModel.SelectRightPanelWorkspace(RightPanelWorkspace.Inspector);
    }

    private void ShowLayersPanel_Click(object? sender, RoutedEventArgs e)
    {
        EnsureRightPanelVisible();
        _viewModel.SelectRightPanelWorkspace(RightPanelWorkspace.Layers);
    }

    private void EnsureRightPanelVisible()
    {
        RightPanel.IsVisible = true;
        ExpandRightButton.IsVisible = false;
        RightSplitter.IsVisible = true;
        WorkspaceGrid.ColumnDefinitions[4].Width = new GridLength(320);
    }

    private void LayerItem_PointerPressed(object? sender, PointerPressedEventArgs e)
    {
        if (sender is not Border { DataContext: LayerItemViewModel layer } row
            || !e.GetCurrentPoint(row).Properties.IsLeftButtonPressed
            || IsLayerInteractiveChild(e.Source))
        {
            return;
        }

        row.Focus();
        _viewModel.SelectNode(layer.Id, LayerSelectionModeFor(e.KeyModifiers));
        if (e.ClickCount == 2)
        {
            var nameLabel = row.GetVisualDescendants().OfType<TextBlock>()
                .FirstOrDefault(text => text.Name == "LayerNameLabel");
            if (nameLabel is not null)
            {
                BeginLayerRename(nameLabel);
            }
            e.Handled = true;
            return;
        }

        _pendingLayerDragId = layer.Id;
        _layerDragStart = e.GetPosition(this);
        _layerDragStarted = false;
        _layerDropTargetId = null;
        e.Pointer.Capture(row);
        e.Handled = true;
    }

    private void LayerItem_PointerMoved(object? sender, PointerEventArgs e)
    {
        if (_pendingLayerDragId is null || _layerDragStart is null)
        {
            return;
        }

        var point = e.GetPosition(this);
        if (!_layerDragStarted && Distance(point, _layerDragStart.Value) < 6)
        {
            return;
        }

        _layerDragStarted = true;
        var target = LayerRows().FirstOrDefault(candidate =>
        {
            var origin = candidate.TranslatePoint(new Point(0, 0), this);
            return origin is Point topLeft
                && new Rect(topLeft, candidate.Bounds.Size).Contains(point);
        });

        if (target?.DataContext is not LayerItemViewModel targetLayer
            || _viewModel.SelectedNodeIds.Contains(targetLayer.Id))
        {
            _layerDropTargetId = null;
            ClearLayerDropIndicators();
            return;
        }

        var targetOrigin = target.TranslatePoint(new Point(0, 0), this)!.Value;
        _layerDropTargetId = targetLayer.Id;
        _layerDropAfter = point.Y >= targetOrigin.Y + target.Bounds.Height / 2;
        ClearLayerDropIndicators();
        target.Classes.Add(_layerDropAfter ? "drop-after" : "drop-before");

        var scrollPoint = e.GetPosition(LayerScrollViewer);
        var scrollDelta = scrollPoint.Y switch
        {
            < 28 => -18,
            var y when y > LayerScrollViewer.Bounds.Height - 28 => 18,
            _ => 0,
        };
        if (scrollDelta != 0)
        {
            LayerScrollViewer.Offset = new Vector(
                LayerScrollViewer.Offset.X,
                Math.Max(0, LayerScrollViewer.Offset.Y + scrollDelta));
        }
        e.Handled = true;
    }

    private void LayerItem_PointerReleased(object? sender, PointerReleasedEventArgs e)
    {
        var shouldReorder = _layerDragStarted && _layerDropTargetId is Guid;
        var targetId = _layerDropTargetId;
        var placeAboveTarget = !_layerDropAfter;
        ResetLayerDrag();

        if (sender is Control control)
        {
            e.Pointer.Capture(null);
            control.Focus();
        }

        if (shouldReorder && targetId is Guid destinationId)
        {
            ExecuteLayerAction(() =>
                _viewModel.MoveSelectedNodesRelative(destinationId, placeAboveTarget));
        }

        e.Handled = true;
    }

    private void LayerItem_PointerCaptureLost(object? sender, PointerCaptureLostEventArgs e) => ResetLayerDrag();

    private void ResetLayerDrag()
    {
        ClearLayerDropIndicators();
        _pendingLayerDragId = null;
        _layerDragStart = null;
        _layerDragStarted = false;
        _layerDropTargetId = null;
    }

    private IEnumerable<Border> LayerRows() => LayerItemsControl
        .GetVisualDescendants()
        .OfType<Border>()
        .Where(border => border.Classes.Contains("layer-row") && border.DataContext is LayerItemViewModel);

    private void ClearLayerDropIndicators()
    {
        foreach (var row in LayerRows())
        {
            row.Classes.Remove("drop-before");
            row.Classes.Remove("drop-after");
        }
    }

    private static bool IsLayerInteractiveChild(object? source)
    {
        if (source is not Visual visual)
        {
            return false;
        }

        return visual is Button or TextBox
            || visual.GetVisualAncestors().Any(ancestor => ancestor is Button or TextBox);
    }

    private static NodeSelectionMode LayerSelectionModeFor(KeyModifiers modifiers) =>
        modifiers.HasFlag(KeyModifiers.Control) || modifiers.HasFlag(KeyModifiers.Meta)
            ? NodeSelectionMode.Toggle
            : modifiers.HasFlag(KeyModifiers.Shift)
                ? NodeSelectionMode.Range
                : NodeSelectionMode.Replace;

    private void LayerVisibility_Click(object? sender, RoutedEventArgs e)
    {
        if (sender is Button { DataContext: LayerItemViewModel layer })
        {
            ExecuteLayerAction(() => _viewModel.SetNodeVisible(layer.Id, !layer.IsVisible));
        }
    }

    private void LayerLock_Click(object? sender, RoutedEventArgs e)
    {
        if (sender is Button { DataContext: LayerItemViewModel layer })
        {
            ExecuteLayerAction(() => _viewModel.SetNodeLocked(layer.Id, !layer.IsLocked));
        }
    }

    private void RenameLayer_Click(object? sender, RoutedEventArgs e) => BeginSelectedLayerRename();

    private void BeginSelectedLayerRename()
    {
        if (_viewModel.SelectedNodeIds.Count != 1)
        {
            return;
        }

        var selectedId = _viewModel.SelectedNodeIds.Single();
        var label = LayerRows()
            .Where(row => row.DataContext is LayerItemViewModel layer && layer.Id == selectedId)
            .SelectMany(row => row.GetVisualDescendants().OfType<TextBlock>())
            .FirstOrDefault(text => text.Name == "LayerNameLabel");
        if (label is not null)
        {
            BeginLayerRename(label);
        }
    }

    private static void BeginLayerRename(TextBlock label)
    {
        var row = label.GetVisualAncestors().OfType<Border>()
            .First(border => border.DataContext is LayerItemViewModel);
        var display = row.GetVisualDescendants().OfType<StackPanel>()
            .First(panel => panel.Name == "LayerNameDisplay");
        var editor = row.GetVisualDescendants().OfType<TextBox>()
            .First(textBox => textBox.Name == "LayerNameEditor");
        display.IsVisible = false;
        editor.IsVisible = true;
        editor.SelectAll();
        editor.Focus();
    }

    private void LayerNameEditor_KeyDown(object? sender, KeyEventArgs e)
    {
        if (sender is not TextBox editor)
        {
            return;
        }

        if (e.Key == Key.Enter)
        {
            CommitLayerRename(editor);
            e.Handled = true;
        }
        else if (e.Key == Key.Escape)
        {
            FinishLayerRename(editor);
            e.Handled = true;
        }
    }

    private void LayerNameEditor_LostFocus(object? sender, RoutedEventArgs e)
    {
        if (sender is TextBox { IsVisible: true } editor)
        {
            CommitLayerRename(editor);
        }
    }

    private void CommitLayerRename(TextBox editor)
    {
        var row = editor.GetVisualAncestors().OfType<Border>()
            .First(border => border.DataContext is LayerItemViewModel);
        var layer = (LayerItemViewModel)row.DataContext!;
        var value = editor.Text ?? string.Empty;
        FinishLayerRename(editor);
        ExecuteLayerAction(() => _viewModel.RenameNode(layer.Id, value));
    }

    private static void FinishLayerRename(TextBox editor)
    {
        var row = editor.GetVisualAncestors().OfType<Border>()
            .First(border => border.DataContext is LayerItemViewModel);
        var display = row.GetVisualDescendants().OfType<StackPanel>()
            .First(panel => panel.Name == "LayerNameDisplay");
        editor.IsVisible = false;
        display.IsVisible = true;
    }

    private void BringToFront_Click(object? sender, RoutedEventArgs e) =>
        ExecuteLayerAction(() => _viewModel.MoveSelectedNodesToBoundary(toFront: true));

    private void BringForward_Click(object? sender, RoutedEventArgs e) =>
        ExecuteLayerAction(() => _viewModel.MoveSelectedNodesOneLayer(towardFront: true));

    private void SendBackward_Click(object? sender, RoutedEventArgs e) =>
        ExecuteLayerAction(() => _viewModel.MoveSelectedNodesOneLayer(towardFront: false));

    private void SendToBack_Click(object? sender, RoutedEventArgs e) =>
        ExecuteLayerAction(() => _viewModel.MoveSelectedNodesToBoundary(toFront: false));

    private void ExecuteLayerAction(Action action)
    {
        try
        {
            action();
        }
        catch (AuthoringCommandException exception)
        {
            _viewModel.SetStatus(exception.Message);
        }
    }
}
