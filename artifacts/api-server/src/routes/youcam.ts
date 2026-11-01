import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { randomUUID, createHmac, timingSafeEqual } from "node:crypto";
import { Readable } from "node:stream";
import { logger } from "../lib/logger";
import {
  GetStudioConfigResponse, ValidateRecipeBody, ValidateRecipeResponse,
  PrepareUploadBody, PrepareUploadResponse, CreateRenderBody, CreateRenderResponse,
  GetRenderJobParams, GetRenderJobResponse,
} from "@workspace/api-zod";
import { buildPayload, assertExactPayload, UNUPLOADED } from "../lib/youcam-recipe";
import { dryRunEnabled, hasYouCamKey, liveAllowed, youcam, YouCamApiError } from "../lib/youcam-client";

const router: IRouter = Router();
type Job = {
  owner: string; jobId: string; status: "dry_run" | "pending" | "success" | "error" | "timeout";
  payload: Record<string, unknown>; timestamp: string; created: number; taskId?: string;
  error?: string; downloadUrl?: string; lastPoll: number; polling?: Promise<void>;
};
const jobs = new Map<string, Job>();
const uploads = new Map<string, { owner: string; expires: number }>();
const requests = new Map<string, { jobId: string; fingerprint: string }>();
const rate = new Map<string, { count: number; until: number }>();
const pending = new Set<string>();
let daily = { day: "", count: 0 };
// Keep task ids around longer than YouCam's documented 24-hour lookup window.
const TTL = 25 * 60 * 60_000;
const secret = process.env.SESSION_SECRET;
// This cookie identifies a transient browser session, not an account or login.
const sessionSecret = secret || randomUUID();
const sign = (id: string) => createHmac("sha256", sessionSecret).update(id).digest("hex");
const sessions = new WeakMap<Request, string>();
function validCookie(raw: string) {
  const [id, sig] = raw.split(".");
  if (!id || !/^[\da-f-]{36}$/.test(id) || !sig || !/^[\da-f]{64}$/.test(sig)) return false;
  return timingSafeEqual(Buffer.from(sig), Buffer.from(sign(id))) ? id : false;
}
function owner(req: Request) { return sessions.get(req)!; }

setInterval(() => {
  const now = Date.now();
  for (const [id, job] of jobs) if (now - job.created > TTL) jobs.delete(id);
  for (const [id, upload] of uploads) if (now > upload.expires) uploads.delete(id);
  for (const [id, request] of requests) if (!jobs.has(request.jobId)) requests.delete(id);
  for (const [id, item] of rate) if (now > item.until) rate.delete(id);
}, 60_000).unref();

router.use((req: Request, res: Response, next: NextFunction) => {
  res.set({ "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" });
  const origin = req.get("origin");
  const fetchSite = req.get("sec-fetch-site");
  const host = req.get("x-forwarded-host")?.split(",")[0]?.trim() || req.get("host");
  if (req.method !== "GET" && (fetchSite === "cross-site" || (origin && new URL(origin).host !== host))) {
    res.status(403).json({ error: "Please make this request from your studio." }); return;
  }
  const raw = (req.headers.cookie || "").split(";").find(v => v.trim().startsWith("ffm_session="))?.trim().slice(12);
  const id = (raw && validCookie(raw)) || randomUUID();
  if (!raw || !validCookie(raw)) {
    const secure = req.secure || req.get("x-forwarded-proto") === "https";
    res.cookie("ffm_session", `${id}.${sign(id)}`, {
      httpOnly: true, secure, partitioned: secure,
      // Partitioning supports the embedded preview without cross-site tracking.
      // All mutations separately enforce same-origin Origin/Sec-Fetch-Site.
      sameSite: secure ? "none" : "lax", path: "/api", maxAge: 24 * 60 * 60_000,
    });
  }
  sessions.set(req, id);
  next();
});

function limit(req: Request, res: Response, kind: string, max: number) {
  const key = `${kind}:${req.ip}`;
  const current = rate.get(key);
  const item = current && current.until > Date.now() ? current : { count: 0, until: Date.now() + 3600_000 };
  if (rate.size > 10000 || item.count >= max) {
    res.status(429).json({ error: "Please pause before trying again. Your saved looks and cards are still available." }); return false;
  }
  item.count++;
  rate.set(key, item);
  return true;
}
function output(job: Job) {
  return {
    jobId: job.jobId, status: job.status, payload: job.payload, timestamp: job.timestamp,
    ...(job.error ? { error: job.error } : {}),
    ...(job.status === "success" ? { resultImageUrl: `/api/youcam/jobs/${job.jobId}/image` } : {}),
  };
}
function error(res: Response, e: unknown, status = 400) {
  res.status(status).json({ error: e instanceof Error ? e.message : "This request could not be completed. Your look is safe." });
}

