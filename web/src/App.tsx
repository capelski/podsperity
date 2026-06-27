import { useEffect, useState } from "react";
import Generate from "./Generate";
import Library, { INITIAL_LIBRARY_STATE, type LibraryState } from "./Library";
import Preferences from "./Preferences";

type Tab = "generate" | "library" | "preferences";

const TABS: { id: Tab; label: string }[] = [
  { id: "generate", label: "Generate" },
  { id: "library", label: "Library" },
  { id: "preferences", label: "Preferences" },
];

const TOPICS_STORAGE_KEY = "podsperity.topics";

function loadTopics(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(TOPICS_STORAGE_KEY) ?? "null");
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

export default function App() {
  const [tab, setTab] = useState<Tab>("generate");
  // The Library's fetched podcasts live here so they persist across tab
  // switches instead of being re-fetched every time the tab is opened.
  const [libraryState, setLibraryState] =
    useState<LibraryState>(INITIAL_LIBRARY_STATE);
  // Topic preferences persist across tab switches and reloads (localStorage).
  const [topics, setTopics] = useState<string[]>(loadTopics);

  useEffect(() => {
    localStorage.setItem(TOPICS_STORAGE_KEY, JSON.stringify(topics));
  }, [topics]);

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

      <nav
        style={{
          display: "flex",
          gap: 4,
          borderBottom: "1px solid #ddd",
          marginBottom: "1.5rem",
        }}
      >
        {TABS.map(({ id, label }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              style={{
                padding: "0.5rem 1rem",
                border: "none",
                borderBottom: active
                  ? "2px solid #333"
                  : "2px solid transparent",
                background: "none",
                cursor: "pointer",
                fontSize: "1rem",
                fontWeight: active ? 600 : 400,
                color: active ? "#111" : "#666",
              }}
            >
              {label}
            </button>
          );
        })}
      </nav>

      {tab === "generate" && <Generate />}
      {tab === "library" && (
        <Library state={libraryState} setState={setLibraryState} />
      )}
      {tab === "preferences" && (
        <Preferences selected={topics} setSelected={setTopics} />
      )}
    </main>
  );
}
