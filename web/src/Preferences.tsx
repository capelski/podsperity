import { useState } from "react";
import { findArticleUrl, generatePodcast, type GenerateResponse } from "./api";
import PodcastResult from "./PodcastResult";

// The topics a user can express interest in.
export const TOPICS = [
  "Technology",
  "Science",
  "Business",
  "Finance",
  "Politics",
  "World News",
  "Health",
  "Environment",
  "Sports",
  "Entertainment",
  "Culture",
  "Education",
  "Travel",
  "Food",
  "Gaming",
] as const;

type Props = {
  selected: string[];
  onChange: (next: string[]) => void;
  saving?: boolean;
};

export default function Preferences({ selected, onChange, saving }: Props) {
  // Status of the one-click "generate from my topics" flow.
  const [status, setStatus] = useState<null | "finding" | "generating">(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateResponse | null>(null);

  function toggle(topic: string) {
    onChange(
      selected.includes(topic)
        ? selected.filter((t) => t !== topic)
        : [...selected, topic],
    );
  }

  // Find an article matching the saved topics and generate a podcast from it,
  // all in one step — no need to visit the Generate tab.
  async function handleGenerate() {
    setError(null);
    setResult(null);
    try {
      setStatus("finding");
      const url = await findArticleUrl();
      setStatus("generating");
      setResult(await generatePodcast(url));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setStatus(null);
    }
  }

  return (
    <>
      <h2>Preferences</h2>
      <p style={{ marginTop: 0 }}>Pick the topics you're interested in.</p>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          marginTop: "1.25rem",
        }}
      >
        {TOPICS.map((topic) => (
          <button
            key={topic}
            type="button"
            className="pill"
            onClick={() => toggle(topic)}
            aria-pressed={selected.includes(topic)}
          >
            {topic}
          </button>
        ))}
      </div>

      <p className="muted" style={{ marginTop: "1.5rem", fontSize: "0.85rem" }}>
        {saving
          ? "Saving…"
          : selected.length === 0
            ? "No topics selected yet."
            : `${selected.length} topic${selected.length === 1 ? "" : "s"} selected.`}
      </p>

      <button
        type="button"
        className="btn btn-primary"
        onClick={() => void handleGenerate()}
        disabled={selected.length === 0 || status !== null}
      >
        {status === "finding"
          ? "Finding an article…"
          : status === "generating"
            ? "Generating…"
            : "Generate a podcast from my topics"}
      </button>

      {status === "generating" && (
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
