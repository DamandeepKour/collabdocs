import { describe, expect, it } from "vitest";
import { ApiError } from "@/server/security/http";

describe("ApiError", () => {
  it("carries status and code", () => {
    const err = new ApiError(403, "Forbidden", "FORBIDDEN");
    expect(err.status).toBe(403);
    expect(err.code).toBe("FORBIDDEN");
  });
});
