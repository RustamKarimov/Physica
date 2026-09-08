using Avalonia;
using Avalonia.Controls;
using PhysicaStudio.Desktop.Controls;

namespace PhysicaStudio.Foundation.Tests;

public sealed class SlideNavigatorLayoutTests
{
    [Theory]
    [InlineData(160, 90)]
    [InlineData(240, 135)]
    [InlineData(320, 180)]
    public void AspectRatioDecoratorTracksAvailablePanelWidth(double width, double expectedHeight)
    {
        var decorator = new AspectRatioDecorator
        {
            AspectRatio = 16d / 9d,
            Child = new Border(),
        };

        decorator.Measure(new Size(width, double.PositiveInfinity));

        Assert.Equal(width, decorator.DesiredSize.Width, 6);
        Assert.Equal(expectedHeight, decorator.DesiredSize.Height, 6);
    }

    [Fact]
    public void AspectRatioDecoratorSupportsNonWidescreenLessons()
    {
        var decorator = new AspectRatioDecorator { AspectRatio = 4d / 3d, Child = new Border() };

        decorator.Measure(new Size(240, double.PositiveInfinity));

        Assert.Equal(new Size(240, 180), decorator.DesiredSize);
    }
}
