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
      <p>Pick the topics you're interested in.</p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {TOPICS.map((topic) => {
          const active = selected.includes(topic);
          return (
            <button
              key={topic}
              type="button"
              onClick={() => toggle(topic)}
              aria-pressed={active}
              style={{
                padding: "0.4rem 0.9rem",
                borderRadius: 999,
                border: `1px solid ${active ? "#333" : "#ccc"}`,
                background: active ? "#333" : "transparent",
                color: active ? "#fff" : "#333",
                cursor: "pointer",
                fontSize: "0.9rem",
              }}
            >
              {topic}
            </button>
          );
        })}
      </div>

      <p style={{ marginTop: "1.5rem", fontSize: "0.85rem", color: "#555" }}>
        {saving
          ? "Saving…"
          : selected.length === 0
            ? "No topics selected yet."
            : `${selected.length} topic${selected.length === 1 ? "" : "s"} selected.`}
      </p>

      <button
        type="button"
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
