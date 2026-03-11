import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { NetSuiteClient } from "../netsuite-client.js";
import { z } from "zod";

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
  const suiteqlSchema = z.object({
    query: z.string().describe("The SuiteQL SELECT query to execute"),
    limit: z.number().optional().describe("Maximum number of results to return"),
    offset: z.number().optional().describe("Offset for pagination"),
  });

  server.registerTool(
    "netsuite_execute_suiteql",
    {
      description: `Execute a read-only SuiteQL query against NetSuite. 
Only SELECT queries are allowed. 
Examples:
- SELECT id, companyName, email FROM vendor WHERE externalId = 'spk_supplier_xxx'
- SELECT id, tranId, entity, amount, status FROM transaction WHERE type = 'VendBill' AND status = 'VendBill:B'
- SELECT id, acctNumber, acctName, type FROM account WHERE acctNumber LIKE '6%'`,
      inputSchema: suiteqlSchema,
    },
    async (args: any) => {
      try {
        const query = args?.query;
        const limit = args?.limit;
        const offset = args?.offset;

        if (!query || typeof query !== "string") {
          return {
            content: [
              {
                type: "text" as const,
                text: `Error: 'query' parameter is required and must be a string.`,
              },
            ],
            isError: true,
          };
        }

        if (!isSafeQuery(query)) {
          return {
            content: [
              {
                type: "text" as const,
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
              type: "text" as const,
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
              type: "text" as const,
              text: `Error executing SuiteQL: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
