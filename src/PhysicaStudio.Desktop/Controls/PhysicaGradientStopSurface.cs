using Avalonia;
using Avalonia.Controls;
using Avalonia.Input;
using Avalonia.Media;
using PhysicaStudio.Document;

namespace PhysicaStudio.Desktop.Controls;

public sealed class GradientStopsChangedEventArgs(
    IReadOnlyList<GradientStopDefinition> stops,
    Guid selectedStopId) : EventArgs
{
    public IReadOnlyList<GradientStopDefinition> Stops { get; } = stops;
    public Guid SelectedStopId { get; } = selectedStopId;
}

public sealed class PhysicaGradientStopSurface : Control
{
    private readonly List<GradientStopDefinition> _stops = [];
    private Guid _selectedStopId;
    private bool _dragging;

    public PhysicaGradientStopSurface()
    {
        Focusable = true;
        Cursor = new Cursor(StandardCursorType.Hand);
    }

    public event EventHandler<GradientStopsChangedEventArgs>? StopsChanged;

    public IReadOnlyList<GradientStopDefinition> Stops => _stops.ToArray();
    public Guid SelectedStopId => _selectedStopId;

    public GradientStopDefinition SelectedStop =>
        _stops.First(stop => stop.Id == _selectedStopId);

    public void SetStops(IEnumerable<GradientStopDefinition> stops, Guid? selectedStopId = null)
    {
        _stops.Clear();
        _stops.AddRange(stops.OrderBy(stop => stop.Position));
        if (_stops.Count == 0)
        {
            return;
        }
        _selectedStopId = selectedStopId is Guid requested && _stops.Any(stop => stop.Id == requested)
            ? requested
            : _stops[0].Id;
        InvalidateVisual();
    }

    public void AddStop()
    {
        if (_stops.Count >= 32)
        {
            return;
        }
        var ordered = _stops.OrderBy(stop => stop.Position).ToArray();
        var left = ordered[0];
        var right = ordered[^1];
        var largestGap = -1d;
        for (var index = 0; index < ordered.Length - 1; index++)
        {
            var gap = ordered[index + 1].Position - ordered[index].Position;
            if (gap > largestGap)
            {
                largestGap = gap;
                left = ordered[index];
                right = ordered[index + 1];
            }
        }
        AddStopAt((left.Position + right.Position) / 2);
    }

    public void RemoveSelectedStop()
    {
        if (_stops.Count <= 2)
        {
            return;
        }
        var removedIndex = _stops.FindIndex(stop => stop.Id == _selectedStopId);
        _stops.RemoveAt(removedIndex);
        var fallbackIndex = Math.Clamp(removedIndex, 0, _stops.Count - 1);
        _selectedStopId = _stops[fallbackIndex].Id;
        PublishChange();
    }

    public void SetSelectedColor(Color color)
    {
        ReplaceSelected(SelectedStop with { Color = ToHex(color) });
    }

    public void SetSelectedPosition(double position)
    {
        ReplaceSelected(SelectedStop with { Position = Math.Clamp(position, 0, 1) });
    }

    public override void Render(DrawingContext context)
    {
        base.Render(context);
        if (_stops.Count < 2)
        {
            return;
        }

        var rail = RailBounds;
        var brush = new LinearGradientBrush
        {
            StartPoint = new RelativePoint(0, .5, RelativeUnit.Relative),
            EndPoint = new RelativePoint(1, .5, RelativeUnit.Relative),
        };
        foreach (var stop in _stops.OrderBy(stop => stop.Position))
        {
            brush.GradientStops.Add(new GradientStop(ParseColor(stop.Color), stop.Position));
        }
        context.DrawRectangle(brush, new Pen(Brush.Parse("#6C8290"), 1), rail, 4, 4);

        foreach (var stop in _stops.OrderBy(stop => stop.Position))
        {
            var x = rail.X + stop.Position * rail.Width;
            var centre = new Point(x, rail.Bottom + 12);
            var selected = stop.Id == _selectedStopId;
            context.DrawLine(new Pen(selected ? Brush.Parse("#42B7FA") : Brush.Parse("#738B99"), selected ? 2 : 1),
                new Point(x, rail.Bottom), new Point(x, centre.Y - 7));
            context.DrawEllipse(Brushes.White, new Pen(Brushes.Black, 2), centre, selected ? 8 : 7, selected ? 8 : 7);
            context.DrawEllipse(new SolidColorBrush(ParseColor(stop.Color)), null, centre, selected ? 5 : 4, selected ? 5 : 4);
            if (selected)
            {
                context.DrawEllipse(null, new Pen(Brush.Parse("#42B7FA"), 2), centre, 9, 9);
            }
        }

        if (IsFocused)
        {
            context.DrawRectangle(null, new Pen(Brush.Parse("#32A8F4"), 1), Bounds.Deflate(.5), 5, 5);
        }
    }

