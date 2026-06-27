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
  function toggle(topic: string) {
    onChange(
      selected.includes(topic)
        ? selected.filter((t) => t !== topic)
        : [...selected, topic],
    );
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
    </>
  );
}
