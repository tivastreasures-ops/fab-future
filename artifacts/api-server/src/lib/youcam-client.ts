const API = "https://yce-api-01.makeupar.com/s2s/v2.0";
// Accept the user's original Replit Secret name and a normalized deployment name.
const apiKey = () => process.env.YOUCAM_API_KEY || process.env.YouCam_Key;

export const hasYouCamKey = () => Boolean(apiKey());

export function liveAllowed() {
  // Without a setting, every request still defaults to dry-run. Explicit true is
  // an operator hard lock; only a deliberately confirmed request may otherwise run.
  return process.env.DRY_RUN !== "true" && hasYouCamKey();
}

export async function youcam(path: string, body?: unknown): Promise<Record<string, any>> {
  const token = apiKey();
  if (!token) throw new Error("YouCam is not connected yet. Your look is safe; drafting and cards still work.");
  const response = await fetch(`${API}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(25000),
    redirect: "error",
  });
  const result = await response.json() as Record<string, any>;
  if (!response.ok || (typeof result.status === "number" && result.status >= 400)) {
    // Never log upstream bodies, URLs, headers or credentials.
    throw new Error(response.status === 401 ? "YouCam could not authorize this request. Check the server API key." :
      response.status === 429 ? "YouCam is busy. Your look is saved; please try again shortly." :
      "YouCam could not complete this request. Your look is saved; please check your photo and available units before retrying.");
  }
  return result;
}
