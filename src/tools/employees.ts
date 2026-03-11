import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { NetSuiteClient } from "../netsuite-client.js";
import { buildPaginationQuery } from "../utils/pagination.js";

export function registerEmployeeTools(server: McpServer, client: NetSuiteClient): void {
  server.registerTool(
    "netsuite_get_employees",
    {
      description: "List NetSuite employees with optional search and pagination. Used to match Spendesk Members to NetSuite Employees for expense reports.",
    },
    async ({ limit, offset, q }: any) => {
      try {
        const pagination = buildPaginationQuery({ limit, offset });
        const params: Record<string, string> = {
          ...pagination,
        };
        if (q) {
          params.q = q;
        }

        const result = await client.get<unknown>("/employee", params);
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
          error instanceof Error ? error.message : "Unknown error listing employees.";
        return {
          content: [
            {
              type: "text",
              text: `Error calling NetSuite employees: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "netsuite_get_employee",
    {
      description: "Get a single NetSuite employee by internal ID.",
    },
    async ({ id }: any) => {
      try {
        const result = await client.get<unknown>(`/employee/${id}`, {
          expandSubResources: "true",
        });
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
          error instanceof Error ? error.message : "Unknown error getting employee.";
        return {
          content: [
            {
              type: "text",
              text: `Error calling NetSuite employee: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
