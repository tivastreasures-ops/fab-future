# Fabulous Future Me

A personal creative playground for imagining lipstick looks, saving possible selves locally, and exporting personal vision-board cards.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (Replit assigns port 8080)
- `PORT=5173 BASE_PATH=/ pnpm --filter @workspace/fabulous-future-me run dev` — run the web app outside its managed workflow
- `pnpm run typecheck` — full typecheck across all packages
- `PORT=5173 BASE_PATH=/ pnpm --filter @workspace/fabulous-future-me run build` — build the web app
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- Optional server secrets for YouCam live try-on: `YouCam_Key` or `YOUCAM_API_KEY`; `SESSION_SECRET` signs short-lived browser session cookies.
- `DRY_RUN=true` hard-disables live uploads and rendering.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Browser persistence: IndexedDB for metadata and image/card Blobs; no localStorage image payloads or server-side portraits

## Where things live

- `artifacts/fabulous-future-me/src/pages/` — home, drafting table, vanity, wardrobe, and settings screens
- `artifacts/fabulous-future-me/src/lib/db.ts` — IndexedDB storage for metadata and image/card Blobs
- `artifacts/fabulous-future-me/src/lib/card.ts` — local 1080 × 1350 PNG creation
- `artifacts/api-server/src/routes/youcam.ts` — server payload validation, direct upload tickets, and ephemeral render-job polling
- `artifacts/api-server/src/lib/youcam-recipe.ts` — lipstick-only provider payload
- `lib/api-spec/openapi.yaml` — contract for generated API hooks and validation
- `README.md` and `DEMO-SCRIPT.md` — run instructions and demo guidance

## Architecture decisions

- Looks, images and card Blobs remain in the browser's IndexedDB. Browsers can still evict data; export cards to retain them.
- Portraits go directly from the browser to YouCam's signed upload destination after live confirmation; this server does not store portraits.
- The required provider lip-shape field is `"original"`; morphology is omitted. Skin smoothing is explicitly zero because omission defaults to 50.
- Render records are transient. Ambiguous submissions are not retried automatically, avoiding duplicate paid requests.

## Product

Design custom-color lipstick looks; save and edit them offline; create PNGs without provider calls; optionally submit a chosen portrait for an explicitly reviewed YouCam preview.

## User preferences

- Inform the user; never overrule the artist. Allow all valid colors. No beauty assessments, flaw-correction language, store, public social feed, or non-lipstick makeup.
- The supplied studio illustration belongs on the darkened landing hero only; functional text stays live HTML.

## Gotchas

- Live upload and rendering require a server-side YouCam secret and two explicit confirmations. A dry run is not a rendered preview.
- After OpenAPI changes, regenerate client and Zod code before consuming the generated interfaces.
- Screenshots and demo video live in ignored `generated-artifacts/`; download them separately from source code.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
