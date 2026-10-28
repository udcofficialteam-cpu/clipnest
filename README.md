# ClipNest — video & audio link checker

A responsive HTML/CSS/JavaScript website with a Vercel serverless API adapter. It is designed for content users own or are authorized to download.

## Important: provider integration is not pre-connected

The UI is real and the API endpoint performs URL checks, but no third-party media provider is bundled or connected. Until you configure a provider, submissions intentionally return `503 Provider not configured`; it does not fabricate formats or download links.

Only connect a provider whose official API and terms permit your intended use. Do not bypass DRM, paywalls, private-content restrictions, authentication controls, or platform rules.

## Files

- `index.html` — homepage, metadata, JSON-LD and UI
- `styles.css` — responsive design, light/dark theme styles
- `script.js` — URL validation, clipboard, theme, menu, API request and result rendering
- `api/media-options.js` — Vercel serverless provider adapter
- `privacy.html`, `terms.html`, `contact.html`, `copyright.html` — editable legal/contact templates
- `robots.txt`, `sitemap.xml`, `vercel.json` — deployment and SEO basics

## Run locally

1. Install Node.js LTS.
2. Install Vercel CLI: `npm i -g vercel`
3. From this folder, run `vercel dev`.
4. Open the local URL shown by Vercel.

Opening `index.html` directly works for visual review, but the `/api/media-options` request needs the Vercel development server.

## Connect an authorized provider

The API adapter expects an HTTPS endpoint and sends:

```http
POST <MEDIA_PROVIDER_URL>
Authorization: Bearer <MEDIA_PROVIDER_API_KEY>
Content-Type: application/json

{"url":"https://public-source.example/media"}
```

The expected JSON response is:

```json
{
  "message": "Options returned by provider",
  "options": [
    {
      "format": "MP4",
      "quality": "720p",
      "size": "25 MB",
      "downloadUrl": "https://provider.example/temporary-file-url"
    }
  ]
}
```

This is a generic adapter contract, not a claim that a provider already supports it. Review the provider's official documentation and adapt `api/media-options.js` to its real request and response shape. Provider-generated download links should be HTTPS and short-lived where possible. Avoid logging URLs, tokens, or personal information.

In Vercel: Project → Settings → Environment Variables, add:
- `MEDIA_PROVIDER_URL` — your provider's official HTTPS API endpoint
- `MEDIA_PROVIDER_API_KEY` — secret key from that provider

Redeploy after changing environment variables. Never put API keys in `script.js` or any other public file.

## Deploy to GitHub and Vercel

1. Create a GitHub repository.
2. Upload/push all files and folders in this project.
3. In Vercel, choose **Add New → Project**, import the repository, and deploy.
4. No frontend build command is needed; this is a static site plus a Vercel Node serverless function.
5. Add your production domain and update all `https://example.com` canonical, Open Graph, sitemap, and robots URLs to your real domain.
6. Replace placeholder contact details and review all legal pages for your actual business and jurisdiction.
7. Configure the provider environment variables only after selecting an authorized provider.
8. Test invalid links, provider-not-configured state, real supported content, unsupported links, rate limits, mobile layout, and all legal links.

## Production hardening checklist

- Add a durable rate limiter/WAF (the endpoint's built-in checks are not a distributed rate limiter).
- Apply DNS/IP and redirect validation at the provider boundary to prevent SSRF. Do not let the provider fetch arbitrary internal URLs.
- Restrict provider use to permitted platforms and enforce file-size, duration, and cost limits.
- Validate provider results and use short-lived download URLs. Add temporary-file cleanup if your provider creates files.
- Review logging/retention and privacy notices.
- Add a custom 404 page and automated tests if needed.
- Google indexing and rankings are not guaranteed. Verify the site in Google Search Console and submit the corrected sitemap after launch.

## Costs

- GitHub repositories and basic Vercel hosting may be available at no charge within their current plan limits.
- Provider API calls, conversion, bandwidth, storage, and higher hosting usage may cost money. Check the provider and hosting pricing before launch.
