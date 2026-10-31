/**
 * Provider schema: https://docs.perfectcorp.com/_bundle/reference/makeup_vto.yaml
 * Do not omit skin_smooth: the provider then applies strength 50 by default.
 * "original" is required by the schema and preserves the existing lip boundary;
 * no morphology/fullness/wrinkle edits are requested.
 */
export type Finish = "matte" | "satin" | "gloss" | "sheer" | "shimmer" | "metallic" | "holographic";
export const UNUPLOADED = "PHOTO_UPLOADED_AFTER_CONFIRMATION";

export function buildPayload(hex: string, finish: Finish, sourceFileId = UNUPLOADED) {
  const palette: Record<string, string | number> = {
    color: hex,
    texture: finish,
    colorIntensity: 80,
  };
  if (["gloss", "holographic", "metallic", "sheer", "shimmer"].includes(finish)) {
    palette.gloss = 70;
  }
  if (["gloss", "sheer", "shimmer"].includes(finish)) {
    palette.transparencyIntensity = 30;
  }
  if (["holographic", "metallic", "shimmer"].includes(finish)) {
    // No unrelated gray default: the sparkle uses the artist's own color.
    palette.shimmerColor = hex;
    palette.shimmerIntensity = 50;
    palette.shimmerDensity = 50;
    palette.shimmerSize = 50;
  }
  return {
    src_file_id: sourceFileId,
    effects: [
      { category: "skin_smooth", skinSmoothStrength: 0, skinSmoothColorIntensity: 0 },
      {
        category: "lip_color",
        shape: { name: "original" },
        style: { type: "full" },
        palettes: [palette],
      },
    ],
    version: "1.0",
  };
}

function canonical(value: unknown): string {
  if (value === null || value === undefined) throw new Error("Null or missing payload values are not allowed.");
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (typeof value === "object") {
    return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function assertExactPayload(expected: unknown, actual: unknown) {
  if (canonical(expected) !== canonical(actual)) {
    throw new Error("The submitted recipe does not match your selections. Please review it again; no render was sent.");
  }
}
