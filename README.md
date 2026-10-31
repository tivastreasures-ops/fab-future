# Fabulous Future Me

**Your skin. Your colors. Your rules.**

A private creative atelier for designing possible versions of yourself—not a
cosmetics store, beauty assessment, or flaw-correction tool.

## Run

Requirements: Node.js 24 and pnpm 10. Install with `pnpm install`.

In Replit, start the existing **API Server** and **Fabulous Future Me: web**
workflows. Open Fabulous Future Me in Preview.

Outside Replit, run these in separate terminals:

```sh
PORT=5000 pnpm --filter @workspace/api-server run dev
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/fabulous-future-me run dev
```

Route `/api/*` to port 5000 and all other requests to port 5173 using a
same-origin reverse proxy. Replit supplies this routing automatically. Do not
put the API token in a Vite variable or client bundle.

Checks:

```sh
pnpm run typecheck
```

For a production frontend bundle:

```sh
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/fabulous-future-me run build
```

## Creative flow, no API needed

1. Start a Look. Optionally name your studio; skipping uses **My Lookbook**.
2. At the Drafting Table, choose any valid hex, lipstick finish, name, mood,
   notes, and optional reference images.
3. Save to Wardrobe. Reopen and edit even if you never render the look.
4. Create a 1080 × 1350 PNG card. Download, share where supported, or use the
   long-press image preview.
5. Naming your studio never forces your name onto a shared card. Collection
   title on exports is **off by default**, controlled in Settings.

Looks and image/card Blobs live on this device in IndexedDB. They are not an
account backup: clearing site data, changing browser/profile/device, or browser
eviction can remove them. Export cards you want to retain. Persistent storage
is requested, but the browser may decline it. No full images or base64 PNGs are
stored in localStorage. Core creative work supports offline use after the app
has loaded and its offline shell has been cached. Live rendering requires
internet access.

## Optional YouCam connection

No credential is needed for drafting, saving, exporting, or dry-run validation.
For live lipstick previews, add **YouCam_Key** (or **YOUCAM_API_KEY**) as a
server secret in Replit Secrets. Keep the existing **SESSION_SECRET**
server-side. Restart API Server after adding a secret. Never commit credentials
or paste them into chat.

Every request defaults to dry-run unless the user deliberately confirms a live
render. Setting **DRY_RUN=true** is an operator hard lock against live uploads
and renders. With this setting absent (or false), a connected server may accept
an explicitly confirmed live request. No automatic render happens on a color
change, page load, save, card creation, or export.

The server caps live submission attempts at 10 per UTC day per process by
default (`YOUCAM_DAILY_LIMIT` may change that non-secret setting). Anonymous
sessions have same-origin checks, rate limits, ownership-bound upload IDs and
render jobs, and an in-flight guard. These are hackathon safety controls, not a
replacement for a production abuse-prevention service. Jobs and limits are
transient and reset on server restart. No server database is needed.

### Exact sequence

1. `GET /api/studio/config` reports connection and dry-run configuration.
2. `POST /api/youcam/validate` takes `{hex, finish, sourceFileId?}` and builds
   the exact provider payload, **without calling YouCam**. Before an upload,
   its source placeholder is `PHOTO_UPLOADED_AFTER_CONFIRMATION`.
3. After deliberate live consent, `POST /api/youcam/upload` requests a provider
   signed upload ticket. The browser uploads the downscaled full-face image
   directly to that destination, honoring the returned method and headers.
   Browser-managed `Content-Length` is not manually set.
4. Validate again with the returned file ID. Review the exact final payload.
5. `POST /api/youcam/render` requires the recipe, exact `expectedPayload`,
   unique `requestId`, and explicit `liveConfirmed`. Every provided field is
   checked; mismatched colors, null numeric payload fields, extra makeup, and
   changed effects cannot pass the exact-payload comparison.
6. Poll `GET /api/youcam/jobs/:jobId`. Status checks are not new renders.
   The server times out after 180 seconds. A client timeout does **not**
   cancel an upstream task; check the YouCam console before retrying an
   ambiguous submission.
7. A successful image is streamed through the session-owned image endpoint
   without disk storage, then saved locally as a Blob.

The documented File API returns `src_file_id`, so uploaded photos use that
documented source form rather than inventing a public photo URL. No portrait
is persisted on this app's server. Provider processing/retention is governed
by YouCam, not a promise of zero retention.

