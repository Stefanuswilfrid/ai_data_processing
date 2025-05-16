/**
 * Sleep for the specified number of milliseconds
 * @param ms Milliseconds to sleep
 * @returns Promise that resolves after the specified time
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Dispatch a custom event to update the current URL being processed
 * @param index The index of the URL being processed
 */
export function updateCurrentUrlIndex(index: number): void {
  if (typeof window !== "undefined") {
    const event = new CustomEvent("url-processing", { detail: { index } })
    window.dispatchEvent(event)
  }
}
