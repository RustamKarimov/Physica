using System.Xml.Linq;

namespace PhysicaStudio.Foundation.Tests;

public sealed class ArchitectureTests
{
    [Fact]
    public void DomainProjects_DoNotReferenceDesktopOrAvalonia()
    {
        var root = FindRepositoryRoot();
        var domainProjects = Directory.GetFiles(Path.Combine(root, "src"), "*.csproj", SearchOption.AllDirectories)
            .Where(path => !path.Contains("PhysicaStudio.Desktop", StringComparison.Ordinal));

        foreach (var project in domainProjects)
        {
            var xml = XDocument.Load(project).ToString();
            Assert.DoesNotContain("PhysicaStudio.Desktop", xml, StringComparison.Ordinal);
            Assert.DoesNotContain("Avalonia", xml, StringComparison.OrdinalIgnoreCase);
        }
    }

    [Fact]
    public void PublicDocumentFoundation_IncludesAllApprovedContractNames()
    {
        var assembly = typeof(PhysicaStudio.Document.LessonProject).Assembly;
        var names = assembly.ExportedTypes.Select(type => type.Name).ToHashSet(StringComparer.Ordinal);
        var expected = new[]
        {
            "LessonProject", "SlideDocument", "MasterSlide", "ThemeDefinition", "SceneNode", "PhysicsEntity",
            "PhysicsSystem", "ObservableDefinition", "RepresentationBinding", "AnimationTrack", "AnimationClip",
            "Keyframe", "PhysicsCondition", "InteractiveControl", "PresentationCheckpoint", "Camera2D", "Camera3D",
            "PresenterConfiguration"
        };

        Assert.All(expected, name => Assert.Contains(name, names));
    }

    private static string FindRepositoryRoot()
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);
        while (directory is not null && !File.Exists(Path.Combine(directory.FullName, "PhysicaStudio.slnx")))
        {
            directory = directory.Parent;
        }

        return directory?.FullName ?? throw new DirectoryNotFoundException("Could not locate PhysicaStudio.slnx.");
    }
}

