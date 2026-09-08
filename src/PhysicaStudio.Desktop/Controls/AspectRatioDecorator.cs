using Avalonia;
using Avalonia.Controls;

namespace PhysicaStudio.Desktop.Controls;

public sealed class AspectRatioDecorator : Decorator
{
    public static readonly StyledProperty<double> AspectRatioProperty =
        AvaloniaProperty.Register<AspectRatioDecorator, double>(nameof(AspectRatio), 16d / 9d);

    static AspectRatioDecorator()
    {
        AffectsMeasure<AspectRatioDecorator>(AspectRatioProperty);
    }

    public double AspectRatio
    {
        get => GetValue(AspectRatioProperty);
        set => SetValue(AspectRatioProperty, value);
    }

    protected override Size MeasureOverride(Size availableSize)
    {
        var ratio = ValidRatio;
        var width = double.IsFinite(availableSize.Width)
            ? Math.Max(0, availableSize.Width)
            : Math.Max(0, Child?.DesiredSize.Width ?? 0);
        var height = width / ratio;

        if (double.IsFinite(availableSize.Height) && height > availableSize.Height)
        {
            height = Math.Max(0, availableSize.Height);
            width = height * ratio;
        }

        Child?.Measure(new Size(width, height));
        return new Size(width, height);
    }

    protected override Size ArrangeOverride(Size finalSize)
    {
        var ratio = ValidRatio;
        var width = finalSize.Width;
        var height = width / ratio;
        if (height > finalSize.Height)
        {
            height = finalSize.Height;
            width = height * ratio;
        }

        var x = (finalSize.Width - width) / 2;
        var y = (finalSize.Height - height) / 2;
        Child?.Arrange(new Rect(x, y, width, height));
        return finalSize;
    }

    private double ValidRatio => double.IsFinite(AspectRatio) && AspectRatio > 0 ? AspectRatio : 16d / 9d;
}
