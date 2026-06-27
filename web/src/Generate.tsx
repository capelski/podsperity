import { useState, type FormEvent } from "react";
import { GENERATE_PODCAST_URL } from "./config";

type GenerateResponse = {
  audioUrl: string;
  lines: { voiceId: string; text: string }[];
};

export default function Generate() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateResponse | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);

    try {
      const response = await fetch(GENERATE_PODCAST_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = (await response.json()) as Partial<GenerateResponse> & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? `Request failed (${response.status}).`);
      }
      if (!data.audioUrl) {
        throw new Error("Response did not include an audio URL.");
      }

      setResult(data as GenerateResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <p>Paste an article URL and generate a short two-voice podcast about it.</p>

      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8 }}>
        <input
          type="url"
          required
          placeholder="https://example.com/article"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={loading}
          style={{ flex: 1, padding: "0.5rem" }}
        />
        <button type="submit" disabled={loading || !url}>
          {loading ? "Generating…" : "Generate"}
        </button>
      </form>

      {loading && (
        <p style={{ marginTop: "1rem" }}>
          Generating your podcast — this can take a minute…
        </p>
      )}

      {error && (
        <p style={{ marginTop: "1rem", color: "crimson" }}>Error: {error}</p>
      )}

      {result && (
        <section style={{ marginTop: "1.5rem" }}>
          <h2>Your podcast</h2>
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
      )}
    </>
  );
}
