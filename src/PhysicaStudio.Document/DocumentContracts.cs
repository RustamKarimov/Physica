namespace PhysicaStudio.Document;

public sealed record LessonProject(Guid Id, string Title, int FormatVersion, IReadOnlyList<SlideDocument> Slides);

public sealed record SlideDocument(Guid Id, string Name, IReadOnlyList<SceneNode> Nodes);

public sealed record MasterSlide(Guid Id, string Name);

public sealed record ThemeDefinition(string Id, string DisplayName);

public sealed record SceneNode(Guid Id, string Name, string Kind);

public sealed record PhysicsEntity(Guid Id, string ModelId);

public sealed record PhysicsSystem(Guid Id, string ModelId);

public sealed record ObservableDefinition(string Id, string QuantityKind, string UnitSymbol);

public sealed record RepresentationBinding(Guid NodeId, string ObservableId);

public sealed record AnimationTrack(Guid Id, Guid? TargetId, string Kind);

public sealed record AnimationClip(Guid Id, TimeSpan Start, TimeSpan Duration, string EffectId);

public sealed record Keyframe(Guid Id, TimeSpan PresentationTime, string PropertyPath);

public sealed record PhysicsCondition(string ObservableId, string Operator, double Value);

public sealed record InteractiveControl(Guid Id, string Kind, string BindingId);

public sealed record PresentationCheckpoint(Guid Id, string Name, PhysicsCondition? Condition, bool Pause);

public sealed record Camera2D(double X, double Y, double Zoom);

public sealed record Camera3D(double X, double Y, double Z, double Yaw, double Pitch, double FieldOfView);

public sealed record PresenterConfiguration(bool ShowNotes, bool ShowNextCheckpoint, bool EnableInk);

