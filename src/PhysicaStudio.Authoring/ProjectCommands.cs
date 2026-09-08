using PhysicaStudio.Document;

namespace PhysicaStudio.Authoring;

public static class ProjectCommands
{
    public static IProjectCommand RenameProject(string title) => Command("Rename project", project =>
    {
        RequireName(title, "Project title");
        return project with { Title = title };
    });

    public static IProjectCommand AddSlide(string name, Guid? afterSlideId = null, Guid? sectionId = null) =>
        AddSlideCore(name, DocumentNameKind.Custom, afterSlideId, sectionId);

    public static IProjectCommand AddAutomaticSlide(Guid? afterSlideId = null, Guid? sectionId = null) =>
        AddSlideCore("Slide", DocumentNameKind.Automatic, afterSlideId, sectionId);

    private static IProjectCommand AddSlideCore(
        string name,
        DocumentNameKind nameKind,
        Guid? afterSlideId,
        Guid? sectionId) =>
        Command("Add slide", project =>
        {
            RequireName(name, "Slide name");
            if (sectionId is not null && project.Sections.All(section => section.Id != sectionId))
            {
                throw new AuthoringCommandException("The requested section does not exist.");
            }

            var slide = SlideDocument.Create(name, nameKind) with { SectionId = sectionId };
            var slides = project.Slides.ToList();
            var insertionIndex = afterSlideId is null
                ? slides.Count
                : FindSlideIndex(slides, afterSlideId.Value) + 1;
            slides.Insert(insertionIndex, slide);
            return project with { Slides = slides };
        });

    public static IProjectCommand DuplicateSlide(Guid slideId) => Command("Duplicate slide", project =>
    {
        var slides = project.Slides.ToList();
        var sourceIndex = FindSlideIndex(slides, slideId);
        var source = slides[sourceIndex];
        var idMap = source.Nodes.ToDictionary(node => node.Id, _ => Guid.NewGuid());
        var nodes = source.Nodes.Select(node => node with
        {
            Id = idMap[node.Id],
            ParentId = node.ParentId is Guid parentId ? idMap[parentId] : null,
        }).ToArray();
        var duplicate = source with
        {
            Id = Guid.NewGuid(),
            Name = source.NameKind == DocumentNameKind.Automatic ? source.Name : $"{source.Name} copy",
            Nodes = nodes,
        };
        slides.Insert(sourceIndex + 1, duplicate);
        return project with { Slides = slides };
    });

    public static IProjectCommand DeleteSlide(Guid slideId) => DeleteSlides([slideId]);

    public static IProjectCommand DeleteSlides(IEnumerable<Guid> slideIds) => Command("Delete slides", project =>
    {
        var ids = slideIds.Distinct().ToHashSet();
        if (ids.Count == 0 || ids.Any(id => project.Slides.All(slide => slide.Id != id)))
        {
            throw new AuthoringCommandException("A selected slide does not exist.");
        }
        if (project.Slides.Count - ids.Count < 1)
        {
            throw new AuthoringCommandException("A lesson must contain at least one slide.");
        }

        return project with { Slides = project.Slides.Where(slide => !ids.Contains(slide.Id)).ToArray() };
    });

    public static IProjectCommand RenameSlide(Guid slideId, string name) => Command("Rename slide", project =>
    {
        RequireName(name, "Slide name");
        return ReplaceSlide(project, slideId, slide => slide with
        {
            Name = name,
            NameKind = DocumentNameKind.Custom,
        });
    });

    public static IProjectCommand MoveSlide(Guid slideId, int destinationIndex) => Command("Move slide", project =>
    {
        if (destinationIndex < 0 || destinationIndex >= project.Slides.Count)
        {
            throw new AuthoringCommandException("The slide destination is outside the lesson.");
        }

        var slides = project.Slides.ToList();
        var sourceIndex = FindSlideIndex(slides, slideId);
        var slide = slides[sourceIndex];
        slides.RemoveAt(sourceIndex);
        slides.Insert(destinationIndex, slide);
        return project with { Slides = slides };
    });

