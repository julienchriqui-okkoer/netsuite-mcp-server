import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { NetSuiteClient } from "../netsuite-client.js";
import { z } from "zod";
import { buildPaginationQuery } from "../utils/pagination.js";
import { parseParam } from "../utils/parseParam.js";
import { canUseSuiteQL } from "../utils/suiteql-capability.js";
import { executeSuiteQL } from "../lib/suiteql.js";
import { parseNetSuiteError } from "../lib/errors.js";
import { withRetry } from "../lib/retry.js";
import { successResponse, errorResponse } from "./_helpers.js";

export function registerVendorBillTools(server: McpServer, client: NetSuiteClient): void {
  server.registerTool(
    "netsuite_get_vendor_bills",
    {
      description:
        "List NetSuite vendor bills with optional search and pagination. Optional parameters: limit (number), offset (number), q (string, search query), status (string, e.g. 'VendBill:A' for open bills)",
      inputSchema: {
        limit: z.number().optional(),
        offset: z.number().optional(),
        q: z.string().optional(),
        status: z.string().optional(),
      } as any,
    },
    async ({ limit, offset, q, status }: any) => {
      try {
        const pagination = buildPaginationQuery({ limit, offset });
        const params: Record<string, string> = {
          ...pagination,
        };
        if (q) {
          params.q = q;
        }
        if (status) {
          params.status = status;
        }

        const result = await withRetry(
          () => client.get<unknown>("/vendorBill", params),
          "get_vendor_bills"
        );
        return successResponse(result);
      } catch (error: any) {
        return errorResponse(`Error listing vendor bills: ${error.message}`);
      }
    }
  );

  server.registerTool(
    "netsuite_get_vendor_bill",
    {
      description:
        "Get a single NetSuite vendor bill by internal ID. Returns full bill details with expanded sub-resources (expense lines, items). Required parameter: id (string, NetSuite internal vendor bill ID)",
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
            client.get<unknown>(`/vendorBill/${id}`, {
              expandSubResources: "true",
            }),
          `get_vendor_bill ${id}`
        );
        return successResponse(result);
      } catch (error: any) {
        return errorResponse(`Error getting vendor bill: ${error.message}`);
      }
    }
  );

  // Get vendor bill by externalId (idempotency helper)
  server.registerTool(
    "netsuite_get_vendor_bill_by_external_id",
    {
      description:
        "Get a vendor bill by its externalId (idempotency helper). Required: externalId (string). Returns { found: boolean, bill: { id, tranId, externalId, entity, tranDate, total } | null }",
      inputSchema: {
        externalId: z.string(),
      } as any,
    },
    async ({ externalId }: any) => {
      try {
        if (!externalId || typeof externalId !== "string") {
          return errorResponse("Missing required parameter: externalId (string)");
        }

        const listRes: any = await withRetry(
          () =>
            client.get<any>("/vendorBill", {
              q: `externalId IS "${externalId}"`,
              limit: "1",
            }),
          "get_vendor_bill_by_external_id list"
        );
        const items = listRes?.items ?? [];

        if (items.length === 0) {
          return successResponse({ found: false, bill: null, source: "rql" });
        }

        const billDetail: any = await withRetry(
          () => client.get<any>(`/vendorBill/${items[0].id}`),
          "get_vendor_bill_by_external_id detail"
        );

        const bill = {
          id: billDetail.id,
          tranId: billDetail.tranId,
          externalId: billDetail.externalId,
          tranDate: billDetail.tranDate,
          dueDate: billDetail.dueDate,
          total: billDetail.total,
          status: billDetail.status?.id ?? billDetail.status,
          entity: billDetail.entity?.id ?? billDetail.entity,
        };

        return successResponse({ found: true, bill, source: "rql" });
      } catch (e: any) {
        return errorResponse(
          `get_vendor_bill_by_external_id failed: ${parseNetSuiteError(e)}`
        );
      }
    }
  );

  // Get vendor bills for a specific vendor (with optional date range)
  server.registerTool(
    "netsuite_get_vendor_bills_for_vendor",
    {
      description:
        "Get vendor bills for a specific vendor, optionally filtered by date range. Required: vendorId (string). Optional: from (YYYY-MM-DD), to (YYYY-MM-DD), limit (number, default 50).",
      inputSchema: {
        vendorId: z.string(),
        from: z.string().optional(),
        to: z.string().optional(),
        limit: z.number().optional(),
      } as any,
    },
    async ({ vendorId, from, to, limit }: any) => {
      try {
        if (!vendorId || typeof vendorId !== "string") {
          return errorResponse("Missing required parameter: vendorId (string)");
        }
        const maxRows = typeof limit === "number" ? limit : 50;

        if (await canUseSuiteQL(client)) {
          const whereParts: string[] = ["type = 'VendBill'", `entity = ${vendorId}`];
          if (from && typeof from === "string") whereParts.push(`tranDate >= DATE '${from}'`);
          if (to && typeof to === "string") whereParts.push(`tranDate <= DATE '${to}'`);
          const result: any = await client.suiteql(
            `SELECT id, tranId, externalId, tranDate, dueDate, total, status FROM transaction WHERE ${whereParts.join(" AND ")} ORDER BY tranDate DESC`,
            maxRows
          );
          const items = result?.items || [];
          const bills = items.map((row: any) => ({
            id: row.id,
            tranId: row.tranid ?? row.tranId,
            externalId: row.externalid ?? row.externalId,
            tranDate: row.trandate ?? row.tranDate,
            dueDate: row.duedate ?? row.dueDate,
            total: row.total,
            status: row.status,
          }));
          return successResponse({ vendorId, count: bills.length, bills, source: "suiteql" });
        }

        const page: any = await withRetry(
          () => client.get<any>("/vendorBill", { limit: "1000", offset: "0" }),
          "get_vendor_bills_for_vendor list"
        );
        const items = page?.items || [];
        const filtered = items.filter((b: any) => {
          if (String(b.entity?.id ?? b.entity) !== String(vendorId)) return false;
          if (from && (b.tranDate || "") < from) return false;
          if (to && (b.tranDate || "") > to) return false;
          return true;
        });
        const sorted = filtered.sort((a: any, b: any) => String(b.tranDate || "").localeCompare(String(a.tranDate || "")));
        const bills = sorted.slice(0, maxRows).map((row: any) => ({
          id: row.id,
          tranId: row.tranId,
          externalId: row.externalId,
          tranDate: row.tranDate,
          dueDate: row.dueDate,
          total: row.total,
          status: row.status,
        }));
        return successResponse({ vendorId, count: bills.length, bills, source: "rest-filter" });
      } catch (error: any) {
        return errorResponse(`Error getting vendor bills for vendor: ${error.message}`);
      }
    }
  );

  server.registerTool(
    "netsuite_create_vendor_bill",
    {
      description:
        "Create a new NetSuite vendor bill with expense lines. Required: entity (vendor ID), subsidiary, tranDate (YYYY-MM-DD). Optional: dueDate, tranId, memo, currency, exchangeRate, foreignAmount, externalId, expense (array of lines with account, amount as NET, memo, department, location, class, taxCode). Set department from cost center map for analytics. Use vatLines for VAT: array of { taxCodeId, taxRate, vatAmount, netAmount } so the tax authority ledger is updated.",
      inputSchema: {
        entity: z.string(),
        subsidiary: z.string(),
        tranDate: z.string(),
        dueDate: z.string().optional(),
        tranId: z.string().optional(),
        memo: z.string().optional(),
        currency: z
          .string()
          .optional()
          .describe("NetSuite currency ID (1=EUR, 2=USD, 3=GBP)"),
        exchangeRate: z
          .number()
          .optional()
          .describe("Exchange rate to EUR (e.g. 0.8651 for USD)"),
        foreignAmount: z
          .number()
          .optional()
          .describe("Original amount in foreign currency"),
        vatAmount: z
          .number()
          .optional()
          .describe("VAT amount in EUR (legacy; prefer vatLines)"),
        taxCodeId: z
          .string()
          .optional()
          .describe("NetSuite tax code ID (legacy; prefer vatLines or expense[].taxCode)"),
        externalId: z.string().optional(),
        expense: z.array(z.any()).optional(),
        vatLines: z
          .array(
            z.object({
              taxCodeId: z.string().describe("NS tax code ID (e.g. '7' for FR 20%)"),
              taxRate: z.number().describe("Rate as decimal e.g. 0.20"),
              vatAmount: z.number().describe("VAT amount in EUR"),
              netAmount: z.number().describe("Net amount in EUR"),
            })
          )
          .optional()
          .describe("VAT breakdown per line; sets taxDetailsOverride so tax authority ledger is updated"),
        dryRun: z
          .boolean()
          .optional()
          .describe("If true, return the NS request body without calling NS (debug mode)"),
      } as any,
    },
    async (params: any) => {
      try {
        const {
          entity,
          subsidiary,
          tranDate,
          dueDate,
          tranId,
          memo,
          currency,
          exchangeRate,
          foreignAmount,
          vatAmount,
          taxCodeId,
          externalId,
          dryRun,
        } = params;
        const expense = parseParam(params.expense) ?? [];
        const vatLines = parseParam(params.vatLines) ?? [];
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
          approvalStatus: { id: "2" }, // Pending Approval by default
        };

        if (dueDate) body.dueDate = dueDate;
        if (tranId) body.tranId = tranId;
        if (memo) body.memo = memo;
        // Currency / FX: only set when meaningfully different from defaults
        if (currency && currency !== "1") {
          body.currency = { id: currency };
        }
        if (typeof exchangeRate === "number" && exchangeRate !== 1) {
          body.exchangeRate = exchangeRate;
        }
        if (externalId) body.externalId = externalId;

        // Expense lines: amount = NET only; taxCode per line when provided
        if (expense.length > 0) {
          body.expense = {
            items: expense.map((line: any, index: number) => {
              const expenseLine: any = {
                account: { id: line.account },
                amount: line.amount,
                memo: line.memo ?? "",
              };
              if (line.department) expenseLine.department = { id: line.department };
              if (line.location) expenseLine.location = { id: line.location };
              if (line.class) expenseLine.class = { id: line.class };
              if (line.taxCode) expenseLine.taxCode = { id: line.taxCode };

              // Legacy: single VAT on first line when vatLines not provided
              if (vatLines.length === 0 && vatAmount != null && vatAmount > 0 && taxCodeId) {
                expenseLine.taxCode = { id: taxCodeId };
                expenseLine.taxAmount = vatAmount;
              }

              if (index === 0 && typeof foreignAmount === "number") {
                expenseLine.foreignAmount = foreignAmount;
              }

              return expenseLine;
            }),
          };
        }

        // VAT breakdown: override tax details so tax authority ledger is updated
        if (vatLines.length > 0) {
          body.taxDetailsOverride = true;
          body.taxDetails = {
            items: vatLines.map((v: any) => ({
              taxCode: { id: v.taxCodeId },
              taxRate: (v.taxRate ?? 0) * 100,
              taxAmount: v.vatAmount,
              netAmount: v.netAmount,
            })),
          };
        }

        console.error("[NS-MCP] POST /vendorBill body:", JSON.stringify(body, null, 2));
        if (dryRun === true) {
          return successResponse({
            dryRun: true,
            url: "/services/rest/record/v1/vendorBill",
            body,
          });
        }

        const result = await withRetry(
          () => client.post<unknown>("/vendorBill", body),
          "create_vendor_bill"
        );
        return successResponse(result);
      } catch (error: any) {
        return errorResponse(`Error creating vendor bill: ${error.message}`);
      }
    }
  );

  server.registerTool(
    "netsuite_update_vendor_bill",
    {
      description: `Update any field of an existing NetSuite vendor bill via PATCH.
Supports: header fields (entity, tranDate, dueDate, tranId, memo, currency, exchangeRate, subsidiary), expense sublist (account, amount, taxCode, memo, department, location, class, amortization), item sublist, custom body fields, billing address.
When expense[] is provided, uses ?replace=expense to REPLACE all lines (not merge). Same for item[] with ?replace=item.`,
      inputSchema: z
        .object({
          id: z.string().describe("NetSuite vendor bill internal ID"),
          entity: z.string().optional().describe("Vendor internal ID"),
          tranDate: z.string().optional().describe("Bill date YYYY-MM-DD"),
          dueDate: z.string().optional().describe("Due date YYYY-MM-DD"),
          tranId: z.string().optional().describe("Invoice/reference number"),
          memo: z.string().optional().describe("Bill memo / description"),
          currency: z.string().optional().describe("NS currency ID (1=EUR, 2=USD)"),
          exchangeRate: z.number().optional().describe("FX rate to base currency"),
          subsidiary: z.string().optional().describe("NS subsidiary ID"),
          expense: z
            .array(
              z.object({
                account: z.string().optional().describe("NS account ID"),
                amount: z.number().optional().describe("Net amount"),
                taxCode: z.string().optional().describe("NS tax code ID (e.g. 2334 = 20-FR)"),
                memo: z.string().optional().describe("Line memo"),
                department: z.string().optional().describe("NS department ID"),
                location: z.string().optional().describe("NS location ID"),
                class: z.string().optional().describe("NS class ID"),
                amortizationSched: z.string().optional().describe("Amortization template ID"),
                amortStartDate: z.string().optional().describe("Amortization start YYYY-MM-DD"),
                amortEndDate: z.string().optional().describe("Amortization end YYYY-MM-DD"),
                customFields: z.record(z.unknown()).optional().describe("custcol_xxx key-value pairs"),
              }).passthrough()
            )
            .optional()
            .describe("Expense lines; when provided REPLACES all existing lines"),
          item: z
            .array(
              z.object({
                item: z.string().optional().describe("NS item ID"),
                quantity: z.number().optional(),
                rate: z.number().optional(),
                amount: z.number().optional(),
                taxCode: z.string().optional(),
                department: z.string().optional(),
                memo: z.string().optional(),
              })
            )
            .optional()
            .describe("Item lines; when provided REPLACES all existing item lines"),
          billingAddress: z
            .object({
              addr1: z.string().optional(),
              city: z.string().optional(),
              zip: z.string().optional(),
              country: z.string().optional(),
              addressee: z.string().optional(),
            })
            .optional(),
          customFields: z.record(z.unknown()).optional().describe("custbody_xxx key-value pairs for custom body fields"),
          dryRun: z.boolean().optional().describe("If true, return body without calling NetSuite"),
        })
        .strict() as any,
    },
    async (params: any) => {
      try {
        const {
          id,
          dryRun,
          entity,
          tranDate,
          dueDate,
          tranId,
          memo,
          currency,
          exchangeRate,
          subsidiary,
          expense,
          item,
          billingAddress,
          customFields,
        } = params;

        if (!id || typeof id !== "string") {
          return errorResponse("Missing required parameter: id (string)");
        }

        const body: Record<string, unknown> = {};

        if (entity != null) body.entity = { id: entity };
        if (tranDate != null) body.tranDate = tranDate;
        if (dueDate != null) body.dueDate = dueDate;
        if (tranId != null) body.tranId = tranId;
        if (memo != null) body.memo = memo;
        if (currency != null) body.currency = { id: currency };
        if (exchangeRate != null) body.exchangeRate = exchangeRate;
        if (subsidiary != null) body.subsidiary = { id: subsidiary };

        if (expense && expense.length > 0) {
          (body as any).expense = {
            items: expense.map((line: any, i: number) => {
              const l: Record<string, unknown> = { line: i + 1 };
              if (line.account != null) l.account = { id: String(line.account) };
              if (line.amount !== undefined) l.amount = line.amount;
              if (line.taxCode != null) l.taxCode = { id: String(line.taxCode) };
              if (line.memo != null) l.memo = line.memo;
              if (line.department != null) l.department = { id: String(line.department) };
              if (line.location != null) l.location = { id: String(line.location) };
              if (line.class != null) l.class = { id: String(line.class) };
              if (line.amortizationSched != null) l.amortizationSched = { id: String(line.amortizationSched) };
              if (line.amortStartDate != null) l.amortStartDate = line.amortStartDate;
              if (line.amortEndDate != null) l.amortEndDate = line.amortEndDate;
              if (line.customFields && typeof line.customFields === "object") {
                Object.entries(line.customFields).forEach(([k, v]) => {
                  (l as any)[k] = v;
                });
              }
              return l;
            }),
          };
        }

        if (item && item.length > 0) {
          (body as any).item = {
            items: item.map((line: any, i: number) => {
              const l: Record<string, unknown> = { line: i + 1 };
              if (line.item != null) l.item = { id: String(line.item) };
              if (line.quantity != null) l.quantity = line.quantity;
              if (line.rate != null) l.rate = line.rate;
              if (line.amount != null) l.amount = line.amount;
              if (line.taxCode != null) l.taxCode = { id: String(line.taxCode) };
              if (line.department != null) l.department = { id: String(line.department) };
              if (line.memo != null) l.memo = line.memo;
              return l;
            }),
          };
        }

        if (billingAddress && typeof billingAddress === "object") {
          (body as any).billingAddress = billingAddress;
        }

        if (customFields && typeof customFields === "object") {
          Object.entries(customFields).forEach(([k, v]) => {
            (body as any)[k] = v;
          });
        }

        if (dryRun === true) {
          return successResponse({
            dryRun: true,
            id,
            body,
          });
        }

        const replaceParams: string[] = [];
        if (expense && expense.length > 0) replaceParams.push("expense");
        if (item && item.length > 0) replaceParams.push("item");
        const query = replaceParams.length > 0 ? `?replace=${replaceParams.join(",")}` : "";
        const path = `/vendorBill/${id}${query}`;

        await withRetry(
          () => client.patch<unknown>(path, body),
          "update_vendor_bill"
        );

        return successResponse({
          success: true,
          id,
          updatedFields: Object.keys(body),
        });
      } catch (error: any) {
        return errorResponse(`Error updating vendor bill: ${parseNetSuiteError(error)}`);
      }
    }
  );
}
