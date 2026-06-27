import { onRequest } from "firebase-functions/v2/https";
import { getStorage } from "firebase-admin/storage";
import { cors } from "./shared";

type PodcastSummary = {
  id: string;
  audioUrl: string;
  title?: string;
  createdAt?: string;
};


// List the podcasts already stored in the bucket, one "page" at a time.
//
// Each podcast lives in its own folder (podcasts/<id>/), so we list with a "/"
// delimiter to get the folder prefixes rather than every individual file, and
// rely on Storage's own pageToken cursor for pagination.
async function fetchPodcastPage(
  pageSize: number,
  pageToken?: string,
): Promise<{ podcasts: PodcastSummary[]; nextPageToken: string | null }> {
  const bucket = getStorage().bucket();

  const [, nextQuery, apiResponse] = (await bucket.getFiles({
    prefix: "podcasts/",
    delimiter: "/",
    autoPaginate: false,
    maxResults: pageSize,
    pageToken,
  })) as [unknown, { pageToken?: string } | null, { prefixes?: string[] }];

  const prefixes = apiResponse?.prefixes ?? [];

  const podcasts = (
    await Promise.all(
      prefixes.map(async (prefix): Promise<PodcastSummary | null> => {
        const id = prefix.slice("podcasts/".length).replace(/\/$/, "");
        const audioPath = `podcasts/${id}/audio.mp3`;
        try {
          const [metadata] = await bucket.file(audioPath).getMetadata();
          const tokens = metadata.metadata?.firebaseStorageDownloadTokens;
          const token =
            typeof tokens === "string" ? tokens.split(",")[0] : undefined;
          if (!token) {
            return null;
          }
          const audioUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(
            audioPath,
          )}?alt=media&token=${token}`;
          const rawTitle = metadata.metadata?.title;
          const title = typeof rawTitle === "string" ? rawTitle : undefined;
          return { id, audioUrl, title, createdAt: metadata.timeCreated };
        } catch {
          // Folder without a readable audio.mp3 (e.g. a half-written upload).
          return null;
        }
      }),
    )
  ).filter((p): p is PodcastSummary => p !== null);

  // Newest first within the page. Pages themselves are ordered by id (the
  // order Storage lists folders), which is what the pageToken cursor tracks.
  podcasts.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));

  return { podcasts, nextPageToken: nextQuery?.pageToken ?? null };
}

export const listPodcasts = onRequest(
  { region: "europe-west3" },
  (req, res) => {
    cors(req, res, async () => {
      if (req.method !== "GET") {
        res.status(405).json({ error: "Use GET." });
        return;
      }

      const requestedSize = Number.parseInt(
        (req.query.pageSize ?? "").toString(),
        10,
      );
      const pageSize =
        Number.isFinite(requestedSize) && requestedSize > 0
          ? Math.min(requestedSize, 50)
          : 10;
      const pageToken = (req.query.pageToken ?? "").toString() || undefined;

      try {
        const result = await fetchPodcastPage(pageSize, pageToken);
        res.status(200).json(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("Failed to list podcasts:", err);
        res.status(500).json({ error: message });
      }
    });
  },
);
