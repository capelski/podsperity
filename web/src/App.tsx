import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { useAuth, signInWithGoogle, signOutUser } from "./auth";
import { identify, track } from "./analytics";
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

  // Tie analytics events to the signed-in user (cleared on sign-out).
  useEffect(() => {
    identify(user?.uid ?? null);
  }, [user]);

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

  function selectTab(next: Tab) {
    if (next !== tab) {
      track("select_tab", { tab: next });
    }
    setTab(next);
  }

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
        maxWidth: 680,
        margin: "0 auto",
        padding: "2.5rem 1.25rem 4rem",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: "2rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            aria-hidden
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 38,
              height: 38,
              borderRadius: 12,
              background: "var(--accent)",
              fontSize: "1.15rem",
            }}
          >
            🎙
          </span>
          <h1 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 800 }}>
            Podsperity
          </h1>
        </div>
        {!authLoading &&
          (user ? (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span className="muted" style={{ fontSize: "0.85rem" }}>
                {user.displayName ?? user.email}
              </span>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  track("logout");
                  void signOutUser();
                }}
              >
                Sign out
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() =>
                void signInWithGoogle().then(() =>
                  track("login", { method: "google" }),
                )
              }
            >
              Sign in with Google
            </button>
          ))}
      </header>

      <nav style={{ display: "flex", gap: 6, marginBottom: "1.75rem" }}>
        {visibleTabs.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className="tab"
            data-active={tab === id}
            onClick={() => selectTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      <section className="card" style={{ padding: "1.75rem" }}>
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
      </section>
    </main>
  );
}
