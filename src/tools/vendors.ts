import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { NetSuiteClient } from "../netsuite-client.js";
import { z } from "zod";
import { buildPaginationQuery } from "../utils/pagination.js";
import { canUseSuiteQL } from "../utils/suiteql-capability.js";
import { executeSuiteQL } from "../lib/suiteql.js";
import { parseNetSuiteError } from "../lib/errors.js";
import { withRetry } from "../lib/retry.js";
import { successResponse, errorResponse, validateRequired } from "./_helpers.js";
import { isToolEnabled } from "../config/tools-config.js";

export function registerVendorTools(server: McpServer, client: NetSuiteClient): void {
  // List vendors with pagination and search
  if (isToolEnabled("vendors", "netsuite_get_vendors")) {
    server.registerTool(
      "netsuite_get_vendors",
      {
        description:
          "List NetSuite vendors (suppliers) with optional search and pagination. Optional parameters: limit (number), offset (number), q (string, search query on companyName, via SuiteQL when provided).",
        inputSchema: {
          limit: z.number().optional(),
          offset: z.number().optional(),
          q: z.string().optional(),
        } as any,
      },
      async ({ limit, offset, q }: any) => {
        try {
          const maxRows = typeof limit === "number" ? limit : 50;
          const startOffset = typeof offset === "number" ? offset : 0;

          // If search query provided and SuiteQL available, use SuiteQL
          if (q && typeof q === "string" && q.trim().length > 0 && (await canUseSuiteQL(client))) {
            const safeQ = q.replace(/'/g, "''");
            const query = `
              SELECT id, companyName, externalId, email
              FROM vendor 
              WHERE LOWER(companyName) LIKE LOWER('%${safeQ}%')
                AND isInactive = 'F'
            `;
            const suiteqlResult: any = await client.suiteql(query, maxRows, startOffset);
            const items = suiteqlResult?.items || [];
            const vendors = items.map((row: any) => ({
              id: row.id,
              companyName: row.companyname ?? row.companyName,
              externalId: row.externalid ?? row.externalId,
              email: row.email,
            }));
            return successResponse({
              vendors,
              count: vendors.length,
              source: "suiteql",
              note: "Filtered by companyName using SuiteQL.",
            });
          }

          // REST path: with q, fetch more and filter client-side; without q, plain pagination
          if (q && typeof q === "string" && q.trim().length > 0) {
            const restLimit = 500;
          const page: any = await withRetry(
            () => client.get<any>("/vendor", { limit: String(restLimit), offset: "0" }),
            "get_vendors REST list"
          );
            const items = page?.items || [];
            const qLower = q.toLowerCase().trim();
            const filtered = items.filter(
              (v: any) => (v.companyName || "").toLowerCase().includes(qLower) && v.isInactive !== true
            );
            const sliced = filtered.slice(startOffset, startOffset + maxRows);
            const vendors = sliced.map((v: any) => ({
              id: v.id,
              companyName: v.companyName,
              externalId: v.externalId,
              email: v.email,
            }));
            return successResponse({
              vendors,
              count: vendors.length,
              source: "rest-filter",
              note: "SuiteQL not available; filtered by companyName from REST list.",
            });
          }

          const pagination = buildPaginationQuery({ limit, offset });
          const result = await withRetry(
            () => client.get<unknown>("/vendor", pagination),
            "get_vendors REST pagination"
          );
          return successResponse(result);
        } catch (error: any) {
          return errorResponse(`Error listing vendors: ${error.message}`);
        }
      }
    );
  }

  // Find vendor by externalId / name (multi-level match for deduplication)
  if (isToolEnabled("vendors", "netsuite_find_vendor")) {
    server.registerTool(
      "netsuite_find_vendor",
      {
        description:
          "Find a vendor using Spendesk-like 3-level matching: (1) externalId, (2) exact name (case-insensitive). Optional subsidiaryId filter. Returns { found, matchLevel, vendors }.",
        inputSchema: {
          externalId: z.string().optional(),
          name: z.string().optional(),
          subsidiaryId: z.string().optional(),
        } as any,
      },
      async ({ externalId, name, subsidiaryId }: any) => {
        try {
          const useSuiteQL = await canUseSuiteQL(client);

          if (useSuiteQL) {
            if (externalId && typeof externalId === "string") {
              const safeExt = externalId.replace(/'/g, "''");
              const where: string[] = [`externalId = '${safeExt}'`];
              if (subsidiaryId && typeof subsidiaryId === "string") where.push(`subsidiary = ${subsidiaryId}`);
              const res: any = await client.suiteql(
                `SELECT id, companyName, externalId, email, subsidiary FROM vendor WHERE ${where.join(" AND ")}`,
                1
              );
              const items = res?.items || [];
              if (items.length > 0) {
                const v = items[0];
                return successResponse({
                  found: true,
                  matchLevel: "externalId",
                  vendors: [{
                    id: v.id,
                    companyName: v.companyname ?? v.companyName,
                    externalId: v.externalid ?? v.externalId,
                    email: v.email,
                    subsidiary: v.subsidiary,
                  }],
                });
              }
            }
            if (name && typeof name === "string") {
              const safeName = name.replace(/'/g, "''");
              const where: string[] = [`LOWER(companyName) = LOWER('${safeName}')`];
              if (subsidiaryId && typeof subsidiaryId === "string") where.push(`subsidiary = ${subsidiaryId}`);
              const res: any = await client.suiteql(
                `SELECT id, companyName, externalId, email, subsidiary FROM vendor WHERE ${where.join(" AND ")}`,
                5
              );
              const items = res?.items || [];
              if (items.length > 0) {
                const vendors = items.map((v: any) => ({
                  id: v.id,
                  companyName: v.companyname ?? v.companyName,
                  externalId: v.externalid ?? v.externalId,
                  email: v.email,
                  subsidiary: v.subsidiary,
                }));
                return successResponse({ found: true, matchLevel: "name", vendors });
              }
            }
            return successResponse({ found: false, matchLevel: "none", vendors: [] });
          }

          // REST fallback: fetch a page and filter
          const page: any = await withRetry(
            () => client.get<any>("/vendor", { limit: "1000", offset: "0" }),
            "find_vendor REST list"
          );
          const items = page?.items || [];
          if (externalId && typeof externalId === "string") {
            const v = items.find((x: any) => x.externalId === externalId);
            if (v) {
              const subOk = !subsidiaryId || String(v.subsidiary?.id ?? v.subsidiary) === String(subsidiaryId);
              if (subOk) {
                return successResponse({
                  found: true,
                  matchLevel: "externalId",
                  vendors: [{ id: v.id, companyName: v.companyName, externalId: v.externalId, email: v.email, subsidiary: v.subsidiary }],
                });
              }
            }
          }
          if (name && typeof name === "string") {
            const nameLower = name.toLowerCase();
            const matches = items.filter((x: any) => (x.companyName || "").toLowerCase() === nameLower);
            const subFilter = subsidiaryId
              ? matches.filter((x: any) => String(x.subsidiary?.id ?? x.subsidiary) === String(subsidiaryId))
              : matches;
            const list = (subFilter.length ? subFilter : matches).slice(0, 5).map((v: any) => ({
              id: v.id,
              companyName: v.companyName,
              externalId: v.externalId,
              email: v.email,
              subsidiary: v.subsidiary,
            }));
            if (list.length > 0) return successResponse({ found: true, matchLevel: "name", vendors: list });
          }
          return successResponse({ found: false, matchLevel: "none", vendors: [] });
        } catch (error: any) {
          return errorResponse(`Error finding vendor: ${error.message}`);
        }
      }
    );
  }

  // Discover filterable vendor fields for RQL (?q=) queries
  server.registerTool(
    "netsuite_get_vendor_filterable_fields",
    {
      description:
        "Inspect NetSuite vendor metadata-catalog and return fields that are filterable with the REST Record Query Language (?q=). Useful to know which field names are valid in RQL filters.",
    },
    async () => {
      try {
        const meta: any = await withRetry(
          () => client.get<any>("/vendor/metadata-catalog"),
          "get_vendor_filterable_fields metadata"
        );

        const properties =
          meta?.properties ??
          meta?.components?.schemas?.vendor?.properties ??
          {};

        const filterableFields: Array<{ name: string; type: string }> = [];

        Object.entries(properties).forEach(([fieldName, fieldDef]: any) => {
          if (fieldDef && fieldDef["x-ns-filterable"] === true) {
            filterableFields.push({
              name: fieldName,
              type: fieldDef.type ?? fieldDef["$ref"] ?? "unknown",
            });
          }
        });

        return successResponse({
          record: "vendor",
          filterableFields,
          total: filterableFields.length,
          hint:
            "Use these field names with the ?q= filter. Example: ?q=<fieldName> CONTAIN \"value\" (see NetSuite N/query operators).",
        });
      } catch (e: any) {
        return errorResponse(
          `netsuite_get_vendor_filterable_fields failed: ${parseNetSuiteError(e)}`
        );
      }
    }
  );

  // Find vendor by externalId only (idempotency helper)
  if (isToolEnabled("vendors", "netsuite_get_vendor_by_external_id")) {
    server.registerTool(
      "netsuite_get_vendor_by_external_id",
      {
        description:
          "Find a NetSuite vendor by its externalId (e.g. 'spk_supplier_<spendeskId>'). Uses NetSuite REST Record Query Language (RQL) on the vendor list, then enriches with full vendor details. Returns { found, vendor: { id, companyName, externalId, email, subsidiary } | null }",
        inputSchema: z
          .object({
            externalId: z.string().describe("e.g. spk_supplier_9wlihd_41supnn"),
          })
          .strict() as any,
      },
      async ({ externalId }: any) => {
        try {
          if (!externalId || typeof externalId !== "string") {
            return errorResponse("Missing required parameter: externalId (string)");
          }

          const listRes: any = await withRetry(
            () =>
              client.get<any>("/vendor", {
                q: `externalId IS "${externalId}"`,
                limit: "1",
              }),
            "get_vendor_by_external_id list"
          );
          const items = listRes?.items ?? [];

          if (items.length === 0) {
            return successResponse({ found: false, vendor: null, source: "rql" });
          }

          const vendorDetail: any = await withRetry(
            () => client.get<any>(`/vendor/${items[0].id}`),
            "get_vendor_by_external_id detail"
          );

          return successResponse({
            found: true,
            source: "rql",
            vendor: {
              id: vendorDetail.id,
              companyName: vendorDetail.companyName,
              externalId: vendorDetail.externalId,
              email: vendorDetail.email,
              subsidiary: vendorDetail.subsidiary?.id ?? vendorDetail.subsidiary,
            },
          });
        } catch (e: any) {
          return errorResponse(
            `get_vendor_by_external_id failed: ${parseNetSuiteError(e)}`
          );
        }
      }
    );
  }

  // Search vendors by name (partial, case-insensitive)
  if (isToolEnabled("vendors", "netsuite_search_vendors_by_name")) {
    server.registerTool(
      "netsuite_search_vendors_by_name",
      {
        description:
          "Search NetSuite vendors by name (case-insensitive, partial match). Uses NetSuite REST Record Query Language (RQL) on the vendor list, then enriches with full vendor details. Optional filter by subsidiaryId.",
        inputSchema: z
          .object({
            name: z.string().describe("Vendor name to search for"),
            subsidiaryId: z.string().optional().describe("Filter by subsidiary ID (optional)"),
            limit: z.number().optional().describe("Max results to return (default 10)"),
          })
          .strict() as any,
      },
      async ({ name, subsidiaryId, limit }: any) => {
        try {
          if (!name || typeof name !== "string") {
            return errorResponse("Missing required parameter: name (string)");
          }
          const maxRows = typeof limit === "number" ? limit : 10;
          const safeName = name.replace(/"/g, '\\"');

          const listRes: any = await withRetry(
            async () => {
              // Try lowercase field name first (companyname), then camelCase (companyName)
              const primary = await client.get<any>("/vendor", {
                q: `companyname START_WITH "${safeName}"`,
                limit: String(maxRows * 3),
              });
              return primary;
            },
            "search_vendors_by_name list"
          );
          const items = listRes?.items ?? [];

          const vendors = await Promise.all(
            items.map((item: any) =>
              withRetry(
                () => client.get<any>(`/vendor/${item.id}`),
                "search_vendors_by_name detail"
              )
                .then((v: any) => ({
                  id: v.id,
                  companyName: v.companyName,
                  entityId: v.entityId,
                  externalId: v.externalId,
                  email: v.email,
                  subsidiary: v.subsidiary?.id ?? v.subsidiary,
                }))
                .catch(() => ({ id: item.id }))
            )
          );

          const filtered =
            subsidiaryId && typeof subsidiaryId === "string"
              ? vendors.filter((v: any) => v.subsidiary === subsidiaryId)
              : vendors;

          const sliced = filtered.slice(0, maxRows);

          return successResponse({
            count: sliced.length,
            vendors: sliced,
            source: "rql",
          });
        } catch (e: any) {
          return errorResponse(
            `search_vendors_by_name failed: ${parseNetSuiteError(e)}`
          );
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
        
        const result = await withRetry(
          () =>
            client.get<unknown>(`/vendor/${id}`, {
              expandSubResources: "true",
            }),
          `get_vendor ${id}`
        );
        
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
        const listResult: any = await withRetry(
          () => client.get<any>("/vendor", pagination),
          "get_latest_vendors list"
        );
        
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
            const vendorDetail: any = await withRetry(
              () =>
                client.get<any>(`/vendor/${vendorRef.id}`, {
                  expandSubResources: "true",
                }),
              `get_latest_vendors detail ${vendorRef.id}`
            );
            
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
        description: "Get list of custom form IDs used by existing vendors. Returns form IDs to use with netsuite_create_vendor. Use this if vendor creation fails with 400 to discover the correct customForm ID.",
        inputSchema: {} as any,
      },
      async () => {
        try {
          // Get a sample of vendors via REST API (simpler than SuiteQL)
          const vendors: any = await withRetry(
            () => client.get<any>("/vendor", { limit: "50" }),
            "get_vendor_forms list"
          );
          const items = vendors?.items || [];
          
          // Extract unique form IDs by fetching full vendor details
          const formIds = new Set<string>();
          
          for (const vendorRef of items.slice(0, 20)) { // Check first 20 vendors
            try {
              const vendor: any = await withRetry(
                () => client.get<any>(`/vendor/${vendorRef.id}`),
                "get_vendor_forms detail"
              );
              if (vendor.customForm?.id) {
                formIds.add(String(vendor.customForm.id));
              }
            } catch (e) {
              // Skip vendor if error
              continue;
            }
          }

          const forms = Array.from(formIds).map((id) => ({
            id,
            name: `Custom Form ${id}`,
          }));

          return successResponse({ 
            forms,
            count: forms.length,
            note: "These are custom form IDs currently used by existing vendors. Use the 'id' field as the customForm parameter when creating vendors. To get the form name, inspect a vendor using that form with netsuite_get_vendor_by_id.",
            example: "If you see id='297', use { customForm: '297' } when creating a vendor."
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
        inputSchema: z
          .object({
            companyName: z.string(),
            subsidiary: z.string(),
            email: z.string().optional(),
            phone: z.string().optional(),
            externalId: z.string().optional(),
            isPerson: z.boolean().optional(),
            currency: z.string().optional(),
            vatRegNumber: z.string().optional(),
            legalName: z.string().optional(),
            addr1: z.string().optional(),
            city: z.string().optional(),
            zip: z.string().optional(),
            country: z.string().optional(),
            customForm: z
              .string()
              .optional()
              .describe(
                "Custom form ID (e.g. '297' for Intercompany Vendor Form). Use netsuite_get_vendor_forms to discover."
              ),
            customFields: z
              .record(z.any())
              .optional()
              .describe(
                "Key-value map of custom field IDs (e.g. { custentity_foo: 'value' })"
              ),
          })
          .strict() as any,
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

          // Pre-flight idempotency: if SuiteQL available and externalId provided, check for existing
          if (externalId && typeof externalId === "string" && (await canUseSuiteQL(client))) {
            try {
              const safeExt = externalId.replace(/'/g, "''");
              const existing = await executeSuiteQL(
                client,
                `SELECT id, companyName FROM vendor WHERE externalId = '${safeExt}' FETCH FIRST 1 ROWS ONLY`,
                1,
                0
              );
              const row = existing.items[0];
              if (row) {
                return successResponse({
                  created: false,
                  found: true,
                  id: row.id,
                  companyName: row.companyname ?? row.companyName,
                  message: "Vendor already exists with this externalId (idempotent)",
                });
              }
            } catch (checkError: any) {
              console.warn(
                `[create_vendor] Pre-flight SuiteQL idempotency check failed (continuing): ${
                  (checkError as Error).message
                }`
              );
            }
          }

          const body: Record<string, any> = {
            isPerson: isPerson ?? false,
            companyName,
            subsidiary: { id: subsidiary },
          };

          // Custom form (required by some NetSuite instances)
          if (customForm) {
            body.customForm = { id: customForm };
          }

          if (currency) body.currency = { id: currency };

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
                defaultShipping: true,
                addressbookAddress: {
                  ...(addr1 && { addr1 }),
                  ...(city && { city }),
                  ...(zip && { zip }),
                  ...(country && { country: { id: country } }),
                },
              }],
            };
          }

          const result: any = await withRetry(
            () => client.post<unknown>("/vendor", body),
            "create_vendor"
          );
          const id = (result as any)?.id ?? (result as any)?.location?.split("/").pop();
          return successResponse({
            created: true,
            id,
            companyName,
            raw: result,
          });
        } catch (error: any) {
          const msg = parseNetSuiteError(error);
          console.error("❌ [create_vendor] Error:", msg);

          if (
            msg.includes("already a vendor using that entity name") ||
            msg.toLowerCase().includes("unique entity name")
          ) {
            try {
              const safeName = companyName.replace(/"/g, '\\"').split(" ")[0];

              const searchResult: any = await withRetry(
                () =>
                  client.get<any>("/vendor", {
                    q: `companyname START_WITH "${safeName}"`,
                    limit: "10",
                  }),
                `search_vendor_by_name ${companyName}`
              );
              const items = searchResult?.items ?? [];

              const enriched = await Promise.all(
                items.slice(0, 5).map((item: any) =>
                  withRetry(
                    () => client.get<any>(`/vendor/${item.id}`),
                    `search_vendor_by_name detail ${item.id}`
                  )
                    .then((v: any) => ({
                      id: v.id,
                      companyName: v.companyName,
                      externalId: v.externalId,
                    }))
                    .catch(() => null)
                )
              );

              const match = enriched.find(
                (v: any) =>
                  v &&
                  typeof v.companyName === "string" &&
                  v.companyName.toLowerCase() === companyName.toLowerCase()
              );

              if (match) {
                if (externalId && !match.externalId) {
                  await withRetry(
                    () =>
                      client.patch<any>(`/vendor/${match.id}`, {
                        externalId,
                      }),
                    `link_externalId vendor ${match.id}`
                  );
                }

                return successResponse({
                  created: false,
                  found: true,
                  linkedExisting: Boolean(externalId && !match.externalId),
                  id: match.id,
                  companyName: match.companyName,
                  message: `Vendor "${companyName}" already existed (id: ${match.id}).${
                    externalId && !match.externalId
                      ? ` ExternalId "${externalId}" linked.`
                      : ""
                  }`,
                });
              }

              return successResponse({
                created: false,
                found: false,
                linkedExisting: false,
                id: null,
                companyName,
                manualAction:
                  `Vendor "${companyName}" exists in NetSuite but could not be auto-linked. ` +
                  `Find its ID in NetSuite UI and call: ` +
                  (externalId
                    ? `netsuite_update_vendor(id="<id>", externalId="${externalId}")`
                    : `netsuite_update_vendor(id="<id>", externalId="<desired_externalId>")`),
              });
            } catch (linkError: any) {
              const linkMsg = parseNetSuiteError(linkError);
              return errorResponse(
                `Error creating vendor '${companyName}': name appears to be already taken, and auto-linking failed: ${linkMsg}`
              );
            }
          }

          return errorResponse(
            `Error creating vendor '${companyName}': ${msg}. If this is a 400 validation error, try calling netsuite_get_vendor_forms first to discover the correct customForm ID and required custom fields.`
          );
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

