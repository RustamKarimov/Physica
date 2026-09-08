using PhysicaStudio.Document;

namespace PhysicaStudio.Foundation.Tests;

public sealed class SceneVisualValidationTests
{
    [Fact]
    public void ValidatorRejectsInvalidPersistedVisualValues()
    {
        var node = SceneNode.Create("Broken", "shape.path", new NodeGeometry(0, 0, 100, 100)) with
        {
            Appearance = SceneNodeAppearance.Default with { Opacity = 1.2, FontSize = 0 },
            Content = new SceneNodeContent(null, null, [new ScenePathPoint(double.NaN, 0)]),
        };
        var slide = SlideDocument.Create("Slide") with { Nodes = [node] };
        var project = LessonProject.Create("Lesson") with { Slides = [slide] };

        var result = DocumentValidator.Validate(project);

        Assert.Contains(result.Issues, issue => issue.Code == "node.appearance.opacity");
        Assert.Contains(result.Issues, issue => issue.Code == "node.appearance.fontSize");
        Assert.Contains(result.Issues, issue => issue.Code == "node.content.points");
    }

    [Fact]
    public void VisualContentSurvivesProjectJsonRoundTrip()
    {
        var node = SceneNode.Create("Caption", "shape.text", new NodeGeometry(20, 30, 400, 80)) with
        {
            Content = new SceneNodeContent("Momentum", null, []),
            Appearance = SceneNodeAppearance.Default with
            {
                FillColor = null,
                TextColor = "#123456",
                FontFamily = "Inter",
                FontSize = 36,
                FontWeight = SceneFontWeight.SemiBold,
            },
        };
        var slide = SlideDocument.Create("Slide") with { Nodes = [node] };
        var project = LessonProject.Create("Lesson") with { Slides = [slide] };

        var restored = ProjectJson.Deserialize(ProjectJson.Serialize(project));
        var restoredNode = Assert.Single(Assert.Single(restored.Slides).Nodes);

        Assert.Equal(node.Content.Text, restoredNode.Content.Text);
        Assert.Equal(node.Content.AssetId, restoredNode.Content.AssetId);
        Assert.Equal(node.Content.Points, restoredNode.Content.Points);
        Assert.Equal(node.Appearance.FillColor, restoredNode.Appearance.FillColor);
        Assert.Equal(node.Appearance.StrokeColor, restoredNode.Appearance.StrokeColor);
        Assert.Equal(node.Appearance.StrokeWidth, restoredNode.Appearance.StrokeWidth);
        Assert.Equal(node.Appearance.CornerRadius, restoredNode.Appearance.CornerRadius);
        Assert.Equal(node.Appearance.Opacity, restoredNode.Appearance.Opacity);
        Assert.Equal(node.Appearance.DashPattern, restoredNode.Appearance.DashPattern);
        Assert.Equal(node.Appearance.FontFamily, restoredNode.Appearance.FontFamily);
        Assert.Equal(node.Appearance.FontSize, restoredNode.Appearance.FontSize);
        Assert.Equal(node.Appearance.FontWeight, restoredNode.Appearance.FontWeight);
        Assert.Equal(node.Appearance.IsItalic, restoredNode.Appearance.IsItalic);
        Assert.Equal(node.Appearance.TextColor, restoredNode.Appearance.TextColor);
        Assert.Equal(node.Appearance.TextAlignment, restoredNode.Appearance.TextAlignment);
    }
}
