import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { NetSuiteClient } from "../netsuite-client.js";
import { z } from "zod";
import { buildPaginationQuery } from "../utils/pagination.js";
import { withRetry } from "../lib/retry.js";
import { parseNetSuiteError } from "../lib/errors.js";
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
      description:
        "Create a NetSuite vendor credit (for Spendesk credit notes / refunds). Use externalId for idempotency (e.g. spk_payable_<creditNoteId>). Optionally apply to an existing bill via applyList.",
      inputSchema: z
        .object({
          entity: z.string().describe("Vendor internal ID"),
          subsidiary: z.string().describe("Subsidiary internal ID"),
          tranDate: z.string().describe("Date YYYY-MM-DD"),
          memo: z.string().optional(),
          externalId: z
            .string()
            .optional()
            .describe("e.g. spk_payable_<creditNoteId>"),
          expenseList: z
            .object({
              items: z
                .array(
                  z.object({
                    account: z.string(),
                    amount: z.number(),
                    department: z.string().optional(),
                    location: z.string().optional(),
                    memo: z.string().optional(),
                  })
                )
                .optional(),
              expense: z.array(z.any()).optional(),
            })
            .optional()
            .describe("Expense lines: use items or expense array with account, amount, department, memo"),
          applyList: z
            .object({
              items: z
                .array(
                  z.object({
                    doc: z.string().describe("Bill internal ID"),
                    apply: z.boolean().optional(),
                    amount: z.number(),
                  })
                )
                .optional(),
              apply: z.array(z.any()).optional(),
            })
            .optional()
            .describe("Apply credit to existing bill(s): doc, apply, amount"),
        })
        .strict() as any,
    },
    async ({ entity, subsidiary, tranDate, memo, externalId, expenseList, applyList }: any) => {
      try {
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

        const expenseLines = expenseList?.items ?? expenseList?.expense ?? [];
        if (Array.isArray(expenseLines) && expenseLines.length > 0) {
          body.expenseList = {
            expense: expenseLines.map((line: any) => {
              const expLine: any = {
                account: { id: String(line.account) },
                amount: line.amount,
              };
              if (line.department) expLine.department = { id: String(line.department) };
              if (line.location) expLine.location = { id: String(line.location) };
              if (line.memo != null) expLine.memo = line.memo;
              return expLine;
            }),
          };
        }

        const applyItems = applyList?.items ?? applyList?.apply ?? [];
        if (Array.isArray(applyItems) && applyItems.length > 0) {
          body.applyList = {
            apply: applyItems.map((item: any) => ({
              doc: item.doc,
              apply: item.apply ?? true,
              amount: item.amount,
            })),
          };
        }

        const result = await withRetry(
          () => client.post<unknown>("/vendorCredit", body),
          "create_vendor_credit"
        );
        return successResponse(result);
      } catch (error: any) {
        return errorResponse(
          `Error creating vendor credit: ${parseNetSuiteError(error)}`
        );
      }
    }
  );
}
