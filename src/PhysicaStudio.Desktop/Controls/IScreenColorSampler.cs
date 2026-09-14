using Avalonia;
using Avalonia.Media;

namespace PhysicaStudio.Desktop.Controls;

/// <summary>
/// Platform boundary for screen colour sampling. Colour fields consume this contract;
/// inspectors must not introduce their own platform capture implementations.
/// </summary>
internal interface IScreenColorSampler
{
    bool TrySample(PixelPoint position, out Color color);
}
