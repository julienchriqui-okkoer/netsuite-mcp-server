import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { NetSuiteClient } from "../netsuite-client.js";
import { buildPaginationQuery } from "../utils/pagination.js";

export function registerReferenceTools(server: McpServer, client: NetSuiteClient): void {
  function registerSimpleListTool(
    name: string,
    description: string,
    path: string
  ) {
    server.registerTool(
      name,
      {
        description,
      },
      async (args: any) => {
        try {
          const { limit, offset, ...rest } = args;
          const pagination = buildPaginationQuery({ limit, offset });
          const params: Record<string, string> = {
            ...pagination,
          };

          Object.entries(rest).forEach(([key, value]) => {
            if (value === undefined || value === null) return;
            params[key] = String(value);
          });

          const result = await client.get<unknown>(path, params);
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
            error instanceof Error ? error.message : "Unknown NetSuite error.";
          return {
            content: [
              {
                type: "text",
                text: `Error calling NetSuite ${name}: ${message}`,
              },
            ],
            isError: true,
          };
        }
      }
    );
  }

  registerSimpleListTool(
    "netsuite_get_accounts",
    "List NetSuite accounts (chart of accounts) with optional filter by type.",
    "/account"
  );

  registerSimpleListTool(
    "netsuite_get_departments",
    "List NetSuite departments / cost centers.",
    "/department"
  );

  registerSimpleListTool(
    "netsuite_get_subsidiaries",
    "List NetSuite subsidiaries.",
    "/subsidiary"
  );

  registerSimpleListTool(
    "netsuite_get_tax_codes",
    "List NetSuite tax codes.",
    "/taxitem"
  );

  registerSimpleListTool(
    "netsuite_get_currencies",
    "List NetSuite currencies.",
    "/currency"
  );
}

