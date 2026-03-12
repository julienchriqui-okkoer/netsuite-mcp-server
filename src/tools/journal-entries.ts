import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { NetSuiteClient } from "../netsuite-client.js";
import { buildPaginationQuery } from "../utils/pagination.js";
import { successResponse, errorResponse } from "./_helpers.js";

export function registerJournalEntryTools(server: McpServer, client: NetSuiteClient): void {
  server.registerTool(
    "netsuite_get_journal_entries",
    {
      description: "List NetSuite journal entries with optional search and pagination. Optional parameters: limit (number), offset (number), q (string, search query)",
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
    },
    async ({ subsidiary, tranDate, memo, externalId, line }: any) => {
      try {
        // Validate required parameters
        if (!subsidiary || typeof subsidiary !== "string") {
          return errorResponse("Missing required parameter: subsidiary (string)");
        }
        if (!tranDate || typeof tranDate !== "string") {
          return errorResponse("Missing required parameter: tranDate (string, YYYY-MM-DD)");
        }

        const body: any = {
          subsidiary: { id: subsidiary },
          tranDate,
        };

        if (memo) body.memo = memo;
        if (externalId) body.externalId = externalId;

        if (line && Array.isArray(line)) {
          body.line = line.map((l: any) => {
            const jeLine: any = {
              account: { id: l.account },
            };
            if (l.debit !== undefined) jeLine.debit = l.debit;
            if (l.credit !== undefined) jeLine.credit = l.credit;
            if (l.department) jeLine.department = { id: l.department };
            if (l.location) jeLine.location = { id: l.location };
            if (l.class) jeLine.class = { id: l.class };
            if (l.memo) jeLine.memo = l.memo;
            if (l.entity) jeLine.entity = { id: l.entity };
            return jeLine;
          });
        }

        const result = await client.post<unknown>("/journalEntry", body);
        return successResponse(result);
      } catch (error: any) {
        return errorResponse(`Error creating journal entry: ${error.message}`);
      }
    }
  );
}
