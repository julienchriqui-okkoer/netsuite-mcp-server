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

  // Create vendor (supplier)
  if (isToolEnabled("vendors", "netsuite_create_vendor")) {
    server.registerTool(
      "netsuite_create_vendor",
      {
        description: "Create a new NetSuite vendor (supplier) from Spendesk data. Required parameters: companyName (string), subsidiary (string). Optional: entityId (string, vendor ID/code), legalName, email, phone, currency, vatRegNumber, defaultAddress, isPerson (boolean), department, location, class, externalId (for idempotence, use Spendesk supplier ID), terms (payment terms ID), category (vendor category ID), memo, accountNumber (supplier account number), isInactive (boolean)",
      },
      async (args: any) => {
        try {
          // Debug: log received args
          console.error("[netsuite_create_vendor] Received args keys:", Object.keys(args));
          
          // Filter out MCP SDK metadata
          const {
            signal,
            sendNotification,
            sendRequest,
            requestId,
            requestInfo,
            _meta,
            ...params
          } = args;

          console.error("[netsuite_create_vendor] Params after filter:", Object.keys(params));

          const {
            companyName,
            subsidiary,
            entityId,
            legalName,
            email,
            phone,
            currency,
            vatRegNumber,
            defaultAddress,
            isPerson,
            department,
            location,
            class: vendorClass,
            externalId,
            terms,
            category,
            memo,
            accountNumber,
            isInactive,
          } = params;

          // Validate required parameters
          if (!companyName || typeof companyName !== "string") {
            return errorResponse("Missing required parameter: companyName (string)");
          }
          if (!subsidiary || typeof subsidiary !== "string") {
            return errorResponse("Missing required parameter: subsidiary (string)");
          }

          const body: any = {
            companyName,
            subsidiary: { id: subsidiary },
          };

          // Identification
          if (entityId) body.entityId = entityId;
          if (legalName) body.legalName = legalName;
          if (externalId) body.externalId = externalId; // Spendesk supplier ID

          // Contact info
          if (email) body.email = email;
          if (phone) body.phone = phone;

          // Financial
          if (currency) body.currency = { id: currency };
          if (vatRegNumber) body.vatRegNumber = vatRegNumber;
          if (terms) body.terms = { id: terms };
          if (accountNumber) body.accountNumber = accountNumber;

          // Address (string or object)
          if (defaultAddress) {
            if (typeof defaultAddress === "string") {
              body.defaultAddress = defaultAddress;
            } else if (typeof defaultAddress === "object") {
              // Structured address
              body.defaultAddress = defaultAddress;
            }
          }

          // Classification & Analytics
          if (category) body.category = { id: category };
          if (department) body.department = { id: department };
          if (location) body.location = { id: location };
          if (vendorClass) body.class = { id: vendorClass };

          // Type & Status
          if (typeof isPerson === "boolean") body.isPerson = isPerson;
          if (typeof isInactive === "boolean") body.isInactive = isInactive;
          if (memo) body.memo = memo;

          const result = await client.post<unknown>("/vendor", body);
          return successResponse(result);
        } catch (error: any) {
          return errorResponse(`Error creating vendor: ${error.message}`);
        }
      }
    );
  }

  // Update vendor (supplier)
  if (isToolEnabled("vendors", "netsuite_update_vendor")) {
    server.registerTool(
      "netsuite_update_vendor",
      {
        description: "Update an existing NetSuite vendor (supplier). Required parameter: id (string, NetSuite internal vendor ID). Optional: companyName, entityId, legalName, email, phone, currency, vatRegNumber, defaultAddress, isPerson, department, location, class, terms, category, memo, accountNumber, isInactive",
      },
      async (args: any) => {
        try {
          // Filter out MCP SDK metadata
          const {
            signal,
            sendNotification,
            sendRequest,
            requestId,
            requestInfo,
            _meta,
            ...params
          } = args;

          const {
            id,
            companyName,
            entityId,
            legalName,
            email,
            phone,
            currency,
            vatRegNumber,
            defaultAddress,
            isPerson,
            department,
            location,
            class: vendorClass,
            terms,
            category,
            memo,
            accountNumber,
            isInactive,
          } = params;

          // Validate required parameter
          if (!id || typeof id !== "string") {
            return errorResponse("Missing required parameter: id (string)");
          }

          const body: any = {};

          // Identification
          if (companyName) body.companyName = companyName;
          if (entityId) body.entityId = entityId;
          if (legalName) body.legalName = legalName;

          // Contact info
          if (email) body.email = email;
          if (phone) body.phone = phone;

          // Financial
          if (currency) body.currency = { id: currency };
          if (vatRegNumber) body.vatRegNumber = vatRegNumber;
          if (terms) body.terms = { id: terms };
          if (accountNumber) body.accountNumber = accountNumber;

          // Address
          if (defaultAddress) {
            if (typeof defaultAddress === "string") {
              body.defaultAddress = defaultAddress;
            } else if (typeof defaultAddress === "object") {
              body.defaultAddress = defaultAddress;
            }
          }

          // Classification & Analytics
          if (category) body.category = { id: category };
          if (department) body.department = { id: department };
          if (location) body.location = { id: location };
          if (vendorClass) body.class = { id: vendorClass };

          // Type & Status
          if (typeof isPerson === "boolean") body.isPerson = isPerson;
          if (typeof isInactive === "boolean") body.isInactive = isInactive;
          if (memo) body.memo = memo;

          const result = await client.patch<unknown>(`/vendor/${id}`, body);
          return successResponse(result);
        } catch (error: any) {
          return errorResponse(`Error updating vendor: ${error.message}`);
        }
      }
    );
  }
}

