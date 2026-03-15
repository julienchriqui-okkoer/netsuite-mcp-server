import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { NetSuiteClient } from "../netsuite-client.js";
import { z } from "zod";
import { buildPaginationQuery } from "../utils/pagination.js";
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
        })
        .strict() as any,
    },
    async ({ subsidiary, tranDate, memo, externalId, line }: any) => {
      try {
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

        if (line?.length > 0) {
          body.lineList = {
            line: line.map((l: any) => {
              const accountId = l.account?.id ?? l.account;
              const jeLine: any = {
                account: { id: String(accountId) },
                memo: l.memo ?? "",
              };
              if (l.debit !== undefined) jeLine.debit = l.debit;
              if (l.credit !== undefined) jeLine.credit = l.credit;
              if (l.department) jeLine.department = { id: String(l.department) };
              if (l.location) jeLine.location = { id: String(l.location) };
              if (l.class) jeLine.class = { id: String(l.class) };
              if (l.entity) jeLine.entity = { id: String(l.entity) };
              return jeLine;
            }),
          };
        }

        const result: any = await withRetry(
          () => client.post<unknown>("/journalEntry", body),
          "create_journal_entry"
        );
        const id = result?.id ?? (typeof result?.location === "string" ? result.location.split("/").pop() : undefined);
        return successResponse({ id, success: true });
      } catch (error: any) {
        return errorResponse(`Error creating journal entry: ${parseNetSuiteError(error)}`);
      }
    }
  );
}
