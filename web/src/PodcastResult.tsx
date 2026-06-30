import type { GenerateResponse } from "./api";

// Shared display for a freshly generated podcast (used by the Generate and
// Preferences tabs).
export default function PodcastResult({ result }: { result: GenerateResponse }) {
  return (
    <section
      style={{
        marginTop: "1.75rem",
        paddingTop: "1.5rem",
        borderTop: "1px solid var(--line)",
      }}
    >
      <h2>{result.title || "Your podcast"}</h2>
      {result.source && (
        <p className="muted" style={{ fontSize: "0.85rem", margin: 0 }}>
          Source:{" "}
          <a href={result.source} target="_blank" rel="noreferrer">
            {result.source}
          </a>
        </p>
      )}
      <audio
        controls
        src={result.audioUrl}
        style={{ width: "100%", marginTop: "0.75rem" }}
      />
      <p style={{ marginTop: "0.75rem" }}>
        <a
          href={result.audioUrl}
          download
          className="btn btn-ghost"
          style={{ textDecoration: "none" }}
        >
          ↓ Download mp3
        </a>
      </p>
      <details style={{ marginTop: "0.5rem" }}>
        <summary style={{ cursor: "pointer", color: "var(--ink-soft)" }}>
          Transcript ({result.lines.length} lines)
        </summary>
        <ol style={{ color: "var(--ink-soft)", lineHeight: 1.7 }}>
          {result.lines.map((line, i) => (
            <li key={i}>{line.text}</li>
          ))}
        </ol>
      </details>
    </section>
  );
}
