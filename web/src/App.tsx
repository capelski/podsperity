import { useCallback, useEffect, useState, type FormEvent } from "react";
import { GENERATE_PODCAST_URL, LIST_PODCASTS_URL } from "./config";

type GenerateResponse = {
  audioUrl: string;
  lines: { voiceId: string; text: string }[];
};

type PodcastSummary = {
  id: string;
  audioUrl: string;
  createdAt?: string;
};

type ListResponse = {
  podcasts: PodcastSummary[];
  nextPageToken: string | null;
};

const PAGE_SIZE = 5;

export default function App() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateResponse | null>(null);

  // Library list + pagination. `tokenStack` holds the pageToken used to fetch
  // each page we've visited (the first page uses `undefined`), so we can step
  // forwards with the cursor from the server and backwards through history.
  const [podcasts, setPodcasts] = useState<PodcastSummary[]>([]);
  const [tokenStack, setTokenStack] = useState<(string | undefined)[]>([
    undefined,
  ]);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const fetchPage = useCallback(async (pageToken?: string) => {
    const params = new URLSearchParams({ pageSize: String(PAGE_SIZE) });
    if (pageToken) {
      params.set("pageToken", pageToken);
    }
    const response = await fetch(`${LIST_PODCASTS_URL}?${params}`);
    const data = (await response.json()) as Partial<ListResponse> & {
      error?: string;
    };
    if (!response.ok) {
      throw new Error(data.error ?? `Request failed (${response.status}).`);
    }
    return {
      podcasts: data.podcasts ?? [],
      nextPageToken: data.nextPageToken ?? null,
    };
  }, []);

  // Load the first page, resetting pagination history. Used on mount and after
  // a new podcast is generated.
  const loadFirstPage = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const data = await fetchPage();
      setPodcasts(data.podcasts);
      setNextPageToken(data.nextPageToken);
      setTokenStack([undefined]);
    } catch (err) {
      setListError(err instanceof Error ? err.message : String(err));
    } finally {
      setListLoading(false);
    }
  }, [fetchPage]);

  useEffect(() => {
    void loadFirstPage();
  }, [loadFirstPage]);

  async function goToNextPage() {
    if (!nextPageToken) return;
    setListLoading(true);
    setListError(null);
    try {
      const data = await fetchPage(nextPageToken);
      setPodcasts(data.podcasts);
      setTokenStack((stack) => [...stack, nextPageToken]);
      setNextPageToken(data.nextPageToken);
    } catch (err) {
      setListError(err instanceof Error ? err.message : String(err));
    } finally {
      setListLoading(false);
    }
  }

  async function goToPrevPage() {
    if (tokenStack.length < 2) return;
    const prevStack = tokenStack.slice(0, -1);
    const prevToken = prevStack[prevStack.length - 1];
    setListLoading(true);
    setListError(null);
    try {
      const data = await fetchPage(prevToken);
      setPodcasts(data.podcasts);
      setTokenStack(prevStack);
      setNextPageToken(data.nextPageToken);
    } catch (err) {
      setListError(err instanceof Error ? err.message : String(err));
    } finally {
      setListLoading(false);
    }
  }

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
      // Show the freshly generated podcast in the library too.
      void loadFirstPage();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  const pageNumber = tokenStack.length;

  return (
    <main
      style={{
        maxWidth: 640,
        margin: "0 auto",
        padding: "2rem 1rem",
        fontFamily: "system-ui, sans-serif",
        lineHeight: 1.5,
      }}
    >
      <h1>Podsperity</h1>
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

      <section style={{ marginTop: "2.5rem" }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <h2 style={{ margin: 0 }}>Library</h2>
          <button
            type="button"
            onClick={() => void loadFirstPage()}
            disabled={listLoading}
          >
            Refresh
          </button>
        </div>

        {listError && (
          <p style={{ marginTop: "1rem", color: "crimson" }}>
            Error: {listError}
          </p>
        )}

        {listLoading && podcasts.length === 0 ? (
          <p style={{ marginTop: "1rem" }}>Loading podcasts…</p>
        ) : podcasts.length === 0 ? (
          <p style={{ marginTop: "1rem" }}>No podcasts yet.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, marginTop: "1rem" }}>
            {podcasts.map((podcast) => (
              <li
                key={podcast.id}
                style={{
                  padding: "0.75rem 0",
                  borderTop: "1px solid #ddd",
                }}
              >
                <div style={{ fontSize: "0.85rem", color: "#555" }}>
                  {podcast.createdAt
                    ? new Date(podcast.createdAt).toLocaleString()
                    : podcast.id}
                </div>
                <audio
                  controls
                  src={podcast.audioUrl}
                  style={{ width: "100%", marginTop: "0.25rem" }}
                />
              </li>
            ))}
          </ul>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginTop: "1rem",
          }}
        >
          <button
            type="button"
            onClick={() => void goToPrevPage()}
            disabled={listLoading || pageNumber <= 1}
          >
            ← Previous
          </button>
          <span style={{ fontSize: "0.9rem", color: "#555" }}>
            Page {pageNumber}
          </span>
          <button
            type="button"
            onClick={() => void goToNextPage()}
            disabled={listLoading || !nextPageToken}
          >
            Next →
          </button>
        </div>
      </section>
    </main>
  );
}
