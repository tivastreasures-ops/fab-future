import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { db, requestPersistence } from '@/lib/db';
import type { Look, StudioSettings } from '@/lib/types';

export const keys = {
  looks: ['idb', 'looks'] as const,
  look: (id: string) => ['idb', 'look', id] as const,
  settings: ['idb', 'settings'] as const,
  cards: ['idb', 'cards'] as const,
};

export function useLooks() {
  return useQuery({ queryKey: keys.looks, queryFn: db.listLooks, networkMode: 'always' });
}

export function useLook(id: string | null) {
  return useQuery({ queryKey: keys.look(id ?? ''), queryFn: () => db.getLook(id!).then((l) => l ?? null), enabled: !!id, networkMode: 'always' });
}

export function useSettings() {
  return useQuery({ queryKey: keys.settings, queryFn: db.getSettings, networkMode: 'always', staleTime: Infinity });
}

export function useSaveSettings() {
  const qc = useQueryClient();
  return useMutation({
    networkMode: 'always',
    mutationFn: async (s: StudioSettings) => {
      await db.putSettings(s);
      return s;
    },
    onSuccess: (s) => qc.setQueryData(keys.settings, s),
  });
}

export function useSaveLook() {
  const qc = useQueryClient();
  return useMutation({
    networkMode: 'always',
    mutationFn: async (look: Look) => {
      void requestPersistence();
      await db.putLook(look);
      return look;
    },
    onSuccess: (look) => {
      qc.setQueryData(keys.look(look.id), look);
      qc.invalidateQueries({ queryKey: keys.looks });
    },
  });
}

export function useDeleteLook() {
  const qc = useQueryClient();
  return useMutation({
    networkMode: 'always',
    mutationFn: (id: string) => db.deleteLook(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.looks });
      qc.invalidateQueries({ queryKey: keys.cards });
    },
  });
}

export function useCards() {
  return useQuery({ queryKey: keys.cards, queryFn: db.listCards, networkMode: 'always' });
}

/** Loads a Blob from IndexedDB and exposes a short-lived object URL. */
export function useBlobUrl(id: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    let made: string | null = null;
    setUrl(null);
    if (id) {
      db.getBlob(id)
        .then((rec) => {
          if (!alive || !rec) return;
          made = URL.createObjectURL(rec.blob);
          setUrl(made);
        })
        .catch(() => undefined);
    }
    return () => {
      alive = false;
      if (made) URL.revokeObjectURL(made);
    };
  }, [id]);
  return url;
}

/** Object URL for an in-memory Blob. */
export function useObjectUrl(blob: Blob | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!blob) {
      setUrl(null);
      return;
    }
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return url;
}
