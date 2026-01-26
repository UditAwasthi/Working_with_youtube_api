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

// Search Videos - TOO RESOURCE INTENSIVE - USE WITH CAUTION
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
// +++++++++++++++++++++++++++++++++++++++++++//

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
// const url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

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
// mainVideoSearch(url);

// PLAYLIST ID EXTRACTION
function extractYouTubePlaylistId(input) {
  if (!input || typeof input !== "string") return null;

  // 1. Raw playlist ID (most common prefixes)
  if (/^(PL|OLAK5uy|UU|LL|FL|RD)[a-zA-Z0-9_-]+$/.test(input)) {
    return input;
  }

  try {
    const url = new URL(input);

    // Standard ?list=PLAYLIST_ID
    if (url.searchParams.has("list")) {
      return url.searchParams.get("list");
    }
  } catch (e) {
    return null;
  }

  return null;
}

async function getAllPlaylistVideos(input) {
  const playlistId = extractYouTubePlaylistId(input);

  if (!playlistId) {
    throw new Error("Invalid playlist URL or ID");
  }

  let playlistItems = [];
  let pageToken = null;

  // 1️⃣ Fetch all playlist items
  do {
    const res = await yt.playlistItems.list({
      part: "snippet,contentDetails",
      playlistId,
      maxResults: 50,
      pageToken,
    });

    playlistItems.push(...res.data.items);
    pageToken = res.data.nextPageToken;
  } while (pageToken);

  // 2️⃣ Extract video IDs
  const videoIds = playlistItems.map(
    item => item.contentDetails.videoId
  );

  // 3️⃣ Fetch video durations (batch: max 50)
  const videoDetails = [];

  for (let i = 0; i < videoIds.length; i += 50) {
    const chunk = videoIds.slice(i, i + 50);

    const res = await yt.videos.list({
      part: "contentDetails",
      id: chunk.join(","),
    });

    videoDetails.push(...res.data.items);
  }

  // 4️⃣ Map videoId → duration
  const durationMap = new Map(
    videoDetails.map(v => [v.id, v.contentDetails.duration])
  );

  // 5️⃣ Attach duration to playlist items
  return playlistItems.map(item => ({
    ...item,
    contentDetails: {
      ...item.contentDetails,
      duration: durationMap.get(item.contentDetails.videoId) || null,
    },
  }));
}

const playlistUrl =
  "https://youtube.com/playlist?list=PLC3y8-rFHvwgg3vaYJgHGnModB54rxOk3&si=CgZ7s0_OEeJ32nCb";

async function mainPlaylistSearch(url) {
  let videos = await getAllPlaylistVideos(url);
  const result = videos.map((v) => ({
    title: v.snippet.title,
    duration: v.contentDetails.duration,
    thumbnails: v.snippet.thumbnails.default.url,
    videoId: v.contentDetails.videoId,
    channel: v.snippet.channelTitle,
  }));
  console.table(result);
}

mainPlaylistSearch(playlistUrl);
