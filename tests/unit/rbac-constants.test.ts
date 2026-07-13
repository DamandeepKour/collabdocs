import { describe, expect, it } from "vitest";
import { ROLE_PERMISSIONS, type DocumentRole } from "@/constants";
import { can, resolveEffectiveRole } from "@/server/auth/rbac";
import { computeBackoffMs } from "@/utils";
import { syncPushSchema } from "@/services/sync.service";

describe("RBAC", () => {
  it("denies write and sync for VIEWER", () => {
    expect(ROLE_PERMISSIONS.VIEWER.write).toBe(false);
    expect(ROLE_PERMISSIONS.VIEWER.sync).toBe(false);
    expect(can("VIEWER", "write")).toBe(false);
    expect(can("VIEWER", "sync")).toBe(false);
  });

  it("allows OWNER managePermissions", () => {
    expect(can("OWNER", "managePermissions")).toBe(true);
    expect(can("EDITOR", "managePermissions")).toBe(false);
  });

  it("resolves owner over permission row", () => {
    expect(resolveEffectiveRole(true, "VIEWER")).toBe("OWNER");
    expect(resolveEffectiveRole(false, "EDITOR")).toBe("EDITOR");
    expect(resolveEffectiveRole(false, null)).toBeNull();
  });
});

describe("sync backoff", () => {
  it("grows with attempts and respects max", () => {
    const a0 = computeBackoffMs(0, 1000, 60_000);
    const a5 = computeBackoffMs(5, 1000, 60_000);
    expect(a0).toBeGreaterThanOrEqual(1000);
    expect(a5).toBeGreaterThan(a0);
    expect(a5).toBeLessThanOrEqual(60_000 * 1.25);
  });
});

describe("sync payload validation", () => {
  it("accepts valid push payload", () => {
    const parsed = syncPushSchema.safeParse({
      clientId: "abc",
      documentId: "doc1",
      baseVersion: 1,
      operation: "update",
      title: "Hello",
      content: { type: "doc" },
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects invalid operation", () => {
    const parsed = syncPushSchema.safeParse({
      clientId: "abc",
      documentId: "doc1",
      baseVersion: 1,
      operation: "hack",
    });
    expect(parsed.success).toBe(false);
  });
});

describe("role matrix completeness", () => {
  const roles: DocumentRole[] = ["OWNER", "EDITOR", "VIEWER"];
  it("defines all capabilities for each role", () => {
    for (const role of roles) {
      expect(ROLE_PERMISSIONS[role]).toMatchObject({
        read: expect.any(Boolean),
        write: expect.any(Boolean),
        sync: expect.any(Boolean),
      });
    }
  });
});
