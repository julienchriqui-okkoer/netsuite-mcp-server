export type PaginationParams = {
  limit?: number;
  offset?: number;
  defaultLimit?: number;
  maxLimit?: number;
};

export function buildPaginationQuery(params: PaginationParams): {
  limit?: string;
  offset?: string;
} {
  const defaultLimit = params.defaultLimit ?? 50;
  const maxLimit = params.maxLimit ?? 1000;

  let limit = params.limit ?? defaultLimit;
  if (limit <= 0) limit = defaultLimit;
  if (limit > maxLimit) limit = maxLimit;

  const offset = params.offset ?? 0;

  return {
    limit: String(limit),
    offset: String(offset),
  };
}

