namespace PhysicaStudio.Document;

public static class SceneNodeHierarchy
{
    public const string GroupKind = "group";

    public static bool IsGroup(SceneNode node) =>
        string.Equals(node.Kind, GroupKind, StringComparison.Ordinal);

    public static IReadOnlyList<SceneNode> FlattenByLayer(IReadOnlyList<SceneNode> nodes)
    {
        var ordered = nodes.OrderBy(node => node.LayerIndex).ToArray();
        var children = ordered.ToLookup(node => node.ParentId);
        var result = new List<SceneNode>(nodes.Count);
        var visited = new HashSet<Guid>();

        void Visit(SceneNode node)
        {
            if (!visited.Add(node.Id))
            {
                return;
            }

            result.Add(node);
            foreach (var child in children[node.Id])
            {
                Visit(child);
            }
        }

        foreach (var root in children[null])
        {
            Visit(root);
        }

        // Keep malformed or cyclic nodes available for validation instead of recursing forever.
        foreach (var node in ordered)
        {
            Visit(node);
        }

        return result;
    }

    public static IReadOnlySet<Guid> SubtreeIds(IReadOnlyList<SceneNode> nodes, Guid rootId)
    {
        var children = nodes.ToLookup(node => node.ParentId, node => node.Id);
        var result = new HashSet<Guid>();
        var pending = new Stack<Guid>();
        pending.Push(rootId);
        while (pending.Count > 0)
        {
            var current = pending.Pop();
            if (!result.Add(current))
            {
                continue;
            }

            foreach (var child in children[current])
            {
                pending.Push(child);
            }
        }
        return result;
    }

    public static Guid TopLevelAncestorId(IReadOnlyList<SceneNode> nodes, Guid nodeId)
    {
        var byId = nodes.ToDictionary(node => node.Id);
        if (!byId.TryGetValue(nodeId, out var current))
        {
            return nodeId;
        }

        var visited = new HashSet<Guid> { current.Id };
        while (current.ParentId is Guid parentId
               && byId.TryGetValue(parentId, out var parent)
               && visited.Add(parentId))
        {
            current = parent;
        }
        return current.Id;
    }

    public static int Depth(IReadOnlyDictionary<Guid, SceneNode> nodesById, SceneNode node)
    {
        var depth = 0;
        var visited = new HashSet<Guid> { node.Id };
        var current = node;
        while (current.ParentId is Guid parentId
               && nodesById.TryGetValue(parentId, out var parent)
               && visited.Add(parentId))
        {
            depth++;
            current = parent;
        }
        return depth;
    }
}
