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

function requireObject(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function requireNumber(record: Record<string, unknown>, field: string, label: string) {
  const value = record[field];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label}.${field} must be a finite number; null, missing, or text values are not allowed.`);
  }
}

/** Reject incomplete or non-numeric provider fields before comparing or submitting a recipe. */
export function assertPayloadFields(value: unknown) {
  const payload = requireObject(value, "Payload");
  if (payload.src_file_id === null || payload.src_file_id === undefined || typeof payload.src_file_id !== "string") {
    throw new Error("Payload.src_file_id must be a string.");
  }
  if (!Array.isArray(payload.effects)) throw new Error("Payload.effects must be an array.");
  const effects = payload.effects.map((effect) => requireObject(effect, "Payload effect"));
  const skin = effects.find((effect) => effect.category === "skin_smooth");
  if (!skin) throw new Error("Payload is missing skin_smooth.");
  requireNumber(skin, "skinSmoothStrength", "skin_smooth");
  requireNumber(skin, "skinSmoothColorIntensity", "skin_smooth");

  const lips = effects.find((effect) => effect.category === "lip_color");
  if (!lips) throw new Error("Payload is missing lip_color.");
  const shape = requireObject(lips.shape, "lip_color.shape");
  const style = requireObject(lips.style, "lip_color.style");
  if (typeof shape.name !== "string" || shape.name.length === 0) throw new Error("lip_color.shape.name is required.");
  if (style.type !== "full") throw new Error("Only full-style lipstick is supported.");
  if (!Array.isArray(lips.palettes) || lips.palettes.length !== 1) throw new Error("lip_color requires one palette.");
  const palette = requireObject(lips.palettes[0], "lip_color.palette");
  if (typeof palette.color !== "string" || !/^#[0-9a-fA-F]{6}$/.test(palette.color)) {
    throw new Error("lip_color.palette.color must be a six-digit hex color.");
  }
  if (typeof palette.texture !== "string") throw new Error("lip_color.palette.texture is required.");
  requireNumber(palette, "colorIntensity", "lip_color.palette");
  if (["gloss", "holographic", "metallic", "sheer", "shimmer"].includes(palette.texture)) {
    requireNumber(palette, "gloss", "lip_color.palette");
  }
  if (["holographic", "metallic", "shimmer"].includes(palette.texture)) {
    if (typeof palette.shimmerColor !== "string" || !/^#[0-9a-fA-F]{6}$/.test(palette.shimmerColor)) {
      throw new Error("lip_color.palette.shimmerColor must be a six-digit hex color.");
    }
    requireNumber(palette, "shimmerIntensity", "lip_color.palette");
    requireNumber(palette, "shimmerDensity", "lip_color.palette");
    requireNumber(palette, "shimmerSize", "lip_color.palette");
  }
  if (["gloss", "sheer", "shimmer"].includes(palette.texture)) {
    requireNumber(palette, "transparencyIntensity", "lip_color.palette");
  }
}

function canonical(value: unknown): string {
  if (value === null || value === undefined) throw new Error("Null or missing payload values are not allowed.");
  if (typeof value === "number" && !Number.isFinite(value)) throw new Error("Payload numbers must be finite.");
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (typeof value === "object") {
    return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function assertExactPayload(expected: unknown, actual: unknown) {
  assertPayloadFields(expected);
  assertPayloadFields(actual);
  if (canonical(expected) !== canonical(actual)) {
    throw new Error("The submitted recipe does not match your selections. Please review it again; no render was sent.");
  }
}
