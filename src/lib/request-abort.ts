/** Recognize explicit cancellation without suppressing unrelated provider failures. */
export function isRequestAbort(error: unknown, signal: AbortSignal): boolean {
  return signal.aborted || (typeof error === "object" && error !== null && "name" in error && error.name === "AbortError");
}