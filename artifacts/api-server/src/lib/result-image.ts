import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { request } from 'node:https';

export const IMAGE_LIMIT = 15_000_000;
const REDIRECTS = new Set([301, 302, 303, 307, 308]);
export type ImageReason = 'INVALID_URL' | 'HTTPS_REQUIRED' | 'HOST_NOT_ALLOWED' |
  'PRIVATE_ADDRESS' | 'DNS_FAILED' | 'REDIRECT_LIMIT' | 'REDIRECT_INVALID' |
  'UPSTREAM_HTTP' | 'CONTENT_TYPE' | 'SIZE_LIMIT' | 'EMPTY_IMAGE' | 'IMAGE_SIGNATURE_INVALID' |
  'DOWNLOAD_TIMEOUT' | 'DOWNLOAD_NETWORK';
export interface ImageDiagnostic {
  reason: ImageReason;
  host: string | null;
  httpStatus: number | null;
  contentType: string | null;
  redirectReturned: boolean;
}
export class ResultImageError extends Error {
  constructor(readonly diagnostic: ImageDiagnostic) {
    super(`Preview download unavailable (${diagnostic.reason}). Check this same preview again; no new render is needed.`);
  }
}
interface Address { address: string; family: number }
interface ImageResponse {
  status: number;
  headers: Record<string, string | undefined>;
  body: AsyncIterable<Uint8Array>;
  close(): void;
}
interface Dependencies {
  timeoutMs: number;
  resolve(host: string): Promise<Address[]>;
  open(url: URL, address: Address, signal: AbortSignal): Promise<ImageResponse>;
}

// Conservatively accept public unicast only, including every DNS answer. Deny
// mapped IPv4 / local IPv6, special networks and metadata endpoints.
export function publicAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const [a, b, c] = address.split('.').map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && (b === 168 || b === 0 || (b === 88 && c === 99))) ||
      (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
      (a === 203 && b === 0 && c === 113));
  }
  if (isIP(address) === 6) {
    const canonical = new URL(`http://[${address}]/`).hostname.slice(1, -1);
    const [first, second] = canonical.split(':').map(v => parseInt(v || '0', 16));
    return first >= 0x2000 && first <= 0x3fff &&
      !(first === 0x2001 && (second < 0x200 || second === 0xdb8)) &&
      first !== 0x2002 && first !== 0x3fff;
  }
  return false;
}

const defaults: Dependencies = {
  timeoutMs: 25_000,
  resolve: (host) => lookup(host, { all: true, verbatim: true }),
  open: (url, address, signal) => new Promise((resolve, reject) => {
    // Pin the validated DNS answer to this connection, avoiding DNS rebinding.
    // TLS still verifies the URL hostname. No bearer token goes to image hosts.
    const req = request(url, {
      method: 'GET', signal, agent: false, family: address.family,
      headers: { Accept: 'image/png,image/jpeg,image/webp' },
      lookup: (_host, _options, cb) => cb(null, address.address, address.family),
    }, (res) => resolve({
      status: res.statusCode || 0,
      headers: {
        location: res.headers.location,
        'content-type': res.headers['content-type'],
        'content-length': res.headers['content-length'],
      },
      body: res,
      close: () => res.destroy(),
    }));
    req.on('error', reject);
    req.end();
  }),
};

/** Magic bytes identify supported images, not arbitrary generic binary bodies.
 * This is a format-signature check, not a full image decoder.
 */
function signedImageType(bytes: Buffer): string | null {
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'image/png';
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 12 && bytes.subarray(0, 4).equals(Buffer.from('RIFF')) &&
      bytes.subarray(8, 12).equals(Buffer.from('WEBP'))) return 'image/webp';
  return null;
}

/**
 * Only call with the URL saved from the authenticated provider task response,
 * NEVER a client-supplied URL. Trust that exact public host plus vendor domains;
 * do not broadly allow arbitrary cloud storage tenants or redirect hosts.
 */
