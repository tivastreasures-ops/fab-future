import { useEffect, useRef, useState } from 'react';
import {
  getGetRenderJobQueryKey,
  useCreateRender,
  useGetRenderJob,
  usePrepareUpload,
  useValidateRecipe,
} from '@workspace/api-client-react';
import { db, friendlyStorageError } from '@/lib/db';
import type { Look, RenderRecord } from '@/lib/types';
import { useSaveLook } from './use-studio';

export type Phase = 'idle' | 'validating' | 'confirm1' | 'uploading' | 'confirm2' | 'submitting' | 'polling' | 'done' | 'failed' | 'expired';
export type Mode = 'dry' | 'live';
const POLL_LIMIT_MS = 180_000;

function rid() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `req-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function errText(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e && typeof (e as { message: unknown }).message === 'string') return (e as { message: string }).message;
  return 'Something went quiet on the line.';
}

export function useRenderFlow(look: Look | null, photo: Blob | null, mode: Mode) {
  const validate = useValidateRecipe();
  const prepare = usePrepareUpload();
  const create = useCreateRender();
  const saveLook = useSaveLook();
  const saveRef = useRef(saveLook.mutateAsync);
  saveRef.current = saveLook.mutateAsync;

  const [phase, setPhase] = useState<Phase>('idle');
  const [payload, setPayload] = useState<Record<string, unknown> | null>(null);
  const [sourceFileId, setSourceFileId] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<Blob | null>(null);
  const [dryJob, setDryJob] = useState<Record<string, unknown> | null>(null);
  const busy = useRef(false);
  const lookIdRef = useRef<string | null>(null);
  const pollStart = useRef(0);

  /** Merge into the stored render record only. User selections (lipstick, name...) are never replaced. */
  const patchRender = async (patch: Partial<RenderRecord>) => {
    const id = lookIdRef.current;
    if (!id) return;
    const cur = await db.getLook(id);
    if (!cur) return;
    const base: RenderRecord = cur.render ?? { mode, originalSelections: { hex: cur.lipstick.hex, finish: cur.lipstick.finish, name: cur.name, mood: cur.mood }, submittedPayload: null, status: 'saved', timestamp: new Date().toISOString() };
    try {
      await saveRef.current({ ...cur, render: { ...base, ...patch, timestamp: new Date().toISOString() } });
    } catch (e) {
      setMessage(friendlyStorageError(e));
    }
  };

  const reset = () => {
    busy.current = false;
    setPhase('idle');
    setPayload(null);
    setSourceFileId(null);
    setJobId(null);
    setMessage(null);
    setDryJob(null);
  };

  const begin = async () => {
    if (!look || busy.current) return;
    if (mode === 'live' && !photo) {
      setMessage('Add a photo first — the live preview needs one.');
      return;
    }
    busy.current = true;
    lookIdRef.current = look.id;
    setMessage(null);
    setResult(null);
    setPhase('validating');
    // Save BEFORE render: fresh record with the original selections snapshot.
    try {
      await saveRef.current({ ...look, updatedAt: look.updatedAt, render: { mode, originalSelections: { hex: look.lipstick.hex, finish: look.lipstick.finish, name: look.name, mood: look.mood }, submittedPayload: null, status: 'saved', timestamp: new Date().toISOString() } });
    } catch (e) {
      setMessage(friendlyStorageError(e));
      setPhase('failed');
      busy.current = false;
      return;
    }
    try {
      const v = await validate.mutateAsync({ data: { hex: look.lipstick.hex, finish: look.lipstick.finish } });
      if (!v.valid) throw new Error('The studio could not validate this recipe.');
      setPayload(v.payload);
      setPhase('confirm1');
    } catch (e) {
      setMessage(`Validation did not complete: ${errText(e)}`);
      setPhase('failed');
      busy.current = false;
    }
  };

  const cancel = () => reset();

  const submit = async (expectedPayload: Record<string, unknown>, live: boolean, fileId?: string) => {
    if (!look) return;
    setPhase('submitting');
    try {
      const job = await create.mutateAsync({ data: { hex: look.lipstick.hex, finish: look.lipstick.finish, sourceFileId: fileId, expectedPayload, liveConfirmed: live, requestId: rid() } });
      await patchRender({ submittedPayload: job.payload ?? expectedPayload, jobId: job.jobId, status: job.status === 'dry_run' ? 'dry_run' : job.status === 'success' ? 'success' : job.status === 'pending' ? 'pending' : job.status, error: job.error });
      if (job.status === 'dry_run') {
        setDryJob(job as unknown as Record<string, unknown>);
        setPhase('done');
        busy.current = false;
      } else if (job.status === 'error' || job.status === 'timeout') {
        setMessage(job.error ?? 'The rendering did not come back this time.');
        setPhase('failed');
        busy.current = false;
      } else {
        pollStart.current = Date.now();
        setJobId(job.jobId);
        setPhase('polling');
      }
    } catch (e) {
      await patchRender({ status: 'error', submittedPayload: expectedPayload, error: errText(e) });
      setMessage(`The render request did not go through: ${errText(e)}`);
      setPhase('failed');
      busy.current = false;
    }
  };

  /** First confirmation: dry-run simulates; live uploads then re-validates for a second review. */
  const confirmFirst = async () => {
    if (!look || !payload) return;
    if (mode === 'dry') return submit(payload, false);
    if (!photo) return;
    setPhase('uploading');
    try {
      const ticket = await prepare.mutateAsync({ data: { fileName: 'portrait.jpg', contentType: 'image/jpeg', fileSize: photo.size, liveConfirmed: true } });
      const headers = new Headers();
      Object.entries(ticket.headers ?? {}).forEach(([k, v]) => {
        const lk = k.toLowerCase();
        if (lk !== 'content-length' && lk !== 'host') headers.set(k, v);
      });
      const up = await fetch(ticket.url, { method: ticket.method || 'PUT', headers, body: photo });
      if (!up.ok) throw new Error(`Upload was refused (${up.status}).`);
      const v = await validate.mutateAsync({ data: { hex: look.lipstick.hex, finish: look.lipstick.finish, sourceFileId: ticket.fileId } });
      if (!v.valid) throw new Error('Final validation did not pass.');
      setSourceFileId(ticket.fileId);
      setPayload(v.payload);
      setPhase('confirm2');
    } catch (e) {
      await patchRender({ status: 'error', error: errText(e) });
      setMessage(`Your photo could not be prepared: ${errText(e)}`);
      setPhase('failed');
      busy.current = false;
    }
  };

  const confirmFinal = () => {
    if (payload && sourceFileId) void submit(payload, true, sourceFileId);
  };

  const job = useGetRenderJob(jobId ?? '', { query: { queryKey: getGetRenderJobQueryKey(jobId ?? ''), enabled: !!jobId && phase === 'polling', refetchInterval: 3000, retry: 1 } });

  useEffect(() => {
    if (phase !== 'polling') return;
    const t = window.setTimeout(() => {
      setPhase((p) => (p === 'polling' ? 'expired' : p));
      busy.current = false;
      void patchRender({ status: 'timeout', error: 'Stopped waiting after 3 minutes.' });
    }, Math.max(0, POLL_LIMIT_MS - (Date.now() - pollStart.current)));
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const handled = useRef<string | null>(null);
  useEffect(() => {
    const d = job.data;
    if (!d || phase !== 'polling' || handled.current === `${d.jobId}:${d.status}`) return;
    if (d.status === 'success') {
      handled.current = `${d.jobId}:${d.status}`;
      const url = d.resultImageUrl ?? `/api/youcam/jobs/${d.jobId}/image`;
      fetch(url, { credentials: 'include' })
        .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(`Image fetch ${r.status}`))))
        .then((b) => {
          setResult(b);
          setPhase('done');
          void patchRender({ status: 'success', jobId: d.jobId });
        })
        .catch((e) => {
          setMessage(`The rendering finished but the image did not arrive: ${errText(e)}`);
          setPhase('failed');
          void patchRender({ status: 'error', error: errText(e) });
        })
        .finally(() => { busy.current = false; });
    } else if (d.status === 'error' || d.status === 'timeout') {
      handled.current = `${d.jobId}:${d.status}`;
      busy.current = false;
      setMessage(d.error ?? 'The rendering did not come back this time.');
      setPhase('failed');
      void patchRender({ status: d.status, error: d.error });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job.data, phase]);

  const keepWaiting = () => {
    if (!jobId) return;
    busy.current = true;
    pollStart.current = Date.now();
    void patchRender({ status: 'pending', error: undefined });
    setPhase('polling');
  };

  const keepResult = async () => {
    const id = lookIdRef.current;
    if (!result || !id) return false;
    const blobId = `result-${id}-${Date.now()}`;
    try {
      await db.putBlob({ id: blobId, blob: result, kind: 'result', lookId: id, createdAt: new Date().toISOString() });
      const cur = await db.getLook(id);
      if (cur?.render?.resultImageId) await db.deleteBlob(cur.render.resultImageId).catch(() => undefined);
      await patchRender({ resultImageId: blobId });
      return true;
    } catch (e) {
      setMessage(friendlyStorageError(e));
      return false;
    }
  };

  return { phase, payload, sourceFileId, message, result, dryJob, jobStatus: job.data?.status, begin, cancel, confirmFirst, confirmFinal, keepWaiting, keepResult, reset };
}
