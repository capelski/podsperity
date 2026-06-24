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

Writes the audio to `output/sample.mp3`.

### Optional env vars

- `ELEVENLABS_VOICE_ID` — override the voice (defaults to the stock "George" voice).
- `OUTPUT_PATH` — override the output file path.
