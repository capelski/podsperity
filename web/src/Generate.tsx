import { useState, type FormEvent } from "react";
import { generatePodcast, type GenerateResponse } from "./api";
import PodcastResult from "./PodcastResult";

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
      setResult(await generatePodcast(url));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h2>URL to Podcast</h2>
      <p style={{ marginTop: 0 }}>
        Paste an article URL and generate a short two-voice podcast about it.
      </p>

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", gap: 8, marginTop: "1.25rem" }}
      >
        <input
          type="url"
          required
          className="input"
          placeholder="https://example.com/article"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={loading}
          style={{ flex: 1 }}
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading || !url}
        >
          {loading ? "Generating…" : "Generate"}
        </button>
      </form>

      {loading && (
        <p className="muted" style={{ marginTop: "1rem" }}>
          Generating your podcast — this can take a minute…
        </p>
      )}

      {error && (
        <p className="error" style={{ marginTop: "1rem" }}>
          Error: {error}
        </p>
      )}

      {result && <PodcastResult result={result} />}
    </>
  );
}
