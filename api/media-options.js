// Cobalt API alternative instance integrated Vercel serverless endpoint for ClipNest.
const ALLOWED_PROTOCOLS = new Set(["https:", "http:"]);
const MAX_URL_LENGTH = 2048;

function isPrivateOrLocalHost(hostname) {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") ||
      h === "0.0.0.0" || h === "::1" || h === "::" || h.startsWith("fc") || h.startsWith("fd") || h.startsWith("fe80:")) return true;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) return true;
  return false;
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({error: "Method not allowed. Use POST."});
  }

  const raw = req.body && req.body.url;
  if (typeof raw !== "string" || raw.length > MAX_URL_LENGTH) {
    return res.status(400).json({error: "Provide a valid media URL (maximum 2048 characters)."});
  }

  let mediaUrl;
  try { mediaUrl = new URL(raw); } catch { return res.status(400).json({error: "Invalid URL."}); }
  if (!ALLOWED_PROTOCOLS.has(mediaUrl.protocol) || mediaUrl.username || mediaUrl.password || isPrivateOrLocalHost(mediaUrl.hostname)) {
    return res.status(400).json({error: "Only public http/https media URLs are accepted."});
  }

  const cobaltApiUrl = "https://co.wuk.sh/api/json";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const cobaltResponse = await fetch(cobaltApiUrl, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      },
      body: JSON.stringify({
        url: mediaUrl.href,
        vQuality: "720",
        filenameStyle: "pretty"
      }),
      signal: controller.signal
    });

    const data = await cobaltResponse.json().catch(() => null);

    if (!cobaltResponse.ok || !data) {
      return res.status(502).json({error: "Could not process this link through the free media provider."});
    }

    if (data.status === "error" || (!data.url && !data.picker)) {
      return res.status(400).json({error: data.text || "The provider could not extract a download link from this URL."});
    }

    let downloadOptions = [];

    if (data.status === "picker" && Array.isArray(data.picker)) {
      downloadOptions = data.picker.map(item => ({
        format: item.type === "photo" ? "Image" : "MP4",
        quality: item.quality || "HD",
        size: "",
        downloadUrl: item.url
      }));
    } else if (data.url) {
      downloadOptions = [{
        format: "MP4",
        quality: "HD",
        size: "",
        downloadUrl: data.url
      }];
    }

    return res.status(200).json({
      message: "Media options retrieved successfully.",
      options: downloadOptions
    });

  } catch (error) {
    return res.status(502).json({
      error: error.name === "AbortError" ? "The media request timed out. Please try again." : "Could not connect to the media provider."
    });
  } finally {
    clearTimeout(timeout);
  }
};
