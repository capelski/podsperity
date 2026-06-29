import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import OpenAI from "openai";
import { cors } from "./shared";

const openAiApiKey = defineSecret("OPENAI_API_KEY");

async function getUserTopics(uid: string): Promise<string[]> {
  const snapshot = await getFirestore().collection("users").doc(uid).get();
  const topics = snapshot.data()?.topics;
  return Array.isArray(topics)
    ? topics.filter(
        (t): t is string => typeof t === "string" && t.trim().length > 0,
      )
    : [];
}

// The shape we care about from the Responses API result. The web search tool
// attaches the sources it used as `url_citation` annotations, which is where
// the real article URL comes from.
type ResponseShape = {
  output?: Array<{
    type?: string;
    content?: Array<{ annotations?: Array<{ type?: string; url?: string }> }>;
  }>;
  output_text?: string;
};

// Returning a genuine URL (not a hallucinated one) is the whole point, so we
// prefer the search tool's citations and only fall back to scraping a URL out
// of the model's text.
function extractUrl(response: ResponseShape): string | undefined {
  for (const item of response.output ?? []) {
    if (item.type !== "message") continue;
    for (const part of item.content ?? []) {
      for (const annotation of part.annotations ?? []) {
        if (annotation.type === "url_citation" && annotation.url) {
          return annotation.url;
        }
      }
    }
  }
  return response.output_text?.match(/https?:\/\/[^\s")]+/)?.[0];
}

async function searchArticleUrl(
  topics: string[],
  openai: OpenAI,
): Promise<string> {
  const response = await openai.responses.create({
    model: process.env.OPENAI_MODEL_ID ?? "gpt-5.4-mini",
    tools: [{ type: "web_search_preview" }],
    input:
      "Find one recent news article related to any of these topics: " +
      `${topics.join(", ")}. ` +
      "Pick a publicly readable article from a reputable news site and reply with only its URL.",
  });

  const url = extractUrl(response as ResponseShape);
  if (!url) {
    throw new Error("Could not find a news article for your topics.");
  }
  return url;
}

export const findArticle = onRequest(
  { secrets: [openAiApiKey], region: "europe-west3" },
  (req, res) => {
    cors(req, res, async () => {
      if (req.method !== "POST") {
        res.status(405).json({ error: "Use POST." });
        return;
      }

      const match = (req.headers.authorization ?? "").match(/^Bearer (.+)$/);
      if (!match) {
        res.status(401).json({ error: "Missing Authorization bearer token." });
        return;
      }

      try {
        const decoded = await getAuth().verifyIdToken(match[1]);
        const topics = await getUserTopics(decoded.uid);
        if (topics.length === 0) {
          res
            .status(400)
            .json({ error: "No saved topics. Pick some in Preferences first." });
          return;
        }

        const openai = new OpenAI({ apiKey: openAiApiKey.value() });
        const url = await searchArticleUrl(topics, openai);
        res.status(200).json({ url, topics });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("Failed to find article:", err);
        res.status(500).json({ error: message });
      }
    });
  },
);
