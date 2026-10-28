const form = document.querySelector("#mediaForm");
const input = document.querySelector("#mediaUrl");
const submitBtn = document.querySelector("#submitBtn");
const pasteBtn = document.querySelector("#pasteBtn");
const statusBox = document.querySelector("#status");
const resultsBox = document.querySelector("#results");
const themeToggle = document.querySelector("#themeToggle");
const menuToggle = document.querySelector("#menuToggle");
const navLinks = document.querySelector("#navLinks");

document.querySelector("#year").textContent = new Date().getFullYear();

function showStatus(message, type = "") {
  statusBox.hidden = false;
  statusBox.className = `status ${type}`.trim();
  statusBox.textContent = message;
}
function hideResults() {
  resultsBox.hidden = true;
  resultsBox.replaceChildren();
}
function detectPlatform(hostname) {
  const host = hostname.toLowerCase().replace(/^www\./, "");
  const matches = [
    [["youtube.com", "youtu.be", "youtube-nocookie.com"], "YouTube"],
    [["facebook.com", "fb.watch"], "Facebook"],
    [["instagram.com"], "Instagram"],
    [["tiktok.com"], "TikTok"],
    [["x.com", "twitter.com"], "X (Twitter)"],
    [["vimeo.com"], "Vimeo"]
  ];
  for (const [domains, name] of matches) {
    if (domains.some(domain => host === domain || host.endsWith("." + domain))) return name;
  }
  return "Other website";
}
function validatePublicUrl(raw) {
  let url;
  try { url = new URL(raw.trim()); } catch { throw new Error("Please enter a complete, valid URL (including https://)."); }
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Only http and https links are supported.");
  if (url.username || url.password) throw new Error("Links containing embedded usernames or passwords are not accepted.");
  const host = url.hostname.toLowerCase();
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") ||
      /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(":") ||
      host === "0.0.0.0" || host === "127.0.0.1") {
    throw new Error("Please enter a public website URL, not a local or IP address.");
  }
  return url;
}
pasteBtn.addEventListener("click", async () => {
  try {
    if (!navigator.clipboard?.readText) throw new Error("Clipboard access is unavailable. Paste the link into the field manually.");
    const text = await navigator.clipboard.readText();
    if (!text.trim()) throw new Error("Your clipboard is empty.");
    input.value = text.trim();
    input.focus();
    showStatus("Link pasted. Select “Check media options” to continue.", "success");
  } catch (error) {
    showStatus(error.message || "Could not read the clipboard. Please paste manually.", "error");
  }
});

form.addEventListener("submit", async event => {
  event.preventDefault();
  hideResults();
  let url;
  try {
    url = validatePublicUrl(input.value);
  } catch (error) {
    showStatus(error.message, "error");
    input.focus();
    return;
  }
  submitBtn.disabled = true;
  submitBtn.textContent = "Checking link…";
  showStatus(`Valid URL detected · ${detectPlatform(url.hostname)}. Checking the configured media provider…`);
  try {
    const response = await fetch("/api/media-options", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({url: url.href}),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "The provider could not check this link. Please try again later.");
    if (!Array.isArray(data.options) || data.options.length === 0) {
      showStatus(data.message || "The provider did not return any downloadable options for this link.", "error");
      return;
    }
    showStatus(data.message || "Media options received from the configured provider.", "success");
    renderOptions(data.options);
  } catch (error) {
    showStatus(error.message || "A network error occurred. Please try again.", "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = 'Check media options <span aria-hidden="true">→</span>';
  }
});

function renderOptions(options) {
  resultsBox.hidden = false;
  const heading = document.createElement("h3");
  heading.textContent = "Available options";
  resultsBox.append(heading);
  options.forEach(option => {
    if (!option || typeof option.downloadUrl !== "string") return;
    let downloadUrl;
    try { downloadUrl = new URL(option.downloadUrl); } catch { return; }
    if (!["http:", "https:"].includes(downloadUrl.protocol)) return;
    const row = document.createElement("div");
    row.className = "result-option";
    const description = document.createElement("span");
    const label = [option.format, option.quality, option.size].filter(Boolean).join(" · ");
    description.textContent = label || "Media file";
    const link = document.createElement("a");
    link.className = "download-link";
    link.href = downloadUrl.href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Open download ↗";
    link.setAttribute("aria-label", `Open download for ${label || "media file"} in a new tab`);
    row.append(description, link);
    resultsBox.append(row);
  });
  if (!resultsBox.querySelector(".result-option")) {
    resultsBox.hidden = true;
    showStatus("The provider response did not include any valid download links.", "error");
  }
}

themeToggle.addEventListener("click", () => {
  const isDark = document.body.classList.toggle("dark");
  themeToggle.textContent = isDark ? "☀" : "☾";
  themeToggle.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
  try { localStorage.setItem("clipnest-theme", isDark ? "dark" : "light"); } catch {}
});
try {
  if (localStorage.getItem("clipnest-theme") === "dark") {
    document.body.classList.add("dark");
    themeToggle.textContent = "☀";
    themeToggle.setAttribute("aria-label", "Switch to light mode");
  }
} catch {}

menuToggle.addEventListener("click", () => {
  const open = navLinks.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(open));
  menuToggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
});
navLinks.querySelectorAll("a").forEach(link => link.addEventListener("click", () => {
  navLinks.classList.remove("open");
  menuToggle.setAttribute("aria-expanded", "false");
}));
