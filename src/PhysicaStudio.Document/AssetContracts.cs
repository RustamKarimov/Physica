namespace PhysicaStudio.Document;

public enum AssetStorageKind
{
    Embedded,
    External,
    InstalledContent
}

public sealed record AssetReference(
    Guid Id,
    string ContentHash,
    string MediaType,
    AssetStorageKind StorageKind,
    string Locator);

public sealed record AssetVariant(
    Guid AssetId,
    string Kind,
    int? PixelWidth,
    int? PixelHeight,
    string ContentHash,
    string Locator);

public sealed record ContentPackManifest(
    string Id,
    string Version,
    string DisplayNameResourceId,
    IReadOnlyList<string> Topics,
    IReadOnlyList<AssetReference> Assets);
