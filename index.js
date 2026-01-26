const { youtube } = require("@googleapis/youtube");
const  dotenv  = require("dotenv");
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
    part: 'snippet',
    q: query || 'JavaScript tutorials',
    maxResults: 5,
    type: 'video',
  });

  res.data.items.forEach(v => {
    console.log(v.snippet);
  });
}

searchVideos("How to use YouTube API with Node.js");

