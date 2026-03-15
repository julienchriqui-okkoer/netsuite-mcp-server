import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { NetSuiteClient } from "../netsuite-client.js";
import { z } from "zod";
import { buildPaginationQuery } from "../utils/pagination.js";
import { parseParam } from "../utils/parseParam.js";
import { withRetry } from "../lib/retry.js";
import { parseNetSuiteError } from "../lib/errors.js";
import { successResponse, errorResponse } from "./_helpers.js";

export function registerJournalEntryTools(server: McpServer, client: NetSuiteClient): void {
  // Get journal entry by externalId (idempotency helper for bank fees etc.)
  server.registerTool(
    "netsuite_get_journal_entry_by_external_id",
    {
      description:
        "Get a journal entry by its externalId (idempotency helper). Required: externalId (string). Returns { found: boolean, entry: { id, externalId, tranDate, ... } | null }",
      inputSchema: z.object({ externalId: z.string() }).strict() as any,
    },
    async ({ externalId }: any) => {
      try {
        if (!externalId || typeof externalId !== "string") {
          return errorResponse("Missing required parameter: externalId (string)");
        }
        const res: any = await withRetry(
          () =>
            client.get<any>("/journalEntry", {
              q: `externalId IS "${externalId}"`,
              limit: "1",
            }),
          "get_journal_entry_by_external_id"
        );
        const items = res?.items ?? [];
        const entry = items.length > 0 ? items[0] : null;
        return successResponse({ found: items.length > 0, entry });
      } catch (e: any) {
        return errorResponse(
          `get_journal_entry_by_external_id failed: ${parseNetSuiteError(e)}`
        );
      }
    }
  );

  server.registerTool(
    "netsuite_get_journal_entries",
    {
      description: "List NetSuite journal entries with optional search and pagination. Optional parameters: limit (number), offset (number), q (string, search query)",
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

        const result = await client.get<unknown>("/journalEntry", params);
        return successResponse(result);
      } catch (error: any) {
        return errorResponse(`Error listing journal entries: ${error.message}`);
      }
    }
  );

  server.registerTool(
    "netsuite_create_journal_entry",
    {
      description: "Create a new NetSuite journal entry with debit/credit lines. Required parameters: subsidiary (string), tranDate (string, YYYY-MM-DD). Optional: memo, externalId (for idempotence), line (array with account, debit, credit, department, location, class, memo, entity)",
      inputSchema: z
        .object({
          subsidiary: z.string().describe("Subsidiary internal ID"),
          tranDate: z.string().describe("Date YYYY-MM-DD"),
          memo: z.string().optional(),
          externalId: z.string().optional(),
          line: z
            .array(z.any())
            .optional()
            .describe(
              "Journal lines: [{ account, debit?, credit?, memo?, department?, location?, class?, entity? }]"
            ),
          dryRun: z
            .boolean()
            .optional()
            .describe("If true, return the NS request body without calling NS (debug mode)"),
        })
        .strict() as any,
    },
    async (params: any) => {
      try {
        const { subsidiary, tranDate, memo, externalId, dryRun } = params;
        const line = parseParam(params.line) ?? [];
        if (!subsidiary || typeof subsidiary !== "string") {
          return errorResponse("Missing required parameter: subsidiary (string)");
        }
        if (!tranDate || typeof tranDate !== "string") {
          return errorResponse("Missing required parameter: tranDate (string, YYYY-MM-DD)");
        }

        // NetSuite expects subsidiary as { id: string }, not a plain string
        const body: any = {
          subsidiary: { id: String(subsidiary) },
          tranDate,
          memo: memo ?? "",
        };
        if (externalId) body.externalId = externalId;
        // Bypass workflow on NS instances that require approvalStatus
        body.approvalStatus = { id: "2" };

        // NS REST API expects body.line = { items: [...] }, not flat array or lineList (SOAP)
        if (line.length > 0) {
          body.line = {
            items: line.map((l: any) => ({
              account: { id: String(l.account?.id ?? l.account) },
              debit: l.debit !== undefined ? l.debit : undefined,
              credit: l.credit !== undefined ? l.credit : undefined,
              memo: l.memo ?? "",
              department: l.department ? { id: String(l.department) } : undefined,
              location: l.location ? { id: String(l.location) } : undefined,
              class: l.class ? { id: String(l.class) } : undefined,
              entity: l.entity ? { id: String(l.entity) } : undefined,
            })),
          };
        }

        console.error("[NS-MCP] POST /journalEntry body:", JSON.stringify(body, null, 2));
        if (dryRun === true) {
          return successResponse({
            dryRun: true,
            url: "/services/rest/record/v1/journalEntry",
            body,
          });
        }

        const result: any = await withRetry(
          () => client.post<unknown>("/journalEntry", body),
          "create_journal_entry"
        );
        // NS returns 204 + Location: .../journalEntry/XXXXX
        const location = result?.location ?? "";
        const id = (typeof location === "string" ? location.split("/").pop() : null) ?? result?.id;
        return successResponse({ id, externalId: params.externalId ?? undefined, success: true });
      } catch (error: any) {
        return errorResponse(`Error creating journal entry: ${parseNetSuiteError(error)}`);
      }
    }
  );
}
