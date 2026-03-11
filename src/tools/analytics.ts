import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { NetSuiteClient } from "../netsuite-client.js";
import { buildPaginationQuery } from "../utils/pagination.js";

export function registerAnalyticsTools(server: McpServer, client: NetSuiteClient): void {
  server.registerTool(
    "netsuite_get_locations",
    {
      description: "List NetSuite locations (analytical dimension).",
    },
    async ({ limit, offset }: any) => {
      try {
        const pagination = buildPaginationQuery({ limit, offset });
        const params: Record<string, string> = {
          ...pagination,
        };

        const result = await client.get<unknown>("/location", params);
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
          error instanceof Error ? error.message : "Unknown error listing locations.";
        return {
          content: [
            {
              type: "text",
              text: `Error calling NetSuite locations: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "netsuite_get_classifications",
    {
      description: "List NetSuite classifications (class - analytical dimension).",
    },
    async ({ limit, offset }: any) => {
      try {
        const pagination = buildPaginationQuery({ limit, offset });
        const params: Record<string, string> = {
          ...pagination,
        };

        const result = await client.get<unknown>("/classification", params);
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
          error instanceof Error ? error.message : "Unknown error listing classifications.";
        return {
          content: [
            {
              type: "text",
              text: `Error calling NetSuite classifications: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
