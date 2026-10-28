
const ALLOWED_PROTOCOLS = new Set(["https:", "http:"]);
const MAX_URL_LENGTH = 2048;

function isPrivateOrLocalHost(hostname) {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");

  if (
    h === "localhost" ||
    h.endsWith(".localhost") ||
    h.endsWith(".local") ||
    h === "0.0.0.0" ||
    h === "::1" ||
    h === "::" ||
    h.startsWith("fc") ||
    h.startsWith("fd") ||
    h.startsWith("fe80:")
  ) {
    return true;
  }

  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) {
    return true;
  }

  return false;
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      error: "Method not allowed. Use POST."
    });
  }

  const raw = req.body && req.body.url;

  if (typeof raw !== "string" || raw.length > MAX_URL_LENGTH) {
    return res.status(400).json({
      error: "Provide a valid media URL (maximum 2048 characters)."
    });
  }

  let mediaUrl;

  try {
    mediaUrl = new URL(raw);
  } catch {
    return res.status(400).json({ error: "Invalid URL." });
  }

  if (
    !ALLOWED_PROTOCOLS.has(mediaUrl.protocol) ||
    mediaUrl.username ||
    mediaUrl.password ||
    isPrivateOrLocalHost(mediaUrl.hostname)
  ) {
    return res.status(400).json({
      error: "Only public http/https media URLs are accepted."
    });
  }

  const cobaltApiUrl = "https://co.wuk.sh/api/json";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const cobaltResponse = await fetch(cobaltApiUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
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
      console.error("Cobalt HTTP status:", cobaltResponse.status);
      console.error("Cobalt response:", data);

      return res.status(502).json({
        error: "The media provider request failed.",
        providerStatus: cobaltResponse.status
      });
    }

    if (data.status === "error") {
      console.error("Cobalt error:", data);

      return res.status(400).json({
        error:
          data.text ||
          data.error?.code ||
          "The provider could not process this URL."
      });
    }

    const downloadOptions = [];

    if (data.status === "picker" && Array.isArray(data.picker)) {
      for (const item of data.picker) {
        if (typeof item.url !== "string") continue;

        downloadOptions.push({
          format:
            item.type === "photo"
              ? "Image"
              : item.type === "gif"
                ? "GIF"
                : "MP4",
          quality: item.quality || "Available",
          size: "",
          downloadUrl: item.url
        });
      }
    } else if (
      ["tunnel", "redirect"].includes(data.status) &&
      typeof data.url === "string"
    ) {
      downloadOptions.push({
        format: "MP4",
        quality: "720p requested",
        size: "",
        downloadUrl: data.url
      });
    }

    if (downloadOptions.length === 0) {
      console.error("Unexpected Cobalt response:", data);

      return res.status(502).json({
        error: "The provider returned no supported download options.",
        providerStatus: data.status || "unknown"
      });
    }

    return res.status(200).json({
      message: "Media options retrieved successfully.",
      options: downloadOptions
    });
  } catch (error) {
    console.error("Cobalt request failed:", error);

    return res.status(502).json({
      error:
        error.name === "AbortError"
          ? "The media request timed out. Please try again."
          : "Could not connect to the media provider."
    });
  } finally {
    clearTimeout(timeout);
  }
};
