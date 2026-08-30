export function Adapter({
  name,
  purpose,
  state,
  accent,
  count,
}: {
  readonly name: string;
  readonly purpose: string;
  readonly state: "initializing" | "ready" | "unavailable";
  readonly accent: string;
  readonly count: number;
}) {
  return (
    <div className={"adapter adapter-" + accent}>
      <div>
        <strong>{name}</strong>
        <span>{purpose}</span>
      </div>
      <div className="adapter-stat">
        <b>{count}</b>
        <small>{state}</small>
      </div>
    </div>
  );
}
