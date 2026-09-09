using System.IO.Compression;
using System.Text.Json.Nodes;
using PhysicaStudio.Authoring;
using PhysicaStudio.Desktop.Models;
using PhysicaStudio.Desktop.Controls;
using PhysicaStudio.Desktop.Services;
using PhysicaStudio.Desktop.ViewModels;
using PhysicaStudio.Document;

namespace PhysicaStudio.Foundation.Tests;

public sealed class Phase2FoundationTests
{
    private static readonly DateTimeOffset FixedTime = new(2026, 9, 7, 12, 0, 0, TimeSpan.Zero);

    [Fact]
    public void NewProject_HasValidFutureCompatibleDefaults()
    {
        var project = LessonProject.Create("Forces lesson", FixedTime);

        var validation = DocumentValidator.Validate(project);

        Assert.True(validation.IsValid);
        Assert.Equal(ProjectFormat.Current, project.FormatVersion);
        Assert.Single(project.Slides);
        Assert.Equal(1920, project.Canvas.Width);
        Assert.Equal(1080, project.Canvas.Height);
        Assert.Equal("en", project.Metadata.ContentLocale);
        Assert.NotSame(project.Slides, project.Sections);
    }

    [Fact]
    public void NewAuthoringSession_IsUnsavedUntilFirstSuccessfulSave()
    {
        var session = AuthoringSession.CreateNew("New lesson", () => FixedTime);

        Assert.True(session.HasUnsavedChanges);
        session.MarkSaved(Path.Combine(Path.GetTempPath(), "New lesson.physica"));
        Assert.False(session.HasUnsavedChanges);
    }

    [Fact]
    public void ProjectJson_PreservesUnknownExtensionFields()
    {
        var root = JsonNode.Parse(ProjectJson.Serialize(LessonProject.Create("Compatible", FixedTime)))!.AsObject();
        root["futureCapability"] = new JsonObject { ["mode"] = "reserved" };

        var project = ProjectJson.Deserialize(root.ToJsonString());
        var serialized = JsonNode.Parse(ProjectJson.Serialize(project))!.AsObject();

        Assert.Equal("reserved", serialized["futureCapability"]?["mode"]?.GetValue<string>());
    }

    [Fact]
    public void ProjectJson_PreservesUnknownNestedNodeFields()
    {
        var node = SceneNode.Create("Card", "shape.card", new NodeGeometry(10, 20, 300, 160));
        var project = LessonProject.Create("Compatible", FixedTime) with
        {
            Slides = [SlideDocument.Create("Slide") with { Nodes = [node] }],
        };
        var root = JsonNode.Parse(ProjectJson.Serialize(project))!.AsObject();
        root["slides"]![0]!["nodes"]![0]!["futureNodeMode"] = "reserved";

        var loaded = ProjectJson.Deserialize(root.ToJsonString());
        var serialized = JsonNode.Parse(ProjectJson.Serialize(loaded))!.AsObject();

        Assert.Equal("reserved", serialized["slides"]![0]!["nodes"]![0]!["futureNodeMode"]!.GetValue<string>());
    }

    [Fact]
    public async Task PhysicaPackage_RoundTripsProjectWithoutIdentityLoss()
    {
        var directory = Directory.CreateTempSubdirectory("Physica-Phase2-");
        try
        {
            var section = new SlideSection(Guid.NewGuid(), "Investigation", 0);
            var node = SceneNode.Create("Question card", "shape.rectangle", new NodeGeometry(120, 160, 640, 240));
            var first = SlideDocument.Create("Question") with
            {
                SectionId = section.Id,
                Nodes = [node],
                Guides = [new GuideDefinition(Guid.NewGuid(), GuideOrientation.Vertical, 960, false)],
            };
            var project = LessonProject.Create("Forces lesson", FixedTime) with
            {
                Sections = [section],
                Slides = [first, SlideDocument.Create("Explanation") with { SectionId = section.Id }],
            };
            var path = Path.Combine(directory.FullName, "forces.physica");

            await PhysicaProjectPackage.SaveAsync(project, path);
            var loaded = await PhysicaProjectPackage.LoadAsync(path);

            Assert.Equal(ProjectJson.Serialize(DocumentNormalizer.Normalize(project)), ProjectJson.Serialize(loaded));
            Assert.Equal(node.Id, loaded.Slides[0].Nodes[0].Id);
            using var archive = ZipFile.OpenRead(path);
            Assert.NotNull(archive.GetEntry(ProjectFormat.ProjectEntryName));
        }
        finally
        {
            directory.Delete(recursive: true);
        }
    }

