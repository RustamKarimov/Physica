using System.Runtime.InteropServices;
using Avalonia;
using Avalonia.Media;

namespace PhysicaStudio.Desktop.Controls;

internal sealed class WindowsScreenColorSampler : IScreenColorSampler
{
    private const uint InvalidColor = 0xFFFFFFFF;

    public bool TrySample(PixelPoint position, out Color color)
    {
        color = default;
        var deviceContext = GetDC(IntPtr.Zero);
        if (deviceContext == IntPtr.Zero)
        {
            return false;
        }

        try
        {
            var colorReference = GetPixel(deviceContext, position.X, position.Y);
            if (colorReference == InvalidColor)
            {
                return false;
            }

            color = DecodeColorReference(colorReference);
            return true;
        }
        finally
        {
            _ = ReleaseDC(IntPtr.Zero, deviceContext);
        }
    }

    internal static Color DecodeColorReference(uint colorReference) => Color.FromRgb(
        (byte)(colorReference & 0xFF),
        (byte)((colorReference >> 8) & 0xFF),
        (byte)((colorReference >> 16) & 0xFF));

    [DllImport("user32.dll")]
    private static extern IntPtr GetDC(IntPtr windowHandle);

    [DllImport("user32.dll")]
    private static extern int ReleaseDC(IntPtr windowHandle, IntPtr deviceContext);

    [DllImport("gdi32.dll")]
    private static extern uint GetPixel(IntPtr deviceContext, int x, int y);
}
