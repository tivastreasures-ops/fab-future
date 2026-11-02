# Fabulous Future Me

**Your skin. Your colors. Your rules.**

**Live demo:** https://fab-future-me.replit.app

## What it does

- Virtual lipstick try-on: pick any valid hex shade and a lipstick finish.
- Optionally send your photo and lipstick settings to YouCam, only after confirmation.
- Save looks and export Look Cards (Luxe, Simple, Kiss Mark) on your device.

A personal creative playground for designing possible versions of yourself—not a
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
2. In **Imagine**, choose any valid hex, lipstick finish, name, mood,
   notes, and optional reference images.
3. Save to **Collect**. Reopen and edit even if you never render the look.
4. Choose **Luxe**, **Simple**, or **Kiss Mark** and create a 1080 × 1350 PNG
   Look Card. Download, share where supported, or use the
   long-press image preview.
5. Naming your studio never forces your name onto a shared card. Collection
   title on exports is **off by default**, controlled in **Studio**.

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

Live uploads and rendering are allowed **only when a YouCam key is configured
AND `DRY_RUN` is exactly the lowercase string `"false"`**. Every other value,
including an absent setting, locks live mode off. Unlocking live mode does not
submit anything: the user must still explicitly confirm. No automatic render
happens on a color change, page load, save, card creation, or export.

### Server environment variables

Names only; configure values privately, never in source or the client bundle:

- `YouCam_Key` or `YOUCAM_API_KEY` — YouCam server API credential; the latter takes precedence if both exist.
- `SESSION_SECRET` — signs anonymous session cookies; keep it stable and server-side.
- `DRY_RUN` — live-mode lock; only the exact lowercase string `"false"` permits live mode when a key is configured.
- `YOUCAM_DAILY_LIMIT` — live submission cap per UTC day per server process; defaults to 10.
- `LOG_LEVEL` — server logging level; defaults to info.

The server caps live submission attempts at 10 per UTC day per process by
default (`YOUCAM_DAILY_LIMIT` may change that non-secret setting). Anonymous
sessions have same-origin checks, rate limits, ownership-bound upload IDs and
render jobs, and an in-flight guard. These are hackathon safety controls, not a
replacement for a production abuse-prevention service. Jobs and limits are
transient and reset on server restart. No server database is needed.

## Test it

- **Dry-run test (no key needed):** create and save a look in Imagine, open
  Paint, and run the simulation. It validates the recipe without uploading a
  photo, calling YouCam, or consuming units. In Collect, export each card style.
- **Live test:** configure a YouCam key and set `DRY_RUN` to exactly `"false"`
  in the server environment. In Paint, use your own consenting face photo,
  review the shade and finish, and confirm twice. Each render uses **1 YouCam
  unit**; the default daily cap is **10** submission attempts per process.
  Check the before/after result. Use **Check this same preview** after a timeout
  to check the existing job rather than submit another render.

### Exact sequence

1. `GET /api/studio/config` reports connection and dry-run configuration.
2. `POST /api/youcam/validate` takes `{hex, finish, sourceFileId?}` and builds
   the exact provider payload, **without calling YouCam**. Before an upload,
   its source placeholder is `PHOTO_UPLOADED_AFTER_CONFIRMATION`.
3. After deliberate live consent, `POST /api/youcam/upload` requests a provider
   signed upload ticket. The browser uploads the downscaled full-face image
   directly to that destination, honoring the returned method and headers.
   Browser-managed `Content-Length` is not manually set.
4. Validate again with the returned file ID. Review the plain-language consent
   summary; the exact payload is available under collapsed **Technical details**.
5. `POST /api/youcam/render` requires the recipe, exact `expectedPayload`,
   unique `requestId`, and explicit `liveConfirmed`. Every provided field is
   checked; mismatched colors, null numeric payload fields, extra makeup, and
   changed effects cannot pass the exact-payload comparison.
6. Poll `GET /api/youcam/jobs/:jobId`. Status checks are not new renders.
   The app's waiting timeout does **not** cancel an upstream task. Check the
   same preview rather than submit another ambiguous request. Restarting or
   republishing loses in-memory jobs and prevents recovery through this app.
7. A successful image is streamed through the session-owned image endpoint
   without disk storage, then saved locally as a Blob.

YouCam result storage can serve images with a generic binary content type
(`binary/octet-stream` or `application/octet-stream`). The server reads the
bounded body and verifies PNG/JPEG/WebP signatures before returning the correct
image content type. Empty or unknown data is rejected. HTTPS, host checks,
redirect limits, download timeout, and the 15 MB size limit remain enforced.

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

The docs list **1 unit per Makeup VTO V1.0 task** and state that query and engine
errors consume no units. Check actual billing and remaining balance in YouCam.

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

A live YouCam lipstick render has been run successfully on the published app
on an Android phone. The checklist above remains useful for regression testing;
that successful render does not imply every device or export path was tested.

## Not built yet

- Skin analysis / Skin Mapping (YouCam skin analysis is face-only).
- In-app live camera.
- Shade-to-product matching.

## Hackathon submission

Judges can use the repository directly:
https://github.com/tivastreasures-ops/fab-future

Use the live demo above or the run instructions here. `DEMO-SCRIPT.md` provides
the demo sequence. Dry runs are not provider renders; live previews require a
configured key, unlocked live mode, a consenting photo, and two confirmations.

Generated screenshots and walkthrough video are intentionally excluded from
Git and should be supplied separately with the submission.

The optional owner-supplied landing illustration is not bundled in Git.
Without it, a fresh checkout runs with a plum-and-gold background. Card artwork
is bundled; drafting, Paint, saved looks, and PNG exports do not depend on the
landing illustration.
