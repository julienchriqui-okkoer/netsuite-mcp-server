import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { NetSuiteClient } from "../netsuite-client.js";
import { z } from "zod";
import { buildPaginationQuery } from "../utils/pagination.js";
import { successResponse, errorResponse } from "./_helpers.js";

export function registerEmployeeTools(server: McpServer, client: NetSuiteClient): void {
  server.registerTool(
    "netsuite_get_employees",
    {
      description: "List NetSuite employees with optional search and pagination. Used to match Spendesk Members to NetSuite Employees for expense reports. Optional parameters: limit (number), offset (number), q (string, search query)",
      inputSchema: {
        limit: z.number().optional(),
        offset: z.number().optional(),
        q: z.string().optional(),
      } as any,
    },
    async ({ limit, offset, q }: any) => {
      try {
        const pagination = buildPaginationQuery({ limit, offset });
        const params: Record<string, string> = { ...pagination };
        if (q) {
          params.q = q;
        }

        const result = await client.get<unknown>("/employee", params);
        return successResponse(result);
      } catch (error: any) {
        return errorResponse(`Error listing employees: ${error.message}`);
      }
    }
  );

  server.registerTool(
    "netsuite_get_employee",
    {
      description: "Get a single NetSuite employee by internal ID. Returns full employee details with expanded sub-resources. Required parameter: id (string, NetSuite internal employee ID)",
      inputSchema: {
        id: z.string(),
      } as any,
    },
    async ({ id }: any) => {
      try {
        // Validate required parameter
        if (!id || typeof id !== "string") {
          return errorResponse("Missing required parameter: id (string)");
        }

        const result = await client.get<unknown>(`/employee/${id}`, {
          expandSubResources: "true",
        });
        return successResponse(result);
      } catch (error: any) {
        return errorResponse(`Error getting employee: ${error.message}`);
      }
    }
  );
}