router.get("/studio/config", (_req, res) => {
  res.json(GetStudioConfigResponse.parse({
    configured: hasYouCamKey(), dryRun: dryRunEnabled(),
    liveAllowed: liveAllowed(), unitsPerRender: 1, errorsCharged: false,
  }));
});
router.post("/youcam/validate", (req, res) => {
  try {
    const input = ValidateRecipeBody.strict().parse(req.body);
    const payload = buildPayload(input.hex, input.finish, input.sourceFileId);
    if (input.expectedPayload !== undefined) assertExactPayload(input.expectedPayload, payload);
    res.json(ValidateRecipeResponse.parse({ valid: true, payload }));
  } catch (e) { error(res, e); }
});
router.post("/youcam/upload", async (req, res): Promise<void> => {
  try {
    const input = PrepareUploadBody.strict().parse(req.body);
    if (!input.liveConfirmed || !liveAllowed()) {
      res.status(403).json({ error: "Live upload is disabled. No photo was sent. Use dry-run or connect YouCam and confirm a live preview." }); return;
    }
    if (!limit(req, res, "upload", 20)) return;
    const result = await youcam("/file", { files: [{
      content_type: input.contentType, file_name: input.contentType === "image/png" ? "portrait.png" : "portrait.jpg", file_size: input.fileSize,
    }] });
    const file = result.data?.files?.[0];
    const upload = file?.requests?.[0];
    if (typeof file?.file_id !== "string" || typeof upload?.url !== "string" ||
        !upload.url.startsWith("https://") || !["PUT", "POST"].includes(upload.method)) {
      throw new Error("YouCam did not return a usable upload destination. No render was sent.");
    }
    const headers = Object.fromEntries(Object.entries(upload.headers || {}).map(([k, v]) => [k, String(v)]));
    uploads.set(file.file_id, { owner: owner(req), expires: Date.now() + 15 * 60_000 });
    res.json(PrepareUploadResponse.parse({ fileId: file.file_id, url: upload.url, method: upload.method, headers }));
  } catch (e) { error(res, e); }
});
router.post("/youcam/render", async (req, res): Promise<void> => {
  const session = owner(req);
  let locked = false;
  try {
    const input = CreateRenderBody.strict().parse(req.body);
    const payload = buildPayload(input.hex, input.finish, input.sourceFileId);
    assertExactPayload(input.expectedPayload, payload);
    const fingerprint = JSON.stringify({ payload, live: input.liveConfirmed });
    const requestKey = `${session}:${input.requestId}`;
    const existing = requests.get(requestKey);
    if (existing) {
      if (existing.fingerprint !== fingerprint) throw new Error("This request was already used for a different recipe. Please confirm again.");
      const job = jobs.get(existing.jobId);
      if (job) { res.json(CreateRenderResponse.parse(output(job))); return; }
    }
    if (pending.has(session)) { res.status(409).json({ error: "A render is already being submitted. Please wait; no extra render was sent." }); return; }
    if (jobs.size > 2000) { res.status(503).json({ error: "The studio is busy. Your local looks are safe." }); return; }
    pending.add(session); locked = true;
    const job: Job = {
      owner: session, jobId: randomUUID(), status: "dry_run", payload,
      timestamp: new Date().toISOString(), created: Date.now(), lastPoll: 0,
    };
    if (input.liveConfirmed) {
      if (!liveAllowed()) { res.status(403).json({ error: "Live rendering is disabled. No render was sent." }); return; }
      const upload = uploads.get(input.sourceFileId || "");
      if (!upload || upload.owner !== session || upload.expires < Date.now() || payload.src_file_id === UNUPLOADED) {
        throw new Error("Upload your own photo and review this recipe before rendering.");
      }
      if ([...jobs.values()].some(j => j.owner === session && j.status === "pending")) {
        res.status(409).json({ error: "Your previous preview is still processing. No extra render was sent." }); return;
      }
      if (!limit(req, res, "render", 10)) return;
      const day = new Date().toISOString().slice(0, 10);
      if (daily.day !== day) daily = { day, count: 0 };
      const max = Math.max(1, Number(process.env.YOUCAM_DAILY_LIMIT) || 10);
      if (daily.count >= max) { res.status(429).json({ error: "This server's daily live-render safety limit has been reached. Drafting and cards still work." }); return; }
      // Count attempts conservatively even if the response is ambiguous. Never
      // automatically retry a POST that may already have incurred a charge.
      daily.count++;
      // Record intent BEFORE upstream I/O. If a connection fails after acceptance,
      // an identical request must not accidentally submit and charge twice.
      jobs.set(job.jobId, job);
      requests.set(requestKey, { jobId: job.jobId, fingerprint });
      job.status = "pending";
      try {
        const result = await youcam("/task/makeup-vto", payload);
        if (typeof result.data?.task_id !== "string") throw new Error("YouCam did not return a task ID. Check your console before retrying.");
        job.taskId = result.data.task_id;
      } catch (e) {
        // A lost submission response is ambiguous: keep it pending so a new
        // request cannot charge again. Only an explicit provider rejection ends it.
        const rejected = e instanceof YouCamApiError && e.confirmedRejection;
        job.status = rejected ? "error" : "pending";
        job.error = rejected ? e.message :
          "We couldn't confirm the provider's response. Your look is saved. No extra render will be submitted; check the YouCam console because the task may still be processing.";
      }
    }
    jobs.set(job.jobId, job);
    requests.set(requestKey, { jobId: job.jobId, fingerprint });
    res.json(CreateRenderResponse.parse(output(job)));
  } catch (e) { error(res, e); }
  finally { if (locked) pending.delete(session); }
});

