using PhysicaStudio.Document;

namespace PhysicaStudio.Desktop.Services;

internal static class ReferenceLessonFactory
{
    private const string Navy = "#11284B";
    private const string Body = "#34424D";
    private const string Muted = "#697985";
    private const string Blue = "#0878F9";
    private const string Cyan = "#24B8FF";
    private const string Orange = "#ED7F18";
    private const string Paper = "#F8F9F7";

    public static LessonProject Create()
    {
        var project = LessonProject.Create("Standing Waves Lesson");
        return project with
        {
            Slides =
            [
                Introduction(),
                Harmonics(),
                StandingWave(),
                Energy(),
                Applications(),
            ],
        };
    }

    private static SlideDocument Introduction()
    {
        var nodes = new List<SceneNode>
        {
            Text("title", "Standing Waves", 130, 88, 1200, 90, 64, Navy, "Georgia", SceneFontWeight.Bold),
            Text("subtitle", "How two travelling waves create a stable pattern", 134, 188, 1200, 60, 29, Body),
            Line("equilibrium", 190, 575, 1540, 0, "#8E9DA8", 2, [12, 10]),
        };
        for (var phase = 0; phase < 5; phase++)
        {
            var offset = phase * 12;
            nodes.Add(Wave($"phase-{phase}", 240, 375 + offset, 1440, 390 - offset * 2, 3,
                phase % 2 == 0, phase == 0 ? Blue : "#A9D5F5", phase == 0 ? 6 : 2, phase == 0 ? 1 : .55));
        }
        nodes.Add(Text("caption", "Equal frequency + opposite directions", 520, 840, 900, 48, 25, Muted, alignment: SceneTextAlignment.Center));
        return Slide("Introduction", nodes);
    }

    private static SlideDocument Harmonics()
    {
        var nodes = new List<SceneNode>
        {
            Text("title", "Harmonics", 130, 80, 1000, 90, 62, Navy, "Georgia", SceneFontWeight.Bold),
            Text("subtitle", "Allowed modes of vibration on a fixed string", 134, 180, 1100, 55, 28, Body),
        };
        for (var harmonic = 1; harmonic <= 3; harmonic++)
        {
            var y = 320 + (harmonic - 1) * 230;
            nodes.Add(Text($"label-{harmonic}", $"n = {harmonic}", 150, y + 40, 130, 45, 24, Navy, weight: SceneFontWeight.SemiBold));
            nodes.Add(Line($"axis-{harmonic}", 330, y + 70, 1250, 0, "#9AA8B2", 2));
            nodes.Add(Wave($"harmonic-{harmonic}", 330, y, 1250, 140, harmonic, false,
                harmonic == 2 ? Blue : "#5D9ED8", harmonic == 2 ? 6 : 4, 1));
        }
        return Slide("Harmonics", nodes);
    }

