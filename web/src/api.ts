import { FIND_ARTICLE_URL, GENERATE_PODCAST_URL } from "./config";
import { auth } from "./firebase";
import { hostnameOf, track } from "./analytics";

// How a generation was kicked off, recorded as an analytics dimension.
export type GenerateMethod = "url" | "topics";

export type GenerateResponse = {
  audioUrl: string;
  title: string;
  source: string;
  lines: { voiceId: string; text: string }[];
};

// Find a news article URL matching the signed-in user's saved topics.
export async function findArticleUrl(): Promise<string> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("Sign in to use your saved topics.");
  }
  const token = await currentUser.getIdToken();
  const response = await fetch(FIND_ARTICLE_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = (await response.json()) as { url?: string; error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? `Request failed (${response.status}).`);
  }
  if (!data.url) {
    throw new Error("No article URL was returned.");
  }
  track("find_article", { source: hostnameOf(data.url) });
  return data.url;
}

// Generate a podcast from an article URL. `method` records how the flow was
// started (pasted URL vs. saved topics) for analytics.
export async function generatePodcast(
  url: string,
  method: GenerateMethod = "url",
): Promise<GenerateResponse> {
  const response = await fetch(GENERATE_PODCAST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  const data = (await response.json()) as Partial<GenerateResponse> & {
    error?: string;
  };
  if (!response.ok) {
    track("generate_podcast_error", { method, source: hostnameOf(url) });
    throw new Error(data.error ?? `Request failed (${response.status}).`);
  }
  if (!data.audioUrl) {
    track("generate_podcast_error", { method, source: hostnameOf(url) });
    throw new Error("Response did not include an audio URL.");
  }
  track("generate_podcast", {
    method,
    source: hostnameOf(url),
    title: data.title,
  });
  return data as GenerateResponse;
}
