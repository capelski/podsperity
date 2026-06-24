import "dotenv/config";
import { writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) {
  console.error(
    "Missing ELEVENLABS_API_KEY. Set it in your environment or a .env file.",
  );
  process.exit(1);
}

const SAMPLE_TEXT = "If you can hear this, the audio pipeline works end to end";

async function main(): Promise<void> {
  // Defaults to "George", a stock ElevenLabs voice available on every account
  const voiceId = process.env.ELEVENLABS_VOICE_ID ?? "JBFqnCBsd6RMkjVDRZzb";
  const outputPath = resolve(process.env.OUTPUT_PATH ?? "output/sample.mp3");
  const modelId = process.env.ELEVENLABS_MODEL_ID ?? "eleven_multilingual_v2";

  const client = new ElevenLabsClient({ apiKey });

  console.log(`Synthesizing speech with voice ${voiceId}...`);
  const audioStream = await client.textToSpeech.convert(voiceId, {
    text: SAMPLE_TEXT,
    modelId,
    outputFormat: "mp3_44100_128",
  });

  // The SDK returns a stream of binary chunks; collect them into one buffer.
  const chunks: Buffer[] = [];
  for await (const chunk of audioStream) {
    chunks.push(Buffer.from(chunk));
  }
  const audio = Buffer.concat(chunks);

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, audio);

  console.log(`Wrote ${audio.length} bytes to ${outputPath}`);
}

main().catch((err) => {
  console.error("Failed to generate audio:", err);
  process.exit(1);
});
