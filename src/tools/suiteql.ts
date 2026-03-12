import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { NetSuiteClient } from "../netsuite-client.js";

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
      description: `Execute a read-only SuiteQL query against NetSuite. 
Only SELECT queries are allowed. 
⚠️ IMPORTANT: NetSuite uses "FETCH FIRST N ROWS ONLY" instead of "LIMIT N" for pagination.
Examples:
- SELECT id, companyName, email FROM vendor WHERE externalId = 'spk_supplier_xxx' FETCH FIRST 10 ROWS ONLY
- SELECT id, tranId, entity, amount, status FROM transaction WHERE type = 'VendBill' AND status = 'VendBill:B'
- SELECT id, acctNumber, acctName, type FROM account WHERE acctNumber LIKE '6%'
Note: LIMIT syntax will be automatically converted to FETCH FIRST syntax.`,
    },
    async (args: any) => {
      try {
        const rawQuery = args?.query;
        const limit = args?.limit;
        const offset = args?.offset;

        if (!rawQuery || typeof rawQuery !== "string") {
          return {
            content: [
              {
                type: "text",
                text: `Error: 'query' parameter is required and must be a string.`,
              },
            ],
            isError: true,
          };
        }

        // Convert LIMIT to FETCH FIRST syntax for NetSuite compatibility
        const query = convertLimitToFetch(rawQuery);

        if (!isSafeQuery(query)) {
          return {
            content: [
              {
                type: "text",
                text: `Error: Query contains forbidden keywords (INSERT, UPDATE, DELETE, DROP, CREATE, ALTER). Only SELECT queries are allowed.`,
              },
            ],
            isError: true,
          };
        }

        const result = await client.suiteql<unknown>(query, limit, offset);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error: any) {
        const message =
          error instanceof Error ? error.message : "Unknown error executing SuiteQL.";
        return {
          content: [
            {
              type: "text",
              text: `Error executing SuiteQL: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
