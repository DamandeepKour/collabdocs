"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PresenceUser } from "@/features/realtime/presence-hub";
import type { ConnectionState } from "@/types";

export function usePresence(documentId: string | undefined, enabled: boolean) {
  const [users, setUsers] = useState<PresenceUser[]>([]);
  const [connection, setConnection] = useState<ConnectionState>("offline");
  const esRef = useRef<EventSource | null>(null);
  const backoff = useRef(1000);

  const connect = useCallback(() => {
    if (!documentId || !enabled) return;
    setConnection("reconnecting");
    const es = new EventSource(`/api/realtime/presence?documentId=${documentId}`);
    esRef.current = es;

    es.onopen = () => {
      setConnection("connected");
      backoff.current = 1000;
    };

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as { users: PresenceUser[] };
        setUsers(data.users);
      } catch {
        /* ignore malformed */
      }
    };

    es.onerror = () => {
      es.close();
      setConnection("reconnecting");
      const delay = backoff.current;
      backoff.current = Math.min(delay * 2, 15_000);
      setTimeout(connect, delay);
    };
  }, [documentId, enabled]);

  useEffect(() => {
    connect();
    return () => {
      esRef.current?.close();
      if (documentId) {
        void fetch("/api/realtime/presence", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documentId }),
        });
      }
    };
  }, [connect, documentId]);

  const sendCursor = useCallback(
    async (cursor: { from: number; to: number } | null, typing: boolean) => {
      if (!documentId) return;
      await fetch("/api/realtime/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId, cursor, typing }),
      });
    },
    [documentId],
  );

  return { users, connection, sendCursor };
}
