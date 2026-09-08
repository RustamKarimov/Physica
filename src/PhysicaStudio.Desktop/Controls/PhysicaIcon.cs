using Avalonia;
using Avalonia.Controls;
using Avalonia.Media;

namespace PhysicaStudio.Desktop.Controls;

public sealed class PhysicaIcon : Control
{
    public static readonly StyledProperty<string> IconKeyProperty =
        AvaloniaProperty.Register<PhysicaIcon, string>(nameof(IconKey), "command");

    public static readonly StyledProperty<IBrush?> StrokeProperty =
        AvaloniaProperty.Register<PhysicaIcon, IBrush?>(nameof(Stroke));

    public string IconKey
    {
        get => GetValue(IconKeyProperty);
        set => SetValue(IconKeyProperty, value);
    }

    public IBrush? Stroke
    {
        get => GetValue(StrokeProperty);
        set => SetValue(StrokeProperty, value);
    }

    public override void Render(DrawingContext context)
    {
        base.Render(context);
        var brush = Stroke ?? Brushes.White;
        var pen = new Pen(brush, Math.Max(1.35, Math.Min(Bounds.Width, Bounds.Height) / 12), lineCap: PenLineCap.Round, lineJoin: PenLineJoin.Round);
        var w = Bounds.Width;
        var h = Bounds.Height;
        Point P(double x, double y) => new(w * x, h * y);
        Rect R(double x, double y, double width, double height) => new(w * x, h * y, w * width, h * height);

        switch (IconKey)
        {
            case "paste":
                context.DrawRectangle(null, pen, R(.22, .22, .56, .66), 2, 2);
                context.DrawRectangle(null, pen, R(.36, .1, .28, .22), 2, 2);
                context.DrawLine(pen, P(.34, .48), P(.66, .48));
                context.DrawLine(pen, P(.34, .65), P(.6, .65));
                break;
            case "cut":
                context.DrawEllipse(null, pen, P(.28, .72), w * .13, h * .13);
                context.DrawEllipse(null, pen, P(.72, .72), w * .13, h * .13);
                context.DrawLine(pen, P(.36, .62), P(.72, .18));
                context.DrawLine(pen, P(.64, .62), P(.28, .18));
                break;
            case "copy":
                context.DrawRectangle(null, pen, R(.28, .18, .52, .55), 2, 2);
                context.DrawRectangle(null, pen, R(.16, .31, .52, .55), 2, 2);
                break;
            case "edit":
                context.DrawGeometry(null, pen, PathGeometry.Parse($"M {w * .2},{h * .76} L {w * .27},{h * .53} L {w * .68},{h * .12} L {w * .86},{h * .3} L {w * .45},{h * .71} Z"));
                context.DrawLine(pen, P(.27, .53), P(.45, .71));
                context.DrawLine(pen, P(.18, .84), P(.52, .84));
                break;
            case "duplicate":
                context.DrawRectangle(null, pen, R(.23, .23, .5, .5), 2, 2);
                context.DrawLine(pen, P(.73, .34), P(.86, .34));
                context.DrawLine(pen, P(.795, .275), P(.795, .405));
                context.DrawLine(pen, P(.12, .66), P(.25, .66));
                context.DrawLine(pen, P(.185, .595), P(.185, .725));
                break;
            case "format":
                context.DrawGeometry(null, pen, PathGeometry.Parse($"M {w * .2},{h * .62} L {w * .62},{h * .2} L {w * .78},{h * .36} L {w * .36},{h * .78} Z"));
                context.DrawLine(pen, P(.28, .7), P(.18, .82));
                break;
            case "bold":
                context.DrawLine(pen, P(.3, .15), P(.3, .85));
                context.DrawGeometry(null, pen, PathGeometry.Parse($"M {w * .3},{h * .18} L {w * .53},{h * .18} C {w * .8},{h * .18} {w * .8},{h * .48} {w * .53},{h * .48} L {w * .3},{h * .48} M {w * .53},{h * .48} C {w * .84},{h * .48} {w * .84},{h * .82} {w * .53},{h * .82} L {w * .3},{h * .82}"));
                break;
            case "italic":
                context.DrawLine(pen, P(.47, .18), P(.72, .18));
                context.DrawLine(pen, P(.28, .82), P(.53, .82));
                context.DrawLine(pen, P(.58, .18), P(.42, .82));
                break;
            case "underline":
                context.DrawGeometry(null, pen, PathGeometry.Parse($"M {w * .28},{h * .18} L {w * .28},{h * .5} C {w * .28},{h * .76} {w * .72},{h * .76} {w * .72},{h * .5} L {w * .72},{h * .18}"));
                context.DrawLine(pen, P(.2, .86), P(.8, .86));
                break;
            case "list":
                for (var row = 0; row < 3; row++)
                {
                    var y = .28 + row * .23;
                    context.DrawEllipse(brush, null, P(.2, y), w * .035, h * .035);
                    context.DrawLine(pen, P(.32, y), P(.82, y));
                }
                break;
            case "more":
                context.DrawEllipse(brush, null, P(.22, .5), w * .065, h * .065);
                context.DrawEllipse(brush, null, P(.5, .5), w * .065, h * .065);
                context.DrawEllipse(brush, null, P(.78, .5), w * .065, h * .065);
                break;
            case "mass":
                context.DrawEllipse(brush, null, P(.5, .54), w * .28, h * .28);
                context.DrawEllipse(Brushes.White, null, P(.41, .44), w * .055, h * .055);
                context.DrawLine(pen, P(.24, .84), P(.76, .84));
                break;
            case "wave":
                context.DrawGeometry(null, pen, PathGeometry.Parse($"M {w * .1},{h * .52} C {w * .22},{h * .18} {w * .36},{h * .18} {w * .5},{h * .52} C {w * .64},{h * .86} {w * .78},{h * .86} {w * .9},{h * .52}"));
                context.DrawLine(new Pen(brush, Math.Max(1, pen.Thickness * .55), new DashStyle([2, 2], 0)), P(.1, .52), P(.9, .52));
                break;
            case "rod":
                context.DrawLine(new Pen(brush, pen.Thickness * 3.2, lineCap: PenLineCap.Round), P(.2, .75), P(.8, .25));
                context.DrawEllipse(null, pen, P(.2, .75), w * .08, h * .08);
                context.DrawEllipse(null, pen, P(.8, .25), w * .08, h * .08);
                break;
            case "block":
                context.DrawRectangle(null, pen, R(.2, .26, .5, .5), 1, 1);
                context.DrawGeometry(null, pen, PathGeometry.Parse($"M {w * .2},{h * .26} L {w * .34},{h * .14} L {w * .84},{h * .14} L {w * .7},{h * .26} M {w * .7},{h * .26} L {w * .84},{h * .14} L {w * .84},{h * .63} L {w * .7},{h * .76}"));
                break;
            case "gravity":
                context.DrawLine(pen, P(.5, .12), P(.5, .78));
                context.DrawLine(pen, P(.5, .78), P(.34, .6));
                context.DrawLine(pen, P(.5, .78), P(.66, .6));
                context.DrawGeometry(null, new Pen(brush, pen.Thickness * .7), PathGeometry.Parse($"M {w * .18},{h * .22} C {w * .3},{h * .35} {w * .3},{h * .56} {w * .2},{h * .7} M {w * .82},{h * .22} C {w * .7},{h * .35} {w * .7},{h * .56} {w * .8},{h * .7}"));
                break;
            case "air":
                context.DrawGeometry(null, pen, PathGeometry.Parse($"M {w * .12},{h * .3} C {w * .38},{h * .3} {w * .42},{h * .18} {w * .55},{h * .18} C {w * .72},{h * .18} {w * .72},{h * .38} {w * .55},{h * .38} M {w * .12},{h * .52} L {w * .78},{h * .52} M {w * .12},{h * .73} C {w * .4},{h * .73} {w * .47},{h * .84} {w * .62},{h * .84} C {w * .8},{h * .84} {w * .82},{h * .64} {w * .67},{h * .64}"));
                break;
            case "medium":
                for (var row = 0; row < 3; row++)
                    for (var column = 0; column < 3; column++)
                        context.DrawEllipse(column == 1 && row == 1 ? brush : null, pen, P(.27 + column * .23, .27 + row * .23), w * .055, h * .055);
                break;
            case "wall":
                context.DrawRectangle(null, pen, R(.2, .12, .6, .76), 1, 1);
                context.DrawLine(pen, P(.2, .37), P(.8, .37));
                context.DrawLine(pen, P(.2, .63), P(.8, .63));
                context.DrawLine(pen, P(.5, .12), P(.5, .37));
                context.DrawLine(pen, P(.38, .37), P(.38, .63));
                context.DrawLine(pen, P(.6, .63), P(.6, .88));
                break;
            case "ruler":
                context.DrawRectangle(null, pen, R(.12, .3, .76, .4), 1, 1);
                for (var tick = 0; tick < 6; tick++)
                {
                    var x = .22 + tick * .11;
                    context.DrawLine(pen, P(x, .3), P(x, tick % 2 == 0 ? .5 : .43));
                }
                break;
            case "protractor":
                context.DrawGeometry(null, pen, PathGeometry.Parse($"M {w * .14},{h * .72} A {w * .36},{h * .36} 0 0 1 {w * .86},{h * .72} L {w * .14},{h * .72}"));
                context.DrawLine(pen, P(.5, .72), P(.65, .38));
                context.DrawEllipse(brush, null, P(.5, .72), w * .04, h * .04);
                break;
            case "sensor":
                context.DrawEllipse(brush, null, P(.5, .5), w * .07, h * .07);
                context.DrawGeometry(null, pen, PathGeometry.Parse($"M {w * .36},{h * .37} A {w * .2},{h * .2} 0 0 0 {w * .36},{h * .63} M {w * .64},{h * .37} A {w * .2},{h * .2} 0 0 1 {w * .64},{h * .63} M {w * .25},{h * .25} A {w * .35},{h * .35} 0 0 0 {w * .25},{h * .75} M {w * .75},{h * .25} A {w * .35},{h * .35} 0 0 1 {w * .75},{h * .75}"));
                break;
            case "trace":
                context.DrawGeometry(null, pen, PathGeometry.Parse($"M {w * .15},{h * .72} C {w * .34},{h * .16} {w * .62},{h * .84} {w * .85},{h * .28}"));
                context.DrawEllipse(brush, null, P(.15, .72), w * .05, h * .05);
                context.DrawEllipse(brush, null, P(.5, .5), w * .04, h * .04);
                context.DrawEllipse(brush, null, P(.85, .28), w * .05, h * .05);
                break;
            case "path":
                context.DrawGeometry(null, pen, PathGeometry.Parse($"M {w * .15},{h * .75} C {w * .28},{h * .2} {w * .7},{h * .18} {w * .86},{h * .63}"));
                context.DrawRectangle(brush, null, R(.1, .7, .1, .1), 1, 1);
                context.DrawRectangle(brush, null, R(.81, .58, .1, .1), 1, 1);
                break;
            case "field":
                context.DrawEllipse(null, pen, P(.5, .5), w * .08, h * .08);
                for (var ray = 0; ray < 8; ray++)
                {
                    var angle = ray * Math.PI / 4;
                    var start = P(.5 + Math.Cos(angle) * .15, .5 + Math.Sin(angle) * .15);
                    var end = P(.5 + Math.Cos(angle) * .38, .5 + Math.Sin(angle) * .38);
                    context.DrawLine(pen, start, end);
                }
                break;
            case "pin":
                context.DrawEllipse(null, pen, P(.5, .3), w * .18, h * .18);
                context.DrawLine(pen, P(.5, .48), P(.5, .86));
                context.DrawLine(pen, P(.32, .86), P(.68, .86));
                break;
            case "guide":
                context.DrawLine(pen, P(.18, .5), P(.82, .5));
                context.DrawLine(new Pen(brush, pen.Thickness * .7, new DashStyle([2, 2], 0)), P(.5, .15), P(.5, .85));
                context.DrawRectangle(null, pen, R(.35, .35, .3, .3), 1, 1);
                break;
            case "limit":
                context.DrawLine(pen, P(.2, .18), P(.2, .82));
                context.DrawLine(pen, P(.8, .18), P(.8, .82));
                context.DrawLine(pen, P(.36, .5), P(.64, .5));
                context.DrawLine(pen, P(.36, .5), P(.46, .4));
                context.DrawLine(pen, P(.36, .5), P(.46, .6));
                context.DrawLine(pen, P(.64, .5), P(.54, .4));
                context.DrawLine(pen, P(.64, .5), P(.54, .6));
                break;
            case "joint":
                context.DrawLine(new Pen(brush, pen.Thickness * 2.2, lineCap: PenLineCap.Round), P(.16, .72), P(.46, .52));
                context.DrawLine(new Pen(brush, pen.Thickness * 2.2, lineCap: PenLineCap.Round), P(.54, .48), P(.84, .2));
                context.DrawEllipse(null, pen, P(.5, .5), w * .13, h * .13);
                context.DrawEllipse(brush, null, P(.5, .5), w * .035, h * .035);
                break;
            case "check":
                context.DrawEllipse(null, pen, P(.5, .5), w * .34, h * .34);
                context.DrawGeometry(null, pen, PathGeometry.Parse($"M {w * .29},{h * .5} L {w * .44},{h * .66} L {w * .73},{h * .34}"));
                break;
            case "diagnostics":
                context.DrawRectangle(null, pen, R(.12, .2, .58, .56), 2, 2);
                context.DrawGeometry(null, pen, PathGeometry.Parse($"M {w * .2},{h * .56} L {w * .3},{h * .56} L {w * .38},{h * .36} L {w * .49},{h * .66} L {w * .58},{h * .46} L {w * .68},{h * .46}"));
                context.DrawEllipse(null, pen, P(.72, .7), w * .15, h * .15);
                context.DrawLine(pen, P(.82, .81), P(.91, .9));
                break;
            case "save":
                context.DrawRectangle(null, pen, R(.18, .12, .64, .76), 2, 2);
                context.DrawRectangle(null, pen, R(.3, .14, .36, .25));
                context.DrawRectangle(null, pen, R(.3, .55, .4, .25), 2, 2);
                break;
            case "open":
                context.DrawGeometry(null, pen, PathGeometry.Parse($"M {w * .12},{h * .33} L {w * .43},{h * .33} L {w * .52},{h * .44} L {w * .88},{h * .44} L {w * .75},{h * .82} L {w * .15},{h * .82} Z"));
                context.DrawLine(pen, P(.2, .34), P(.2, .2));
                context.DrawLine(pen, P(.2, .2), P(.58, .2));
                break;
            case "play":
                context.DrawGeometry(brush, null, PathGeometry.Parse($"M {w * .3},{h * .18} L {w * .78},{h * .5} L {w * .3},{h * .82} Z"));
                break;
            case "pause":
                context.DrawRectangle(brush, null, R(.25, .2, .16, .6), 1, 1);
                context.DrawRectangle(brush, null, R(.59, .2, .16, .6), 1, 1);
                break;
            case "graph":
                context.DrawLine(pen, P(.16, .82), P(.16, .18));
                context.DrawLine(pen, P(.16, .82), P(.86, .82));
                context.DrawGeometry(null, pen, PathGeometry.Parse($"M {w * .22},{h * .7} C {w * .38},{h * .62} {w * .4},{h * .27} {w * .56},{h * .38} C {w * .68},{h * .47} {w * .72},{h * .22} {w * .86},{h * .2}"));
                break;
            case "equation":
                context.DrawLine(pen, P(.18, .32), P(.82, .32));
                context.DrawLine(pen, P(.18, .68), P(.82, .68));
                break;
            case "physics":
                context.DrawEllipse(null, pen, P(.5, .5), w * .34, h * .14);
                context.DrawEllipse(null, pen, P(.5, .5), w * .14, h * .34);
                context.DrawEllipse(brush, null, P(.5, .5), w * .07, h * .07);
                break;
            case "camera":
                context.DrawRectangle(null, pen, R(.14, .28, .58, .5), 3, 3);
                context.DrawGeometry(null, pen, PathGeometry.Parse($"M {w * .72},{h * .4} L {w * .9},{h * .3} L {w * .9},{h * .76} L {w * .72},{h * .66} Z"));
                break;
            case "cube":
                context.DrawGeometry(null, pen, PathGeometry.Parse($"M {w * .5},{h * .1} L {w * .84},{h * .3} L {w * .84},{h * .68} L {w * .5},{h * .9} L {w * .16},{h * .68} L {w * .16},{h * .3} Z M {w * .16},{h * .3} L {w * .5},{h * .5} L {w * .84},{h * .3} M {w * .5},{h * .5} L {w * .5},{h * .9}"));
                break;
            case "text":
                context.DrawLine(pen, P(.2, .2), P(.8, .2));
                context.DrawLine(pen, P(.5, .2), P(.5, .82));
                context.DrawLine(pen, P(.34, .82), P(.66, .82));
                break;
            case "image":
                context.DrawRectangle(null, pen, R(.14, .18, .72, .64), 2, 2);
                context.DrawEllipse(null, pen, P(.68, .36), w * .08, h * .08);
                context.DrawGeometry(null, pen, PathGeometry.Parse($"M {w * .2},{h * .72} L {w * .4},{h * .5} L {w * .53},{h * .63} L {w * .66},{h * .5} L {w * .82},{h * .72}"));
                break;
            case "arrow":
                context.DrawLine(pen, P(.14, .72), P(.76, .24));
                context.DrawLine(pen, P(.76, .24), P(.58, .24));
                context.DrawLine(pen, P(.76, .24), P(.72, .42));
                break;
            case "align":
                context.DrawLine(pen, P(.18, .2), P(.18, .8));
                context.DrawLine(pen, P(.3, .32), P(.78, .32));
                context.DrawLine(pen, P(.3, .52), P(.64, .52));
                context.DrawLine(pen, P(.3, .72), P(.84, .72));
                break;
            case "slide":
                context.DrawRectangle(null, pen, R(.12, .2, .76, .58), 2, 2);
                context.DrawLine(pen, P(.25, .34), P(.72, .34));
                context.DrawLine(pen, P(.25, .5), P(.6, .5));
                break;
            case "undo":
            case "redo":
                var reverse = IconKey == "redo";
                var a = reverse ? .78 : .22;
                var b = reverse ? .22 : .78;
                context.DrawGeometry(null, pen, PathGeometry.Parse($"M {w * a},{h * .28} C {w * b},{h * .2} {w * b},{h * .78} {w * (reverse ? .72 : .28)},{h * .72}"));
                context.DrawLine(pen, P(a, .28), P(reverse ? .62 : .38, .15));
                context.DrawLine(pen, P(a, .28), P(reverse ? .62 : .38, .41));
                break;
            case "delete":
                context.DrawRectangle(null, pen, R(.27, .28, .46, .56), 2, 2);
                context.DrawLine(pen, P(.2, .28), P(.8, .28));
                context.DrawLine(pen, P(.38, .16), P(.62, .16));
                break;
            case "add":
                context.DrawLine(pen, P(.5, .18), P(.5, .82));
                context.DrawLine(pen, P(.18, .5), P(.82, .5));
                break;
            case "search":
                context.DrawEllipse(null, pen, P(.42, .4), w * .25, h * .25);
                context.DrawLine(pen, P(.6, .59), P(.84, .83));
                break;
            case "lock":
                context.DrawRectangle(null, pen, R(.22, .43, .56, .4), 2, 2);
                context.DrawGeometry(null, pen, PathGeometry.Parse($"M {w * .34},{h * .43} L {w * .34},{h * .32} C {w * .34},{h * .08} {w * .66},{h * .08} {w * .66},{h * .32} L {w * .66},{h * .43}"));
                break;
            case "link":
                context.DrawGeometry(null, pen, PathGeometry.Parse($"M {w * .42},{h * .36} L {w * .31},{h * .47} C {w * .12},{h * .66} {w * .38},{h * .92} {w * .57},{h * .73} L {w * .67},{h * .63} M {w * .58},{h * .64} L {w * .69},{h * .53} C {w * .88},{h * .34} {w * .62},{h * .08} {w * .43},{h * .27} L {w * .33},{h * .37}"));
                break;
            case "palette":
                context.DrawEllipse(null, pen, P(.5, .5), w * .34, h * .3);
                context.DrawEllipse(brush, null, P(.35, .36), w * .04, h * .04);
                context.DrawEllipse(brush, null, P(.53, .28), w * .04, h * .04);
                context.DrawEllipse(brush, null, P(.68, .4), w * .04, h * .04);
                break;
            case "clock":
                context.DrawEllipse(null, pen, P(.5, .5), w * .34, h * .34);
                context.DrawLine(pen, P(.5, .5), P(.5, .28));
                context.DrawLine(pen, P(.5, .5), P(.68, .62));
                break;
            case "control":
                context.DrawLine(pen, P(.18, .3), P(.82, .3));
                context.DrawLine(pen, P(.18, .7), P(.82, .7));
                context.DrawEllipse(brush, null, P(.38, .3), w * .08, h * .08);
                context.DrawEllipse(brush, null, P(.65, .7), w * .08, h * .08);
                break;
            default:
                context.DrawEllipse(null, pen, P(.5, .5), w * .3, h * .3);
                context.DrawLine(pen, P(.28, .72), P(.72, .28));
                break;
        }
    }
}
