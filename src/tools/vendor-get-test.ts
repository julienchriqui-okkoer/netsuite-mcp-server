import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { NetSuiteClient } from "../netsuite-client.js";

// EXACT copy of vendor-bills.ts structure to test if it works for vendors
export function registerVendorGetByIdTest(server: McpServer, client: NetSuiteClient): void {
  server.registerTool(
    "netsuite_test_get_vendor_exact_copy",
    {
      description: "EXACT COPY of get_vendor_bill logic but for vendors. Get a single NetSuite vendor by internal ID.",
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
