# Podsperity

Personal podcast generator. Paste an article URL and get a short two-voice
podcast about it, generated with OpenAI (dialogue) and ElevenLabs (audio).

This is a Firebase app:

- **`web/`** — React + TypeScript (Vite) frontend hosted on Firebase Hosting.
- **`functions/`** — Cloud Functions (Node + TypeScript) backend. The
  `generatePodcast` HTTP function fetches the URL, writes a dialogue with
  OpenAI, synthesizes it with ElevenLabs, uploads the mp3 to Firebase Storage,
  and returns a download URL.

## Prerequisites

- Node 20+ and the Firebase CLI: `npm install -g firebase-tools`
- A Firebase project on the **Blaze (pay-as-you-go) plan** — Cloud Functions
  need it to make outbound calls to OpenAI and ElevenLabs. Enable **Storage** in
  the Firebase console.
- Set your project id in [`.firebaserc`](.firebaserc) (replace `podsperity`).
- OpenAI and ElevenLabs API keys.

## Install

```bash
cd functions && npm install
cd ../web && npm install
```

## Local development (emulators)

```bash
# 1. Provide keys for the emulator
cp functions/.env.example functions/.env   # then fill in the two API keys

# 2. Start the emulators (build functions first)
npm --prefix functions run build
firebase emulators:start

# 3. In another terminal, start the Vite dev server
npm --prefix web run dev
```

The Vite dev server (default http://localhost:5173) calls the functions
emulator directly. If your project id differs from `podsperity`, set
`VITE_FIREBASE_PROJECT_ID` in `web/.env`.

## Deploy

```bash
# Set the production secrets once
firebase functions:secrets:set OPENAI_API_KEY
firebase functions:secrets:set ELEVENLABS_API_KEY

# Build the frontend and deploy everything
npm --prefix web run build
firebase deploy
```

In production the frontend calls the function through a Hosting rewrite at
`/api/generatePodcast`, so requests stay same-origin.

## Optional env vars (functions)

- `ELEVENLABS_VOICE_ID_1` / `ELEVENLABS_VOICE_ID_2` — override the two speaker
  voices (default to the stock "George" and "Sarah" voices).
- `ELEVENLABS_MODEL_ID` — override the ElevenLabs model (defaults to `eleven_v3`).
- `OPENAI_MODEL_ID` — override the OpenAI model (defaults to `gpt-4.1-mini`).
