import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { NetSuiteClient } from "../netsuite-client.js";
import { z } from "zod";
import { buildPaginationQuery } from "../utils/pagination.js";
import { successResponse, errorResponse } from "./_helpers.js";

export function registerPaymentTools(server: McpServer, client: NetSuiteClient): void {
  // List vendor payments (bill payments)
  server.registerTool(
    "netsuite_get_bill_payments",
    {
      description: "List NetSuite vendor payments (bill payments) with optional search and pagination. Optional parameters: limit (number), offset (number), q (string, search query)",
      inputSchema: {
        limit: z.number().optional(),
        offset: z.number().optional(),
        q: z.string().optional(),
      } as any,
    },
    async ({ limit, offset, q }: any) => {
      try {
        const pagination = buildPaginationQuery({ limit, offset });
        const params: Record<string, string> = { ...pagination };
        if (q) {
          params.q = q;
        }

        const result = await client.get<unknown>("/vendorpayment", params);
        return successResponse(result);
      } catch (error: any) {
        return errorResponse(`Error listing bill payments: ${error.message}`);
      }
    }
  );

  // Get a single vendor payment by ID
  server.registerTool(
    "netsuite_get_bill_payment",
    {
      description: "Get a single NetSuite vendor payment (bill payment) by ID. Required parameter: id (string, payment ID)",
      inputSchema: {
        id: z.string(),
      } as any,
    },
    async ({ id }: any) => {
      try {
        if (!id || typeof id !== "string") {
          return errorResponse("Missing required parameter: id (string, payment ID)");
        }

        const result = await client.get<unknown>(`/vendorpayment/${id}`);
        return successResponse(result);
      } catch (error: any) {
        return errorResponse(`Error getting bill payment: ${error.message}`);
      }
    }
  );

  // Create vendor payment (bill payment)
  server.registerTool(
    "netsuite_create_bill_payment",
    {
      description: "Create a NetSuite vendor payment (bill payment) and apply it to one or more vendor bills. Required parameters: entity (string, vendor ID), account (string, bank account ID), tranDate (string, YYYY-MM-DD). Optional: subsidiary (string, defaults to '1'), currency (string, defaults to '1' for EUR), externalId (for idempotence), memo, exchangeRate (default 1), applyList (object with apply array containing doc, apply=true, amount). NOTE: Without applyList, creates an unapplied payment.",
      inputSchema: {
        entity: z.string(),
        account: z.string(),
        tranDate: z.string(),
        subsidiary: z.string().optional(),
        currency: z.string().optional(),
        externalId: z.string().optional(),
        memo: z.string().optional(),
        exchangeRate: z.number().optional(),
        applyList: z.any().optional(),
      } as any,
    },
    async ({ entity, account, tranDate, subsidiary, currency, externalId, memo, exchangeRate, applyList }: any) => {
      try {
        // Validate required parameters
        if (!entity || typeof entity !== "string") {
          return errorResponse("Missing required parameter: entity (string, vendor ID)");
        }
        if (!account || typeof account !== "string") {
          return errorResponse("Missing required parameter: account (string, bank account ID)");
        }
        if (!tranDate || typeof tranDate !== "string") {
          return errorResponse("Missing required parameter: tranDate (string, YYYY-MM-DD)");
        }

        const body: any = {
          entity: { id: entity },
          account: { id: account },
          tranDate,
          subsidiary: { id: subsidiary || "1" }, // Default to subsidiary 1
          currency: { id: currency || "1" }, // Default to EUR
          exchangeRate: exchangeRate || 1, // Default exchange rate
        };

        if (externalId) body.externalId = externalId;
        if (memo) body.memo = memo;

        if (applyList?.apply && Array.isArray(applyList.apply)) {
          body.apply = {
            items: applyList.apply.map((item: any) => ({
              doc: { id: String(item.doc) }, // Document ID (bill ID)
              apply: item.apply !== false, // Default to true
              amount: item.amount,
            })),
          };
        }

        const result = await client.post<unknown>("/vendorpayment", body);
        return successResponse(result);
      } catch (error: any) {
        return errorResponse(`Error creating bill payment: ${error.message}`);
      }
    }
  );
}
