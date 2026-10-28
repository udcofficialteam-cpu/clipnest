const cobaltApiUrl = "https://api.cobalt.tools";
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
      videoQuality: "720",
      filenameStyle: "pretty"
    }),
    signal: controller.signal
  });

  const data = await cobaltResponse.json().catch(() => null);

  if (!cobaltResponse.ok || !data) {
    console.error("Cobalt response:", cobaltResponse.status, data);

    return res.status(502).json({
      error: "Cobalt provider request failed.",
      providerStatus: cobaltResponse.status,
      providerError: data?.error?.code || data?.error || null
    });
  }

  if (data.status === "error") {
    return res.status(400).json({
      error:
        data.error?.code ||
        data.text ||
        "Cobalt could not process this link."
    });
  }

  let downloadOptions = [];

  if (data.status === "picker" && Array.isArray(data.picker)) {
    downloadOptions = data.picker.map(item => ({
      format:
        item.type === "photo"
          ? "Image"
          : item.type === "gif"
            ? "GIF"
            : "MP4",
      quality: item.quality || "Available",
      size: "",
      downloadUrl: item.url
    }));
  } else if (
    ["tunnel", "redirect"].includes(data.status) &&
    typeof data.url === "string"
  ) {
    downloadOptions = [{
      format: "MP4",
      quality: "720p requested",
      size: "",
      downloadUrl: data.url
    }];
  }

  if (!downloadOptions.length) {
    return res.status(502).json({
      error: "Provider returned no supported download options.",
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
        ? "The media request timed out."
        : "Could not connect to the media provider."
  });
} finally {
  clearTimeout(timeout);
}
