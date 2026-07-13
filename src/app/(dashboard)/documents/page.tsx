"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { localDocumentStore } from "@/features/offline/db";
import type { LocalDocument } from "@/types";
import { formatDistanceToNow } from "date-fns";

type RemoteDoc = {
  id: string;
  title: string;
  version: number;
  ownerId: string;
  updatedAt: string;
  createdAt: string;
  contentHash?: string | null;
};

export default function DocumentsPage() {
  const router = useRouter();
  const [docs, setDocs] = useState<LocalDocument[]>([]);
  const [pending, startTransition] = useTransition();

  const hydrate = useCallback(async () => {
    // Local-first: paint from IndexedDB immediately (no network block)
    const local = await localDocumentStore.list();
    setDocs(local);

    // Background reconcile from server when online
    if (!navigator.onLine) return;
    try {
      const res = await fetch("/api/documents");
      const json = await res.json();
      if (!json.ok) return;
      const remote = json.data as RemoteDoc[];
      for (const r of remote) {
        const existing = await localDocumentStore.get(r.id);
        if (existing?.isDirty) continue;
        await localDocumentStore.put({
          id: r.id,
          title: r.title,
          content: existing?.content ?? { type: "doc", content: [] },
          version: r.version,
          contentHash: r.contentHash,
          ownerId: r.ownerId,
          updatedAt: new Date(r.updatedAt).toISOString(),
          createdAt: new Date(r.createdAt).toISOString(),
          isDirty: false,
          lastSyncedAt: new Date().toISOString(),
        });
      }
      setDocs(await localDocumentStore.list());
    } catch {
      /* stay on local */
    }
  }, []);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  async function createDoc() {
    startTransition(async () => {
      try {
        const res = await fetch("/api/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "Untitled" }),
        });
        const json = await res.json();
        if (!json.ok) throw new Error(json.error?.message ?? "Create failed");
        const d = json.data;
        await localDocumentStore.put({
          id: d.id,
          title: d.title,
          content: d.content,
          version: d.version,
          contentHash: d.contentHash,
          ownerId: d.ownerId,
          updatedAt: new Date(d.updatedAt).toISOString(),
          createdAt: new Date(d.createdAt).toISOString(),
          isDirty: false,
          lastSyncedAt: new Date().toISOString(),
        });
        router.push(`/documents/${d.id}`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not create");
      }
    });
  }

  async function removeDoc(id: string) {
    try {
      await fetch(`/api/documents/${id}`, { method: "DELETE" });
      await localDocumentStore.remove(id);
      setDocs(await localDocumentStore.list());
      toast.success("Document deleted");
    } catch {
      toast.error("Delete failed");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
          <p className="text-sm text-muted-foreground">
            Opens instantly from local storage — syncs in the background.
          </p>
        </div>
        <Button onClick={createDoc} disabled={pending}>
          <Plus className="size-4" />
          New document
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {docs.map((doc) => (
          <Card key={doc.id} className="group relative border-border/70 transition hover:border-foreground/20">
            <Link href={`/documents/${doc.id}`} className="block">
              <CardHeader>
                <div className="mb-2 flex size-9 items-center justify-center rounded-md bg-muted">
                  <FileText className="size-4" />
                </div>
                <CardTitle className="line-clamp-1 text-base">{doc.title}</CardTitle>
                <CardDescription>
                  v{doc.version}
                  {doc.isDirty ? " · unsynced" : ""}
                  {" · "}
                  {formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })}
                </CardDescription>
              </CardHeader>
            </Link>
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute right-2 top-2 opacity-0 group-hover:opacity-100"
              onClick={() => void removeDoc(doc.id)}
              aria-label="Delete"
            >
              <Trash2 className="size-4" />
            </Button>
          </Card>
        ))}
        {docs.length === 0 ? (
          <p className="text-sm text-muted-foreground sm:col-span-2 lg:col-span-3">
            No documents yet. Create one to start writing offline-first.
          </p>
        ) : null}
      </div>
    </div>
  );
}