    protected override void OnPointerPressed(PointerPressedEventArgs e)
    {
        base.OnPointerPressed(e);
        var point = e.GetCurrentPoint(this);
        if (!point.Properties.IsLeftButtonPressed || _stops.Count < 2)
        {
            return;
        }
        Focus();
        var position = PositionFromX(point.Position.X);
        var nearest = _stops.OrderBy(stop => Math.Abs(stop.Position - position)).First();
        var distance = Math.Abs(XFromPosition(nearest.Position) - point.Position.X);
        if (e.ClickCount == 2 && RailBounds.Contains(point.Position))
        {
            AddStopAt(position);
            e.Handled = true;
            return;
        }
        if (distance > 13 || point.Position.Y < RailBounds.Bottom - 3)
        {
            return;
        }
        _selectedStopId = nearest.Id;
        _dragging = true;
        e.Pointer.Capture(this);
        PublishChange();
        e.Handled = true;
    }

    protected override void OnPointerMoved(PointerEventArgs e)
    {
        base.OnPointerMoved(e);
        if (!_dragging)
        {
            return;
        }
        SetSelectedPosition(PositionFromX(e.GetPosition(this).X));
        e.Handled = true;
    }

    protected override void OnPointerReleased(PointerReleasedEventArgs e)
    {
        base.OnPointerReleased(e);
        if (_dragging)
        {
            SetSelectedPosition(PositionFromX(e.GetPosition(this).X));
        }
        _dragging = false;
        e.Pointer.Capture(null);
        e.Handled = true;
    }

    protected override void OnKeyDown(KeyEventArgs e)
    {
        base.OnKeyDown(e);
        if (_stops.Count == 0)
        {
            return;
        }
        var ordered = _stops.OrderBy(stop => stop.Position).ToArray();
        var index = Array.FindIndex(ordered, stop => stop.Id == _selectedStopId);
        switch (e.Key)
        {
            case Key.Left when e.KeyModifiers.HasFlag(KeyModifiers.Control):
                _selectedStopId = ordered[Math.Max(0, index - 1)].Id;
                PublishChange();
                break;
            case Key.Right when e.KeyModifiers.HasFlag(KeyModifiers.Control):
                _selectedStopId = ordered[Math.Min(ordered.Length - 1, index + 1)].Id;
                PublishChange();
                break;
            case Key.Left:
                SetSelectedPosition(SelectedStop.Position - (e.KeyModifiers.HasFlag(KeyModifiers.Shift) ? .05 : .01));
                break;
            case Key.Right:
                SetSelectedPosition(SelectedStop.Position + (e.KeyModifiers.HasFlag(KeyModifiers.Shift) ? .05 : .01));
                break;
            case Key.Delete:
                RemoveSelectedStop();
                break;
            default:
                return;
        }
        e.Handled = true;
    }

    private Rect RailBounds => new(10, 8, Math.Max(1, Bounds.Width - 20), 30);

    private void AddStopAt(double position)
    {
        var color = InterpolateColor(position);
        var stop = GradientStopDefinition.Create(position, ToHex(color));
        _stops.Add(stop);
        _selectedStopId = stop.Id;
        PublishChange();
    }

    private Color InterpolateColor(double position)
    {
        var ordered = _stops.OrderBy(stop => stop.Position).ToArray();
        var rightIndex = Array.FindIndex(ordered, stop => stop.Position >= position);
        if (rightIndex <= 0)
        {
            return ParseColor(ordered[0].Color);
        }
        if (rightIndex < 0)
        {
            return ParseColor(ordered[^1].Color);
        }
        var left = ordered[rightIndex - 1];
        var right = ordered[rightIndex];
        var span = Math.Max(.000001, right.Position - left.Position);
        var amount = Math.Clamp((position - left.Position) / span, 0, 1);
        var a = ParseColor(left.Color);
        var b = ParseColor(right.Color);
        return Color.FromRgb(
            Lerp(a.R, b.R, amount),
            Lerp(a.G, b.G, amount),
            Lerp(a.B, b.B, amount));
    }

    private void ReplaceSelected(GradientStopDefinition replacement)
    {
        var index = _stops.FindIndex(stop => stop.Id == _selectedStopId);
        if (index < 0)
        {
            return;
        }
        _stops[index] = replacement;
        PublishChange();
    }

    private void PublishChange()
    {
        InvalidateVisual();
        StopsChanged?.Invoke(this, new GradientStopsChangedEventArgs(Stops, _selectedStopId));
    }

    private double PositionFromX(double x) => Math.Clamp((x - RailBounds.X) / RailBounds.Width, 0, 1);
    private double XFromPosition(double position) => RailBounds.X + position * RailBounds.Width;
    private static byte Lerp(byte a, byte b, double amount) => (byte)Math.Clamp(Math.Round(a + (b - a) * amount), 0, 255);
    private static Color ParseColor(string value) => Color.Parse(value);
    private static string ToHex(Color color) => $"#{color.R:X2}{color.G:X2}{color.B:X2}";
}