    public static IProjectCommand MoveSlides(
        IEnumerable<Guid> slideIds,
        Guid targetSlideId,
        bool placeAfterTarget) => Command("Move slides", project =>
        {
            var ids = slideIds.Distinct().ToHashSet();
            if (ids.Count == 0 || ids.Any(id => project.Slides.All(slide => slide.Id != id)))
            {
                throw new AuthoringCommandException("A selected slide does not exist.");
            }
            if (ids.Contains(targetSlideId))
            {
                return project;
            }

            var targetSectionId = project.Slides.Single(slide => slide.Id == targetSlideId).SectionId;
            var moving = project.Slides
                .Where(slide => ids.Contains(slide.Id))
                .Select(slide => slide with { SectionId = targetSectionId })
                .ToArray();
            var remaining = project.Slides.Where(slide => !ids.Contains(slide.Id)).ToList();
            var targetIndex = FindSlideIndex(remaining, targetSlideId);
            var insertionIndex = targetIndex + (placeAfterTarget ? 1 : 0);
            remaining.InsertRange(insertionIndex, moving);
            return RemoveUnusedSections(project with { Slides = remaining });
        });

    public static IProjectCommand SetSlideHidden(Guid slideId, bool isHidden) =>
        Command(isHidden ? "Hide slide" : "Show slide", project =>
            ReplaceSlide(project, slideId, slide => slide with { IsHidden = isHidden }));

    public static IProjectCommand AddSection(string name) => Command("Add section", project =>
    {
        RequireName(name, "Section name");
        var sections = project.Sections
            .Append(SlideSection.Create(name, project.Sections.Count))
            .ToArray();
        return project with { Sections = sections };
    });

    public static IProjectCommand AddSectionAndAssignSlide(string name, Guid slideId) =>
        AddSectionAndAssignSlides(name, [slideId]);

    public static IProjectCommand AddSectionAndAssignSlides(string name, IEnumerable<Guid> slideIds) =>
        AddSectionAndAssignSlidesCore(name, DocumentNameKind.Custom, slideIds);

    public static IProjectCommand AddAutomaticSectionAndAssignSlides(IEnumerable<Guid> slideIds) =>
        AddSectionAndAssignSlidesCore("Section", DocumentNameKind.Automatic, slideIds);

    private static IProjectCommand AddSectionAndAssignSlidesCore(
        string name,
        DocumentNameKind nameKind,
        IEnumerable<Guid> slideIds) =>
        Command("Add section and assign slides", project =>
        {
            RequireName(name, "Section name");
            var ids = slideIds.Distinct().ToHashSet();
            if (ids.Count == 0 || ids.Any(id => project.Slides.All(slide => slide.Id != id)))
            {
                throw new AuthoringCommandException("A selected slide does not exist.");
            }

            var section = SlideSection.Create(name, project.Sections.Count, nameKind);
            var moving = project.Slides
                .Where(slide => ids.Contains(slide.Id))
                .Select(slide => slide with { SectionId = section.Id })
                .ToArray();
            var firstSelectedIndex = project.Slides
                .Select((slide, index) => (slide, index))
                .Where(item => ids.Contains(item.slide.Id))
                .Min(item => item.index);
            var remaining = project.Slides.Where(slide => !ids.Contains(slide.Id)).ToList();
            var insertionIndex = project.Slides
                .Take(firstSelectedIndex)
                .Count(slide => !ids.Contains(slide.Id));
            remaining.InsertRange(insertionIndex, moving);

            return RemoveUnusedSections(project with
            {
                Sections = project.Sections.Append(section).ToArray(),
                Slides = remaining,
            });
        });

