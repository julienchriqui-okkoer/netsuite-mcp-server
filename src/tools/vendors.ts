import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { NetSuiteClient } from "../netsuite-client.js";
import { buildPaginationQuery } from "../utils/pagination.js";
import { successResponse, errorResponse, validateRequired } from "./_helpers.js";
import { isToolEnabled } from "../config/tools-config.js";

export function registerVendorTools(server: McpServer, client: NetSuiteClient): void {
  // List vendors with pagination and search
  if (isToolEnabled("vendors", "netsuite_get_vendors")) {
    server.registerTool(
    "netsuite_get_vendors",
    {
      description: "List NetSuite vendors (suppliers) with optional search and pagination. Optional parameters: limit (number), offset (number), q (string, search query)",
    },
    async ({ limit, offset, q }: any) => {
      try {
        const pagination = buildPaginationQuery({ limit, offset });
        const params: Record<string, string> = { ...pagination };
        
        if (q) {
          params.q = q;
        }

        const result = await client.get<unknown>("/vendor", params);
        return successResponse(result);
      } catch (error: any) {
        return errorResponse(`Error listing vendors: ${error.message}`);
      }
    }
  );
  }

  // Get single vendor by ID
  if (isToolEnabled("vendors", "netsuite_get_vendor_by_id")) {
    server.registerTool(
    "netsuite_get_vendor_by_id",
    {
      description: "Get a single NetSuite vendor by internal ID. Returns full vendor details with expanded sub-resources. Required parameter: id (string, NetSuite internal vendor ID)",
    },
    async ({ id }: any) => {
      try {
        // Validate required parameter
        if (!id || typeof id !== "string") {
          return errorResponse("Missing required parameter: id (string)");
        }
        
        const result = await client.get<unknown>(`/vendor/${id}`, {
          expandSubResources: "true",
        });
        
        return successResponse(result);
      } catch (error: any) {
        return errorResponse(`Error getting vendor: ${error.message}`);
      }
    }
  );
  }

  // Get latest vendors with Spendesk-compatible format
  if (isToolEnabled("vendors", "netsuite_get_latest_vendors")) {
    server.registerTool(
    "netsuite_get_latest_vendors",
    {
      description: "Get the most recently created vendors in a Spendesk-compatible format (name, email, phone, address, VAT, currency, external ID). Uses REST API (no SuiteQL required). Optional parameter: limit (number, default 5)",
    },
    async ({ limit }: any) => {
      try {
        const limitValue = limit || 5;
        
        // Step 1: Get vendor list (lighter call without full details)
        const pagination = buildPaginationQuery({ limit: 50, offset: 0 });
        const listResult: any = await client.get<any>("/vendor", pagination);
        
        const items = listResult.items || [];
        
        // Step 2: Sort by ID DESC (higher ID = more recent) and take top N
        const sortedVendorIds = items
          .map((item: any) => ({ id: item.id }))
          .sort((a: any, b: any) => {
            const idA = parseInt(a.id) || 0;
            const idB = parseInt(b.id) || 0;
            return idB - idA; // DESC order
          })
          .slice(0, limitValue);
        
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
            // Continue with next vendor if one fails
            console.error(`[netsuite_get_latest_vendors] Error fetching vendor ${vendorRef.id}:`, detailError.message);
          }
        }

        return successResponse({ 
          vendors, 
          count: vendors.length,
          note: "Sorted by ID DESC (higher ID = more recent). Using REST API (no SuiteQL permissions required)."
        });
      } catch (error: any) {
        return errorResponse(`Error getting latest vendors: ${error.message}`);
      }
    }
  );
  }
}

