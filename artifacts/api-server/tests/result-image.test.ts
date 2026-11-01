import { test } from 'node:test';
import assert from 'node:assert/strict';
import { downloadResultImage, IMAGE_LIMIT, publicAddress, ResultImageError } from '../src/lib/result-image';
import {
  EXPIRED_PREVIEW_MESSAGE, PreviewSessionExpired, expiredPreviewQuery, previewBlob,
} from '../../fabulous-future-me/src/lib/preview-download';

// Every DNS lookup and HTTP request below is mocked. No provider/API calls.
const source = 'https://output.vendor-storage.example/result.png?token=DO_NOT_LOG';
function fixture(steps: Array<{
  status?: number; headers?: Record<string, string>; chunks?: Uint8Array[];
  error?: Error; streamError?: boolean;
}> = [{}]) {
  const requests: string[] = [];
  let closed = 0;
  return {
    requests, closed: () => closed,
    deps: {
      resolve: async () => [{ address: '8.8.8.8', family: 4 }],
      open: async (url: URL) => {
        requests.push(url.href);
        const step = steps[requests.length - 1];
        if (!step) throw new Error('Unexpected request');
        if (step.error) throw step.error;
        return {
          status: step.status ?? 200,
          headers: { 'content-type': 'image/png', ...step.headers },
          body: (async function* () {
            yield* step.chunks ?? [Buffer.from('mock image')];
            if (step.streamError) throw new Error('stream token=DO_NOT_LOG');
          })(),
          close: () => { closed++; },
        };
      },
    },
  };
}
async function failure(reason: string, url: string, f = fixture(), extra = {}) {
  let caught: ResultImageError | undefined;
  await assert.rejects(downloadResultImage(url, { ...f.deps, ...extra }), e => {
    assert.ok(e instanceof ResultImageError);
    assert.equal(e.diagnostic.reason, reason);
    assert.equal(JSON.stringify(e.diagnostic).includes('DO_NOT_LOG'), false);
    assert.equal(e.message.includes('DO_NOT_LOG'), false);
    caught = e;
    return true;
  });
  return caught!;
}

