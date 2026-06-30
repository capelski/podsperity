import {
  getAnalytics,
  isSupported,
  logEvent,
  setUserId,
  type Analytics,
} from "firebase/analytics";
import { app } from "./firebase";

// Google Analytics (GA4 via Firebase) lives behind a thin wrapper so call
// sites stay clean and tracking degrades to a no-op wherever Analytics isn't
// available — server-side rendering, browsers that block it, or a project with
// no measurementId configured.

type EventParams = Record<string, string | number | boolean | undefined>;

let analytics: Analytics | null = null;

// Analytics support is resolved asynchronously; events fired before it settles
// are queued against this promise so none are dropped during startup.
const ready: Promise<void> = isSupported()
  .then((supported) => {
    if (supported && import.meta.env.VITE_FIREBASE_MEASUREMENT_ID) {
      analytics = getAnalytics(app);
    }
  })
  .catch(() => {
    /* Analytics unavailable — tracking becomes a no-op. */
  });

/** Log a GA4 event. Safe to call anywhere; no-ops when Analytics is disabled. */
export function track(eventName: string, params?: EventParams) {
  void ready.then(() => {
    if (analytics) {
      logEvent(analytics, eventName, params);
    }
  });
}

/** Associate subsequent events with a signed-in user (or clear on sign-out). */
export function identify(userId: string | null) {
  void ready.then(() => {
    if (analytics) {
      setUserId(analytics, userId);
    }
  });
}

/** Best-effort hostname for an article URL, used as an event dimension. */
export function hostnameOf(url: string): string | undefined {
  try {
    return new URL(url).hostname;
  } catch {
    return undefined;
  }
}
