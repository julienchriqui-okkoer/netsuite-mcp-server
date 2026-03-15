/**
 * Safely parse MCP params that may arrive as JSON strings or objects.
 * MCP clients sometimes serialize object/array params as JSON strings — use this for complex params.
 */
export function parseParam<T>(param: T | string | undefined | null): T | undefined {
  if (param === undefined || param === null) return undefined;
  if (typeof param === "string") {
    try {
      return JSON.parse(param) as T;
    } catch (e) {
      console.error("[NS-MCP] Failed to parse param:", param);
      return undefined;
    }
  }
  return param as T;
}
