import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { NetSuiteClient } from "../netsuite-client.js";
import { buildPaginationQuery } from "../utils/pagination.js";
import { successResponse, errorResponse } from "./_helpers.js";

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
          return successResponse(result);
        } catch (error: any) {
          return errorResponse(`Error listing ${name.replace('netsuite_get_', '')}: ${error.message}`);
        }
      }
    );
  }

  registerSimpleListTool(
    "netsuite_get_accounts",
    "List NetSuite accounts (chart of accounts) with optional filter by type. Optional parameters: limit (number), offset (number), type (string, e.g. 'Bank', 'Expense')",
    "/account"
  );

  registerSimpleListTool(
    "netsuite_get_departments",
    "List NetSuite departments / cost centers for analytical tracking. Optional parameters: limit (number), offset (number)",
    "/department"
  );

  registerSimpleListTool(
    "netsuite_get_subsidiaries",
    "List NetSuite subsidiaries (legal entities). Optional parameters: limit (number), offset (number)",
    "/subsidiary"
  );

  registerSimpleListTool(
    "netsuite_get_tax_codes",
    "List NetSuite sales tax items. Returns tax codes with rates and descriptions. Optional parameters: limit (number), offset (number)",
    "/salestaxitem"
  );

  registerSimpleListTool(
    "netsuite_get_currencies",
    "List NetSuite currencies with exchange rates. Optional parameters: limit (number), offset (number)",
    "/currency"
  );
}

