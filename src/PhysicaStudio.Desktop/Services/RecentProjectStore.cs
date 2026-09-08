using System.Text.Json;

namespace PhysicaStudio.Desktop.Services;

public sealed record RecentProjectEntry(string Path, string DisplayName, DateTimeOffset LastOpenedUtc);

public sealed class RecentProjectStore
{
    private const int MaximumEntries = 12;
    private readonly string _path;

    public RecentProjectStore(string path)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(path);
        _path = Path.GetFullPath(path);
    }

    public IReadOnlyList<RecentProjectEntry> Load()
    {
        if (!File.Exists(_path))
        {
            return [];
        }

        try
        {
            var entries = JsonSerializer.Deserialize<List<RecentProjectEntry>>(File.ReadAllText(_path)) ?? [];
            return entries
                .Where(entry => !string.IsNullOrWhiteSpace(entry.Path) && File.Exists(entry.Path))
                .OrderByDescending(entry => entry.LastOpenedUtc)
                .Take(MaximumEntries)
                .ToArray();
        }
        catch (Exception exception) when (exception is JsonException or IOException or UnauthorizedAccessException)
        {
            return [];
        }
    }

    public void Record(string path, string displayName, DateTimeOffset? openedUtc = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(path);
        ArgumentException.ThrowIfNullOrWhiteSpace(displayName);

        var fullPath = Path.GetFullPath(path);
        var entries = Load()
            .Where(entry => !string.Equals(entry.Path, fullPath, StringComparison.OrdinalIgnoreCase))
            .Prepend(new RecentProjectEntry(fullPath, displayName.Trim(), openedUtc ?? DateTimeOffset.UtcNow))
            .Take(MaximumEntries)
            .ToArray();

        var directory = Path.GetDirectoryName(_path) ?? throw new IOException("The recent-project store has no parent directory.");
        Directory.CreateDirectory(directory);
        var temporaryPath = $"{_path}.{Guid.NewGuid():N}.tmp";
        try
        {
            File.WriteAllText(temporaryPath, JsonSerializer.Serialize(entries));
            File.Move(temporaryPath, _path, overwrite: true);
        }
        finally
        {
            if (File.Exists(temporaryPath))
            {
                File.Delete(temporaryPath);
            }
        }
    }
}