export async function downloadResultImage(providerUrl: string, injected: Partial<Dependencies> = {}) {
  const deps = { ...defaults, ...injected };
  const signal = AbortSignal.timeout(deps.timeoutMs); // Whole chain, DNS and body included.
  let diagnostic: Omit<ImageDiagnostic, 'reason'> = {
    host: null, httpStatus: null, contentType: null, redirectReturned: false,
  };
  const fail = (reason: ImageReason): never => { throw new ResultImageError({ ...diagnostic, reason }); };
  const parse = (raw: string, base?: URL) => {
    try { return new URL(raw, base); } catch { return fail(base ? 'REDIRECT_INVALID' : 'INVALID_URL'); }
  };
  const initial = parse(providerUrl);
  let url = initial;
  const vendor = (host: string) => /(^|\.)(makeupar\.com|perfectcorp\.com)$/.test(host);
  try {
    for (let hop = 0; ; hop++) {
      diagnostic = { host: url.hostname, httpStatus: null, contentType: null, redirectReturned: false };
      if (url.protocol !== 'https:' || url.username || url.password || url.port) fail('HTTPS_REQUIRED');
      if (isIP(url.hostname.replace(/^\[|\]$/g, '')) ||
          url.hostname === 'localhost' || url.hostname.endsWith('.localhost') ||
          !url.hostname.includes('.')) fail('PRIVATE_ADDRESS');
      if (url.hostname !== initial.hostname && !vendor(url.hostname)) fail('HOST_NOT_ALLOWED');
      let addresses: Address[];
      try {
        addresses = await Promise.race([
          deps.resolve(url.hostname),
          new Promise<never>((_, reject) => {
            if (signal.aborted) reject(new Error('Timeout'));
            else signal.addEventListener('abort', () => reject(new Error('Timeout')), { once: true });
          }),
        ]);
      } catch { return fail(signal.aborted ? 'DOWNLOAD_TIMEOUT' : 'DNS_FAILED'); }
      if (!addresses.length) fail('DNS_FAILED');
      if (!addresses.every(a => publicAddress(a.address))) fail('PRIVATE_ADDRESS');
      const response = await deps.open(url, addresses[0], signal);
      const type = (response.headers['content-type'] || '').trim().toLowerCase();
      // Log normalized MIME only, never raw error bodies or arbitrary headers.
      diagnostic.httpStatus = response.status;
      diagnostic.contentType = /^[a-z0-9.+-]+\/[a-z0-9.+-]+(?:;|$)/.test(type) ? type.split(';')[0] : null;
      diagnostic.redirectReturned = REDIRECTS.has(response.status);
      try {
        if (diagnostic.redirectReturned) {
          if (hop >= 3) fail('REDIRECT_LIMIT');
          const location = response.headers.location;
          if (!location) return fail('REDIRECT_INVALID');
          url = parse(location, url);
          diagnostic.host = url.hostname;
          // Validate before resetting response diagnostics on the next hop.
          if (url.protocol !== 'https:' || url.username || url.password || url.port) fail('HTTPS_REQUIRED');
          if (url.hostname !== initial.hostname && !vendor(url.hostname)) fail('HOST_NOT_ALLOWED');
          continue;
        }
        if (response.status < 200 || response.status >= 300) fail('UPSTREAM_HTTP');
        const genericBinary = /^(?:binary|application)\/octet-stream(?:;|$)/.test(type);
        if (!genericBinary && !/^image\/(?:jpeg|png|webp)(?:;|$)/.test(type)) fail('CONTENT_TYPE');
        if (Number(response.headers['content-length']) > IMAGE_LIMIT) fail('SIZE_LIMIT');
        const chunks: Buffer[] = [];
        let size = 0;
        for await (const chunk of response.body) {
          size += chunk.byteLength;
          if (size > IMAGE_LIMIT) fail('SIZE_LIMIT');
          chunks.push(Buffer.from(chunk));
        }
        if (!size) fail('EMPTY_IMAGE');
        const bytes = Buffer.concat(chunks);
        // Generic storage headers are allowed only when the bounded body starts
        // with a supported image signature. Never trust a filename or URL suffix.
        const contentType = genericBinary ? signedImageType(bytes) : type.split(';')[0];
        if (!contentType) return fail('IMAGE_SIGNATURE_INVALID');
        return { bytes, contentType };
      } finally { response.close(); }
    }
  } catch (e) {
    if (e instanceof ResultImageError) throw e;
    return fail(signal.aborted ? 'DOWNLOAD_TIMEOUT' : 'DOWNLOAD_NETWORK');
  }
}
