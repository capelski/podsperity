# Podsperity

Personal podcasts generator based on user interests

## Setup

```bash
npm install
cp .env.example .env   # then add your ELEVENLABS_API_KEY
```

## Run

```bash
npm run tts
```

Generates a short two-person conversation between two people and writes the audio to `output/sample.mp3`.

### Optional env vars

- `ELEVENLABS_VOICE_ID_1` / `ELEVENLABS_VOICE_ID_2` — override the two speaker voices (default to the stock "George" and "Sarah" voices).
- `ELEVENLABS_MODEL_ID` — override the model (defaults to `eleven_v3`).
- `OUTPUT_FOLDER` — override the output folder path.
