using PhysicaStudio.Authoring;
using PhysicaStudio.Desktop.Models;
using PhysicaStudio.Desktop.ViewModels;
using PhysicaStudio.Desktop.Services;
using PhysicaStudio.Document;

namespace PhysicaStudio.Foundation.Tests;

public sealed class SlideNavigatorInteractionTests
{
    private static readonly DateTimeOffset FixedTime = new(2026, 9, 8, 12, 0, 0, TimeSpan.Zero);

    [Fact]
    public void SelectionUpdatesPreserveThumbnailInstancesAndRenderedScenes()
    {
        var slides = Enumerable.Range(1, 5)
            .Select(index => SlideDocument.Create($"Slide {index}"))
            .ToArray();
        var session = new AuthoringSession(LessonProject.Create("Lesson", FixedTime) with { Slides = slides });
        var viewModel = CreateViewModel(session);
        var originalItems = viewModel.Slides.ToArray();
        var originalScenes = originalItems.Select(item => item.Scene).ToArray();

        viewModel.SelectSlide(slides[3].Id, SlideSelectionMode.Range);

        Assert.Equal(5, viewModel.Slides.Count);
        for (var index = 0; index < originalItems.Length; index++)
        {
            Assert.Same(originalItems[index], viewModel.Slides[index]);
            Assert.Same(originalScenes[index], viewModel.Slides[index].Scene);
        }

        Assert.All(viewModel.Slides.Take(4), slide => Assert.True(slide.IsSelected));
        Assert.False(viewModel.Slides[4].IsSelected);
        Assert.Equal(slides[3].Id, viewModel.ActiveSlide.Id);
    }

    [Fact]
    public void ToggleAndReverseRangeSelectionKeepAStableAnchor()
    {
        var slides = Enumerable.Range(1, 5)
            .Select(index => SlideDocument.Create($"Slide {index}"))
            .ToArray();
        var session = new AuthoringSession(LessonProject.Create("Lesson", FixedTime) with { Slides = slides });
        var viewModel = CreateViewModel(session);

        viewModel.SelectSlide(slides[4].Id);
        viewModel.SelectSlide(slides[1].Id, SlideSelectionMode.Range);
        Assert.Equal(slides.Skip(1).Select(slide => slide.Id).ToHashSet(), viewModel.SelectedSlideIds);

        viewModel.SelectSlide(slides[2].Id, SlideSelectionMode.Toggle);
        Assert.DoesNotContain(slides[2].Id, viewModel.SelectedSlideIds);
        Assert.Equal(slides[2].Id, session.SelectionAnchorSlideId);
    }

    [Fact]
    public void StateChangesIdentifySelectionWithoutPretendingTheDocumentChanged()
    {
        var project = LessonProject.Create("Lesson", FixedTime) with
        {
            Slides =
            [
                SlideDocument.Create("One"),
                SlideDocument.Create("Two"),
            ],
        };
        var session = new AuthoringSession(project);
        var changes = new List<AuthoringStateChangedEventArgs>();
        session.StateChanged += (_, change) => changes.Add(change);

        session.SelectSlide(project.Slides[1].Id, SlideSelectionMode.Range);
        session.Execute(ProjectCommands.MoveSlides([project.Slides[0].Id], project.Slides[1].Id, true));
        session.MarkSaved(Path.Combine(Path.GetTempPath(), "navigator-state.physica"));

        Assert.Equal(AuthoringStateChangeKind.Selection, changes[0].Kind);
        Assert.Equal(AuthoringStateChangeKind.Document, changes[1].Kind);
        Assert.Equal(AuthoringStateChangeKind.Persistence, changes[2].Kind);
    }

    private static StudioShellViewModel CreateViewModel(AuthoringSession session) =>
        new(
            new RibbonManifest([new RibbonTabDefinition("home", "Home", [])], []),
            new FeatureManifest([], 2, []),
            session);
}
