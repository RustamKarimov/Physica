using Avalonia.Controls;
using Avalonia.Media;

namespace PhysicaStudio.Desktop.Controls;

internal static class PhysicaScreenEyedropper
{
    public static bool IsSupported => OperatingSystem.IsWindows();

    public static async Task<Color?> PickAsync(Window owner)
    {
        if (!IsSupported)
        {
            return null;
        }

        var screen = owner.Screens.ScreenFromWindow(owner) ?? owner.Screens.Primary;
        if (screen is null)
        {
            return null;
        }

        var overlay = new PhysicaEyedropperOverlay(
            new WindowsScreenColorSampler(),
            screen.Bounds,
            screen.Scaling);
        return await overlay.ShowDialog<Color?>(owner);
    }
}
