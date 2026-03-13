import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { NetSuiteClient } from "../netsuite-client.js";
import { z } from "zod";
import { buildPaginationQuery } from "../utils/pagination.js";
import { successResponse, errorResponse } from "./_helpers.js";

export function registerVendorCreditTools(server: McpServer, client: NetSuiteClient): void {
  server.registerTool(
    "netsuite_get_vendor_credits",
    {
      description: "List NetSuite vendor credits with optional search and pagination. Optional parameters: limit (number), offset (number), q (string, search query)",
      inputSchema: z
        .object({
          limit: z.number().optional(),
          offset: z.number().optional(),
          q: z.string().optional(),
        })
        .strict() as any,
    },
    async ({ limit, offset, q }: any) => {
      try {
        const pagination = buildPaginationQuery({ limit, offset });
        const params: Record<string, string> = { ...pagination };
        if (q) {
          params.q = q;
        }

        const result = await client.get<unknown>("/vendorCredit", params);
        return successResponse(result);
      } catch (error: any) {
        return errorResponse(`Error listing vendor credits: ${error.message}`);
      }
    }
  );

  server.registerTool(
    "netsuite_create_vendor_credit",
    {
      description: "Create a NetSuite vendor credit (credit note) and optionally apply it to vendor bills. Required parameters: entity (string, vendor ID), subsidiary (string), tranDate (string, YYYY-MM-DD). Optional: memo, externalId (for idempotence), expenseList (object with expense array containing account, amount, department, location, memo), applyList (object with apply array containing doc, apply=true, amount)",
      inputSchema: z
        .object({
          entity: z.string().describe("Vendor internal ID"),
          subsidiary: z.string().describe("Subsidiary internal ID"),
          tranDate: z.string().describe("Date YYYY-MM-DD"),
          memo: z.string().optional(),
          externalId: z.string().optional(),
          expenseList: z.any().optional(),
          applyList: z.any().optional(),
        })
        .strict() as any,
    },
    async ({ entity, subsidiary, tranDate, memo, externalId, expenseList, applyList }: any) => {
      try {
        // Validate required parameters
        if (!entity || typeof entity !== "string") {
          return errorResponse("Missing required parameter: entity (string, vendor ID)");
        }
        if (!subsidiary || typeof subsidiary !== "string") {
          return errorResponse("Missing required parameter: subsidiary (string)");
        }
        if (!tranDate || typeof tranDate !== "string") {
          return errorResponse("Missing required parameter: tranDate (string, YYYY-MM-DD)");
        }

        const body: any = {
          entity: { id: entity },
          subsidiary: { id: subsidiary },
          tranDate,
        };

        if (memo) body.memo = memo;
        if (externalId) body.externalId = externalId;

        if (expenseList?.expense && Array.isArray(expenseList.expense)) {
          body.expenseList = {
            expense: expenseList.expense.map((line: any) => {
              const expLine: any = {
                account: { id: line.account },
                amount: line.amount,
              };
              if (line.department) expLine.department = { id: line.department };
              if (line.location) expLine.location = { id: line.location };
              if (line.memo) expLine.memo = line.memo;
              return expLine;
            }),
          };
        }

        if (applyList?.apply && Array.isArray(applyList.apply)) {
          body.applyList = {
            apply: applyList.apply.map((item: any) => ({
              doc: item.doc,
              apply: item.apply ?? true,
              amount: item.amount,
            })),
          };
        }

        const result = await client.post<unknown>("/vendorCredit", body);
        return successResponse(result);
      } catch (error: any) {
        return errorResponse(`Error creating vendor credit: ${error.message}`);
      }
    }
  );
}