    private static SlideDocument StandingWave()
    {
        const double left = 245;
        const double width = 1430;
        const double centerY = 520;
        var nodes = new List<SceneNode>
        {
            Text("title", "Standing Waves", 135, 62, 1100, 86, 62, Navy, "Georgia", SceneFontWeight.Bold),
            Text("explanation", "When a wave reflects at both ends of a string, identical waves travelling\nin opposite directions interfere to form a standing wave.", 138, 158, 1350, 100, 25, Body),
            Rect("left support shadow", 168, 762, 70, 18, "#D7DADB", null, 0, 9),
            Rect("left support", 180, 300, 58, 462, "#171B1E", "#090C0E", 2, 11),
            Rect("left support face", 189, 313, 34, 435, "#33393D", "#596269", 2, 7),
            Rect("left support highlight", 195, 322, 8, 416, "#778087", null, 0, 4),
            Rect("right support shadow", 1670, 762, 70, 18, "#D7DADB", null, 0, 9),
            Rect("right support", 1682, 300, 58, 462, "#171B1E", "#090C0E", 2, 11),
            Rect("right support face", 1697, 313, 34, 435, "#33393D", "#596269", 2, 7),
            Rect("right support highlight", 1716, 322, 8, 416, "#778087", null, 0, 4),
            Line("equilibrium", left, centerY, width, 0, "#8E9DA8", 2, [12, 10]),
        };

        for (var phase = 1; phase <= 5; phase++)
        {
            var inset = phase * 10;
            nodes.Add(Wave($"upper phase {phase}", left, centerY - 150 + inset, width, 300 - inset * 2, 3, false, "#91C8EF", 2, .28));
            nodes.Add(Wave($"lower phase {phase}", left, centerY - 150 + inset, width, 300 - inset * 2, 3, true, "#91C8EF", 2, .28));
        }

        nodes.Add(Wave("standing-wave-upper", left, centerY - 165, width, 330, 3, false, Blue, 6, 1, "physics.standing-wave"));
        nodes.Add(Wave("standing-wave-lower", left, centerY - 165, width, 330, 3, true, Blue, 6, 1, "physics.standing-wave"));

        for (var nodeIndex = 0; nodeIndex <= 3; nodeIndex++)
        {
            var x = left + width * nodeIndex / 3;
            nodes.Add(Ellipse($"node {nodeIndex + 1}", x - 12, centerY - 12, 24, 24, Paper, Blue, 4));
            if (nodeIndex is 1 or 2)
            {
                nodes.Add(Line($"node callout {nodeIndex}", x, centerY + 28, 0, 66, Blue, 2));
                nodes.Add(Text($"node label {nodeIndex}", "Node", x - 55, centerY + 100, 110, 38, 22, Blue,
                    weight: SceneFontWeight.Medium, alignment: SceneTextAlignment.Center));
            }
        }

        var antinodeX = left + width / 2;
        nodes.Add(Ellipse("antinode marker", antinodeX - 10, centerY - 175, 20, 20, Orange, "#FFF0DE", 2));
        nodes.Add(Line("antinode callout", antinodeX, centerY - 195, 0, -62, Orange, 2));
        nodes.Add(Text("antinode label", "Antinode", antinodeX - 90, centerY - 308, 180, 42, 22, Orange,
            weight: SceneFontWeight.Medium, alignment: SceneTextAlignment.Center));

        nodes.Add(Rect("frequency card", 140, 800, 410, 145, "#FFFFFF", "#D5DADE", 2, 12));
        nodes.Add(Text("frequency label", "Frequency", 172, 828, 180, 38, 21, Body, weight: SceneFontWeight.Medium));
        nodes.Add(Text("frequency value", "4.0 Hz", 410, 828, 100, 38, 22, Blue, weight: SceneFontWeight.SemiBold, alignment: SceneTextAlignment.End));
        nodes.Add(Line("frequency track", 210, 900, 245, 0, "#B0BBC2", 6));
        nodes.Add(Line("frequency progress", 210, 900, 125, 0, Blue, 6));
        nodes.Add(Ellipse("frequency thumb", 325, 890, 20, 20, Blue, "#FFFFFF", 2));

        nodes.Add(Rect("equation card", 730, 812, 330, 118, "#FFFFFF", "#AEB8C0", 2, 10));
        nodes.Add(Text("equation", "v = f λ", 730, 833, 330, 70, 55, Navy, "Cambria Math", SceneFontWeight.Normal, true, SceneTextAlignment.Center));

        nodes.Add(Rect("legend card", 1190, 800, 520, 145, "#FFFFFF", "#D5DADE", 2, 11));
        nodes.Add(Ellipse("legend node", 1222, 838, 18, 18, Blue, null, 0));
        nodes.Add(Text("legend node text", "Node    zero displacement", 1260, 829, 400, 38, 20, Body));
        nodes.Add(Ellipse("legend antinode", 1222, 891, 18, 18, Orange, null, 0));
        nodes.Add(Text("legend antinode text", "Antinode    maximum displacement", 1260, 882, 420, 38, 20, Body));
        return Slide("Standing Waves", nodes);
    }

    private static SlideDocument Energy()
    {
        var nodes = new List<SceneNode>
        {
            Text("title", "Energy in a standing wave", 130, 80, 1400, 90, 60, Navy, "Georgia", SceneFontWeight.Bold),
            Text("subtitle", "Kinetic and potential energy exchange continuously", 134, 180, 1300, 55, 28, Body),
            Line("vertical axis", 270, 780, 0, -430, "#758995", 3),
            Line("horizontal axis", 270, 780, 1320, 0, "#758995", 3),
            Wave("kinetic energy", 290, 405, 1260, 310, 2, false, Blue, 7, 1),
            Wave("potential energy", 290, 405, 1260, 310, 2, true, Orange, 7, 1),
            Ellipse("kinetic swatch", 380, 875, 18, 18, Blue, null, 0),
            Text("kinetic label", "Kinetic energy", 415, 861, 270, 42, 22, Body),
            Ellipse("potential swatch", 760, 875, 18, 18, Orange, null, 0),
            Text("potential label", "Potential energy", 795, 861, 300, 42, 22, Body),
            Rect("conservation card", 1260, 835, 390, 90, "#FFFFFF", "#C7D0D6", 2, 10),
            Text("conservation equation", "E = Eₖ + Eₚ", 1260, 850, 390, 54, 34, Navy, "Cambria Math", alignment: SceneTextAlignment.Center),
        };
        return Slide("Energy in a standing wave", nodes);
    }

