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

  // NEW TOOL: Get latest vendors with Spendesk-compatible format
  server.registerTool(
    "netsuite_get_latest_vendors",
    {
      description: "Get the 5 most recently created vendors in a Spendesk-compatible format (name, email, phone, address, VAT, currency, external ID). Uses REST API (no SuiteQL required).",
    },
    async ({ limit }: any) => {
      try {
        const limitValue = limit || 5;
        
        // Use REST API instead of SuiteQL (no special permissions required)
        // Get a larger batch and sort client-side
        const pagination = buildPaginationQuery({ limit: 100, offset: 0 });
        const result: any = await client.get<any>("/vendor", pagination);
        
        // Extract vendors from result
        const items = result.items || [];
        
        // Sort by dateCreated DESC and take the requested limit
        const sortedVendors = items
          .filter((item: any) => item.dateCreated) // Only vendors with dateCreated
          .sort((a: any, b: any) => {
            const dateA = new Date(a.dateCreated).getTime();
            const dateB = new Date(b.dateCreated).getTime();
            return dateB - dateA; // DESC order
          })
          .slice(0, limitValue);

        // Transform NetSuite format to Spendesk-compatible format
        const vendors = sortedVendors.map((item: any) => ({
          id: item.id,
          name: item.companyName || item.entityId || "N/A",
          email: item.email || null,
          phone: item.phone || null,
          address: item.defaultAddress || null,
          vatNumber: item.vatRegNumber || null,
          legalName: item.legalName || item.companyName || null,
          currency: item.currency?.refName || item.currency || null,
          subsidiary: item.subsidiary?.refName || item.subsidiary || null,
          isActive: !item.isInactive,
          createdAt: item.dateCreated,
          updatedAt: item.lastModifiedDate,
          externalId: item.externalId || null,
        }));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ 
                vendors, 
                count: vendors.length,
                note: "Using REST API (no SuiteQL permissions required). Sorted client-side."
              }, null, 2),
            },
          ],
        };
      } catch (error: any) {
        const message =
          error instanceof Error ? error.message : "Unknown error getting latest vendors.";
        return {
          content: [
            {
              type: "text",
              text: `Error calling NetSuite latest vendors: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}

