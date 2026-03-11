import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { NetSuiteClient } from "../netsuite-client.js";
import { buildPaginationQuery } from "../utils/pagination.js";
import { z } from "zod";

export function registerVendorTools(server: McpServer, client: NetSuiteClient): void {
  const getVendorsSchema = z.object({
    limit: z.number().optional().describe("Maximum number of vendors to return"),
    offset: z.number().optional().describe("Offset for pagination"),
    q: z.string().optional().describe("Search query"),
  });

  const getVendorSchema = z.object({
    id: z.string().describe("NetSuite vendor internal ID"),
  });

  const getLatestVendorsSchema = z.object({
    limit: z.number().optional().describe("Number of vendors to return (default: 5)"),
  });

  server.registerTool(
    "netsuite_get_vendors",
    {
      description: "List NetSuite vendors (suppliers) with optional search and pagination.",
      inputSchema: getVendorsSchema,
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
              type: "text" as const,
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
              type: "text" as const,
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
      inputSchema: getVendorSchema,
    },
    async ({ id }: any) => {
      try {
        const result = await client.get<unknown>(`/vendor/${id}`, {
          expandSubResources: "true",
        });
        return {
          content: [
            {
              type: "text" as const,
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
              type: "text" as const,
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
      description: "Get the 5 most recently created vendors in a Spendesk-compatible format (name, email, phone, address, VAT, currency, external ID).",
      inputSchema: getLatestVendorsSchema,
    },
    async ({ limit }: any) => {
      try {
        const limitValue = limit || 5;
        
        const query = `
          SELECT
            id,
            companyName,
            email,
            phone,
            defaultAddress,
            vatRegNumber,
            legalName,
            currency,
            subsidiary,
            isInactive,
            dateCreated,
            lastModifiedDate,
            externalId
          FROM vendor
          ORDER BY dateCreated DESC
          LIMIT ${limitValue}
        `;

        const result: any = await client.suiteql<any>(query);

        // Transform NetSuite format to Spendesk-compatible format
        const vendors = (result.items || []).map((item: any) => ({
          id: item.id,
          name: item.companyName,
          email: item.email || null,
          phone: item.phone || null,
          address: item.defaultAddress || null,
          vatNumber: item.vatRegNumber || null,
          legalName: item.legalName || item.companyName,
          currency: item.currency || null,
          subsidiary: item.subsidiary || null,
          isActive: !item.isInactive,
          createdAt: item.dateCreated,
          updatedAt: item.lastModifiedDate,
          externalId: item.externalId || null,
        }));

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ vendors, count: vendors.length }, null, 2),
            },
          ],
        };
      } catch (error: any) {
        const message =
          error instanceof Error ? error.message : "Unknown error getting latest vendors.";
        return {
          content: [
            {
              type: "text" as const,
              text: `Error calling NetSuite latest vendors: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}

