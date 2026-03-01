# Fetcher Skill

Retrieves readable content from external URLs for the top-of-funnel idea capture.

---

## 1. fetchYoutube(url)

Fetches the transcript text for a YouTube video using the free `youtube-transcript` npm package.
If not installed, prompt the user to let you run `npm install youtube-transcript` first.

```javascript
// const { YoutubeTranscript } = require('youtube-transcript'); // Make sure this is available in the environment

async function fetchYoutube(url) {
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(url);
    return transcript.map(t => t.text).join(' ');
  } catch (error) {
    throw new Error(`Failed to fetch YouTube transcript: ${error.message}`);
  }
}
```

---

## 2. fetchBlog(url)

Fetches the markdown content of a blog post or web page using the free Jina Reader API.

```javascript
async function fetchBlog(url) {
  try {
    const res = await fetch(`https://r.jina.ai/${url}`, {
      method: "GET",
      headers: { "X-Return-Format": "markdown" }
    });
    if (!res.ok) throw new Error(`Jina Reader returned ${res.status}: ${res.statusText}`);
    return await res.text();
  } catch (error) {
    throw new Error(`Failed to fetch blog content: ${error.message}`);
  }
}
```
