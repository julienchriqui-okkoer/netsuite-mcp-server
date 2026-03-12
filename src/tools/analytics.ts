import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { NetSuiteClient } from "../netsuite-client.js";
import { buildPaginationQuery } from "../utils/pagination.js";
import { successResponse, errorResponse } from "./_helpers.js";

export function registerAnalyticsTools(server: McpServer, client: NetSuiteClient): void {
  server.registerTool(
    "netsuite_get_locations",
    {
      description: "List NetSuite locations (analytical dimension for geographical or physical location tracking). Optional parameters: limit (number), offset (number)",
    },
    async ({ limit, offset }: any) => {
      try {
        const pagination = buildPaginationQuery({ limit, offset });
        const result = await client.get<unknown>("/location", pagination);
        return successResponse(result);
      } catch (error: any) {
        return errorResponse(`Error listing locations: ${error.message}`);
      }
    }
  );

  server.registerTool(
    "netsuite_get_classifications",
    {
      description: "List NetSuite classifications (class - analytical dimension for project, product line, or business unit tracking). Optional parameters: limit (number), offset (number)",
    },
    async ({ limit, offset }: any) => {
      try {
        const pagination = buildPaginationQuery({ limit, offset });
        const result = await client.get<unknown>("/classification", pagination);
        return successResponse(result);
      } catch (error: any) {
        return errorResponse(`Error listing classifications: ${error.message}`);
      }
    }
  );
}
