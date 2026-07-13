"use client";

import { Badge } from "@/components/ui/badge";
import type { SyncStatusUi } from "@/constants";

const labels: Record<SyncStatusUi, string> = {
  idle: "Idle",
  pending: "Pending",
  syncing: "Syncing…",
  synced: "Synced",
  offline: "Queued offline",
  conflict: "Conflict",
  error: "Sync error",
};

export function SyncIndicator({
  status,
  pendingCount,
}: {
  status: SyncStatusUi;
  pendingCount: number;
}) {
  const variant =
    status === "conflict" || status === "error"
      ? "destructive"
      : status === "synced"
        ? "secondary"
        : "outline";

  return (
    <Badge variant={variant}>
      {labels[status]}
      {pendingCount > 0 ? ` · ${pendingCount}` : ""}
    </Badge>
  );
}
