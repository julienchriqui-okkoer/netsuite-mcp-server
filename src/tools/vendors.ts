import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { NetSuiteClient } from "../netsuite-client.js";
import { z } from "zod";
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

  // Get available vendor custom forms
  if (isToolEnabled("vendors", "netsuite_get_vendor_forms")) {
    server.registerTool(
      "netsuite_get_vendor_forms",
      {
        description: "Get list of custom forms used by existing vendors. Returns form IDs and names to use with netsuite_create_vendor. Use this if vendor creation fails with 400 to discover the correct customForm ID.",
        inputSchema: {} as any,
      },
      async () => {
        try {
          // Query existing vendors to discover their custom forms
          const query = `
            SELECT DISTINCT 
              v.customform AS formId,
              cf.name AS formName
            FROM vendor v
            LEFT JOIN customrecordtype cf ON v.customform = cf.id
            WHERE v.customform IS NOT NULL
            FETCH FIRST 50 ROWS ONLY
          `;
          
          const result: any = await client.suiteql(query);
          const items = result?.items || [];
          
          const forms = items
            .filter((item: any) => item.formid)
            .map((item: any) => ({
              id: String(item.formid),
              name: item.formname || `Form ${item.formid}`,
            }));

          // Remove duplicates by ID
          const uniqueForms = Array.from(
            new Map(forms.map((f: any) => [f.id, f])).values()
          );

          return successResponse({ 
            forms: uniqueForms,
            count: uniqueForms.length,
            note: "These are custom forms currently used by existing vendors. Use the 'id' field as the customForm parameter when creating vendors.",
            fallback: "If this query fails, inspect an existing vendor via netsuite_get_vendor_by_id and look for the customForm field."
          });
        } catch (error: any) {
          return errorResponse(`Error getting vendor forms: ${error.message}. Fallback: Use netsuite_get_vendor_by_id on an existing vendor to inspect its customForm field.`);
        }
      }
    );
  }

  // Create vendor (supplier) - COMPLETE WITH CUSTOM FORMS AND IDEMPOTENCY
  if (isToolEnabled("vendors", "netsuite_create_vendor")) {
    server.registerTool(
      "netsuite_create_vendor",
      {
        description: "Create a new NetSuite vendor (supplier). If vendor creation fails with 400, first call netsuite_get_vendor_forms to discover the correct customForm ID, then retry with customForm and any required customFields. Required: companyName (string), subsidiary (string). Optional: email, phone, externalId (for idempotency), customForm (string, custom form ID), customFields (object, key-value map of custom field IDs), isPerson (boolean), currency, vatRegNumber, legalName, addr1, city, zip, country",
        inputSchema: {
          companyName: z.string(),
          subsidiary: z.string(),
          email: z.string().optional(),
          phone: z.string().optional(),
          externalId: z.string().optional(),
          customForm: z.string().optional(),
          customFields: z.record(z.any()).optional(),
          isPerson: z.boolean().optional(),
          currency: z.string().optional(),
          vatRegNumber: z.string().optional(),
          legalName: z.string().optional(),
          addr1: z.string().optional(),
          city: z.string().optional(),
          zip: z.string().optional(),
          country: z.string().optional(),
        } as any,
      },
      async ({ 
        companyName, subsidiary, email, phone, externalId,
        customForm, customFields,
        isPerson, currency, vatRegNumber, legalName,
        addr1, city, zip, country 
      }: any) => {
        try {
          // Validate required parameters
          if (!companyName || typeof companyName !== "string") {
            return errorResponse("Missing required parameter: companyName (string)");
          }
          if (!subsidiary || typeof subsidiary !== "string") {
            return errorResponse("Missing required parameter: subsidiary (string)");
          }

          // Pre-flight check: if externalId is provided, check if vendor already exists (idempotency)
          if (externalId && typeof externalId === "string") {
            try {
              const checkQuery = `SELECT id FROM vendor WHERE externalId = '${externalId.replace(/'/g, "''")}' FETCH FIRST 1 ROWS ONLY`;
              const existing: any = await client.suiteql(checkQuery);
              
              if (existing?.items && existing.items.length > 0) {
                const existingId = existing.items[0].id;
                console.log(`[create_vendor] Vendor with externalId '${externalId}' already exists: ${existingId}`);
                return successResponse({
                  found: true,
                  id: existingId,
                  message: `Vendor with externalId '${externalId}' already exists (idempotent)`,
                });
              }
            } catch (checkError: any) {
              // If SuiteQL fails (permissions), continue with creation attempt
              console.warn(`[create_vendor] Pre-flight check failed (continuing): ${checkError.message}`);
            }
          }

          const body: Record<string, unknown> = {
            companyName,
            isPerson: isPerson ?? false,
          };

          // Custom form (required by some NetSuite instances)
          if (customForm) {
            body.customForm = { id: customForm };
          }

          // References → objects { id }
          body.subsidiary = { id: subsidiary };
          if (currency) body.currency = { id: currency };

          // Simple fields
          if (email) body.email = email;
          if (phone) body.phone = phone;
          if (externalId) body.externalId = externalId;
          if (vatRegNumber) body.vatRegNumber = vatRegNumber;
          if (legalName) body.legalName = legalName;

          // Custom fields (key-value map)
          if (customFields && typeof customFields === "object") {
            for (const [key, value] of Object.entries(customFields)) {
              body[key] = value;
            }
          }

          // Address → nested addressbook.items[] structure
          if (addr1 || city || zip || country) {
            body.addressbook = {
              items: [{
                defaultBilling: true,
                addressbookAddress: {
                  ...(addr1 && { addr1 }),
                  ...(city && { city }),
                  ...(zip && { zip }),
                  ...(country && { country: { id: country } }),
                },
              }],
            };
          }

          const result = await client.post<unknown>("/vendor", body);
          return successResponse(result);
        } catch (error: any) {
          const errorMsg = error.message || String(error);
          console.error("❌ [create_vendor] Error:", errorMsg);
          return errorResponse(`Error creating vendor: ${errorMsg}`);
        }
      }
    );
  }

  // Update vendor (supplier)
  if (isToolEnabled("vendors", "netsuite_update_vendor")) {
    server.registerTool(
      "netsuite_update_vendor",
      {
        description: "Update an existing NetSuite vendor. Required: id (string). Optional: companyName, email, externalId",
        inputSchema: {
          id: z.string(),
          companyName: z.string().optional(),
          email: z.string().optional(),
          externalId: z.string().optional(),
        } as any,
      },
      async ({ id, companyName, email, externalId }: any) => {
        try {
          // Validate required parameter
          if (!id || typeof id !== "string") {
            return errorResponse("Missing required parameter: id (string)");
          }

          const body: any = {};

          if (companyName) body.companyName = companyName;
          if (email) body.email = email;
          if (externalId) body.externalId = externalId;

          const result = await client.patch<unknown>(`/vendor/${id}`, body);
          return successResponse(result);
        } catch (error: any) {
          return errorResponse(`Error updating vendor: ${error.message}`);
        }
      }
    );
  }
}

