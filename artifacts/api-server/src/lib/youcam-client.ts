const API = "https://yce-api-01.makeupar.com/s2s/v2.0";
import { logger } from "./logger";

// Accept the user's original Replit Secret name and a normalized deployment name.
const apiKey = () => process.env.YOUCAM_API_KEY || process.env.YouCam_Key;

export const hasYouCamKey = () => Boolean(apiKey());

export function dryRunEnabled() {
  // An unset flag is a safety default, not permission to send paid requests.
  return process.env.DRY_RUN !== "false";
}

export function liveAllowed() {
  return !dryRunEnabled() && hasYouCamKey();
}

export async function youcam(path: string, body?: unknown): Promise<Record<string, any>> {
  const token = apiKey();
  if (!token) throw new Error("YouCam is not connected yet. Your look is safe; drafting and cards still work.");
  const response = await fetch(`${API}${path}`, {
    method: body === undefined ? "GET" : "POST",
    // Current Perfect Corp docs require Authorization: Bearer <API key>.
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(25000),
    redirect: "error",
  });
  const responseBody = await response.text();
  let result: Record<string, any>;
  try {
    result = JSON.parse(responseBody) as Record<string, any>;
  } catch {
    logger.error({ httpStatus: response.status, providerBody: responseBody.slice(0, 16000) }, "YouCam returned a non-JSON response");
    throw new Error("YouCam could not complete this request. Your look is saved; try again later.");
  }
  if (!response.ok || (typeof result.status === "number" && result.status >= 400)) {
    // Log a bounded upstream error body for debugging; never return it to the browser.
    logger.error({ httpStatus: response.status, providerBody: responseBody.slice(0, 16000) }, "YouCam request failed");
    throw new Error(response.status === 401 ? "YouCam could not authorize this request. Check the server API key." :
      response.status === 429 ? "YouCam is busy. Your look is saved; please try again shortly." :
      "YouCam could not complete this request. Your look is saved; please check your photo and available units before retrying.");
  }
  return result;
}
