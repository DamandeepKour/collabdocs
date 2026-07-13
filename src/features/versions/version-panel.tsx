"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

type VersionRow = {
  id: string;
  version: number;
  title: string;
  label: string | null;
  createdAt: string;
};

export function VersionPanel({
  documentId,
  baseVersion,
  canRestore,
  onRestored,
}: {
  documentId: string;
  baseVersion: number;
  canRestore: boolean;
  onRestored: (doc: {
    title: string;
    content: unknown;
    version: number;
    contentHash?: string | null;
  }) => void;
}) {
  const [versions, setVersions] = useState<VersionRow[]>([]);
  const [left, setLeft] = useState<string | null>(null);
  const [right, setRight] = useState<string | null>(null);
  const [diff, setDiff] = useState<string | null>(null);

  async function load() {
    const res = await fetch(`/api/versions/${documentId}`);
    const json = await res.json();
    if (json.ok) setVersions(json.data);
  }

  useEffect(() => {
    void load();
  }, [documentId]);

  async function capture() {
    const res = await fetch(`/api/versions/${documentId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: "Manual snapshot" }),
    });
    const json = await res.json();
    if (!json.ok) return toast.error(json.error?.message ?? "Capture failed");
    toast.success("Snapshot saved");
    void load();
  }

  async function restore(versionId: string) {
    if (!canRestore) return toast.error("No permission to restore");
    const res = await fetch(`/api/versions/${documentId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ versionId, baseVersion }),
    });
    const json = await res.json();
    if (res.status === 409) {
      return toast.error("Document changed — sync first, then restore");
    }
    if (!json.ok) return toast.error(json.error?.message ?? "Restore failed");
    onRestored(json.data);
    toast.success("Restored as a new version (safe)");
    void load();
  }

  async function compare() {
    if (!left || !right) return;
    const res = await fetch(
      `/api/versions/${documentId}/compare?left=${left}&right=${right}`,
    );
    const json = await res.json();
    if (!json.ok) return;
    setDiff(
      `Title changed: ${json.data.titleChanged}\nContent changed: ${json.data.contentChanged}\n` +
        `v${json.data.left.version} vs v${json.data.right.version}`,
    );
  }

  return (
    <Card className="h-fit border-border/70">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Version history</CardTitle>
        <Button size="xs" variant="outline" onClick={() => void capture()}>
          Snapshot
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <ScrollArea className="h-64">
          <ul className="space-y-2">
            {versions.map((v) => (
              <li
                key={v.id}
                className="rounded-md border border-border/60 px-2 py-2 text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      v{v.version} {v.label ? `· ${v.label}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(v.createdAt), "MMM d, HH:mm")}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="xs" variant="ghost" onClick={() => setLeft(v.id)}>
                      L
                    </Button>
                    <Button size="xs" variant="ghost" onClick={() => setRight(v.id)}>
                      R
                    </Button>
                    {canRestore ? (
                      <Button size="xs" onClick={() => void restore(v.id)}>
                        Restore
                      </Button>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </ScrollArea>
        <Button size="sm" variant="secondary" className="w-full" onClick={() => void compare()}>
          Compare L/R
        </Button>
        {diff ? <pre className="whitespace-pre-wrap text-xs text-muted-foreground">{diff}</pre> : null}
      </CardContent>
    </Card>
  );
}
