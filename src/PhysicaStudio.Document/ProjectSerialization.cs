using System.IO.Compression;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;

namespace PhysicaStudio.Document;

public sealed class ProjectPackageException : Exception
{
    public ProjectPackageException(string message) : base(message)
    {
    }

    public ProjectPackageException(string message, Exception innerException) : base(message, innerException)
    {
    }
}

public interface IProjectMigration
{
    int SourceVersion { get; }
    int TargetVersion { get; }
    JsonObject Migrate(JsonObject project);
}

public sealed class ProjectMigrationPipeline
{
    private readonly IReadOnlyDictionary<int, IProjectMigration> _migrations;

    public ProjectMigrationPipeline(IEnumerable<IProjectMigration>? migrations = null)
    {
        _migrations = (migrations ?? [])
            .ToDictionary(migration => migration.SourceVersion);
    }

    public JsonObject Upgrade(JsonObject project)
    {
        var version = ReadFormatVersion(project);
        if (version > ProjectFormat.Current)
        {
            throw new ProjectPackageException($"This project uses format version {version}, but this Physica build supports up to version {ProjectFormat.Current}.");
        }

        while (version < ProjectFormat.Current)
        {
            if (!_migrations.TryGetValue(version, out var migration) || migration.TargetVersion <= version)
            {
                throw new ProjectPackageException($"No migration is available from project format version {version}.");
            }

            project = migration.Migrate(project);
            version = ReadFormatVersion(project);
            if (version != migration.TargetVersion)
            {
                throw new ProjectPackageException($"Migration from version {migration.SourceVersion} did not produce version {migration.TargetVersion}.");
            }
        }

        return project;
    }

    public static int ReadFormatVersion(JsonObject project)
    {
        if (project["formatVersion"] is not JsonValue value || !value.TryGetValue<int>(out var version) || version <= 0)
        {
            throw new ProjectPackageException("The project format version is missing or invalid.");
        }

        return version;
    }
}

public static class ProjectJson
{
    public static JsonSerializerOptions Options { get; } = CreateOptions();

    public static string Serialize(LessonProject project) =>
        JsonSerializer.Serialize(project, Options);

    public static LessonProject Deserialize(string json, ProjectMigrationPipeline? migrations = null)
    {
        JsonObject root;
        try
        {
            root = JsonNode.Parse(json)?.AsObject()
                ?? throw new ProjectPackageException("The project JSON is empty.");
        }
        catch (JsonException exception)
        {
            throw new ProjectPackageException("The project JSON is invalid.", exception);
        }

        root = (migrations ?? new ProjectMigrationPipeline()).Upgrade(root);
        LessonProject project;
        try
        {
            project = root.Deserialize<LessonProject>(Options)
                ?? throw new ProjectPackageException("The project JSON does not contain a lesson.");
        }
        catch (JsonException exception)
        {
            throw new ProjectPackageException("The project structure is invalid.", exception);
        }

        try
        {
            project = DocumentNormalizer.Normalize(project);
            var validation = DocumentValidator.Validate(project);
            if (!validation.IsValid)
            {
                var diagnostic = string.Join(Environment.NewLine, validation.Issues.Select(issue => $"{issue.Path}: {issue.Message}"));
                throw new ProjectPackageException($"The project failed validation.{Environment.NewLine}{diagnostic}");
            }
        }
        catch (ProjectPackageException)
        {
            throw;
        }
        catch (Exception exception) when (exception is NullReferenceException or InvalidOperationException or ArgumentException)
        {
            throw new ProjectPackageException("The project structure is incomplete or inconsistent.", exception);
        }

        return project;
    }

    private static JsonSerializerOptions CreateOptions() => new(JsonSerializerDefaults.General)
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DictionaryKeyPolicy = null,
        WriteIndented = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        UnmappedMemberHandling = JsonUnmappedMemberHandling.Skip,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) },
    };
}

public static class PhysicaProjectPackage
{
    private static readonly DateTimeOffset StableEntryTimestamp = new(1980, 1, 1, 0, 0, 0, TimeSpan.Zero);

    public static async Task SaveAsync(LessonProject project, string path, CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(path);
        project = DocumentNormalizer.Normalize(project);
        var validation = DocumentValidator.Validate(project);
        if (!validation.IsValid)
        {
            throw new ProjectPackageException(string.Join(Environment.NewLine, validation.Issues.Select(issue => issue.Message)));
        }

        var fullPath = Path.GetFullPath(path);
        var directory = Path.GetDirectoryName(fullPath) ?? throw new ProjectPackageException("The destination directory is invalid.");
        Directory.CreateDirectory(directory);
        var temporaryPath = Path.Combine(directory, $".{Path.GetFileName(fullPath)}.{Guid.NewGuid():N}.tmp");

        try
        {
            await using (var stream = new FileStream(
                temporaryPath,
                FileMode.CreateNew,
                FileAccess.ReadWrite,
                FileShare.None,
                64 * 1024,
                FileOptions.Asynchronous | FileOptions.WriteThrough))
            {
                using var archive = new ZipArchive(stream, ZipArchiveMode.Create, leaveOpen: true);
                var entry = archive.CreateEntry(ProjectFormat.ProjectEntryName, CompressionLevel.Optimal);
                entry.LastWriteTime = StableEntryTimestamp;
                await using var entryStream = entry.Open();
                await JsonSerializer.SerializeAsync(entryStream, project, ProjectJson.Options, cancellationToken);
            }

            cancellationToken.ThrowIfCancellationRequested();
            File.Move(temporaryPath, fullPath, overwrite: true);
        }
        catch
        {
            if (File.Exists(temporaryPath))
            {
                File.Delete(temporaryPath);
            }

            throw;
        }
    }