    [Fact]
    public void ProjectJson_RejectsUnsupportedFutureVersion()
    {
        var node = JsonNode.Parse(ProjectJson.Serialize(LessonProject.Create("Future", FixedTime)))!.AsObject();
        node["formatVersion"] = ProjectFormat.Current + 1;

        var exception = Assert.Throws<ProjectPackageException>(() => ProjectJson.Deserialize(node.ToJsonString()));

        Assert.Contains("supports up to version", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task RecoveryStore_IsolatedSnapshotDoesNotChangeOriginalPackage()
    {
        var directory = Directory.CreateTempSubdirectory("Physica-Recovery-");
        try
        {
            var store = new ProjectRecoveryStore(directory.FullName);
            var project = LessonProject.Create("Recovered lesson", FixedTime);

            await store.SaveAsync(project, 7, "C:/Lessons/original.physica", FixedTime);
            var snapshots = await store.ListAsync();

            var snapshot = Assert.Single(snapshots);
            Assert.Equal(project.Id, snapshot.ProjectId);
            Assert.Equal(7, snapshot.Revision);
            Assert.Equal("Recovered lesson", snapshot.Project.Title);
            store.Delete(project.Id);
            Assert.Empty(await store.ListAsync());
        }
        finally
        {
            directory.Delete(recursive: true);
        }
    }

    [Fact]
    public async Task PhysicaPackage_RejectsArchiveWithoutProjectEntry()
    {
        var directory = Directory.CreateTempSubdirectory("Physica-MissingProject-");
        try
        {
            var path = Path.Combine(directory.FullName, "missing.physica");
            using (var archive = ZipFile.Open(path, ZipArchiveMode.Create))
            {
                archive.CreateEntry("readme.txt");
            }

            var exception = await Assert.ThrowsAsync<ProjectPackageException>(() => PhysicaProjectPackage.LoadAsync(path));
            Assert.Contains(ProjectFormat.ProjectEntryName, exception.Message, StringComparison.Ordinal);
        }
        finally
        {
            directory.Delete(recursive: true);
        }
    }

    [Fact]
    public void AuthoringSession_SlideCommandsUndoRedoAndRestoreSavedState()
    {
        var tick = 0;
        var session = new AuthoringSession(LessonProject.Create("Lesson", FixedTime), clock: () => FixedTime.AddSeconds(tick++));
        var originalSlideId = session.ActiveSlideId;

        session.Execute(ProjectCommands.AddSlide("Explanation", originalSlideId));
        var addedSlideId = session.CurrentProject.Slides[1].Id;
        session.SelectSlide(addedSlideId);
        session.Execute(ProjectCommands.RenameSlide(addedSlideId, "Worked example"));

        Assert.True(session.HasUnsavedChanges);
        Assert.True(session.CanUndo);
        Assert.Equal("Worked example", session.CurrentProject.Slides[1].Name);

        Assert.True(session.Undo());
        Assert.Equal("Explanation", session.CurrentProject.Slides[1].Name);
        Assert.True(session.Undo());
        Assert.Single(session.CurrentProject.Slides);
        Assert.False(session.HasUnsavedChanges);

        Assert.True(session.Redo());
        Assert.True(session.Redo());
        Assert.Equal("Worked example", session.CurrentProject.Slides[1].Name);
    }

    [Fact]
    public void AuthoringSession_NewCommandAfterUndoClearsRedoHistory()
    {
        var session = new AuthoringSession(LessonProject.Create("Lesson", FixedTime), clock: () => FixedTime);
        session.Execute(ProjectCommands.AddSlide("Second"));
        session.Execute(ProjectCommands.AddSlide("Third"));
        Assert.True(session.Undo());
        Assert.True(session.CanRedo);

        session.Execute(ProjectCommands.RenameProject("Changed"));

        Assert.False(session.CanRedo);
        Assert.Equal("Changed", session.CurrentProject.Title);
    }

    [Fact]
    public void LockedNode_RejectsTransformUntilUnlockCommandRuns()
    {
        var session = AuthoringSession.CreateNew("Lesson", () => FixedTime);
        var slideId = session.ActiveSlideId;
        var node = SceneNode.Create("Explanation card", "shape.rectangle", new NodeGeometry(100, 100, 300, 160));
        session.Execute(ProjectCommands.AddNode(slideId, node));
        session.Execute(ProjectCommands.SetNodeLocked(slideId, node.Id, true));

        Assert.Throws<AuthoringCommandException>(() => session.Execute(
            ProjectCommands.SetNodePresentationTransform(
                slideId,
                node.Id,
                PresentationTransform2D.Identity with { OffsetX = 40 })));

        session.Execute(ProjectCommands.SetNodeLocked(slideId, node.Id, false));
        session.Execute(ProjectCommands.SetNodePresentationTransform(
            slideId,
            node.Id,
            PresentationTransform2D.Identity with { OffsetX = 40 }));
        Assert.Equal(40, session.CurrentProject.Slides[0].Nodes[0].PresentationTransform.OffsetX);
        Assert.Equal(0, session.CurrentProject.Slides[0].Nodes[0].ModelTransform.X);
    }

    [Fact]
    public void LayerRangeSelectionUsesStableDocumentOrder()
    {
        var session = AuthoringSession.CreateNew("Lesson", () => FixedTime);
        var slideId = session.ActiveSlideId;
        var nodes = Enumerable.Range(1, 4)
            .Select(index => SceneNode.Create($"Object {index}", "shape.rectangle",
                new NodeGeometry(index * 20, index * 20, 100, 60)))
            .ToArray();
        foreach (var node in nodes)
        {
            session.Execute(ProjectCommands.AddNode(slideId, node));
        }

        session.SelectNode(nodes[1].Id);
        session.SelectNode(nodes[3].Id, NodeSelectionMode.Range);

        Assert.Equal(
            nodes.Skip(1).Select(node => node.Id).Order(),
            session.SelectedNodeIds.Order());
        Assert.Equal(nodes[1].Id, session.SelectionAnchorNodeId);
    }

    [Fact]
    public void MultiLayerReorderPreservesRelativeOrderAndUndoesAtomically()
    {
        var session = AuthoringSession.CreateNew("Lesson", () => FixedTime);
        var slideId = session.ActiveSlideId;
        var nodes = Enumerable.Range(1, 4)
            .Select(index => SceneNode.Create($"Object {index}", "shape.rectangle",
                new NodeGeometry(index * 20, index * 20, 100, 60)))
            .ToArray();
        foreach (var node in nodes)
        {
            session.Execute(ProjectCommands.AddNode(slideId, node));
        }
        var before = session.CurrentProject;

        session.Execute(ProjectCommands.MoveNodesRelative(
            slideId,
            [nodes[1].Id, nodes[3].Id],
            nodes[0].Id,
            placeAboveTarget: true));

        Assert.Equal(
            [nodes[0].Id, nodes[1].Id, nodes[3].Id, nodes[2].Id],
            session.CurrentProject.Slides[0].Nodes.Select(node => node.Id));
        Assert.True(session.Undo());
        Assert.Same(before, session.CurrentProject);
    }

    [Fact]
    public void MultiLayerLockVisibilityBoundaryAndRenameCommandsRemainValidated()
    {
        var session = AuthoringSession.CreateNew("Lesson", () => FixedTime);
        var slideId = session.ActiveSlideId;
        var first = SceneNode.Create("First", "shape.rectangle", new NodeGeometry(20, 20, 100, 60));
        var second = SceneNode.Create("Second", "shape.rectangle", new NodeGeometry(160, 20, 100, 60));
        session.Execute(ProjectCommands.AddNode(slideId, first));
        session.Execute(ProjectCommands.AddNode(slideId, second));

        session.Execute(ProjectCommands.SetNodesVisible(slideId, [first.Id, second.Id], false));
        session.Execute(ProjectCommands.SetNodesLocked(slideId, [first.Id, second.Id], true));
        Assert.All(session.CurrentProject.Slides[0].Nodes, node =>
        {
            Assert.False(node.IsVisible);
            Assert.True(node.IsLocked);
        });
        Assert.Throws<AuthoringCommandException>(() =>
            session.Execute(ProjectCommands.RenameNode(slideId, first.Id, "Renamed")));

        session.Execute(ProjectCommands.SetNodesLocked(slideId, [first.Id, second.Id], false));
        session.Execute(ProjectCommands.RenameNode(slideId, first.Id, "Renamed"));
        session.Execute(ProjectCommands.MoveNodesToBoundary(slideId, [first.Id], toFront: true));

        Assert.Equal("Renamed", session.CurrentProject.Slides[0].Nodes[^1].Name);
        Assert.Equal(first.Id, session.CurrentProject.Slides[0].Nodes[^1].Id);
    }

    [Fact]
    public void StudioLayersRemainFrontToBackAndSynchronizeWithCanvasSelectionAndCommands()
    {
        var back = SceneNode.Create("Back", "shape.rectangle", new NodeGeometry(20, 20, 100, 60));
        var front = SceneNode.Create("Front", "shape.text", new NodeGeometry(40, 40, 100, 60)) with { LayerIndex = 1 };
        var slide = SlideDocument.Create("Layers") with { Nodes = [back, front] };
        var session = new AuthoringSession(LessonProject.Create("Lesson", FixedTime) with { Slides = [slide] });
        var viewModel = new StudioShellViewModel(
            new RibbonManifest([new RibbonTabDefinition("home", "Home", [])], []),
            new FeatureManifest([], 2, []),
            session);

        Assert.Equal([front.Id, back.Id], viewModel.Layers.Select(layer => layer.Id));
        viewModel.SelectNode(back.Id);
        Assert.True(viewModel.Layers.Single(layer => layer.Id == back.Id).IsSelected);

        viewModel.SetNodeVisible(back.Id, false);
        viewModel.SetNodeLocked(front.Id, true);
        Assert.False(viewModel.Layers.Single(layer => layer.Id == back.Id).IsVisible);
        Assert.True(viewModel.Layers.Single(layer => layer.Id == front.Id).IsLocked);

        viewModel.SetNodeLocked(front.Id, false);
        viewModel.SelectNode(back.Id);
        viewModel.MoveSelectedNodesToBoundary(toFront: true);
        Assert.Equal(back.Id, viewModel.Layers[0].Id);
        viewModel.RenameNode(back.Id, "Foreground card");
        Assert.Equal("Foreground card", viewModel.Layers[0].Name);
    }

    [Fact]
    public void OneLayerForwardAndBackwardAreExactInversesForASelectedBlock()
    {
        var session = AuthoringSession.CreateNew("Lesson", () => FixedTime);
        var slideId = session.ActiveSlideId;
        var nodes = Enumerable.Range(1, 4)
            .Select(index => SceneNode.Create($"Object {index}", "shape.rectangle",
                new NodeGeometry(index * 20, index * 20, 100, 60)))
            .ToArray();
        foreach (var node in nodes)
        {
            session.Execute(ProjectCommands.AddNode(slideId, node));
        }

        session.Execute(ProjectCommands.MoveNodesOneLayer(
            slideId, [nodes[1].Id, nodes[2].Id], towardFront: true));
        Assert.Equal(
            [nodes[0].Id, nodes[3].Id, nodes[1].Id, nodes[2].Id],
            session.CurrentProject.Slides[0].Nodes.Select(node => node.Id));

        session.Execute(ProjectCommands.MoveNodesOneLayer(
            slideId, [nodes[1].Id, nodes[2].Id], towardFront: false));
        Assert.Equal(nodes.Select(node => node.Id),
            session.CurrentProject.Slides[0].Nodes.Select(node => node.Id));
    }

    [Fact]
    public void DuplicateSlide_RekeysNodesAndPreservesParentRelationships()
    {
        var session = AuthoringSession.CreateNew("Lesson", () => FixedTime);
        var slideId = session.ActiveSlideId;
        var parent = SceneNode.Create("Group", "group", new NodeGeometry(0, 0, 400, 300));
        var child = SceneNode.Create("Label", "shape.text", new NodeGeometry(20, 20, 100, 40)) with
        {
            ParentId = parent.Id,
            LayerIndex = 1,
        };
        session.Execute(ProjectCommands.AddNode(slideId, parent));
        session.Execute(ProjectCommands.AddNode(slideId, child));

        session.Execute(ProjectCommands.DuplicateSlide(slideId));

        var duplicate = session.CurrentProject.Slides[1];
        Assert.NotEqual(slideId, duplicate.Id);
        Assert.NotEqual(parent.Id, duplicate.Nodes[0].Id);
        Assert.Equal(duplicate.Nodes[0].Id, duplicate.Nodes[1].ParentId);
    }

    [Fact]
    public void SnapEngine_UsesSlideCenterWithoutChangingModelCoordinates()
    {
        var moving = new NodeBounds(0, 0, 200, 100);
        var settings = SnapSettings.Default with
        {
            SnapToGrid = false,
            SnapToGuides = false,
            SnapToObjects = false,
            Threshold = 10,
        };

        var result = SnapEngine.Snap(moving, 855, 494, CanvasDefinition.Widescreen, [], [], settings);

        Assert.Equal(860, result.X);
        Assert.Equal(490, result.Y);
        Assert.Collection(
            result.Matches.OrderBy(match => match.Axis),
            match => Assert.Equal(("X", "Slide", 960d), (match.Axis, match.Source, match.Position)),
            match => Assert.Equal(("Y", "Slide", 540d), (match.Axis, match.Source, match.Position)));
    }

    [Fact]
    public void StudioViewModel_UsesSessionBackedSlidesAndConditionalRibbonState()
    {
        var ribbon = new RibbonManifest(
        [
            new RibbonTabDefinition("home", "Home",
            [
                new RibbonGroupDefinition("Slides", ["New Slide", "Duplicate Slide", "Delete Slide"]),
                new RibbonGroupDefinition("History", ["Undo", "Redo"]),
            ]),
            new RibbonTabDefinition("physics", "Physics", [new RibbonGroupDefinition("Objects", ["Mass"])])
        ], []);
        var features = new FeatureManifest([], 2, []);
        var viewModel = new StudioShellViewModel(ribbon, features);
        var initialCount = viewModel.Slides.Count;
        var undo = viewModel.RibbonTabs
            .SelectMany(tab => tab.Groups)
            .SelectMany(group => group.Commands)
            .First(command => command.Id.StartsWith("home.history", StringComparison.Ordinal) && command.Label == "Undo");

        Assert.False(undo.IsEnabled);
        Assert.True(undo.IsImplemented);
        viewModel.AddSlide();

        Assert.Equal(initialCount + 1, viewModel.Slides.Count);
        Assert.True(viewModel.CanUndo);
        Assert.True(undo.IsEnabled);
        Assert.EndsWith("*", viewModel.DocumentTitle, StringComparison.Ordinal);

        viewModel.Undo();
        Assert.Equal(initialCount, viewModel.Slides.Count);
    }

    [Fact]
    public void StudioViewModel_ReordersSlidesAndAssignsNewSectionUndoably()
    {
        var ribbon = new RibbonManifest(
        [
            new RibbonTabDefinition("home", "Home", [new RibbonGroupDefinition("Slides", ["Section"])]),
            new RibbonTabDefinition("physics", "Physics", [new RibbonGroupDefinition("Objects", ["Mass"])])
        ], []);
        var viewModel = new StudioShellViewModel(ribbon, new FeatureManifest([], 2, []));
        var selectedId = viewModel.ActiveSlide.Id;

        viewModel.MoveActiveSlide(-1);
        Assert.Equal(selectedId, viewModel.Session.CurrentProject.Slides[1].Id);

        viewModel.AddSectionForActiveSlide();
        Assert.Single(viewModel.Session.CurrentProject.Sections);
        Assert.Equal(viewModel.Session.CurrentProject.Sections[0].Id, viewModel.ActiveSlide.SectionId);

        viewModel.Undo();
        Assert.Null(viewModel.ActiveSlide.SectionId);
        Assert.Empty(viewModel.Session.CurrentProject.Sections);
    }

    [Fact]
    public void AuthoringSession_SupportsRangeAndToggleSlideSelection()
    {
        var slides = Enumerable.Range(1, 4).Select(index => SlideDocument.Create($"Slide {index}")).ToArray();
        var session = new AuthoringSession(LessonProject.Create("Lesson", FixedTime) with { Slides = slides });

        session.SelectSlide(slides[2].Id, SlideSelectionMode.Range);
        Assert.Equal(3, session.SelectedSlideIds.Count);
        Assert.Contains(slides[0].Id, session.SelectedSlideIds);
        Assert.Contains(slides[2].Id, session.SelectedSlideIds);

        session.SelectSlide(slides[1].Id, SlideSelectionMode.Toggle);
        Assert.DoesNotContain(slides[1].Id, session.SelectedSlideIds);
        Assert.Contains(session.ActiveSlideId, session.SelectedSlideIds);
    }

    [Fact]
    public void MultiSlideDeleteAndReorder_AreSingleUndoableCommands()
    {
        var slides = Enumerable.Range(1, 5).Select(index => SlideDocument.Create($"Slide {index}")).ToArray();
        var session = new AuthoringSession(LessonProject.Create("Lesson", FixedTime) with { Slides = slides });

        session.Execute(ProjectCommands.MoveSlides([slides[1].Id, slides[2].Id], slides[4].Id, placeAfterTarget: true));
        Assert.Equal([slides[0].Id, slides[3].Id, slides[4].Id, slides[1].Id, slides[2].Id],
            session.CurrentProject.Slides.Select(slide => slide.Id));
        Assert.True(session.Undo());
        Assert.Equal(slides.Select(slide => slide.Id), session.CurrentProject.Slides.Select(slide => slide.Id));

        session.Execute(ProjectCommands.DeleteSlides([slides[1].Id, slides[2].Id]));
        Assert.Equal(3, session.CurrentProject.Slides.Count);
        Assert.True(session.Undo());
        Assert.Equal(5, session.CurrentProject.Slides.Count);
    }

    [Fact]
    public void StudioViewModel_BlankSlidesHaveEmptyDocumentScenesAndNoReferenceContext()
    {
        var viewModel = new StudioShellViewModel(
            new RibbonManifest([new RibbonTabDefinition("home", "Home", [])], []),
            new FeatureManifest([], 2, []));

        viewModel.AddSlide();
        var added = viewModel.Slides.Single(slide => slide.Id == viewModel.ActiveSlide.Id);
        Assert.Empty(added.Scene.Layers);
        Assert.Equal(viewModel.ActiveScene, added.Scene);
        Assert.True(viewModel.ShowEmptySlideContext);
        Assert.Equal("0 tracks · 0 keyframes", viewModel.TimelineSummary);

        viewModel.DuplicateActiveSlide();
        var duplicate = viewModel.Slides.Single(slide => slide.Id == viewModel.ActiveSlide.Id);
        Assert.Empty(duplicate.Scene.Layers);
        Assert.Equal(viewModel.ActiveScene, duplicate.Scene);
    }

    [Fact]
    public void StudioViewModel_SectionAssignmentIsVisibleAndProjectCloseKeepsApplicationState()
    {
        var slides = Enumerable.Range(1, 3).Select(index => SlideDocument.Create($"Slide {index}")).ToArray();
        var session = new AuthoringSession(LessonProject.Create("Lesson", FixedTime) with { Slides = slides });
        var viewModel = new StudioShellViewModel(
            new RibbonManifest([new RibbonTabDefinition("home", "Home", [new RibbonGroupDefinition("Slides", ["Section"])])], []),
            new FeatureManifest([], 2, []),
            session);

        viewModel.SelectSlide(slides[1].Id, SlideSelectionMode.Range);
        viewModel.AddSectionForActiveSlide();

        Assert.Equal(2, viewModel.ActiveSlide.SectionId is Guid sectionId
            ? viewModel.Session.CurrentProject.Slides.Count(slide => slide.SectionId == sectionId)
            : 0);
        Assert.Single(viewModel.Slides, slide => slide.ShowSectionHeader);

        viewModel.CloseProject();
        Assert.False(viewModel.IsProjectOpen);
        Assert.True(viewModel.IsStartCenterVisible);
        Assert.Equal(viewModel.ApplicationTitle, viewModel.DocumentTitle);
    }

    [Fact]
    public void RecentProjectStore_DeduplicatesAndOrdersExistingProjects()
    {
        var directory = Directory.CreateTempSubdirectory("Physica-Recent-");
        try
        {
            var first = Path.Combine(directory.FullName, "first.physica");
            var second = Path.Combine(directory.FullName, "second.physica");
            File.WriteAllText(first, "first");
            File.WriteAllText(second, "second");
            var store = new RecentProjectStore(Path.Combine(directory.FullName, "recent.json"));

            store.Record(first, "First", FixedTime);
            store.Record(second, "Second", FixedTime.AddMinutes(1));
            store.Record(first, "First revised", FixedTime.AddMinutes(2));

            var entries = store.Load();
            Assert.Equal(2, entries.Count);
            Assert.Equal("First revised", entries[0].DisplayName);
            Assert.Equal(Path.GetFullPath(first), entries[0].Path);
        }
        finally
        {
            directory.Delete(recursive: true);
        }
    }


    [Fact]
    public void AutomaticSlideNamesFollowVisualOrderWhileCustomNamesRemainStable()
    {
        var session = AuthoringSession.CreateNew("Lesson", () => FixedTime);
        var firstId = session.ActiveSlideId;
        session.Execute(ProjectCommands.AddAutomaticSlide(firstId));
        var secondId = session.CurrentProject.Slides[1].Id;
        session.Execute(ProjectCommands.AddAutomaticSlide(secondId));
        var thirdId = session.CurrentProject.Slides[2].Id;

        session.Execute(ProjectCommands.RenameSlide(secondId, "Teacher explanation"));
        session.Execute(ProjectCommands.MoveSlides([thirdId], firstId, placeAfterTarget: false));

        Assert.Equal([thirdId, firstId, secondId], session.CurrentProject.Slides.Select(slide => slide.Id));
        Assert.Equal(["Slide 1", "Slide 2", "Teacher explanation"], session.CurrentProject.Slides.Select(slide => slide.Name));
        Assert.Equal(DocumentNameKind.Custom, session.CurrentProject.Slides[2].NameKind);

        Assert.True(session.Undo());
        Assert.Equal(["Slide 1", "Teacher explanation", "Slide 3"], session.CurrentProject.Slides.Select(slide => slide.Name));
        Assert.True(session.Redo());
        Assert.Equal(["Slide 1", "Slide 2", "Teacher explanation"], session.CurrentProject.Slides.Select(slide => slide.Name));
    }

    [Fact]
    public void AddingAutomaticSlideNearTopRenumbersEarlierAndLaterAutomaticSlides()
    {
        var session = AuthoringSession.CreateNew("Lesson", () => FixedTime);
        var firstId = session.ActiveSlideId;
        session.Execute(ProjectCommands.AddAutomaticSlide(firstId));
        var bottomId = session.CurrentProject.Slides[1].Id;
        session.Execute(ProjectCommands.AddAutomaticSlide(firstId));

        Assert.Equal([firstId, session.CurrentProject.Slides[1].Id, bottomId], session.CurrentProject.Slides.Select(slide => slide.Id));
        Assert.Equal(["Slide 1", "Slide 2", "Slide 3"], session.CurrentProject.Slides.Select(slide => slide.Name));
        Assert.All(session.CurrentProject.Slides, slide => Assert.Equal(DocumentNameKind.Automatic, slide.NameKind));
    }

    [Fact]
    public void AutomaticSectionNamesFollowFirstSlidePositionAndCustomNamesRemainStable()
    {
        var slides = Enumerable.Range(1, 4)
            .Select(index => SlideDocument.Create($"Slide {index}", DocumentNameKind.Automatic))
            .ToArray();
        var session = new AuthoringSession(LessonProject.Create("Lesson", FixedTime) with { Slides = slides });

        session.Execute(ProjectCommands.AddAutomaticSectionAndAssignSlides([slides[3].Id]));
        var bottomSectionId = session.CurrentProject.Slides[3].SectionId!.Value;
        session.Execute(ProjectCommands.AddAutomaticSectionAndAssignSlides([slides[0].Id]));
        var topSectionId = session.CurrentProject.Slides[0].SectionId!.Value;

        Assert.Equal([topSectionId, bottomSectionId], session.CurrentProject.Sections.Select(section => section.Id));
        Assert.Equal(["Section 1", "Section 2"], session.CurrentProject.Sections.Select(section => section.Name));
        Assert.Equal([0, 1], session.CurrentProject.Sections.Select(section => section.Order));

        session.Execute(ProjectCommands.RenameSection(topSectionId, "Opening investigation"));
        session.Execute(ProjectCommands.MoveSection(bottomSectionId, topSectionId, placeAfterTarget: false));

        Assert.Equal(bottomSectionId, session.CurrentProject.Sections[0].Id);
        Assert.Equal("Section 1", session.CurrentProject.Sections[0].Name);
        Assert.Equal("Opening investigation", session.CurrentProject.Sections[1].Name);
        Assert.Equal(DocumentNameKind.Custom, session.CurrentProject.Sections[1].NameKind);
    }

    [Fact]
    public async Task RenamedSlidesAndSectionsRoundTripWithNameKinds()
    {
        var directory = Directory.CreateTempSubdirectory("Physica-Names-");
        try
        {
            var session = AuthoringSession.CreateNew("Lesson", () => FixedTime);
            session.Execute(ProjectCommands.AddAutomaticSlide(session.ActiveSlideId));
            var secondId = session.CurrentProject.Slides[1].Id;
            session.Execute(ProjectCommands.RenameSlide(secondId, "Worked example"));
            session.Execute(ProjectCommands.AddAutomaticSectionAndAssignSlides([secondId]));
            var sectionId = session.CurrentProject.Slides[1].SectionId!.Value;
            session.Execute(ProjectCommands.RenameSection(sectionId, "Examples"));
            var path = Path.Combine(directory.FullName, "names.physica");

            await PhysicaProjectPackage.SaveAsync(session.CurrentProject, path);
            var loaded = await PhysicaProjectPackage.LoadAsync(path);

            Assert.Equal("Worked example", loaded.Slides[1].Name);
            Assert.Equal(DocumentNameKind.Custom, loaded.Slides[1].NameKind);
            Assert.Equal("Examples", loaded.Sections[0].Name);
            Assert.Equal(DocumentNameKind.Custom, loaded.Sections[0].NameKind);
        }
        finally
        {
            directory.Delete(recursive: true);
        }
    }

    [Fact]
    public void LegacyProjectWithoutNameKindPreservesExistingNamesAsCustom()
    {
        var root = JsonNode.Parse(ProjectJson.Serialize(LessonProject.Create("Legacy", FixedTime)))!.AsObject();
        root["slides"]![0]!["name"] = "Original teacher title";
        root["slides"]![0]!.AsObject().Remove("nameKind");

        var loaded = ProjectJson.Deserialize(root.ToJsonString());

        Assert.Equal("Original teacher title", loaded.Slides[0].Name);
        Assert.Equal(DocumentNameKind.Custom, loaded.Slides[0].NameKind);
    }

    [Fact]
    public void StudioViewModelRenamesSlideAndSectionThroughUndoableCommands()
    {
        var viewModel = new StudioShellViewModel(
            new RibbonManifest([new RibbonTabDefinition("home", "Home", [])], []),
            new FeatureManifest([], 2, []));
        var slideId = viewModel.ActiveSlide.Id;

        viewModel.RenameSlide(slideId, "Introduction");
        viewModel.AddSectionForActiveSlide();
        var sectionId = viewModel.ActiveSlide.SectionId!.Value;
        viewModel.RenameSection(sectionId, "Foundations");

        Assert.Equal("Introduction", viewModel.ActiveSlide.Name);
        Assert.Equal("Foundations", viewModel.Session.CurrentProject.Sections.Single().Name);
        Assert.Equal(sectionId, viewModel.Slides.Single(slide => slide.Id == slideId).SectionId);
        Assert.True(viewModel.CanUndo);
    }

    [Fact]
    public void MovingSlidesAcrossASectionBoundaryReassignsThemAndUndoRestoresBothOrderAndSection()
    {
        var slides = Enumerable.Range(1, 5)
            .Select(index => SlideDocument.Create($"Slide {index}", DocumentNameKind.Automatic))
            .ToArray();
        var firstSection = SlideSection.Create("Opening", 0);
        var secondSection = SlideSection.Create("Investigation", 1);
        var project = LessonProject.Create("Lesson", FixedTime) with
        {
            Sections = [firstSection, secondSection],
            Slides =
            [
                slides[0] with { SectionId = firstSection.Id },
                slides[1] with { SectionId = firstSection.Id },
                slides[2],
                slides[3] with { SectionId = secondSection.Id },
                slides[4] with { SectionId = secondSection.Id },
            ],
        };
        var session = new AuthoringSession(project);

        session.Execute(ProjectCommands.MoveSlides([slides[2].Id], slides[3].Id, placeAfterTarget: true));

        Assert.Equal(secondSection.Id, session.CurrentProject.Slides.Single(slide => slide.Id == slides[2].Id).SectionId);
        Assert.Equal([slides[0].Id, slides[1].Id, slides[3].Id, slides[2].Id, slides[4].Id],
            session.CurrentProject.Slides.Select(slide => slide.Id));

        Assert.True(session.Undo());
        Assert.Null(session.CurrentProject.Slides.Single(slide => slide.Id == slides[2].Id).SectionId);
        Assert.Equal(slides.Select(slide => slide.Id), session.CurrentProject.Slides.Select(slide => slide.Id));
    }

    [Fact]
    public void SectionAssignmentMovementAndRemovalAreAtomicAndKeepSlides()
    {
        var slides = Enumerable.Range(1, 4)
            .Select(index => SlideDocument.Create($"Slide {index}", DocumentNameKind.Automatic))
            .ToArray();
        var session = new AuthoringSession(LessonProject.Create("Lesson", FixedTime) with { Slides = slides });
        session.Execute(ProjectCommands.AddAutomaticSectionAndAssignSlides([slides[0].Id, slides[1].Id]));
        var firstSectionId = session.CurrentProject.Slides[0].SectionId!.Value;
        session.Execute(ProjectCommands.AddAutomaticSectionAndAssignSlides([slides[2].Id, slides[3].Id]));
        var secondSectionId = session.CurrentProject.Slides[2].SectionId!.Value;

        session.Execute(ProjectCommands.MoveSection(secondSectionId, firstSectionId, placeAfterTarget: false));
        Assert.Equal([slides[2].Id, slides[3].Id, slides[0].Id, slides[1].Id],
            session.CurrentProject.Slides.Select(slide => slide.Id));

        session.Execute(ProjectCommands.AssignSlidesToSection([slides[0].Id, slides[1].Id], secondSectionId));
        Assert.Single(session.CurrentProject.Sections);
        Assert.All(session.CurrentProject.Slides, slide => Assert.Equal(secondSectionId, slide.SectionId));

        session.Execute(ProjectCommands.RemoveSection(secondSectionId));
        Assert.Empty(session.CurrentProject.Sections);
        Assert.All(session.CurrentProject.Slides, slide => Assert.Null(slide.SectionId));
        Assert.Equal(4, session.CurrentProject.Slides.Count);

        Assert.True(session.Undo());
        Assert.Single(session.CurrentProject.Sections);
        Assert.All(session.CurrentProject.Slides, slide => Assert.Equal(secondSectionId, slide.SectionId));
    }

    [Fact]
    public void StudioViewModelCollapsesAndExpandsASectionWithoutChangingTheDocument()
    {
        var slides = Enumerable.Range(1, 3).Select(index => SlideDocument.Create($"Slide {index}")).ToArray();
        var section = SlideSection.Create("Investigation", 0);
        var project = LessonProject.Create("Lesson", FixedTime) with
        {
            Sections = [section],
            Slides = slides.Select(slide => slide with { SectionId = section.Id }).ToArray(),
        };
        var viewModel = new StudioShellViewModel(
            new RibbonManifest([new RibbonTabDefinition("home", "Home", [])], []),
            new FeatureManifest([], 2, []),
            new AuthoringSession(project));
        var revision = viewModel.Session.Revision;

        viewModel.ToggleSectionCollapsed(section.Id);

        Assert.Single(viewModel.Slides, slide => slide.ShowSectionHeader);
        Assert.All(viewModel.Slides, slide => Assert.False(slide.ShowSlideCard));
        Assert.Equal(revision, viewModel.Session.Revision);

        viewModel.ToggleSectionCollapsed(section.Id);
        Assert.All(viewModel.Slides, slide => Assert.True(slide.ShowSlideCard));
        Assert.Equal(revision, viewModel.Session.Revision);
    }

    [Fact]
    public void AuthoringSessionSupportsReplaceToggleAndAddObjectSelectionWithoutChangingDocumentRevision()
    {
        var nodes = Enumerable.Range(1, 3)
            .Select(index => SceneNode.Create($"Object {index}", "shape.rectangle", new NodeGeometry(index * 10, 20, 100, 80)))
            .ToArray();
        var project = LessonProject.Create("Lesson", FixedTime) with
        {
            Slides = [SlideDocument.Create("Canvas") with { Nodes = nodes }],
        };
        var session = new AuthoringSession(project);
        var revision = session.Revision;

        session.SelectNode(nodes[0].Id);
        session.SelectNode(nodes[1].Id, NodeSelectionMode.Add);
        session.SelectNode(nodes[0].Id, NodeSelectionMode.Toggle);

        Assert.Equal([nodes[1].Id], session.SelectedNodeIds);
        Assert.Equal(revision, session.Revision);

        session.ClearNodeSelection();
        Assert.Empty(session.SelectedNodeIds);
        Assert.Equal(revision, session.Revision);
    }

    [Fact]
    public void MultiObjectPresentationTransformCommitsAsOneUndoStepAndPreservesModelAuthority()
    {
        var first = SceneNode.Create("First", "shape.rectangle", new NodeGeometry(100, 100, 200, 100)) with
        {
            ModelTransform = new SpatialTransform2D(3, 4, 1, 1, 5),
        };
        var second = SceneNode.Create("Second", "shape.ellipse", new NodeGeometry(400, 300, 120, 120));
        var project = LessonProject.Create("Lesson", FixedTime) with
        {
            Slides = [SlideDocument.Create("Canvas") with { Nodes = [first, second] }],
        };
        var session = new AuthoringSession(project);
        var transforms = new Dictionary<Guid, PresentationTransform2D>
        {
            [first.Id] = new(20, 30, 1.5, .75, 25, 1),
            [second.Id] = new(-15, 8, .8, 1.2, -10, .9),
        };

        session.Execute(ProjectCommands.SetNodesPresentationTransforms(project.Slides[0].Id, transforms));

        Assert.Equal(transforms[first.Id], session.CurrentProject.Slides[0].Nodes[0].PresentationTransform);
        Assert.Equal(transforms[second.Id], session.CurrentProject.Slides[0].Nodes[1].PresentationTransform);
        Assert.Equal(first.ModelTransform, session.CurrentProject.Slides[0].Nodes[0].ModelTransform);

        Assert.True(session.Undo());
        Assert.Equal(PresentationTransform2D.Identity, session.CurrentProject.Slides[0].Nodes[0].PresentationTransform);
        Assert.Equal(PresentationTransform2D.Identity, session.CurrentProject.Slides[0].Nodes[1].PresentationTransform);
        Assert.False(session.CanUndo);
    }

    [Fact]
    public void MultiObjectDeleteIsAtomicAndRejectsLockedSelections()
    {
        var first = SceneNode.Create("First", "shape.rectangle", new NodeGeometry(100, 100, 200, 100));
        var second = SceneNode.Create("Second", "shape.ellipse", new NodeGeometry(400, 300, 120, 120)) with { IsLocked = true };
        var third = SceneNode.Create("Third", "shape.text", new NodeGeometry(600, 300, 200, 60));
        var project = LessonProject.Create("Lesson", FixedTime) with
        {
            Slides = [SlideDocument.Create("Canvas") with { Nodes = [first, second, third] }],
        };
        var session = new AuthoringSession(project);

        Assert.Throws<AuthoringCommandException>(() =>
            session.Execute(ProjectCommands.DeleteNodes(project.Slides[0].Id, [first.Id, second.Id])));
        Assert.Equal(3, session.CurrentProject.Slides[0].Nodes.Count);

        session.Execute(ProjectCommands.DeleteNodes(project.Slides[0].Id, [first.Id, third.Id]));
        Assert.Equal([second.Id], session.CurrentProject.Slides[0].Nodes.Select(node => node.Id));
        Assert.True(session.Undo());
        Assert.Equal([first.Id, second.Id, third.Id], session.CurrentProject.Slides[0].Nodes.Select(node => node.Id));
    }
}