    public static IProjectCommand RenameSection(Guid sectionId, string name) => Command("Rename section", project =>
    {
        RequireName(name, "Section name");
        var found = false;
        var sections = project.Sections.Select(section =>
        {
            if (section.Id != sectionId)
            {
                return section;
            }

            found = true;
            return section with { Name = name, NameKind = DocumentNameKind.Custom };
        }).ToArray();
        if (!found)
        {
            throw new AuthoringCommandException("The section does not exist.");
        }

        return project with { Sections = sections };
    });

    public static IProjectCommand AssignSlideToSection(Guid slideId, Guid? sectionId) =>
        AssignSlidesToSection([slideId], sectionId);

    public static IProjectCommand AssignSlidesToSection(IEnumerable<Guid> slideIds, Guid? sectionId) => Command("Assign slide section", project =>
    {
        if (sectionId is not null && project.Sections.All(section => section.Id != sectionId))
        {
            throw new AuthoringCommandException("The section does not exist.");
        }

        var ids = slideIds.Distinct().ToHashSet();
        if (ids.Count == 0 || ids.Any(id => project.Slides.All(slide => slide.Id != id)))
        {
            throw new AuthoringCommandException("A selected slide does not exist.");
        }

        var moving = project.Slides
            .Where(slide => ids.Contains(slide.Id))
            .Select(slide => slide with { SectionId = sectionId })
            .ToArray();
        var firstSelectedIndex = project.Slides
            .Select((slide, index) => (slide, index))
            .Where(item => ids.Contains(item.slide.Id))
            .Min(item => item.index);
        var remaining = project.Slides.Where(slide => !ids.Contains(slide.Id)).ToList();
        var insertionIndex = sectionId is Guid targetSectionId
            ? LastSectionSlideIndex(remaining, targetSectionId) + 1
            : project.Slides.Take(firstSelectedIndex).Count(slide => !ids.Contains(slide.Id));
        if (sectionId is not null && insertionIndex == 0)
        {
            insertionIndex = remaining.Count;
        }
        remaining.InsertRange(insertionIndex, moving);
        return RemoveUnusedSections(project with { Slides = remaining });
    });

    public static IProjectCommand MoveSection(Guid sectionId, Guid targetSectionId, bool placeAfterTarget) =>
        Command("Move section", project =>
        {
            if (sectionId == targetSectionId)
            {
                return project;
            }
            if (project.Sections.All(section => section.Id != sectionId)
                || project.Sections.All(section => section.Id != targetSectionId))
            {
                throw new AuthoringCommandException("The section does not exist.");
            }

            var moving = project.Slides.Where(slide => slide.SectionId == sectionId).ToArray();
            if (moving.Length == 0)
            {
                throw new AuthoringCommandException("The section has no slides to move.");
            }
            var remaining = project.Slides.Where(slide => slide.SectionId != sectionId).ToList();
            var targetIndexes = remaining
                .Select((slide, index) => (slide, index))
                .Where(item => item.slide.SectionId == targetSectionId)
                .Select(item => item.index)
                .ToArray();
            if (targetIndexes.Length == 0)
            {
                throw new AuthoringCommandException("The target section has no slides.");
            }

            var insertionIndex = placeAfterTarget ? targetIndexes.Max() + 1 : targetIndexes.Min();
            remaining.InsertRange(insertionIndex, moving);
            return project with { Slides = remaining };
        });

    public static IProjectCommand RemoveSection(Guid sectionId) => Command("Remove section", project =>
    {
        if (project.Sections.All(section => section.Id != sectionId))
        {
            throw new AuthoringCommandException("The section does not exist.");
        }

        return project with
        {
            Sections = project.Sections.Where(section => section.Id != sectionId).ToArray(),
            Slides = project.Slides
                .Select(slide => slide.SectionId == sectionId ? slide with { SectionId = null } : slide)
                .ToArray(),
        };
    });

