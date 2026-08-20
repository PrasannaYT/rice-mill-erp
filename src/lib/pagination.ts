/**
 * Cursor-based pagination utilities for Prisma queries.
 * 
 * Prevents full-collection scans that cause API timeouts and OOM crashes.
 * All list endpoints should use these helpers instead of unbounded findMany().
 */

export const DEFAULT_PAGE_SIZE = 30;
export const MAX_PAGE_SIZE = 100;

export type PaginationParams = {
  cursor?: string;
  take?: number;
};

export type PaginatedResult<T> = {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
  totalCount?: number;
};

/**
 * Clamps and validates pagination parameters from client requests.
 */
export function parsePaginationParams(params?: {
  cursor?: string | null;
  take?: number | string | null;
}): { cursor?: string; take: number } {
  const take = Math.min(
    Math.max(1, Number(params?.take) || DEFAULT_PAGE_SIZE),
    MAX_PAGE_SIZE
  );
  const cursor = params?.cursor || undefined;
  return { cursor, take };
}

/**
 * Wraps a Prisma findMany result into a PaginatedResult.
 * 
 * Usage:
 * ```ts
 * const { cursor, take } = parsePaginationParams(params);
 * const items = await prisma.model.findMany({
 *   take: take + 1,  // fetch one extra to detect hasMore
 *   ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
 *   orderBy: { createdAt: 'desc' },
 * });
 * return buildPaginatedResult(items, take);
 * ```
 */
export function buildPaginatedResult<T extends { id: string }>(
  items: T[],
  take: number,
  totalCount?: number
): PaginatedResult<T> {
  const hasMore = items.length > take;
  const trimmed = hasMore ? items.slice(0, take) : items;
  const nextCursor = hasMore ? trimmed[trimmed.length - 1]?.id ?? null : null;

  return {
    items: trimmed,
    nextCursor,
    hasMore,
    ...(totalCount !== undefined ? { totalCount } : {}),
  };
}

/**
 * Builds Prisma cursor/skip args from pagination params.
 */
export function buildCursorArgs(params: { cursor?: string; take: number }) {
  return {
    take: params.take + 1, // fetch one extra to detect hasMore
    ...(params.cursor
      ? { cursor: { id: params.cursor }, skip: 1 }
      : {}),
  };
}