async function refresh(job: Job) {
  // A browser timeout does not cancel the provider task. Keep polling the same
  // task on demand so a later retry can retrieve its result without a new POST.
  if (job.status !== "pending" || !job.taskId) return;
  if (job.polling) { await job.polling; return; }
  if (Date.now() - job.lastPoll < 2500) return;
  job.lastPoll = Date.now();
  job.polling = (async () => {
    try {
      const result = await youcam(`/task/makeup-vto/${encodeURIComponent(job.taskId!)}`);
      const data = result.data;
      if (data?.task_status === "success") {
        // Current OpenAPI response: data.task_status and data.results.url.
        const url = data.results?.url;
        if (typeof url !== "string" || !url.startsWith("https://")) throw new Error("YouCam returned no downloadable result.");
        job.status = "success"; job.downloadUrl = url; job.error = undefined;
      } else if (data?.task_status === "error") {
        logger.error({ taskId: job.taskId, providerBody: JSON.stringify(data ?? null).slice(0, 16000) }, "YouCam rendering task failed");
        job.status = "error";
        job.error = "YouCam couldn't render this photo. Your look is saved. Try good light with your entire face centered, then retry.";
      } else if (data?.task_status !== "running") {
        logger.error({ taskId: job.taskId, providerBody: JSON.stringify(data ?? null).slice(0, 16000) }, "YouCam returned an unexpected task status");
        job.error = "The preview status is not available yet. Your look is saved; check this same preview again before starting another.";
      }
    } catch {
      // Transient GET failures don't trigger a new paid render.
      job.error = "The status connection was interrupted. Still checking this same task; no extra render was sent.";
    }
  })();
  await job.polling;
  job.polling = undefined;
}
router.get("/youcam/jobs/:jobId", async (req, res): Promise<void> => {
  const parsed = GetRenderJobParams.safeParse(req.params);
  const job = parsed.success ? jobs.get(parsed.data.jobId) : undefined;
  if (!job || job.owner !== owner(req)) { res.status(404).json({ error: "This render session has expired. Your locally saved look is unchanged." }); return; }
  await refresh(job);
  res.json(GetRenderJobResponse.parse(output(job)));
});
router.get("/youcam/jobs/:jobId/image", async (req, res): Promise<void> => {
  const job = jobs.get(String(req.params.jobId));
  if (!job || job.owner !== owner(req) || job.status !== "success" || !job.downloadUrl) {
    res.status(404).json({ error: "This preview is not available. Your look is still saved." }); return;
  }
  try {
    // Only provider-returned URLs can reach here; callers cannot supply URLs.
    const url = new URL(job.downloadUrl);
    if (url.protocol !== "https:" || url.username || url.password || url.port ||
        !/\.(makeupar\.com|perfectcorp\.com|amazonaws\.com|cloudfront\.net)$/.test(url.hostname)) {
      throw new Error("The provider's image host is not on this server's allowlist.");
    }
    const result = await fetch(url, { signal: AbortSignal.timeout(25000), redirect: "error" });
    const type = result.headers.get("content-type") || "";
    if (!result.ok || !result.body || !/^image\/(jpeg|png|webp)/.test(type)) throw new Error("The preview could not be downloaded. Please retry downloading this same task.");
    if (Number(result.headers.get("content-length")) > 15_000_000) throw new Error("The preview exceeds the download safety limit.");
    res.setHeader("Content-Type", type);
    let bytes = 0;
    const stream = Readable.fromWeb(result.body as any);
    stream.on("data", (chunk: Buffer) => { bytes += chunk.length; if (bytes > 15_000_000) stream.destroy(new Error("Image too large")); });
    stream.on("error", () => { if (!res.headersSent) res.status(502).end(); else res.destroy(); });
    res.on("close", () => stream.destroy());
    stream.pipe(res);
  } catch (e) { error(res, e, 502); }
});
export default router;
