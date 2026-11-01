const SAFE_CODES = new Set([
  'INVALID_URL', 'HTTPS_REQUIRED', 'HOST_NOT_ALLOWED', 'PRIVATE_ADDRESS',
  'DNS_FAILED', 'REDIRECT_LIMIT', 'REDIRECT_INVALID', 'UPSTREAM_HTTP',
  'CONTENT_TYPE', 'SIZE_LIMIT', 'EMPTY_IMAGE', 'DOWNLOAD_TIMEOUT', 'DOWNLOAD_NETWORK',
]);
export class PreviewSessionExpired extends Error {}

/** Never surface an arbitrary server/error-page body (or signed URL) to users. */
export async function previewBlob(response: Response): Promise<Blob> {
  if (response.ok) return response.blob();
  const body = await response.json().catch(() => null);
  if (response.status === 404 && body?.code === 'JOB_EXPIRED') throw new PreviewSessionExpired();
  const code = SAFE_CODES.has(body?.code) ? body.code : 'DOWNLOAD_UNAVAILABLE';
  throw new Error(`Preview download unavailable (${code}).`);
}

export function expiredPreviewQuery(error: unknown): boolean {
  return !!error && typeof error === 'object' && 'status' in error && error.status === 404;
}

export const EXPIRED_PREVIEW_MESSAGE =
  'This preview session is no longer available; the server may have restarted. Your saved look is safe. Checking cannot recover it here. To see a new preview, start and confirm a new render; it may use another unit.';
