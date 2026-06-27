import { useCallback, useEffect, useState } from "react";
import { LIST_PODCASTS_URL } from "./config";

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

export default function Library() {
  // Library list + pagination. `tokenStack` holds the pageToken used to fetch
  // each page we've visited (the first page uses `undefined`), so we can step
  // forwards with the cursor from the server and backwards through history.
  const [podcasts, setPodcasts] = useState<PodcastSummary[]>([]);
  const [tokenStack, setTokenStack] = useState<(string | undefined)[]>([
    undefined,
  ]);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Load the first page, resetting pagination history.
  const loadFirstPage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPage();
      setPodcasts(data.podcasts);
      setNextPageToken(data.nextPageToken);
      setTokenStack([undefined]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [fetchPage]);

  useEffect(() => {
    void loadFirstPage();
  }, [loadFirstPage]);

  async function goToNextPage() {
    if (!nextPageToken) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPage(nextPageToken);
      setPodcasts(data.podcasts);
      setTokenStack((stack) => [...stack, nextPageToken]);
      setNextPageToken(data.nextPageToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function goToPrevPage() {
    if (tokenStack.length < 2) return;
    const prevStack = tokenStack.slice(0, -1);
    const prevToken = prevStack[prevStack.length - 1];
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPage(prevToken);
      setPodcasts(data.podcasts);
      setTokenStack(prevStack);
      setNextPageToken(data.nextPageToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  const pageNumber = tokenStack.length;

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <p style={{ margin: 0 }}>Podcasts you've already generated.</p>
        <button
          type="button"
          onClick={() => void loadFirstPage()}
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      {error && (
        <p style={{ marginTop: "1rem", color: "crimson" }}>Error: {error}</p>
      )}

      {loading && podcasts.length === 0 ? (
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
          disabled={loading || pageNumber <= 1}
        >
          ← Previous
        </button>
        <span style={{ fontSize: "0.9rem", color: "#555" }}>
          Page {pageNumber}
        </span>
        <button
          type="button"
          onClick={() => void goToNextPage()}
          disabled={loading || !nextPageToken}
        >
          Next →
        </button>
      </div>
    </>
  );
}