    public static IProjectCommand AddNode(Guid slideId, SceneNode node) => Command("Add object", project =>
    {
        if (project.Slides.SelectMany(slide => slide.Nodes).Any(existing => existing.Id == node.Id))
        {
            throw new AuthoringCommandException("The scene node ID already exists.");
        }

        return ReplaceSlide(project, slideId, slide => slide with
        {
            Nodes = slide.Nodes.Append(node with { LayerIndex = slide.Nodes.Count }).ToArray(),
        });
    });

    public static IProjectCommand DuplicateNode(Guid slideId, Guid nodeId) => Command("Duplicate object", project =>
        ReplaceSlide(project, slideId, slide =>
        {
            var node = FindNode(slide, nodeId);
            var copy = node with
            {
                Id = Guid.NewGuid(),
                Name = $"{node.Name} copy",
                ParentId = null,
                LayerIndex = slide.Nodes.Count,
                Geometry = node.Geometry with { X = node.Geometry.X + 20, Y = node.Geometry.Y + 20 },
            };
            return slide with { Nodes = slide.Nodes.Append(copy).ToArray() };
        }));

    public static IProjectCommand DeleteNode(Guid slideId, Guid nodeId) => Command("Delete object", project =>
        ReplaceSlide(project, slideId, slide =>
        {
            var node = FindNode(slide, nodeId);
            if (node.IsLocked)
            {
                throw new AuthoringCommandException("Unlock the object before deleting it.");
            }

            var nodes = slide.Nodes
                .Where(candidate => candidate.Id != nodeId)
                .Select(candidate => candidate.ParentId == nodeId ? candidate with { ParentId = null } : candidate)
                .Select((candidate, index) => candidate with { LayerIndex = index })
                .ToArray();
            return slide with { Nodes = nodes };
        }));

    public static IProjectCommand SetNodePresentationTransform(
        Guid slideId,
        Guid nodeId,
        PresentationTransform2D transform) => Command("Transform object", project =>
            ReplaceNode(project, slideId, nodeId, node =>
            {
                RequireUnlocked(node);
                return node with { PresentationTransform = transform };
            }));

    public static IProjectCommand SetNodeGeometry(Guid slideId, Guid nodeId, NodeGeometry geometry) =>
        Command("Resize object", project => ReplaceNode(project, slideId, nodeId, node =>
        {
            RequireUnlocked(node);
            return node with { Geometry = geometry };
        }));

    public static IProjectCommand SetNodeLocked(Guid slideId, Guid nodeId, bool isLocked) =>
        Command(isLocked ? "Lock object" : "Unlock object", project =>
            ReplaceNode(project, slideId, nodeId, node => node with { IsLocked = isLocked }));

    public static IProjectCommand SetNodeVisible(Guid slideId, Guid nodeId, bool isVisible) =>
        Command(isVisible ? "Show object" : "Hide object", project =>
            ReplaceNode(project, slideId, nodeId, node => node with { IsVisible = isVisible }));

    public static IProjectCommand MoveNodeToLayer(Guid slideId, Guid nodeId, int destinationIndex) => Command("Reorder object", project =>
        ReplaceSlide(project, slideId, slide =>
        {
            if (destinationIndex < 0 || destinationIndex >= slide.Nodes.Count)
            {
                throw new AuthoringCommandException("The layer destination is outside the slide.");
            }

            var nodes = slide.Nodes.ToList();
            var sourceIndex = nodes.FindIndex(node => node.Id == nodeId);
            if (sourceIndex < 0)
            {
                throw new AuthoringCommandException("The scene node does not exist.");
            }

            if (nodes[sourceIndex].IsLocked)
            {
                throw new AuthoringCommandException("Unlock the object before reordering it.");
            }

            var node = nodes[sourceIndex];
            nodes.RemoveAt(sourceIndex);
            nodes.Insert(destinationIndex, node);
            return slide with { Nodes = nodes.Select((candidate, index) => candidate with { LayerIndex = index }).ToArray() };
        }));

