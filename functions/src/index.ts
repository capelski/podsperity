// Entry point: surface each Cloud Function so the Firebase runtime can
// discover and deploy them. The implementations live in their own files.
export { generatePodcast } from "./generatePodcast";
export { listPodcasts } from "./listPodcasts";
export { findArticle } from "./findArticle";
