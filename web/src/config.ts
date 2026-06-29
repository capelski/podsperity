// Where the generatePodcast Cloud Function lives.
//
// - In production the request goes through a Firebase Hosting rewrite
//   (/api/generatePodcast -> the function), which keeps it same-origin and
//   avoids CORS.
// - In local dev (vite) we call the functions emulator directly. Override the
//   project id with VITE_FIREBASE_PROJECT_ID if yours differs.
const PROJECT_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID;
const REGION = "europe-west3";

export const GENERATE_PODCAST_URL = import.meta.env.DEV
  ? `http://127.0.0.1:5001/${PROJECT_ID}/${REGION}/generatePodcast`
  : "/api/generatePodcast";

export const LIST_PODCASTS_URL = import.meta.env.DEV
  ? `http://127.0.0.1:5001/${PROJECT_ID}/${REGION}/listPodcasts`
  : "/api/listPodcasts";

export const FIND_ARTICLE_URL = import.meta.env.DEV
  ? `http://127.0.0.1:5001/${PROJECT_ID}/${REGION}/findArticle`
  : "/api/findArticle";
