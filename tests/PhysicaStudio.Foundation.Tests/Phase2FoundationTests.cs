using System.IO.Compression;
using System.Text.Json.Nodes;
using PhysicaStudio.Authoring;
using PhysicaStudio.Desktop.Models;
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
}
