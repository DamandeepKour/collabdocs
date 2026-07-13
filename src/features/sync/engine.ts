"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { nanoid } from "nanoid";
import {
  localDocumentStore,
  localSyncQueue,
  setMeta,
} from "@/features/offline/db";
import type { LocalDocument, SyncOperation } from "@/types";
import type { SyncStatusUi } from "@/constants";
import { SYNC_CONFIG } from "@/config/app";
import { computeBackoffMs } from "@/utils";

function subscribeOnline(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

function getOnlineSnapshot() {
  return navigator.onLine;
}

function getServerOnlineSnapshot() {
  return true;
}

async function clearDocumentQueue(documentId: string) {
  const ops = await localSyncQueue.listForDocument(documentId);
  await Promise.all(ops.map((op) => localSyncQueue.remove(op.id)));
}

/**
 * Sync engine with coalesced queue (one pending op per doc) so rapid typing
 * never stacks stale baseVersions and false-conflicts against yourself.
 */
export function useSyncEngine() {
  const online = useSyncExternalStore(
    subscribeOnline,
    getOnlineSnapshot,
    getServerOnlineSnapshot,
  );
  const [status, setStatus] = useState<SyncStatusUi>("idle");
  const [pendingCount, setPendingCount] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const [conflictServerVersion, setConflictServerVersion] = useState<
    number | null
  >(null);
  const draining = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshPending = useCallback(async () => {
    const ops = await localSyncQueue.list();
    setPendingCount(ops.length);
  }, []);

  const drainQueue = useCallback(async () => {
    if (draining.current || !navigator.onLine) return;
    draining.current = true;
    setStatus("syncing");

    try {
      // Process newest-first per document by coalescing as we go
      let ops = await localSyncQueue.list();
      ops = ops.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );

      for (const op of ops) {
        // Always read latest local doc — content + version are source of truth
        const doc = await localDocumentStore.get(op.documentId);
        if (!doc) {
          await localSyncQueue.remove(op.id);
          continue;
        }

        const payload = {
          clientId: op.clientId,
          documentId: op.documentId,
          // Use live IndexedDB version, not the stale value captured at enqueue
          baseVersion: doc.version,
          operation: op.type,
          title: doc.title,
          content: doc.content,
        };

        try {
          const res = await fetch("/api/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const json = await res.json();

          if (res.status === 409) {
            const serverVersion =
              (json?.error?.details?.serverVersion as number | undefined) ??
              null;
            setConflictServerVersion(serverVersion);
            setStatus("conflict");
            setLastError("Version conflict — choose how to resolve");
            await localSyncQueue.update({
              ...op,
              attempts: op.attempts + 1,
              baseVersion: doc.version,
            });
            break;
          }

          if (!res.ok || !json.ok) {
            throw new Error(json?.error?.message ?? "Sync failed");
          }

          const serverVersion = json.data.version as number;
          await localDocumentStore.put({
            ...doc,
            version: serverVersion,
            contentHash: json.data.contentHash,
            isDirty: false,
            lastSyncedAt: new Date().toISOString(),
          });
          await localSyncQueue.remove(op.id);
          await setMeta("lastSyncAt", new Date().toISOString());
          setConflictServerVersion(null);
        } catch (err) {
          const attempts = op.attempts + 1;
          await localSyncQueue.update({ ...op, attempts });
          setLastError(err instanceof Error ? err.message : "Sync error");
          setStatus(navigator.onLine ? "error" : "offline");
          const delay = computeBackoffMs(
            attempts,
            SYNC_CONFIG.backoffBaseMs,
            SYNC_CONFIG.backoffMaxMs,
          );
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => {
            void drainQueue();
          }, delay);
          break;
        }
      }

      const remaining = await localSyncQueue.list();
      setPendingCount(remaining.length);
      if (remaining.length === 0) {
        setStatus(navigator.onLine ? "synced" : "offline");
        setLastError(null);
        setConflictServerVersion(null);
      }
    } finally {
      draining.current = false;
    }
  }, []);

  const enqueueUpdate = useCallback(
    async (doc: LocalDocument) => {
      // Coalesce: drop prior pending ops for this doc so we never stack versions
      await clearDocumentQueue(doc.id);

      // Re-read version from IDB in case a sync just landed
      const latest = (await localDocumentStore.get(doc.id)) ?? doc;
      const next: LocalDocument = {
        ...doc,
        version: latest.version,
        isDirty: true,
        updatedAt: new Date().toISOString(),
      };
      await localDocumentStore.put(next);

      const op: SyncOperation = {
        id: nanoid(),
        clientId: nanoid(),
        documentId: next.id,
        type: "update",
        payload: { title: next.title, content: next.content },
        baseVersion: next.version,
        createdAt: new Date().toISOString(),
        attempts: 0,
      };
      await localSyncQueue.enqueue(op);
      await refreshPending();
      setStatus(navigator.onLine ? "pending" : "offline");
      setConflictServerVersion(null);

      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        void drainQueue();
      }, SYNC_CONFIG.debounceMs);
    },
    [drainQueue, refreshPending],
  );

  const resolveConflictKeepLocal = useCallback(
    async (documentId: string, serverVersionHint?: number | null) => {
      const doc = await localDocumentStore.get(documentId);
      if (!doc) return;

      let serverVersion = serverVersionHint ?? conflictServerVersion;
      if (serverVersion == null) {
        const res = await fetch(`/api/sync?documentId=${documentId}`);
        const json = await res.json();
        serverVersion =
          json?.data?.document?.version ??
          json?.data?.version ??
          doc.version;
      }

      await clearDocumentQueue(documentId);
      const rebased: LocalDocument = {
        ...doc,
        version: Number(serverVersion),
        isDirty: true,
        updatedAt: new Date().toISOString(),
      };
      await localDocumentStore.put(rebased);
      setConflictServerVersion(null);
      setStatus("pending");
      await enqueueUpdate(rebased);
    },
    [conflictServerVersion, enqueueUpdate],
  );

  const resolveConflictTakeServer = useCallback(
    async (documentId: string) => {
      const res = await fetch(`/api/sync?documentId=${documentId}`);
      const json = await res.json();
      if (!json.ok) return;

      const remote =
        json.data.status === "update"
          ? json.data.document
          : json.data.document;

      if (!remote?.id) {
        // up_to_date — just clear queue
        await clearDocumentQueue(documentId);
        setStatus("synced");
        setConflictServerVersion(null);
        setLastError(null);
        await refreshPending();
        return;
      }

      const existing = await localDocumentStore.get(documentId);
      await localDocumentStore.put({
        id: remote.id,
        title: remote.title,
        content: remote.content,
        version: remote.version,
        contentHash: remote.contentHash,
        ownerId: existing?.ownerId ?? "",
        updatedAt: remote.updatedAt,
        createdAt: existing?.createdAt ?? remote.updatedAt,
        isDirty: false,
        lastSyncedAt: new Date().toISOString(),
      });
      await clearDocumentQueue(documentId);
      await refreshPending();
      setStatus("synced");
      setLastError(null);
      setConflictServerVersion(null);
      return remote as {
        title: string;
        content: unknown;
        version: number;
        contentHash?: string | null;
      };
    },
    [refreshPending],
  );

  useEffect(() => {
    void refreshPending();
    if (online) void drainQueue();
    else setStatus("offline");
  }, [online, drainQueue, refreshPending]);

  return {
    online,
    status,
    pendingCount,
    lastError,
    conflictServerVersion,
    enqueueUpdate,
    drainQueue,
    resolveConflictKeepLocal,
    resolveConflictTakeServer,
  };
}
