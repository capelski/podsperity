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

// A short conversation between two people. v3 understands inline audio tags
// like [laughs] or [curious] to make the delivery feel natural.
function buildDialogue(voiceA: string, voiceB: string) {
  return [
    { voiceId: voiceA, text: "[curious] So, did the audio pipeline actually work?" },
    { voiceId: voiceB, text: "[confident] It did! If you can hear this, it's running end to end." },
    { voiceId: voiceA, text: "[laughs] No way. Two voices and everything?" },
    { voiceId: voiceB, text: "Two voices, one request. That's the v3 dialogue model for you." },
    { voiceId: voiceA, text: "[impressed] Nice. Sounds like a real podcast already." },
  ];
}

async function main(): Promise<void> {
  // Two stock ElevenLabs voices available on every account: "George" and "Sarah".
  const voiceA = process.env.ELEVENLABS_VOICE_ID_1 ?? "JBFqnCBsd6RMkjVDRZzb";
  const voiceB = process.env.ELEVENLABS_VOICE_ID_2 ?? "EXAVITQu4vr4xnSDxMaL";
  const outputPath = resolve(process.env.OUTPUT_PATH ?? "output/sample.mp3");
  const modelId = process.env.ELEVENLABS_MODEL_ID ?? "eleven_v3";

  const client = new ElevenLabsClient({ apiKey });

  const inputs = buildDialogue(voiceA, voiceB);

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

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, audio);

  console.log(`Wrote ${audio.length} bytes to ${outputPath}`);
}

main().catch((err) => {
  console.error("Failed to generate audio:", err);
  process.exit(1);
});
