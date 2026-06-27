import { randomUUID } from "node:crypto";
import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { initializeApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import OpenAI from "openai";
import corsLib from "cors";

initializeApp();

const openAiApiKey = defineSecret("OPENAI_API_KEY");
const elevenLabsApiKey = defineSecret("ELEVENLABS_API_KEY");

const cors = corsLib({ origin: true });

type DialogueInput = { voiceId: string; text: string };

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// A short conversation between two people. v3 understands inline audio tags
// like [laughs] or [curious] to make the delivery feel natural.
async function buildDialogue(
  url: string,
  voiceA: string,
  voiceB: string,
  openai: OpenAI,
): Promise<DialogueInput[]> {
  const pageResponse = await fetch(url);
  if (!pageResponse.ok) {
    throw new Error(
      `Failed to fetch ${url}: ${pageResponse.status} ${pageResponse.statusText}`,
    );
  }

  const pageHtml = await pageResponse.text();
  const pageText = htmlToText(pageHtml);

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL_ID ?? "gpt-4.1-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          'You extract the key content from web page text and write an engaging podcast dialogue. Return strict JSON with shape {"lines": []}. Each line should be a string of dialogue, alternating between two speakers. Include inline audio tags like [laughs] or [curious] at the beginning of the line to make the delivery feel natural.',
      },
      {
        role: "user",
        content: `URL: ${url}\n\nExtracted page text:\n${pageText}`,
      },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned no content while building dialogue.");
  }

  const parsed = JSON.parse(content) as { lines?: unknown };
  if (!Array.isArray(parsed.lines) || parsed.lines.length === 0) {
    throw new Error("OpenAI response did not include a valid 'lines' array.");
  }

  return parsed.lines
    .filter(
      (line): line is string =>
        typeof line === "string" && line.trim().length > 0,
    )
    .map((text, index) => ({
      voiceId: index % 2 === 0 ? voiceA : voiceB,
      text,
    }));
}

async function generate(url: string): Promise<{ audioUrl: string; lines: DialogueInput[] }> {
  // Two stock ElevenLabs voices available on every account: "George" and "Sarah".
  const voiceA = process.env.ELEVENLABS_VOICE_ID_1 ?? "JBFqnCBsd6RMkjVDRZzb";
  const voiceB = process.env.ELEVENLABS_VOICE_ID_2 ?? "EXAVITQu4vr4xnSDxMaL";
  const modelId = process.env.ELEVENLABS_MODEL_ID ?? "eleven_v3";

  const openai = new OpenAI({ apiKey: openAiApiKey.value() });
  const client = new ElevenLabsClient({ apiKey: elevenLabsApiKey.value() });

  const inputs = await buildDialogue(url, voiceA, voiceB, openai);

  const audioStream = await client.textToDialogue.convert({
    inputs,
    modelId,
    outputFormat: "mp3_44100_128",
  });

  // The SDK returns a stream of binary chunks; collect them into one buffer.
  const chunks: Buffer[] = [];
  for await (const chunk of audioStream) {
    chunks.push(Buffer.from(chunk));
  }
  const audio = Buffer.concat(chunks);

  // Upload to the default Storage bucket with a download token so the URL works
  // with the default (locked-down) Storage security rules.
  const id = randomUUID();
  const token = randomUUID();
  const bucket = getStorage().bucket();
  const objectPath = `podcasts/${id}/audio.mp3`;
  const file = bucket.file(objectPath);

  await file.save(audio, {
    metadata: {
      contentType: "audio/mpeg",
      metadata: { firebaseStorageDownloadTokens: token },
    },
  });

  // Also store the script alongside the audio for reference.
  await bucket.file(`podcasts/${id}/script.json`).save(
    JSON.stringify(inputs, null, 2),
    { metadata: { contentType: "application/json" } },
  );

  const audioUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(
    objectPath,
  )}?alt=media&token=${token}`;

  return { audioUrl, lines: inputs };
}

export const generatePodcast = onRequest(
  { secrets: [openAiApiKey, elevenLabsApiKey], timeoutSeconds: 300, memory: "512MiB", region: 'europe-west3' },
  (req, res) => {
    cors(req, res, async () => {
      if (req.method !== "POST") {
        res.status(405).json({ error: "Use POST." });
        return;
      }

      const url = (req.body?.url ?? "").toString().trim();
      if (!url) {
        res.status(400).json({ error: "Missing 'url' in request body." });
        return;
      }

      try {
        const result = await generate(url);
        res.status(200).json(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("Failed to generate podcast:", err);
        res.status(500).json({ error: message });
      }
    });
  },
);
