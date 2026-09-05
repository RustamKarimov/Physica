export function ObjectGlyph({ name }: { readonly name: string }) {
  const key = name.toLowerCase();
  if (key.includes("ball") || key.includes("mass"))
    return (
      <svg viewBox="0 0 80 60" aria-hidden="true">
        <defs>
          <radialGradient id="ball-shade" cx="35%" cy="28%">
            <stop offset="0" stopColor="#fff4da" />
            <stop offset="0.3" stopColor="#ffb27f" />
            <stop offset="1" stopColor="#e85f4a" />
          </radialGradient>
        </defs>
        <circle cx="40" cy="30" r="19" fill="url(#ball-shade)" />
        <ellipse cx="40" cy="53" rx="22" ry="4" fill="#071014" opacity=".5" />
      </svg>
    );
  if (key.includes("trolley") || key.includes("car"))
    return (
      <svg viewBox="0 0 80 60" aria-hidden="true">
        <path d="M15 37h50l-7-18H31L20 27z" fill="#4fc3b3" />
        <path d="M11 38h58v8H11z" fill="#d7eef0" />
        <circle cx="25" cy="48" r="6" fill="#17252b" stroke="#9cd8d1" />
        <circle cx="57" cy="48" r="6" fill="#17252b" stroke="#9cd8d1" />
      </svg>
    );
  if (key.includes("spring"))
    return (
      <svg viewBox="0 0 80 60" aria-hidden="true">
        <path
          d="M8 30h9l6-15 10 30 10-30 10 30 6-15h13"
          fill="none"
          stroke="#f2c46d"
          strokeWidth="4"
          strokeLinejoin="round"
        />
      </svg>
    );
  if (
    key.includes("panel") ||
    key.includes("text") ||
    key.includes("explanation")
  )
    return (
      <svg viewBox="0 0 80 60" aria-hidden="true">
        <rect x="8" y="8" width="64" height="44" rx="5" fill="#e9f1ed" />
        <path
          d="M18 21h42M18 30h33M18 39h38"
          stroke="#27414a"
          strokeWidth="3"
        />
        {key.includes("graph") && (
          <path
            d="M18 42c10-2 13-19 22-14 8 5 11-10 22-12"
            fill="none"
            stroke="#e85f4a"
            strokeWidth="3"
          />
        )}
      </svg>
    );
  if (key.includes("axes") || key.includes("vector"))
    return (
      <svg viewBox="0 0 80 60" aria-hidden="true">
        <path d="M12 48h56M18 53V8" stroke="#a7bec2" strokeWidth="2" />
        <path
          d="M18 42L59 16M59 16l-11 2m11-2-4 10"
          stroke="#ef725c"
          strokeWidth="4"
          fill="none"
        />
      </svg>
    );
  return (
    <svg viewBox="0 0 80 60" aria-hidden="true">
      <rect x="13" y="14" width="54" height="34" rx="5" fill="#6db5a9" />
      <path
        d="M13 22l27 13 27-13"
        fill="none"
        stroke="#d8f0eb"
        strokeWidth="3"
      />
    </svg>
  );
}
