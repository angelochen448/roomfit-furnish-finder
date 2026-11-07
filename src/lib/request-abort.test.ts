import { describe, expect, it } from "vitest";
import { isRequestAbort } from "./request-abort";

describe("request cancellation", () => {
  it("recognizes cancellation before headers arrive", () => {
    const controller = new AbortController();
    controller.abort();
    expect(isRequestAbort(new Error("Stream ended"), controller.signal)).toBe(true);
  });
  it("recognizes a fetch AbortError", () => {
    expect(isRequestAbort(new DOMException("This operation was aborted", "AbortError"), new AbortController().signal)).toBe(true);
  });
  it("does not hide provider errors on active requests", () => {
    expect(isRequestAbort(new Error("Provider access denied"), new AbortController().signal)).toBe(false);
  });
});