using Avalonia;
using PhysicaStudio.Rendering2D;

namespace PhysicaStudio.Desktop.Controls;

public static class CanvasTransformGeometry
{
    public static RenderBounds ResizeBounds(
        RenderBounds original,
        CanvasSelectionHandle handle,
        Point current,
        bool preserveAspectRatio,
        bool resizeFromCenter)
    {
        const double minimum = 20;
        var west = handle is CanvasSelectionHandle.ResizeNorthWest or CanvasSelectionHandle.ResizeSouthWest;
        var north = handle is CanvasSelectionHandle.ResizeNorthWest or CanvasSelectionHandle.ResizeNorthEast;
        var signX = west ? -1d : 1d;
        var signY = north ? -1d : 1d;
        var center = new Point(original.X + original.Width / 2, original.Y + original.Height / 2);

        if (preserveAspectRatio)
        {
            var anchor = resizeFromCenter
                ? center
                : new Point(west ? original.X + original.Width : original.X,
                    north ? original.Y + original.Height : original.Y);
            var divisor = resizeFromCenter ? 2d : 1d;
            var originalVector = new Point(
                signX * original.Width / divisor,
                signY * original.Height / divisor);
            var currentVector = new Point(current.X - anchor.X, current.Y - anchor.Y);
            var denominator = originalVector.X * originalVector.X + originalVector.Y * originalVector.Y;
            var projectedScale = denominator < .001
                ? 1
                : (currentVector.X * originalVector.X + currentVector.Y * originalVector.Y) / denominator;
            var minimumScale = Math.Max(
                minimum / Math.Max(original.Width, minimum),
                minimum / Math.Max(original.Height, minimum));
            var scale = Math.Max(projectedScale, minimumScale);
            var width = Math.Max(minimum, original.Width * scale);
            var height = Math.Max(minimum, original.Height * scale);

            return resizeFromCenter
                ? new RenderBounds(center.X - width / 2, center.Y - height / 2, width, height)
                : new RenderBounds(
                    west ? anchor.X - width : anchor.X,
                    north ? anchor.Y - height : anchor.Y,
                    width,
                    height);
        }

        if (resizeFromCenter)
        {
            var width = Math.Max(minimum, 2 * Math.Abs(current.X - center.X));
            var height = Math.Max(minimum, 2 * Math.Abs(current.Y - center.Y));
            return new RenderBounds(center.X - width / 2, center.Y - height / 2, width, height);
        }

        var opposite = new Point(
            west ? original.X + original.Width : original.X,
            north ? original.Y + original.Height : original.Y);
        var targetWidth = Math.Max(minimum, Math.Abs(current.X - opposite.X));
        var targetHeight = Math.Max(minimum, Math.Abs(current.Y - opposite.Y));
        return new RenderBounds(
            west ? opposite.X - targetWidth : opposite.X,
            north ? opposite.Y - targetHeight : opposite.Y,
            targetWidth,
            targetHeight);
    }

    public static RenderBounds Union(IEnumerable<RenderBounds> bounds)
    {
        var values = bounds.ToArray();
        var left = values.Min(value => value.X);
        var top = values.Min(value => value.Y);
        var right = values.Max(value => value.X + value.Width);
        var bottom = values.Max(value => value.Y + value.Height);
        return new RenderBounds(left, top, right - left, bottom - top);
    }

    public static Point Rotate(Point point, Point center, double degrees)
    {
        var radians = degrees * Math.PI / 180;
        var cosine = Math.Cos(radians);
        var sine = Math.Sin(radians);
        var x = point.X - center.X;
        var y = point.Y - center.Y;
        return new Point(
            center.X + x * cosine - y * sine,
            center.Y + x * sine + y * cosine);
    }

    public static Rect Normalize(Point start, Point end) => new(
        Math.Min(start.X, end.X),
        Math.Min(start.Y, end.Y),
        Math.Abs(end.X - start.X),
        Math.Abs(end.Y - start.Y));
}
