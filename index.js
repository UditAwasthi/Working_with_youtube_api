const { youtube } = require("@googleapis/youtube");
const dotenv = require("dotenv");
dotenv.config({
  path: ".env",
});
const yt = youtube({
  version: "v3",
  auth: process.env.YOUTUBE_API_KEY,
});
// module.exports = yt;

async function searchVideos(query) {
  const res = await yt.search.list({
    part: "snippet",
    q: query || "JavaScript tutorials",
    maxResults: 5,
    type: "video",
  });

  res.data.items.forEach((v) => {
    console.log(v.snippet);
  });
}
function extractYouTubeVideoId(input) {
  if (!input || typeof input !== "string") return null;

  // 1. Raw video ID (11 chars)
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) {
    return input;
  }

  try {
    const url = new URL(input);
    const host = url.hostname.replace("www.", "");

    // youtu.be/VIDEO_ID
    if (host === "youtu.be") {
      return url.pathname.slice(1);
    }

    // youtube.com/*
    if (host.endsWith("youtube.com")) {
      // watch?v=VIDEO_ID
      if (url.searchParams.has("v")) {
        return url.searchParams.get("v");
      }

      // /embed/VIDEO_ID
      // /shorts/VIDEO_ID
      // /v/VIDEO_ID
      const pathMatch = url.pathname.match(
        /^\/(embed|shorts|v)\/([a-zA-Z0-9_-]{11})/,
      );
      if (pathMatch) {
        return pathMatch[2];
      }
    }
  } catch (e) {
    return null;
  }

  return null;
}

const url = "https://youtu.be/9ao4FEaDGhQ?si=5DIj97Fpkzqc18_c";

async function getVideoDetailsFromAnyUrl(input) {
  const videoId = extractYouTubeVideoId(input);

  if (!videoId) {
    throw new Error("Invalid or unsupported YouTube URL");
  }

  const res = await yt.videos.list({
    part: "snippet,statistics,contentDetails",
    id: videoId,
  });

  if (!res.data.items.length) {
    throw new Error("Video not found or unavailable");
  }

  return res.data.items[0];
}

async function mainVideoSearch(url) {
  console.log(await getVideoDetailsFromAnyUrl(url));
}
mainVideoSearch(url);   