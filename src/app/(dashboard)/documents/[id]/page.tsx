"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  startTransition,
} from "react";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { toast } from "sonner";
import { localDocumentStore } from "@/features/offline/db";
import { useSyncEngine } from "@/features/sync/engine";
import { usePresence } from "@/features/realtime/use-presence";
import { SyncIndicator } from "@/components/shared/sync-indicator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { LocalDocument } from "@/types";
import { ROLE_PERMISSIONS, type DocumentRole } from "@/constants";

const AiSidebar = dynamic(
  () => import("@/features/ai/ai-sidebar").then((m) => m.AiSidebar),
  { ssr: false, loading: () => null },
);
const VersionPanel = dynamic(
  () =>
    import("@/features/versions/version-panel").then((m) => m.VersionPanel),
  { ssr: false, loading: () => null },
);
const InviteModal = dynamic(
  () =>
    import("@/features/permissions/invite-modal").then((m) => m.InviteModal),
  { ssr: false, loading: () => null },
);

const EMPTY_DOC = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

function plainTextFromDoc(content: unknown): string {
  try {
    const parts: string[] = [];
    const walk = (nodes?: Array<Record<string, unknown>>) => {
      if (!nodes) return;
      for (const n of nodes) {
        if (typeof n.text === "string") parts.push(n.text);
        if (Array.isArray(n.content)) {
          walk(n.content as Array<Record<string, unknown>>);
        }
      }
    };
    walk(
      (content as { content?: Array<Record<string, unknown>> })?.content,
    );
    return parts.join("\n");
  } catch {
    return "";
  }
}

function normalizeContent(content: unknown) {
  if (
    content &&
    typeof content === "object" &&
    (content as { type?: string }).type === "doc"
  ) {
    return content;
  }
  return EMPTY_DOC;
}