    public static IProjectCommand SetSlideBackground(Guid slideId, SlideBackground background) =>
        Command("Change slide background", project => ReplaceSlide(project, slideId, slide => slide with { Background = background }));

    public static IProjectCommand SetSlideGuides(Guid slideId, IReadOnlyList<GuideDefinition> guides) =>
        Command("Change slide guides", project => ReplaceSlide(project, slideId, slide => slide with { Guides = guides }));

    public static IProjectCommand SetSnapSettings(Guid slideId, SnapSettings settings) =>
        Command("Change snapping", project => ReplaceSlide(project, slideId, slide => slide with { SnapSettings = settings }));

    public static IProjectCommand SetTheme(ThemeDefinition theme) =>
        Command("Change theme", project => project with { Theme = theme });

    public static IProjectCommand SetCanvas(CanvasDefinition canvas) =>
        Command("Change slide size", project => project with { Canvas = canvas });

    private static IProjectCommand Command(string description, Func<LessonProject, LessonProject> apply) =>
        new ProjectCommand(Guid.NewGuid(), description, apply);

    private static LessonProject ReplaceSlide(
        LessonProject project,
        Guid slideId,
        Func<SlideDocument, SlideDocument> update)
    {
        var found = false;
        var slides = project.Slides.Select(slide =>
        {
            if (slide.Id != slideId)
            {
                return slide;
            }

            found = true;
            return update(slide);
        }).ToArray();
        if (!found)
        {
            throw new AuthoringCommandException("The slide does not exist.");
        }

        return project with { Slides = slides };
    }

    private static LessonProject ReplaceNode(
        LessonProject project,
        Guid slideId,
        Guid nodeId,
        Func<SceneNode, SceneNode> update) => ReplaceSlide(project, slideId, slide =>
        {
            var found = false;
            var nodes = slide.Nodes.Select(node =>
            {
                if (node.Id != nodeId)
                {
                    return node;
                }

                found = true;
                return update(node);
            }).ToArray();
            if (!found)
            {
                throw new AuthoringCommandException("The scene node does not exist.");
            }

            return slide with { Nodes = nodes };
        });

    private static int FindSlideIndex(IReadOnlyList<SlideDocument> slides, Guid slideId)
    {
        for (var index = 0; index < slides.Count; index++)
        {
            if (slides[index].Id == slideId)
            {
                return index;
            }
        }

        throw new AuthoringCommandException("The slide does not exist.");
    }

    private static int LastSectionSlideIndex(IReadOnlyList<SlideDocument> slides, Guid sectionId)
    {
        for (var index = slides.Count - 1; index >= 0; index--)
        {
            if (slides[index].SectionId == sectionId)
            {
                return index;
            }
        }

        return -1;
    }

    private static LessonProject RemoveUnusedSections(LessonProject project)
    {
        var usedSectionIds = project.Slides
            .Where(slide => slide.SectionId.HasValue)
            .Select(slide => slide.SectionId!.Value)
            .ToHashSet();
        return project with
        {
            Sections = project.Sections.Where(section => usedSectionIds.Contains(section.Id)).ToArray(),
        };
    }

    private static SceneNode FindNode(SlideDocument slide, Guid nodeId) =>
        slide.Nodes.FirstOrDefault(node => node.Id == nodeId)
        ?? throw new AuthoringCommandException("The scene node does not exist.");

    private static void RequireUnlocked(SceneNode node)
    {
        if (node.IsLocked)
        {
            throw new AuthoringCommandException("Unlock the object before changing it.");
        }
    }

    private static void RequireName(string value, string label)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new AuthoringCommandException($"{label} cannot be empty.");
        }
    }

    private sealed record ProjectCommand(
        Guid Id,
        string Description,
        Func<LessonProject, LessonProject> ApplyDelegate) : IProjectCommand
    {
        public LessonProject Apply(LessonProject project) => ApplyDelegate(project);
    }
}