    public static async Task<LessonProject> LoadAsync(
        string path,
        ProjectMigrationPipeline? migrations = null,
        CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(path);
        try
        {
            await using var stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read, 64 * 1024, FileOptions.Asynchronous | FileOptions.SequentialScan);
            using var archive = new ZipArchive(stream, ZipArchiveMode.Read);
            var entry = archive.GetEntry(ProjectFormat.ProjectEntryName)
                ?? throw new ProjectPackageException($"The package does not contain {ProjectFormat.ProjectEntryName}.");
            if (entry.Length > 64 * 1024 * 1024)
            {
                throw new ProjectPackageException("The project metadata entry exceeds the 64 MB safety limit.");
            }
            await using var entryStream = entry.Open();
            using var reader = new StreamReader(entryStream);
            var json = await reader.ReadToEndAsync(cancellationToken);
            return ProjectJson.Deserialize(json, migrations);
        }
        catch (ProjectPackageException)
        {
            throw;
        }
        catch (Exception exception) when (exception is IOException or InvalidDataException or UnauthorizedAccessException)
        {
            throw new ProjectPackageException("The Physica project package could not be opened.", exception);
        }
    }
}

public sealed record RecoverySnapshot(
    Guid ProjectId,
    long Revision,
    DateTimeOffset SavedUtc,
    string? OriginalPath,
    LessonProject Project);

public sealed class ProjectRecoveryStore
{
    private readonly string _rootDirectory;

    public ProjectRecoveryStore(string rootDirectory)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(rootDirectory);
        _rootDirectory = Path.GetFullPath(rootDirectory);
    }

    public async Task SaveAsync(
        LessonProject project,
        long revision,
        string? originalPath,
        DateTimeOffset? savedUtc = null,
        CancellationToken cancellationToken = default)
    {
        Directory.CreateDirectory(_rootDirectory);
        var destination = GetPath(project.Id);
        var temporary = $"{destination}.{Guid.NewGuid():N}.tmp";
        var snapshot = new RecoverySnapshot(project.Id, revision, savedUtc ?? DateTimeOffset.UtcNow, originalPath, project);
        try
        {
            await using (var stream = new FileStream(temporary, FileMode.CreateNew, FileAccess.Write, FileShare.None, 32 * 1024, FileOptions.Asynchronous | FileOptions.WriteThrough))
            {
                await JsonSerializer.SerializeAsync(stream, snapshot, ProjectJson.Options, cancellationToken);
            }

            cancellationToken.ThrowIfCancellationRequested();
            File.Move(temporary, destination, overwrite: true);
        }
        catch
        {
            if (File.Exists(temporary))
            {
                File.Delete(temporary);
            }

            throw;
        }
    }

    public async Task<IReadOnlyList<RecoverySnapshot>> ListAsync(CancellationToken cancellationToken = default)
    {
        if (!Directory.Exists(_rootDirectory))
        {
            return [];
        }

        var snapshots = new List<RecoverySnapshot>();
        foreach (var path in Directory.EnumerateFiles(_rootDirectory, "*.recovery.json").OrderBy(path => path, StringComparer.Ordinal))
        {
            cancellationToken.ThrowIfCancellationRequested();
            try
            {
                await using var stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read, 32 * 1024, FileOptions.Asynchronous | FileOptions.SequentialScan);
                var snapshot = await JsonSerializer.DeserializeAsync<RecoverySnapshot>(stream, ProjectJson.Options, cancellationToken);
                if (snapshot?.Project is { } project && DocumentValidator.Validate(project).IsValid)
                {
                    snapshots.Add(snapshot);
                }
            }
            catch (JsonException)
            {
                // A corrupt recovery item is isolated; valid recovery entries remain available.
            }
            catch (IOException)
            {
                // A temporarily unavailable recovery item does not prevent listing the others.
            }
            catch (Exception exception) when (exception is NullReferenceException or InvalidOperationException or ArgumentException)
            {
                // Malformed recovery content is isolated from valid entries.
            }
        }

        return snapshots.OrderByDescending(snapshot => snapshot.SavedUtc).ToArray();
    }

    public void Delete(Guid projectId)
    {
        var path = GetPath(projectId);
        if (File.Exists(path))
        {
            File.Delete(path);
        }
    }

    private string GetPath(Guid projectId) => Path.Combine(_rootDirectory, $"{projectId:N}.recovery.json");
}
