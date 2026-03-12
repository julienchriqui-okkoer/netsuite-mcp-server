import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { NetSuiteClient } from "../netsuite-client.js";
import { successResponse, errorResponse } from "./_helpers.js";

const FORBIDDEN_KEYWORDS = [
  "INSERT",
  "UPDATE",
  "DELETE",
  "DROP",
  "CREATE",
  "ALTER",
  "TRUNCATE",
  "EXEC",
  "EXECUTE",
];

function isSafeQuery(query: string): boolean {
  const upperQuery = query.toUpperCase();
  return !FORBIDDEN_KEYWORDS.some((kw) => upperQuery.includes(kw));
}

function convertLimitToFetch(query: string): string {
  // NetSuite SuiteQL uses "FETCH FIRST N ROWS ONLY" instead of "LIMIT N"
  return query.replace(/\bLIMIT\s+(\d+)\b/gi, "FETCH FIRST $1 ROWS ONLY");
}

export function registerSuiteQLTools(server: McpServer, client: NetSuiteClient): void {
  server.registerTool(
    "netsuite_execute_suiteql",
    {
      description: `Execute a read-only SuiteQL query against NetSuite. Only SELECT queries are allowed. Required parameter: query (string, SQL SELECT statement). Optional: limit (number), offset (number). ⚠️ IMPORTANT: NetSuite uses "FETCH FIRST N ROWS ONLY" instead of "LIMIT N" for pagination (auto-converted). Examples: SELECT id, companyName, email FROM vendor WHERE externalId = 'spk_supplier_xxx' FETCH FIRST 10 ROWS ONLY`,
    },
    async (args: any) => {
      try {
        const rawQuery = args?.query;
        const limit = args?.limit;
        const offset = args?.offset;

        if (!rawQuery || typeof rawQuery !== "string") {
          return errorResponse("Missing required parameter: query (string, SQL SELECT statement)");
        }

        // Convert LIMIT to FETCH FIRST syntax for NetSuite compatibility
        const query = convertLimitToFetch(rawQuery);

        if (!isSafeQuery(query)) {
          return errorResponse("Query contains forbidden keywords (INSERT, UPDATE, DELETE, DROP, CREATE, ALTER). Only SELECT queries are allowed.");
        }

        const result = await client.suiteql<unknown>(query, limit, offset);
        return successResponse(result);
      } catch (error: any) {
        return errorResponse(`Error executing SuiteQL: ${error.message}`);
      }
    }
  );
}
