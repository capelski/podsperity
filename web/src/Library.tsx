import { useCallback, useEffect, useState } from "react";
import { LIST_PODCASTS_URL } from "./config";

export type PodcastSummary = {
  id: string;
  audioUrl: string;
  title?: string;
  source?: string;
  createdAt?: string;
};

// The fetched podcasts + pagination cursor. Lifted into App so it survives
// switching away from and back to the Library tab. `tokenStack` holds the
// pageToken used to fetch each page we've visited (the first page uses
// `undefined`), so we can step forwards with the server's cursor and backwards
// through history. `loaded` guards the one-time initial fetch.
export type LibraryState = {
  podcasts: PodcastSummary[];
  tokenStack: (string | undefined)[];
  nextPageToken: string | null;
  loaded: boolean;
};

export const INITIAL_LIBRARY_STATE: LibraryState = {
  podcasts: [],
  tokenStack: [undefined],
  nextPageToken: null,
  loaded: false,
};

type ListResponse = {
  podcasts: PodcastSummary[];
  nextPageToken: string | null;
};

const PAGE_SIZE = 5;

type Props = {
  state: LibraryState;
  setState: React.Dispatch<React.SetStateAction<LibraryState>>;
};

export default function Library({ state, setState }: Props) {
  // Transient UI state stays local to the tab; the data lives in App.
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
      setState({
        podcasts: data.podcasts,
        nextPageToken: data.nextPageToken,
        tokenStack: [undefined],
        loaded: true,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [fetchPage, setState]);

  // Fetch once on first open; later visits reuse the lifted state.
  useEffect(() => {
    if (!state.loaded) {
      void loadFirstPage();
    }
  }, [state.loaded, loadFirstPage]);

  async function goToNextPage() {
    if (!state.nextPageToken) return;
    const token = state.nextPageToken;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPage(token);
      setState((prev) => ({
        ...prev,
        podcasts: data.podcasts,
        tokenStack: [...prev.tokenStack, token],
        nextPageToken: data.nextPageToken,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function goToPrevPage() {
    if (state.tokenStack.length < 2) return;
    const prevStack = state.tokenStack.slice(0, -1);
    const prevToken = prevStack[prevStack.length - 1];
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPage(prevToken);
      setState((prev) => ({
        ...prev,
        podcasts: data.podcasts,
        tokenStack: prevStack,
        nextPageToken: data.nextPageToken,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  const { podcasts, tokenStack, nextPageToken } = state;
  const pageNumber = tokenStack.length;

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <div>
          <h2 style={{ marginBottom: "0.15rem" }}>Library</h2>
          <p className="muted" style={{ margin: 0, fontSize: "0.9rem" }}>
            Podcasts you've already generated.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => void loadFirstPage()}
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      {error && (
        <p className="error" style={{ marginTop: "1rem" }}>
          Error: {error}
        </p>
      )}

      {loading && podcasts.length === 0 ? (
        <p className="muted" style={{ marginTop: "1rem" }}>
          Loading podcasts…
        </p>
      ) : podcasts.length === 0 ? (
        <p className="muted" style={{ marginTop: "1rem" }}>
          No podcasts yet.
        </p>
      ) : (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            marginTop: "1.25rem",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {podcasts.map((podcast) => (
            <li
              key={podcast.id}
              style={{
                padding: "1rem 1.1rem",
                border: "1px solid var(--line)",
                borderRadius: "var(--radius)",
                background: "var(--surface-muted)",
              }}
            >
              <div style={{ fontWeight: 600, fontSize: "1.02rem" }}>
                {podcast.title || "Untitled podcast"}
              </div>
              <div className="muted" style={{ fontSize: "0.82rem" }}>
                {podcast.createdAt
                  ? new Date(podcast.createdAt).toLocaleString()
                  : podcast.id}
              </div>
              {podcast.source && (
                <div
                  style={{
                    fontSize: "0.82rem",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  <a href={podcast.source} target="_blank" rel="noreferrer">
                    {podcast.source}
                  </a>
                </div>
              )}
              <audio
                controls
                src={podcast.audioUrl}
                style={{ width: "100%", marginTop: "0.6rem" }}
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
          marginTop: "1.5rem",
        }}
      >
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => void goToPrevPage()}
          disabled={loading || pageNumber <= 1}
        >
          ← Previous
        </button>
        <span className="muted" style={{ fontSize: "0.9rem" }}>
          Page {pageNumber}
        </span>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => void goToNextPage()}
          disabled={loading || !nextPageToken}
        >
          Next →
        </button>
      </div>
    </>
  );
}
