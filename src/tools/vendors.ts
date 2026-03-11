import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { NetSuiteClient } from "../netsuite-client.js";
import { buildPaginationQuery } from "../utils/pagination.js";
import { z } from "zod";

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

  // Get single vendor with Zod schema
  (server as any).tool(
    "netsuite_get_vendor",
    "Get a single NetSuite vendor by internal ID",
    z.object({
      id: z.string().describe("NetSuite internal vendor ID"),
    }),
    async ({ id }: { id: string }) => {
      try {
        console.error(`[netsuite_get_vendor] Calling NetSuite with ID: ${id}`);
        
        // Try without expandSubResources first (it may require extra permissions)
        const result = await client.get<unknown>(`/vendor/${id}`);
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
    async (args: any) => {
      try {
        const limitValue = args?.limit || 5;
        
        console.error(`[netsuite_get_latest_vendors] Fetching latest ${limitValue} vendors`);
        
        // Step 1: Get vendor list (lighter call without full details)
        const pagination = buildPaginationQuery({ limit: 50, offset: 0 });
        const listResult: any = await client.get<any>("/vendor", pagination);
        
        // Extract vendors from result
        const items = listResult.items || [];
        
        console.error(`[netsuite_get_latest_vendors] Retrieved ${items.length} vendors from list`);
        
        // Step 2: Sort by ID DESC (higher ID = more recent) and take top N
        const sortedVendorIds = items
          .map((item: any) => ({ id: item.id, links: item.links }))
          .sort((a: any, b: any) => {
            const idA = parseInt(a.id) || 0;
            const idB = parseInt(b.id) || 0;
            return idB - idA; // DESC order
          })
          .slice(0, limitValue);
        
        console.error(`[netsuite_get_latest_vendors] Selected top ${sortedVendorIds.length} vendor IDs:`, 
          sortedVendorIds.map((v: any) => v.id).join(', '));
        
        // Step 3: Fetch full details for each vendor
        const vendors = [];
        for (const vendorRef of sortedVendorIds) {
          try {
            const vendorDetail: any = await client.get<any>(`/vendor/${vendorRef.id}`, {
              expandSubResources: "true",
            });
            
            // Step 4: Transform to Spendesk-compatible format
            vendors.push({
              id: vendorDetail.id,
              name: vendorDetail.companyName || vendorDetail.entityId || "N/A",
              email: vendorDetail.email || null,
              phone: vendorDetail.phone || null,
              address: vendorDetail.defaultAddress || null,
              vatNumber: vendorDetail.vatRegNumber || null,
              legalName: vendorDetail.legalName || vendorDetail.companyName || null,
              currency: vendorDetail.currency?.refName || vendorDetail.currency || null,
              subsidiary: vendorDetail.subsidiary?.refName || vendorDetail.subsidiary || null,
              isActive: !vendorDetail.isInactive,
              createdAt: vendorDetail.dateCreated,
              updatedAt: vendorDetail.lastModifiedDate,
              externalId: vendorDetail.externalId || null,
            });
          } catch (detailError: any) {
            console.error(`[netsuite_get_latest_vendors] Error fetching vendor ${vendorRef.id}:`, detailError.message);
            // Continue with next vendor
          }
        }

        console.error(`[netsuite_get_latest_vendors] Successfully retrieved ${vendors.length} vendor details`);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ 
                vendors, 
                count: vendors.length,
                note: "Using REST API (no SuiteQL permissions required). Sorted by ID DESC (higher ID = more recent)."
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