test('direct result supports provider-named public storage and pins validated IP', async () => {
  const f = fixture();
  let pinned = '';
  const open = f.deps.open;
  const result = await downloadResultImage(source, { ...f.deps, open: async (url, address) => {
    pinned = address.address; return open(url);
  } });
  assert.equal(result.contentType, 'image/png');
  assert.equal(result.bytes.toString(), 'mock image');
  assert.equal(pinned, '8.8.8.8');
  assert.equal(f.closed(), 1);
});
test('allows three HTTPS redirects within exact storage host / vendor domains', async () => {
  const f = fixture([
    { status: 302, headers: { location: '/second' } },
    { status: 307, headers: { location: 'https://cdn.perfectcorp.com/third?token=DO_NOT_LOG' } },
    { status: 301, headers: { location: 'https://cdn.makeupar.com/final' } },
    { headers: { 'content-type': 'image/jpeg; charset=binary' } },
  ]);
  assert.equal((await downloadResultImage(source, f.deps)).contentType, 'image/jpeg');
  assert.equal(f.requests.length, 4);
  assert.equal(f.closed(), 4);
});
test('fourth redirect stops without requesting another host', async () => {
  const f = fixture(Array.from({ length: 4 }, () => ({ status: 302, headers: { location: '/again' } })));
  const e = await failure('REDIRECT_LIMIT', source, f);
  assert.equal(f.requests.length, 4);
  assert.equal(e.diagnostic.redirectReturned, true);
  assert.equal(e.diagnostic.httpStatus, 302);
});
test('blocks arbitrary redirect host, including another cloud-storage tenant', async () => {
  for (const host of ['attacker.example', 'perfectcorp.com.attacker.example', 'other.s3.amazonaws.com']) {
    const f = fixture([{ status: 302, headers: { location: `https://${host}/?token=DO_NOT_LOG` } }]);
    const e = await failure('HOST_NOT_ALLOWED', source, f);
    assert.equal(e.diagnostic.host, host);
    assert.equal(e.diagnostic.redirectReturned, true);
    assert.equal(f.requests.length, 1);
  }
});
test('rejects malformed URLs, HTTP, credentials and custom ports', async () => {
  await failure('INVALID_URL', 'not a URL');
  for (const url of ['http://cdn.perfectcorp.com/image', 'https://user:password@cdn.perfectcorp.com/image', 'https://cdn.perfectcorp.com:444/image']) {
    await failure('HTTPS_REQUIRED', url);
  }
  await failure('HTTPS_REQUIRED', source, fixture([{ status: 302, headers: { location: 'http://cdn.perfectcorp.com/image' } }]));
});
test('rejects missing / malformed redirect location', async () => {
  await failure('REDIRECT_INVALID', source, fixture([{ status: 302 }]));
  await failure('REDIRECT_INVALID', source, fixture([{ status: 302, headers: { location: 'https://[' } }]));
});
test('rejects local, private, metadata and literal address destinations before HTTP', async () => {
  for (const host of ['localhost', 'local.localhost', '127.0.0.1', '169.254.169.254', '[::1]', '[::ffff:127.0.0.1]']) {
    const f = fixture();
    await failure('PRIVATE_ADDRESS', `https://${host}/photo?token=DO_NOT_LOG`, f);
    assert.equal(f.requests.length, 0);
  }
  for (const ip of ['10.0.0.1', '172.16.0.1', '192.168.0.1', '100.64.0.1', 'fc00::1', 'fe80::1', '2001:0db8::1', '::ffff:10.0.0.1']) {
    assert.equal(publicAddress(ip), false);
    const f = fixture();
    await failure('PRIVATE_ADDRESS', source, f, { resolve: async () => [{ address: ip, family: ip.includes(':') ? 6 : 4 }] });
    assert.equal(f.requests.length, 0);
  }
  assert.equal(publicAddress('2606:4700::1111'), true);
});
test('rejects private DNS answers after redirect and mixed public/private answers', async () => {
  const f = fixture([{ status: 302, headers: { location: 'https://cdn.perfectcorp.com/result' } }]);
  await failure('PRIVATE_ADDRESS', source, f, { resolve: async (host: string) =>
    [{ address: host === 'cdn.perfectcorp.com' ? '10.0.0.1' : '8.8.8.8', family: 4 }] });
  assert.equal(f.requests.length, 1);
  await failure('PRIVATE_ADDRESS', source, fixture(), { resolve: async () =>
    [{ address: '8.8.8.8', family: 4 }, { address: '127.0.0.1', family: 4 }] });
});
test('DNS errors and empty DNS answers produce safe codes', async () => {
  await failure('DNS_FAILED', source, fixture(), { resolve: async () => { throw new Error(source); } });
  await failure('DNS_FAILED', source, fixture(), { resolve: async () => [] });
});
test('records upstream status and normalized MIME, not signed URL/error body', async () => {
  const e = await failure('UPSTREAM_HTTP', source, fixture([{ status: 403, headers: { 'content-type': 'text/html; token=DO_NOT_LOG' } }]));
  assert.deepEqual(e.diagnostic, {
    reason: 'UPSTREAM_HTTP', host: 'output.vendor-storage.example',
    httpStatus: 403, contentType: 'text/html', redirectReturned: false,
  });
});
test('enforces image content-type, including missing and deceptive values', async () => {
  for (const type of ['', 'text/html', 'image/png-evil', 'application/octet-stream']) {
    await failure('CONTENT_TYPE', source, fixture([{ headers: { 'content-type': type } }]));
  }
});
test('enforces declared size and streamed size without trusting Content-Length', async () => {
  await failure('SIZE_LIMIT', source, fixture([{ headers: { 'content-length': String(IMAGE_LIMIT + 1) } }]));
  await failure('SIZE_LIMIT', source, fixture([{ chunks: [Buffer.alloc(IMAGE_LIMIT), Buffer.alloc(1)] }]));
});
test('handles empty body, request failures and midstream failures', async () => {
  await failure('EMPTY_IMAGE', source, fixture([{ chunks: [] }]));
  await failure('DOWNLOAD_NETWORK', source, fixture([{ error: new Error(source) }]));
  const f = fixture([{ streamError: true }]);
  await failure('DOWNLOAD_NETWORK', source, f);
  assert.equal(f.closed(), 1);
});
test('deadline covers DNS and a transport waiting on headers', async () => {
  // A ref'ed timer keeps Node alive while AbortSignal.timeout's unref'ed timer runs.
  const keepAlive = setInterval(() => {}, 1000);
  try {
    await failure('DOWNLOAD_TIMEOUT', source, fixture(), {
      timeoutMs: 5, resolve: async () => new Promise(() => {}),
    });
    await failure('DOWNLOAD_TIMEOUT', source, fixture(), {
      timeoutMs: 5, open: async (_url: URL, _address: unknown, signal: AbortSignal) =>
        new Promise((_, reject) => signal.addEventListener('abort', () => reject(new Error('Timeout')), { once: true })),
    });
  } finally { clearInterval(keepAlive); }
});
test('frontend exposes only allowlisted reason code and retries download independently', async () => {
  for (let i = 0; i < 2; i++) {
    await assert.rejects(previewBlob(new Response(JSON.stringify({
      code: 'HOST_NOT_ALLOWED', error: source,
    }), { status: 502 })), /HOST_NOT_ALLOWED/);
  }
  await assert.rejects(previewBlob(new Response(source, { status: 502 })), /DOWNLOAD_UNAVAILABLE/);
  await assert.rejects(previewBlob(new Response(JSON.stringify({ code: source }), { status: 502 })), /DOWNLOAD_UNAVAILABLE/);
  assert.equal(await (await previewBlob(new Response('image'))).text(), 'image');
});
test('expired server jobs get clear recovery handling, never an automatic render', async () => {
  await assert.rejects(previewBlob(new Response(JSON.stringify({ code: 'JOB_EXPIRED' }), { status: 404 })), PreviewSessionExpired);
  assert.equal(expiredPreviewQuery({ status: 404 }), true);
  assert.equal(expiredPreviewQuery({ status: 502 }), false);
  assert.match(EXPIRED_PREVIEW_MESSAGE, /new render.*another unit/);
});
