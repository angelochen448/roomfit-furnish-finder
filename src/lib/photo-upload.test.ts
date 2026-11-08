import { describe, expect, it } from "vitest";
import { isSupportedPhoto } from "./photo-upload";

describe("photo upload formats", () => {
  it("accepts AVIF product photos", () => {
    expect(isSupportedPhoto({ type: "image/avif", name: "sofa.avif", size: 2000 })).toBe(true);
  });
  it("recognizes AVIF when the file picker omits the MIME type", () => {
    expect(isSupportedPhoto({ type: "", name: "sofa.avif", size: 2000 })).toBe(true);
  });
  it("preserves the eight MB limit", () => {
    expect(isSupportedPhoto({ type: "image/avif", name: "sofa.avif", size: 8 * 1024 * 1024 })).toBe(true);
    expect(isSupportedPhoto({ type: "image/avif", name: "sofa.avif", size: 8 * 1024 * 1024 + 1 })).toBe(false);
  });
  it("rejects empty or unsupported files", () => {
    expect(isSupportedPhoto({ type: "image/avif", name: "sofa.avif", size: 0 })).toBe(false);
    expect(isSupportedPhoto({ type: "text/plain", name: "sofa.avif", size: 2000 })).toBe(false);
  });
});