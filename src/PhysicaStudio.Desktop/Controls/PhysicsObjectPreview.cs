using Avalonia;
using Avalonia.Controls;
using Avalonia.Media;

namespace PhysicaStudio.Desktop.Controls;

public sealed class PhysicsObjectPreview : Control
{
    public static readonly StyledProperty<string> PreviewKindProperty =
        AvaloniaProperty.Register<PhysicsObjectPreview, string>(nameof(PreviewKind), "wave");

    public string PreviewKind
    {
        get => GetValue(PreviewKindProperty);
        set => SetValue(PreviewKindProperty, value);
    }

    public override void Render(DrawingContext context)
    {
        base.Render(context);
        var w = Bounds.Width;
        var h = Bounds.Height;
        var teal = Brush.Parse("#55D9CA");
        var blue = Brush.Parse("#6BB9FF");
        var warm = Brush.Parse("#E9AF59");
        var muted = Brush.Parse("#8DA5B8");
        var pen = new Pen(teal, 2, null, PenLineCap.Round, PenLineJoin.Round, 10);
        Point P(double x, double y) => new(w * x, h * y);

        switch (PreviewKind)
        {
            case "spring":
                context.DrawLine(new Pen(muted, 2), P(.12, .15), P(.88, .15));
                context.DrawGeometry(null, pen, PathGeometry.Parse($"M {w*.5},{h*.15} L {w*.5},{h*.23} L {w*.36},{h*.29} L {w*.64},{h*.38} L {w*.36},{h*.47} L {w*.64},{h*.56} L {w*.5},{h*.63} L {w*.5},{h*.72}"));
                context.DrawRectangle(blue, null, new Rect(w * .33, h * .72, w * .34, h * .19), 3, 3);
                break;
            case "projectile":
                context.DrawLine(new Pen(muted, 2), P(.1, .84), P(.9, .84));
                context.DrawGeometry(null, pen, PathGeometry.Parse($"M {w*.18},{h*.78} C {w*.38},{h*.12} {w*.67},{h*.14} {w*.86},{h*.78}"));
                context.DrawEllipse(warm, new Pen(Brushes.White, 1), P(.48, .28), w * .08, h * .08);
                break;
            case "plates":
                context.DrawRectangle(blue, null, new Rect(w * .16, h * .18, w * .1, h * .64), 2, 2);
                context.DrawRectangle(warm, null, new Rect(w * .74, h * .18, w * .1, h * .64), 2, 2);
                for (var y = .28; y <= .72; y += .14)
                {
                    context.DrawLine(pen, P(.31, y), P(.68, y));
                }
                break;
            case "circuit":
                context.DrawRectangle(null, pen, new Rect(w * .14, h * .23, w * .72, h * .54), 3, 3);
                context.DrawLine(new Pen(warm, 2), P(.39, .67), P(.39, .86));
                context.DrawLine(new Pen(warm, 4), P(.53, .62), P(.53, .9));
                context.DrawEllipse(null, new Pen(blue, 2), P(.7, .23), w * .1, h * .1);
                break;
            case "lens":
                context.DrawGeometry(null, new Pen(blue, 3), PathGeometry.Parse($"M {w*.43},{h*.12} C {w*.22},{h*.3} {w*.22},{h*.7} {w*.43},{h*.88} M {w*.57},{h*.12} C {w*.78},{h*.3} {w*.78},{h*.7} {w*.57},{h*.88}"));
                context.DrawLine(new Pen(warm, 2), P(.08, .35), P(.42, .43));
                context.DrawLine(new Pen(warm, 2), P(.58, .43), P(.92, .62));
                break;
            default:
                context.DrawGeometry(null, pen, PathGeometry.Parse($"M {w*.08},{h*.5} C {w*.2},{h*.12} {w*.32},{h*.12} {w*.44},{h*.5} C {w*.56},{h*.88} {w*.68},{h*.88} {w*.8},{h*.5} C {w*.86},{h*.31} {w*.9},{h*.3} {w*.94},{h*.5}"));
                break;
        }
    }
}