### Lipstick payload choices

Only `lip_color` is styled, using `style.type="full"`. The documented required
`shape.name="original"` preserves the user's existing lip outline; morphology,
fullness and wrinkle adjustments are omitted. Intensity is explicitly numeric
80. Finish-specific gloss, transparency and shimmer controls are numeric and
visible in the payload review. Shimmer uses the selected lipstick hex, never
an unrelated gray default.

**Important:** YouCam documents implicit skin smoothing of 50 if the
`skin_smooth` effect is omitted. We explicitly send `skinSmoothStrength=0` and
`skinSmoothColorIntensity=0`. No app-side skin smoothing, brightness changes,
or beauty filters are applied. The provider's rendering may differ from a
real product.

### Documentation consulted

- [Current Makeup VTO schema and integration guide](https://docs.perfectcorp.com/_bundle/reference/makeup_vto.yaml)
- [Integration guide](https://docs.perfectcorp.com/reference/makeup_vto/section/overview/integration-guide)
- Provider base: `https://yce-api-01.makeupar.com`
- Upload allocation: `POST /s2s/v2.0/file`, followed by the returned upload request.
- Task: `POST /s2s/v2.0/task/makeup-vto`
- Status: `GET /s2s/v2.0/task/makeup-vto/{task_id}`

The current docs list **1 unit per Makeup VTO V1.0 task** and explicitly state
query and engine errors consume no units. Thus 1,000 promo units nominally
cover 1,000 successful tasks if all are allocated to this feature. Actual
promotion eligibility, expiry, remaining balance and completed-but-client-
timed-out tasks must be checked in the user's YouCam console.

## Acceptance checklist

### No-YouCam Android Chrome pass

Use an actual Android device, not a desktop screenshot:

- Name the Lookbook; confirm the live title preview and skip path.
- Create a look with a custom unconventional hex and name. Save, reload,
  reopen and edit it.
- Generate a readable PNG, download it, share if supported, and verify the
  long-press fallback. Confirm 1080 × 1350 dimensions.
- Repeat with several looks/cards, reopen every saved card, and export again.
- Switch offline after loading. Draft, save, reopen and export again.
- Confirm images never enter localStorage; verify storage-error copy preserves
  the current draft.
- Change the draft during an asynchronous export: exported values must reflect
  the original snapshot and the on-screen draft must remain unchanged.
- Confirm 360px layout, keyboard focus, tap targets, and reduced-motion behavior.

### Separate live YouCam pass

- Connect the secret, allow live requests, and upload your own consenting
  full-face photo. There are no shipped portrait samples.
- Confirm the exact lipstick hex/finish, original outline, full style,
  intensity80, both smoothing controls0, and the provider source file ID.
- Deliberately confirm exactly one live render; record its provider task ID,
  successful result and unit balance change.
- Verify before/after; confirm failure or timeout leaves the saved look intact.

**A real successful provider render and physical Android Chrome acceptance
cannot be claimed until these steps are actually performed.**

## Hackathon submission

This Replit project holds the source repository and these run instructions.
The mobile and desktop screenshots are in `generated-artifacts/screenshots/`.
`generated-artifacts/Fabulous-Future-Me-walkthrough.mp4` is a 72-second,
captioned, silent walkthrough made from screenshots of the live app. It shows
the product screens, not recorded interactions; it contains no portrait and
claims no successful YouCam render. Use `DEMO-SCRIPT.md` for a truthful
spoken-video version.

Generated screenshots and video are excluded from Git and deployment to keep
build assets out of source history. Download them separately for submission.
The source submission repository is private:
https://github.com/tivastreasures-ops/fab-future
Grant access to anyone who needs to review or run it.
Dry runs are not YouCam renders. Live preview needs a consenting user-provided
photo, two explicit confirmations, and the configured provider key.

The attached studio illustration is used only as a darkened landing hero.
When a portrait is uploaded, the full uncropped frame is previewed and sent
directly to YouCam only after explicit live confirmation.

The studio illustration is intentionally not bundled. When supplied, use it
only as mood/palette/composition direction and a dimmed landing hero background
under a dark scrim. Keep all titles/buttons as live HTML, and keep working
screens free of illustration backgrounds.
