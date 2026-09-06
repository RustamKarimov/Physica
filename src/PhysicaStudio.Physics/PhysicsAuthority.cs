namespace PhysicaStudio.Physics;

/// <summary>Boundary marker: only physics systems may write authoritative physical state.</summary>
public static class PhysicsAuthority
{
    public const string Contract = "Physics owns physical state; representations consume observables.";
}

