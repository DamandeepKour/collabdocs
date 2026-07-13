import { describe, expect, it } from "vitest";

/**
 * Offline queue semantics (pure logic stand-in for IndexedDB integration).
 */
function mergeLocalFirst<T extends { id: string; isDirty?: boolean; version: number }>(
  local: T[],
  remote: T[],
): T[] {
  const map = new Map(local.map((d) => [d.id, d]));
  for (const r of remote) {
    const existing = map.get(r.id);
    if (existing?.isDirty) continue;
    map.set(r.id, r);
  }
  return [...map.values()];
}

describe("offline-first merge", () => {
  it("never overwrites dirty local docs with remote", () => {
    const local = [{ id: "1", version: 1, isDirty: true }];
    const remote = [{ id: "1", version: 5, isDirty: false }];
    const merged = mergeLocalFirst(local, remote);
    expect(merged[0]?.version).toBe(1);
    expect(merged[0]?.isDirty).toBe(true);
  });

  it("accepts remote when local is clean", () => {
    const local = [{ id: "1", version: 1, isDirty: false }];
    const remote = [{ id: "1", version: 5, isDirty: false }];
    const merged = mergeLocalFirst(local, remote);
    expect(merged[0]?.version).toBe(5);
  });
});
