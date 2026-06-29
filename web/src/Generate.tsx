import { useState, type FormEvent } from "react";
import { useAuth } from "./auth";
import { findArticleUrl, generatePodcast, type GenerateResponse } from "./api";
import PodcastResult from "./PodcastResult";

export default function Generate() {
  const { user } = useAuth();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateResponse | null>(null);

  // Ask the backend for a news article URL matching the user's saved topics
  // and drop it into the input, ready to generate.
  async function handleSuggest() {
    setError(null);
    setSuggesting(true);
    try {
      setUrl(await findArticleUrl());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSuggesting(false);
    }
  }

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

      {user && (
        <p style={{ marginTop: "0.5rem" }}>
          <button
            type="button"
            onClick={() => void handleSuggest()}
            disabled={loading || suggesting}
          >
            {suggesting ? "Finding an article…" : "Suggest from my topics"}
          </button>
        </p>
      )}

      {loading && (
        <p style={{ marginTop: "1rem" }}>
          Generating your podcast — this can take a minute…
        </p>
      )}

      {error && (
        <p style={{ marginTop: "1rem", color: "crimson" }}>Error: {error}</p>
      )}

      {result && <PodcastResult result={result} />}
    </>
  );
}
