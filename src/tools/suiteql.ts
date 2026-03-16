import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { NetSuiteClient } from "../netsuite-client.js";
import { z } from "zod";
import { executeSuiteQL } from "../lib/suiteql.js";
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

export function registerSuiteQLTools(server: McpServer, client: NetSuiteClient): void {
  server.registerTool(
    "netsuite_execute_suiteql",
    {
      description: `Execute a read-only SuiteQL query against NetSuite. Only SELECT queries are allowed.
Required parameter: query (string, SQL SELECT statement).
Optional: limit (number, default 100, max 1000), offset (number, default 0).
⚠️ IMPORTANT: Use "FETCH FIRST N ROWS ONLY" instead of "LIMIT N" (auto-converted).
Examples:
  SELECT id, companyName, externalId FROM vendor WHERE externalId = 'spk_supplier_xxx' FETCH FIRST 1 ROWS ONLY
  SELECT id, acctnumber, fullname FROM account WHERE type = 'Bank' AND subsidiary = 1
  SELECT id, tranId, externalId FROM transaction WHERE externalId = 'spk_payable_xxx' AND type = 'VendBill' FETCH FIRST 1 ROWS ONLY`,
      inputSchema: z
        .object({
          query: z.string().describe("Read-only SuiteQL SELECT statement"),
          limit: z
            .number()
            .int()
            .min(1)
            .max(1000)
            .optional(),
          offset: z
            .number()
            .int()
            .min(0)
            .optional(),
        })
        .strict() as any,
    },
    async (args: any) => {
      try {
        const rawQuery = args?.query;
        const limit = typeof args?.limit === "number" ? args.limit : 100;
        const offset = typeof args?.offset === "number" ? args.offset : 0;

        if (!rawQuery || typeof rawQuery !== "string") {
          return errorResponse("Missing required parameter: query (string, SQL SELECT statement)");
        }

        const trimmedUpper = rawQuery.trim().toUpperCase();
        if (!trimmedUpper.startsWith("SELECT") && !trimmedUpper.startsWith("WITH")) {
          return errorResponse("Only SELECT and WITH (CTE) queries are allowed");
        }

        if (!isSafeQuery(rawQuery)) {
          return errorResponse(
            "Query contains forbidden keywords (INSERT, UPDATE, DELETE, DROP, CREATE, ALTER). Only read-only SELECT queries are allowed."
          );
        }

        const result = await executeSuiteQL(client, rawQuery, limit, offset);
        const columns = result.items.length > 0 ? Object.keys(result.items[0]) : [];

        return successResponse({
          columns,
          rows: result.items,
          count: result.items.length,
          hasMore: result.hasMore,
          totalResults: result.totalResults,
        });
      } catch (error: any) {
        return errorResponse(`Error executing SuiteQL: ${error.message}`);
      }
    }
  );
}