export default function DocumentEditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const [doc, setDoc] = useState<LocalDocument | null>(null);
  const [role, setRole] = useState<DocumentRole>("OWNER");
  const [showAi, setShowAi] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const docRef = useRef<LocalDocument | null>(null);
  const writableRef = useRef(true);

  const sync = useSyncEngine();
  const writable = ROLE_PERMISSIONS[role].write;
  writableRef.current = writable;
  const presence = usePresence(id, true);

  useEffect(() => {
    docRef.current = doc;
  }, [doc]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "Start writing… works offline.",
      }),
    ],
    content: EMPTY_DOC,
    editable: true,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "collab-editor focus:outline-none",
        "aria-label": "Document editor",
      },
    },
    onUpdate: ({ editor: ed }) => {
      const current = docRef.current;
      if (!writableRef.current || !current) return;

      const next: LocalDocument = {
        ...current,
        content: ed.getJSON(),
        updatedAt: new Date().toISOString(),
        isDirty: true,
      };
      docRef.current = next;
      setDoc(next);
      void localDocumentStore.put(next);

      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void sync.enqueueUpdate(next);
      }, 600);
      void presence.sendCursor(null, true);
    },
  });

  // Load local first — never block UI on network
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const local = await localDocumentStore.get(id);
      if (cancelled) return;

      if (local) {
        const normalized = {
          ...local,
          content: normalizeContent(local.content),
        };
        docRef.current = normalized;
        setDoc(normalized);
        editor?.commands.setContent(normalized.content as object, {
          emitUpdate: false,
        });
      }

      if (!navigator.onLine) {
        if (!local && !cancelled) {
          // Still open a shell so UI isn't stuck if IDB miss but route is valid
          toast.message("Offline — waiting for cached document");
        }
        return;
      }

      try {
        const res = await fetch(`/api/documents/${id}`);
        const json = await res.json();
        if (!json.ok || cancelled) return;

        const remote = json.data;
        setRole(remote.role as DocumentRole);

        const keepLocal = Boolean(local?.isDirty);
        const merged: LocalDocument = {
          id: remote.id,
          title: keepLocal ? local!.title : remote.title,
          content: keepLocal
            ? normalizeContent(local!.content)
            : normalizeContent(remote.content),
          version: keepLocal ? local!.version : remote.version,
          contentHash: remote.contentHash,
          ownerId: remote.ownerId,
          updatedAt: keepLocal
            ? local!.updatedAt
            : new Date(remote.updatedAt).toISOString(),
          createdAt: new Date(remote.createdAt).toISOString(),
          isDirty: keepLocal,
          lastSyncedAt: new Date().toISOString(),
        };

        await localDocumentStore.put(merged);
        if (cancelled) return;

        docRef.current = merged;
        setDoc(merged);
        if (!keepLocal) {
          editor?.commands.setContent(merged.content as object, {
            emitUpdate: false,
          });
        }
      } catch {
        /* offline ok */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, editor]);

  useEffect(() => {
    editor?.setEditable(writable);
  }, [editor, writable]);

  const onTitleChange = useCallback(
    (title: string) => {
      const current = docRef.current;
      if (!current || !writableRef.current) return;
      const next = {
        ...current,
        title,
        updatedAt: new Date().toISOString(),
        isDirty: true,
      };
      docRef.current = next;
      setDoc(next);
      void localDocumentStore.put(next);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => void sync.enqueueUpdate(next), 600);
    },
    [sync],
  );

  const text = useMemo(
    () => (doc ? plainTextFromDoc(doc.content) : ""),
    [doc],
  );

  async function handleTakeServer() {
    const remote = await sync.resolveConflictTakeServer(id);
    if (!remote) return;
    const current = docRef.current;
    if (!current) return;
    const next: LocalDocument = {
      ...current,
      title: remote.title,
      content: normalizeContent(remote.content),
      version: remote.version,
      contentHash: remote.contentHash,
      isDirty: false,
      updatedAt: new Date().toISOString(),
    };
    docRef.current = next;
    setDoc(next);
    editor?.commands.setContent(next.content as object, { emitUpdate: false });
    toast.success("Loaded server version");
  }

  async function handleKeepLocal() {
    await sync.resolveConflictKeepLocal(id, sync.conflictServerVersion);
    toast.success("Kept your local edits");
  }

  if (!doc) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Opening from local storage…
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/documents")}
        >
          ← Back
        </Button>
        <Input
          value={doc.title}
          onChange={(e) => onTitleChange(e.target.value)}
          disabled={!writable}
          className="max-w-md border-none bg-transparent text-xl font-semibold shadow-none focus-visible:ring-0"
        />
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Badge variant="outline">{role}</Badge>
          <SyncIndicator status={sync.status} pendingCount={sync.pendingCount} />
          <Badge variant="secondary">{presence.connection}</Badge>
          {presence.users.map((u) => (
            <Badge
              key={u.userId}
              style={{ backgroundColor: u.color }}
              className="text-white"
            >
              {u.name.split(" ")[0]}
              {u.typing ? "…" : ""}
            </Badge>
          ))}
          {ROLE_PERMISSIONS[role].managePermissions ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowInvite(true)}
            >
              Invite
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowVersions((v) => !v)}
          >
            History
          </Button>
          <Button size="sm" onClick={() => setShowAi((v) => !v)}>
            AI
          </Button>
        </div>
      </div>

      {sync.status === "conflict" ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm">
          Conflict detected. Collaborator changes exist.
          <Button size="sm" variant="outline" onClick={() => void handleTakeServer()}>
            Take server
          </Button>
          <Button size="sm" onClick={() => void handleKeepLocal()}>
            Keep local & rebase
          </Button>
        </div>
      ) : null}

      {!writable ? (
        <p className="text-sm text-muted-foreground">
          View-only — you cannot edit, sync, or upload changes.
        </p>
      ) : null}

      <div className="grid flex-1 gap-4 lg:grid-cols-[1fr_320px]">
        <div className="min-h-[50vh] rounded-xl border border-border/70 bg-background p-4 shadow-sm">
          <EditorContent editor={editor} />
        </div>
        {showAi ? (
          <AiSidebar
            documentId={id}
            text={text}
            onInsert={(value) => {
              if (!writable) {
                toast.error("Viewers cannot modify the document");
                return;
              }
              editor?.commands.insertContent(value);
            }}
            onTitle={(title) => onTitleChange(title)}
          />
        ) : null}
        {showVersions ? (
          <VersionPanel
            documentId={id}
            baseVersion={doc.version}
            canRestore={ROLE_PERMISSIONS[role].restore}
            onRestored={(remote) => {
              startTransition(() => {
                const current = docRef.current;
                if (!current) return;
                const next: LocalDocument = {
                  ...current,
                  title: remote.title,
                  content: normalizeContent(remote.content),
                  version: remote.version,
                  contentHash: remote.contentHash,
                  isDirty: false,
                  updatedAt: new Date().toISOString(),
                };
                docRef.current = next;
                setDoc(next);
                void localDocumentStore.put(next);
                editor?.commands.setContent(next.content as object, {
                  emitUpdate: false,
                });
              });
            }}
          />
        ) : null}
      </div>

      {showInvite ? (
        <InviteModal documentId={id} onClose={() => setShowInvite(false)} />
      ) : null}
    </div>
  );
}
