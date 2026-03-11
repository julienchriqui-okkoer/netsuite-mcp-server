import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { NetSuiteClient } from "../netsuite-client.js";
import { buildPaginationQuery } from "../utils/pagination.js";

export function registerVendorTools(server: McpServer, client: NetSuiteClient): void {
  server.registerTool(
    "netsuite_get_vendors",
    {
      description: "List NetSuite vendors (suppliers) with optional search and pagination.",
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

        const result = await client.get<unknown>("/vendor", params);
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
          error instanceof Error ? error.message : "Unknown error listing vendors.";
        return {
          content: [
            {
              type: "text",
              text: `Error calling NetSuite vendors: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "netsuite_get_vendor",
    {
      description: "Get a single NetSuite vendor by internal ID.",
    },
    async ({ id }: any) => {
      try {
        const result = await client.get<unknown>(`/vendor/${id}`, {
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
          error instanceof Error ? error.message : "Unknown error getting vendor.";
        return {
          content: [
            {
              type: "text",
              text: `Error calling NetSuite vendor: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}

