import { FIND_ARTICLE_URL, GENERATE_PODCAST_URL } from "./config";
import { auth } from "./firebase";

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
  return data.url;
}

// Generate a podcast from an article URL.
export async function generatePodcast(url: string): Promise<GenerateResponse> {
  const response = await fetch(GENERATE_PODCAST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  const data = (await response.json()) as Partial<GenerateResponse> & {
    error?: string;
  };
  if (!response.ok) {
    throw new Error(data.error ?? `Request failed (${response.status}).`);
  }
  if (!data.audioUrl) {
    throw new Error("Response did not include an audio URL.");
  }
  return data as GenerateResponse;
}
