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
  if (key.includes("pulley") || key.includes("atwood"))
    return (
      <svg viewBox="0 0 80 60" aria-hidden="true">
        <circle
          cx="40"
          cy="17"
          r="12"
          fill="#28454d"
          stroke="#91d1ca"
          strokeWidth="3"
        />
        <path d="M28 17v28m24-28v28" stroke="#e7d5a8" strokeWidth="2" />
        <rect x="19" y="37" width="18" height="17" fill="#e37459" />
        <rect x="43" y="34" width="18" height="20" fill="#5ab1a5" />
      </svg>
    );
  if (key.includes("inclined") || key.includes("ramp"))
    return (
      <svg viewBox="0 0 80 60" aria-hidden="true">
        <path
          d="M9 51h62L71 13z"
          fill="#314b51"
          stroke="#8ba8aa"
          strokeWidth="2"
        />
        <rect
          x="41"
          y="23"
          width="22"
          height="17"
          rx="2"
          fill="#e47459"
          transform="rotate(-31 52 31)"
        />
      </svg>
    );
  if (key.includes("collision"))
    return (
      <svg viewBox="0 0 80 60" aria-hidden="true">
        <path d="M7 48h66" stroke="#9db2b4" strokeWidth="3" />
        <rect x="9" y="28" width="25" height="17" fill="#e47459" />
        <rect x="46" y="28" width="25" height="17" fill="#5ab1a5" />
        <path d="M36 36h8m-4-4 4 4-4 4" stroke="#f4cf7c" strokeWidth="2" />
      </svg>
    );
  if (key.includes("energy") || key.includes("power") || key.includes("work"))
    return (
      <svg viewBox="0 0 80 60" aria-hidden="true">
        <rect x="8" y="15" width="20" height="31" fill="#d5aa55" />
        <path d="M29 30h18" stroke="#e7d38c" strokeWidth="6" />
        <rect x="47" y="10" width="25" height="14" fill="#58aa83" />
        <rect x="47" y="28" width="18" height="10" fill="#5c8fd0" />
        <rect x="47" y="42" width="10" height="8" fill="#bb6252" />
      </svg>
    );
  if (
    key.includes("stress") ||
    key.includes("strain") ||
    key.includes("modulus") ||
    key.includes("extension")
  )
    return (
      <svg viewBox="0 0 80 60" aria-hidden="true">
        <path d="M12 49V9m0 40h57" stroke="#9bb2b5" strokeWidth="2" />
        <path
          d="M14 47L38 18 67 11"
          fill="none"
          stroke="#efb85f"
          strokeWidth="4"
        />
        <path d="M38 14v37" stroke="#e46f58" strokeDasharray="3 3" />
      </svg>
    );
  if (
    key.includes("circular") ||
    key.includes("rotating") ||
    key.includes("radius")
  )
    return (
      <svg viewBox="0 0 80 60" aria-hidden="true">
        <circle
          cx="40"
          cy="30"
          r="22"
          fill="none"
          stroke="#6b979b"
          strokeWidth="3"
          strokeDasharray="4 3"
        />
        <path d="M40 30L58 17" stroke="#efbf67" strokeWidth="3" />
        <circle cx="58" cy="17" r="7" fill="#e66e58" />
        <path d="M58 17l-8-12" stroke="#61c8b9" strokeWidth="3" />
      </svg>
    );
  if (
    key.includes("pressure") ||
    key.includes("fluid") ||
    key.includes("density")
  )
    return (
      <svg viewBox="0 0 80 60" aria-hidden="true">
        <path d="M18 8v43h44V8" fill="none" stroke="#b9cdcf" strokeWidth="3" />
        <path d="M20 25h40v24H20z" fill="#4e94b0" opacity=".85" />
        <path
          d="M27 31h27m-20 7h20m-12 7h12"
          stroke="#eaf7f6"
          strokeWidth="2"
        />
      </svg>
    );
  if (
    key.includes("ruler") ||
    key.includes("caliper") ||
    key.includes("measurement")
  )
    return (
      <svg viewBox="0 0 80 60" aria-hidden="true">
        <path
          d="M9 19h62v23H9z"
          fill="#e8ca76"
          stroke="#694f25"
          strokeWidth="2"
        />
        <path
          d="M17 19v11m9-11v7m9-7v11m9-11v7m9-7v11m9-11v7"
          stroke="#694f25"
          strokeWidth="2"
        />
      </svg>
    );
  if (
    key.includes("wave") ||
    key.includes("string") ||
    key.includes("slinky") ||
    key.includes("oscillator")
  )
    return (
      <svg viewBox="0 0 80 60" aria-hidden="true">
        <path
          d="M5 31c9-25 17-25 26 0s17 25 26 0 13-20 18-4"
          fill="none"
          stroke="#62cfc1"
          strokeWidth="5"
        />
        <path d="M5 48h70" stroke="#6e858b" strokeDasharray="4 3" />
      </svg>
    );
  if (
    key.includes("slit") ||
    key.includes("optics") ||
    key.includes("lens") ||
    key.includes("polarizer") ||
    key.includes("ray")
  )
    return (
      <svg viewBox="0 0 80 60" aria-hidden="true">
        <path d="M8 30h22m10 0h32" stroke="#f0be68" strokeWidth="4" />
        <path
          d="M35 8c-8 12-8 32 0 44 8-12 8-32 0-44z"
          fill="#5cb5c066"
          stroke="#82d4de"
          strokeWidth="2"
        />
        <path d="M42 30l28-14m-28 14 28 14" stroke="#ef795f" strokeWidth="2" />
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
