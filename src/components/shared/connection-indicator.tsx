"use client";

import { useSyncExternalStore } from "react";
import { Badge } from "@/components/ui/badge";

function subscribe(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

/**
 * Real-time network status for the chrome (a11y live region).
 */
export function ConnectionIndicator() {
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );

  return (
    <Badge
      variant={online ? "secondary" : "destructive"}
      aria-live="polite"
      role="status"
    >
      <span
        className={`mr-1.5 inline-block size-1.5 rounded-full ${online ? "bg-emerald-500" : "bg-destructive"}`}
        aria-hidden
      />
      {online ? "Online" : "Offline"}
    </Badge>
  );
}
