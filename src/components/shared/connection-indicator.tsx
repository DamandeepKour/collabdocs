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

export function ConnectionIndicator() {
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );

  return (
    <Badge variant={online ? "secondary" : "destructive"}>
      {online ? "Online" : "Offline"}
    </Badge>
  );
}
