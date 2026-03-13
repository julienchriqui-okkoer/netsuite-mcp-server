import type { NetSuiteClient } from "../netsuite-client.js";

export type SuiteQLResult = {
  items: Record<string, any>[];
  hasMore: boolean;
  totalResults?: number;
};

function normalizeQuery(raw: string): string {
  return raw
    .replace(/\bLIMIT\s+(\d+)\b/gi, "FETCH FIRST $1 ROWS ONLY")
    .trim();
}

export async function executeSuiteQL(
  client: NetSuiteClient,
  query: string,
  limit = 100,
  offset = 0
): Promise<SuiteQLResult> {
  const normalizedQuery = normalizeQuery(query);

  const response: any = await client.suiteql<any>(normalizedQuery, limit, offset);

  return {
    items: Array.isArray(response?.items) ? response.items : [],
    hasMore: Boolean(response?.hasMore),
    totalResults: response?.totalResults,
  };
}

