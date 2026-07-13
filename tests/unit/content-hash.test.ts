import { describe, expect, it } from "vitest";
import { hashContent } from "@/repositories/document.repository";

describe("content hash", () => {
  it("is stable for same payload", () => {
    const a = hashContent({ type: "doc", content: [{ type: "paragraph" }] });
    const b = hashContent({ type: "doc", content: [{ type: "paragraph" }] });
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
  });

  it("changes when content changes", () => {
    const a = hashContent({ text: "a" });
    const b = hashContent({ text: "b" });
    expect(a).not.toBe(b);
  });
});
