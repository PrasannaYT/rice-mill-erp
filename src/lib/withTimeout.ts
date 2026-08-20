/**
 * Utility to wrap server actions with a timeout + clean JSON error fallback.
 * Prevents the server process from hanging indefinitely on slow DB queries.
 */

export class ServerTimeoutError extends Error {
  constructor(message = 'Operation timed out. Please try again.') {
    super(message);
    this.name = 'ServerTimeoutError';
  }
}

/**
 * Wraps an async operation with a timeout.
 * If the operation takes longer than `timeoutMs`, it rejects with a ServerTimeoutError.
 * 
 * Note: this does NOT cancel the underlying operation (Prisma query) — 
 * it just ensures the client gets a response instead of hanging.
 */
export async function withTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number = 15000
): Promise<T> {
  return Promise.race([
    operation(),
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new ServerTimeoutError()),
        timeoutMs
      )
    ),
  ]);
}

/**
 * Wraps a server action to catch errors and return a standardized result.
 * Use this for actions that should never crash the server.
 */
export async function safeAction<T>(
  action: () => Promise<T>,
  timeoutMs?: number
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const data = timeoutMs
      ? await withTimeout(action, timeoutMs)
      : await action();
    return { success: true, data };
  } catch (error) {
    const message =
      error instanceof ServerTimeoutError
        ? error.message
        : error instanceof Error
          ? error.message
          : 'An unexpected error occurred.';
    console.error('[safeAction] Error:', message);
    return { success: false, error: message };
  }
}
