import type { GenerateResponse } from "./api";

// Shared display for a freshly generated podcast (used by the Generate and
// Preferences tabs).
export default function PodcastResult({ result }: { result: GenerateResponse }) {
  return (
    <section style={{ marginTop: "1.5rem" }}>
      <h2>{result.title || "Your podcast"}</h2>
      {result.source && (
        <p style={{ fontSize: "0.85rem", color: "#555", margin: 0 }}>
          Source:{" "}
          <a href={result.source} target="_blank" rel="noreferrer">
            {result.source}
          </a>
        </p>
      )}
      <audio controls src={result.audioUrl} style={{ width: "100%" }} />
      <p>
        <a href={result.audioUrl} download>
          Download mp3
        </a>
      </p>
      <details>
        <summary>Transcript ({result.lines.length} lines)</summary>
        <ol>
          {result.lines.map((line, i) => (
            <li key={i}>{line.text}</li>
          ))}
        </ol>
      </details>
    </section>
  );
}
