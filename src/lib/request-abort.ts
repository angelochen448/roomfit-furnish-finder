/** Recognize explicit cancellation without suppressing unrelated provider failures. */
export function isRequestAbort(error: unknown, signal: AbortSignal): boolean {
  return signal.aborted || (error instanceof Error && error.name === "AbortError");
}