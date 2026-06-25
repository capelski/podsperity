import "dotenv/config";
import { writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import OpenAI from "openai";

const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) {
  console.error(
    "Missing ELEVENLABS_API_KEY. Set it in your environment or a .env file.",
  );
  process.exit(1);
}

const openAiApiKey = process.env.OPENAI_API_KEY;
if (!openAiApiKey) {
  console.error("Missing OPENAI_API_KEY. Set it in your environment or a .env file.");
  process.exit(1);
}

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
async function buildDialogue(url: string, voiceA: string, voiceB: string): Promise<DialogueInput[]> {
  const pageResponse = await fetch(url);
  if (!pageResponse.ok) {
    throw new Error(`Failed to fetch ${url}: ${pageResponse.status} ${pageResponse.statusText}`);
  }

  const pageHtml = await pageResponse.text();
  const pageText = htmlToText(pageHtml);
  const openai = new OpenAI({ apiKey: openAiApiKey });

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL_ID ?? "gpt-4.1-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You extract the key content from web page text and write an engaging podcast dialogue. Return strict JSON with shape {\"lines\": []}. Each line should be a string of dialogue, alternating between two speakers. Include inline audio tags like [laughs] or [curious] at the beginning of the line to make the delivery feel natural.",
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
    .filter((line): line is string => typeof line === "string" && line.trim().length > 0)
    .map((text, index) => ({
      voiceId: index % 2 === 0 ? voiceA : voiceB,
      text,
    }));
}

async function main(sourceUrl: string): Promise<void> {
  // Two stock ElevenLabs voices available on every account: "George" and "Sarah".
  const voiceA = process.env.ELEVENLABS_VOICE_ID_1 ?? "JBFqnCBsd6RMkjVDRZzb";
  const voiceB = process.env.ELEVENLABS_VOICE_ID_2 ?? "EXAVITQu4vr4xnSDxMaL";
  const outputFolder = resolve(process.env.OUTPUT_FOLDER ?? "output");
  const modelId = process.env.ELEVENLABS_MODEL_ID ?? "eleven_v3";

  const client = new ElevenLabsClient({ apiKey });
  await mkdir(outputFolder, { recursive: true });

  console.log(`Building dialogue from ${sourceUrl} with OpenAI...`);
  const inputs = await buildDialogue(sourceUrl, voiceA, voiceB);

  const scriptPath = resolve(outputFolder, "script.json");
  await writeFile(scriptPath, JSON.stringify(inputs, null, 2), "utf8");
  console.log(`Wrote script JSON to ${scriptPath}`);

  console.log(`Synthesizing a dialogue with ${modelId} (voices ${voiceA}, ${voiceB})...`);
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

  const audioPath = resolve(outputFolder, "audio.mp3");
  await writeFile(audioPath, audio);

  console.log(`Wrote ${audio.length} bytes to ${audioPath}`);
}

main('https://www.bbc.com/news/live/c621z18wznet').catch((err) => {
  console.error("Failed to generate audio:", err);
  process.exit(1);
});
