import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { NetSuiteClient } from "../netsuite-client.js";
import { z } from "zod";
import { buildPaginationQuery } from "../utils/pagination.js";
import { withRetry } from "../lib/retry.js";
import { parseNetSuiteError } from "../lib/errors.js";
import { successResponse, errorResponse } from "./_helpers.js";

export function registerExpenseReportTools(server: McpServer, client: NetSuiteClient): void {
  // Get expense report by externalId (idempotency helper for expense claims flow)
  server.registerTool(
    "netsuite_get_expense_report_by_external_id",
    {
      description: "Get an expense report by its externalId (idempotency check before creating an expense report).",
      inputSchema: z.object({ externalId: z.string() }).strict() as any,
    },
    async ({ externalId }: any) => {
      try {
        if (!externalId || typeof externalId !== "string") {
          return errorResponse("Missing required parameter: externalId (string)");
        }
        const res: any = await withRetry(
          () =>
            client.get<any>("/expenseReport", {
              q: `externalId IS "${externalId}"`,
              limit: "1",
            }),
          "get_expense_report_by_external_id"
        );
        const items = res?.items ?? [];
        if (items.length === 0) {
          return successResponse({ found: false, report: null });
        }
        return successResponse({
          found: true,
          report: { id: items[0].id, externalId: items[0].externalId ?? externalId },
        });
      } catch (e: any) {
        return errorResponse(
          `get_expense_report_by_external_id failed: ${parseNetSuiteError(e)}`
        );
      }
    }
  );

  server.registerTool(
    "netsuite_get_expense_reports",
    {
      description: "List NetSuite expense reports with optional search and pagination. Optional parameters: limit (number), offset (number), q (string, search query), status (string, e.g. 'ExpRpt:A' for approved)",
      inputSchema: z
        .object({
          limit: z.number().optional(),
          offset: z.number().optional(),
          q: z.string().optional(),
          status: z.string().optional(),
        })
        .strict() as any,
    },
    async ({ limit, offset, q, status }: any) => {
      try {
        const pagination = buildPaginationQuery({ limit, offset });
        const params: Record<string, string> = { ...pagination };
        if (q) {
          params.q = q;
        }
        if (status) {
          params.status = status;
        }

        const result = await client.get<unknown>("/expenseReport", params);
        return successResponse(result);
      } catch (error: any) {
        return errorResponse(`Error listing expense reports: ${error.message}`);
      }
    }
  );

  server.registerTool(
    "netsuite_create_expense_report",
    {
      description: "Create a new NetSuite expense report for an employee with expense lines. Required parameters: employee (string, employee ID), subsidiary (string), tranDate (string, YYYY-MM-DD). Optional: memo, externalId (for idempotence), expenseList (object with expense array containing expenseDate, account, amount, taxCode, department, location, class, memo, currency, exchangeRate, foreignAmount)",
      inputSchema: z
        .object({
          employee: z.string().describe("Employee internal ID"),
          subsidiary: z.string().describe("Subsidiary internal ID"),
          tranDate: z.string().describe("Date YYYY-MM-DD"),
          currency: z
            .string()
            .optional()
            .describe("NS currency ID (1=EUR, 2=USD, 3=GBP). Default: '1' (EUR)"),
          memo: z.string().optional(),
          externalId: z.string().optional().describe("Idempotency key"),
          expenseList: z
            .object({
              expense: z.array(
                z.object({
                  expenseDate: z.string().optional(),
                  account: z.union([z.string(), z.object({ id: z.string() })]).optional(),
                  amount: z.number(),
                  memo: z.string().optional(),
                  currency: z.string().optional(),
                  foreignAmount: z.number().optional(),
                  exchangeRate: z.number().optional(),
                  department: z.string().optional(),
                  location: z.string().optional(),
                  class: z.string().optional(),
                  taxCode: z.string().optional(),
                })
              ),
            })
            .optional()
            .describe("Expense lines: { expense: [{ expenseDate, account, amount, memo, currency, foreignAmount, exchangeRate, department }] }"),
        })
        .strict() as any,
    },
    async (params: any) => {
      try {
        const { employee, subsidiary, tranDate, currency, memo, externalId, expenseList } = params;
        if (!employee || typeof employee !== "string") {
          return errorResponse("Missing required parameter: employee (string, employee ID)");
        }
        if (!subsidiary || typeof subsidiary !== "string") {
          return errorResponse("Missing required parameter: subsidiary (string)");
        }
        if (!tranDate || typeof tranDate !== "string") {
          return errorResponse("Missing required parameter: tranDate (string, YYYY-MM-DD)");
        }

        // NS REST: employee/entity (employee ID), subsidiary, currency as { id: string }
        // Some NS REST variants use "entity" for the employee (like vendorBill uses entity for vendor)
        const body: any = {};
        body.employee = { id: String(params.employee) };
        body.entity = { id: String(params.employee) };
        body.subsidiary = { id: String(params.subsidiary) };
        body.currency = { id: String(params.currency ?? "1") };
        body.tranDate = params.tranDate;
        body.memo = params.memo ?? "";
        if (params.externalId) body.externalId = params.externalId;

        const expenseLines = params.expenseList?.expense ?? [];
        if (expenseLines.length > 0) {
          body.expenseList = {
            expense: expenseLines.map((e: any) => ({
              expenseDate: e.expenseDate ?? params.tranDate,
              account: { id: String(e.account?.id ?? e.account) },
              amount: e.amount,
              memo: e.memo ?? "",
              currency: e.currency != null ? { id: String(e.currency) } : undefined,
              exchangeRate: e.exchangeRate ?? undefined,
              foreignAmount: e.foreignAmount ?? undefined,
              department: e.department != null ? { id: String(e.department) } : undefined,
              location: e.location != null ? { id: String(e.location) } : undefined,
              class: e.class != null ? { id: String(e.class) } : undefined,
              taxCode: e.taxCode != null ? { id: String(e.taxCode) } : undefined,
            })),
          };
        }

        const result: any = await withRetry(
          () => client.post<unknown>("/expenseReport", body),
          "create_expense_report"
        );
        const location = result?.location ?? "";
        const id = (typeof location === "string" ? location.split("/").pop() : null) ?? result?.id;
        return successResponse({ id, externalId: params.externalId ?? undefined, success: true });
      } catch (error: any) {
        return errorResponse(`Error creating expense report: ${parseNetSuiteError(error)}`);
      }
    }
  );
}
