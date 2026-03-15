import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { NetSuiteClient } from "../netsuite-client.js";
import { z } from "zod";
import { parseParam } from "../utils/parseParam.js";
import { withRetry } from "../lib/retry.js";
import { parseNetSuiteError } from "../lib/errors.js";
import { successResponse, errorResponse } from "./_helpers.js";

export function registerAccrualJournalEntryTools(server: McpServer, client: NetSuiteClient): void {
  server.registerTool(
    "netsuite_create_accrual_journal_entry",
    {
      description:
        "Create a month-end accrual journal entry with automatic NS reversal. Use after spendesk_get_accruals to post charges-à-payer (408xxx) entries. NS will auto-reverse on reversalDate (typically 1st of next month).",
      inputSchema: z
        .object({
          subsidiary: z.string().describe("NS subsidiary ID"),
          tranDate: z.string().describe("Accrual date YYYY-MM-DD (last day of month)"),
          reversalDate: z.string().describe("Auto-reversal date YYYY-MM-DD (1st of next month)"),
          externalId: z.string().optional().describe("e.g. spk_accrual_2026-02_<supplierId>"),
          memo: z.string().optional(),
          line: z
            .array(z.any())
            .optional()
            .describe("Journal lines (account, debit, credit, memo, department)"),
          dryRun: z
            .boolean()
            .optional()
            .describe("If true, return the NS request body without calling NS (debug mode)"),
        })
        .strict() as any,
    },
    async (params: any) => {
      try {
        const { subsidiary, tranDate, reversalDate, externalId, memo, dryRun } = params;
        const line = parseParam(params.line) ?? [];
        if (!subsidiary || typeof subsidiary !== "string") {
          return errorResponse("Missing required parameter: subsidiary (string)");
        }
        if (!tranDate || typeof tranDate !== "string") {
          return errorResponse("Missing required parameter: tranDate (string, YYYY-MM-DD)");
        }
        if (!reversalDate || typeof reversalDate !== "string") {
          return errorResponse("Missing required parameter: reversalDate (string, YYYY-MM-DD)");
        }

        const body: any = {
          subsidiary: { id: String(subsidiary) },
          tranDate,
          memo: memo ?? "",
          isReversal: false,
          reversalDate,
          reversalDefer: false,
        };
        if (externalId) body.externalId = externalId;

        // NS REST API expects body.line = { items: [...] }, not flat array or lineList (SOAP)
        if (line.length > 0) {
          body.line = {
            items: line.map((l: any) => ({
              account: { id: String(l.account?.id ?? l.account) },
              debit: l.debit !== undefined ? l.debit : undefined,
              credit: l.credit !== undefined ? l.credit : undefined,
              memo: l.memo ?? "",
              department: l.department ? { id: String(l.department) } : undefined,
            })),
          };
        }

        console.error("[NS-MCP] POST /journalEntry (accrual) body:", JSON.stringify(body, null, 2));
        if (dryRun === true) {
          return successResponse({
            dryRun: true,
            url: "/services/rest/record/v1/journalEntry",
            body,
          });
        }

        const result: any = await withRetry(
          () => client.post<unknown>("/journalEntry", body),
          "create_accrual_journal_entry"
        );
        const location = result?.location ?? "";
        const id = (typeof location === "string" ? location.split("/").pop() : null) ?? result?.id;
        return successResponse({ id, reversalDate, externalId: params.externalId ?? undefined, success: true });
      } catch (error: any) {
        return errorResponse(`Error creating accrual journal entry: ${parseNetSuiteError(error)}`);
      }
    }
  );
}
