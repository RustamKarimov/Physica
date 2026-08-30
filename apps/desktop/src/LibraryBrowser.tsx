import type {
  LibraryDragPayload,
  LibraryItemClass,
  LibraryItemDefinition,
} from "@physica/assets";
import "./library.css";

export function LibraryBrowser({
  items,
  itemClasses,
  query,
  selectedClass,
  onQueryChange,
  onClassChange,
  onPlace,
  dragPayload,
}: {
  readonly items: readonly LibraryItemDefinition[];
  readonly itemClasses: readonly (LibraryItemClass | "all")[];
  readonly query: string;
  readonly selectedClass: LibraryItemClass | "all";
  readonly onQueryChange: (query: string) => void;
  readonly onClassChange: (itemClass: LibraryItemClass | "all") => void;
  readonly onPlace: (item: LibraryItemDefinition) => void;
  readonly dragPayload: (item: LibraryItemDefinition) => LibraryDragPayload;
}) {
  return (
    <aside className="library-browser" aria-label="Physics Library">
      <div className="library-heading">
        <div>
          <small>CATALOG</small>
          <strong>Library</strong>
        </div>
        <span>{items.length}</span>
      </div>
      <label className="library-search">
        <span className="sr-only">Search Library</span>
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search objects…"
        />
        <kbd>⌕</kbd>
      </label>
      <div className="library-filters" aria-label="Library item class">
        {itemClasses.map((itemClass) => (
          <button
            key={itemClass}
            className={selectedClass === itemClass ? "active" : ""}
            onClick={() => onClassChange(itemClass)}
          >
            {itemClass === "all" ? "All" : itemClass.replace("-", " ")}
          </button>
        ))}
      </div>
      <div className="library-list">
        {items.map((item) => (
          <article
            className="library-card"
            key={item.id}
            draggable
            onDragStart={(event) => {
              event.dataTransfer.effectAllowed = "copy";
              event.dataTransfer.setData(
                "application/x-physica-library",
                JSON.stringify(dragPayload(item)),
              );
            }}
          >
            <div
              className={"library-glyph glyph-" + item.itemClass}
              aria-hidden="true"
            >
              {item.displayName.slice(0, 1)}
            </div>
            <div>
              <strong>{item.displayName}</strong>
              <span>{item.itemClass.replace("-", " ")}</span>
            </div>
            <button
              onClick={() => onPlace(item)}
              aria-label={"Add " + item.displayName + " to stage"}
            >
              +
            </button>
          </article>
        ))}
      </div>
    </aside>
  );
}
