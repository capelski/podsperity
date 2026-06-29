import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { useAuth, signInWithGoogle, signOutUser } from "./auth";
import Generate from "./Generate";
import Library, { INITIAL_LIBRARY_STATE, type LibraryState } from "./Library";
import Preferences from "./Preferences";

type Tab = "url-to-podcast" | "library" | "preferences";

const TABS: { id: Tab; label: string }[] = [
  { id: "library", label: "Library" },
  { id: "preferences", label: "Preferences" },
  { id: "url-to-podcast", label: "URL to Podcast" },
];

export default function App() {
  const { user, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<Tab>("library");
  // The Library's fetched podcasts live here so they persist across tab
  // switches instead of being re-fetched every time the tab is opened.
  const [libraryState, setLibraryState] =
    useState<LibraryState>(INITIAL_LIBRARY_STATE);
  // Topic preferences are stored per-user in Firestore (users/{uid}.topics).
  const [topics, setTopics] = useState<string[]>([]);
  const [savingTopics, setSavingTopics] = useState(false);

  // Load the signed-in user's saved topics; clear them on sign-out.
  useEffect(() => {
    if (!user) {
      setTopics([]);
      return;
    }
    let cancelled = false;
    getDoc(doc(db, "users", user.uid))
      .then((snapshot) => {
        if (cancelled) return;
        const data = snapshot.data();
        setTopics(Array.isArray(data?.topics) ? (data!.topics as string[]) : []);
      })
      .catch((err) => console.error("Failed to load preferences:", err));
    return () => {
      cancelled = true;
    };
  }, [user]);

  // The Preferences tab requires sign-in; leave it if the user signs out.
  useEffect(() => {
    if (!user && tab === "preferences") {
      setTab("library");
    }
  }, [user, tab]);

  const visibleTabs = TABS.filter(({ id }) => id !== "preferences" || user);

  async function handleTopicsChange(next: string[]) {
    setTopics(next);
    if (!user) return;
    setSavingTopics(true);
    try {
      await setDoc(doc(db, "users", user.uid), { topics: next }, { merge: true });
    } catch (err) {
      console.error("Failed to save preferences:", err);
    } finally {
      setSavingTopics(false);
    }
  }

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
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <h1 style={{ margin: 0 }}>Podsperity</h1>
        {!authLoading &&
          (user ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: "0.85rem", color: "#555" }}>
                {user.displayName ?? user.email}
              </span>
              <button type="button" onClick={() => void signOutUser()}>
                Sign out
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => void signInWithGoogle()}>
              Sign in with Google
            </button>
          ))}
      </header>

      <nav
        style={{
          display: "flex",
          gap: 4,
          borderBottom: "1px solid #ddd",
          margin: "1.5rem 0",
        }}
      >
        {visibleTabs.map(({ id, label }) => {
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

      {tab === "url-to-podcast" && <Generate />}
      {tab === "library" && (
        <Library state={libraryState} setState={setLibraryState} />
      )}
      {tab === "preferences" && user && (
        <Preferences
          selected={topics}
          onChange={handleTopicsChange}
          saving={savingTopics}
        />
      )}
    </main>
  );
}