    private static SlideDocument Applications()
    {
        var nodes = new List<SceneNode>
        {
            Text("title", "Applications", 130, 80, 1000, 90, 62, Navy, "Georgia", SceneFontWeight.Bold),
            Text("subtitle", "Strings, air columns and resonators", 134, 180, 1100, 55, 28, Body),
            Ellipse("instrument body left", 250, 420, 420, 390, "#B6793F", "#70451F", 5),
            Ellipse("instrument body right", 520, 390, 360, 430, "#B6793F", "#70451F", 5),
            Ellipse("sound hole", 520, 520, 130, 130, "#241A14", "#D5A96E", 4),
            Rect("neck", 765, 490, 780, 80, "#744824", "#4E2D16", 4, 15),
            Line("string", 565, 575, 930, -45, "#F1D29D", 3),
            Wave("resonance", 920, 350, 650, 260, 3, false, Blue, 6, 1),
            Text("application note", "The physics model supplies the allowed frequencies;\nthe presentation controls how they are explained.", 960, 720, 720, 100, 27, Body),
        };
        return Slide("Applications", nodes);
    }

    private static SlideDocument Slide(string name, IEnumerable<SceneNode> nodes) =>
        SlideDocument.Create(name) with
        {
            Background = new SlideBackground(SlideBackgroundKind.Solid, Paper, null, null, 1),
            Nodes = nodes.Select((node, index) => node with { LayerIndex = index }).ToArray(),
        };

    private static SceneNode Rect(string name, double x, double y, double width, double height,
        string? fill, string? stroke, double strokeWidth, double radius) =>
        Node(name, "shape.rectangle", x, y, width, height, fill, stroke, strokeWidth, radius);

    private static SceneNode Ellipse(string name, double x, double y, double width, double height,
        string? fill, string? stroke, double strokeWidth) =>
        Node(name, "shape.ellipse", x, y, width, height, fill, stroke, strokeWidth, width / 2);

    private static SceneNode Line(string name, double x, double y, double width, double height,
        string stroke, double strokeWidth, IReadOnlyList<double>? dash = null)
    {
        var endX = x + width;
        var endY = y + height;
        var left = Math.Min(x, endX);
        var top = Math.Min(y, endY);
        var normalizedWidth = Math.Abs(width);
        var normalizedHeight = Math.Abs(height);
        var startPoint = new ScenePathPoint(
            normalizedWidth == 0 ? 0 : (x - left) / normalizedWidth,
            normalizedHeight == 0 ? 0 : (y - top) / normalizedHeight);
        var endPoint = new ScenePathPoint(
            normalizedWidth == 0 ? 0 : (endX - left) / normalizedWidth,
            normalizedHeight == 0 ? 0 : (endY - top) / normalizedHeight);

        return Node(name, "shape.line", left, top, normalizedWidth, normalizedHeight, null, stroke, strokeWidth, 0,
            points: [startPoint, endPoint], dash: dash);
    }

    private static SceneNode Text(string name, string value, double x, double y, double width, double height,
        double size, string color, string font = "Inter", SceneFontWeight weight = SceneFontWeight.Normal,
        bool italic = false, SceneTextAlignment alignment = SceneTextAlignment.Start) =>
        Node(name, "shape.text", x, y, width, height, null, null, 0, 0, value, null,
            font, size, weight, italic, color, alignment);

    private static SceneNode Wave(string name, double x, double y, double width, double height, int lobes,
        bool inverted, string stroke, double strokeWidth, double opacity, string kind = "shape.path")
    {
        const int sampleCount = 180;
        var points = Enumerable.Range(0, sampleCount + 1).Select(index =>
        {
            var t = index / (double)sampleCount;
            var sign = inverted ? -1d : 1d;
            return new ScenePathPoint(t, .5 - Math.Sin(t * lobes * Math.PI) * .48 * sign);
        }).ToArray();
        return Node(name, kind, x, y, width, height, null, stroke, strokeWidth, 0, points: points, opacity: opacity);
    }

    private static SceneNode Node(
        string name,
        string kind,
        double x,
        double y,
        double width,
        double height,
        string? fill,
        string? stroke,
        double strokeWidth,
        double radius,
        string? text = null,
        Guid? assetId = null,
        string font = "Inter",
        double fontSize = 28,
        SceneFontWeight fontWeight = SceneFontWeight.Normal,
        bool italic = false,
        string textColor = Body,
        SceneTextAlignment textAlignment = SceneTextAlignment.Start,
        IReadOnlyList<ScenePathPoint>? points = null,
        IReadOnlyList<double>? dash = null,
        double opacity = 1) =>
        SceneNode.Create(name, kind, new NodeGeometry(x, y, width, height)) with
        {
            Content = new SceneNodeContent(text, assetId, points ?? []),
            Appearance = new SceneNodeAppearance(
                fill,
                stroke,
                strokeWidth,
                radius,
                opacity,
                dash ?? [],
                font,
                fontSize,
                fontWeight,
                italic,
                textColor,
                textAlignment),
        };
}
