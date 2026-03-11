import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { NetSuiteClient } from "../netsuite-client.js";
import { buildPaginationQuery } from "../utils/pagination.js";

export function registerJournalEntryTools(server: McpServer, client: NetSuiteClient): void {
  server.registerTool(
    "netsuite_get_journal_entries",
    {
      description: "List NetSuite journal entries with optional search and pagination.",
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

        const result = await client.get<unknown>("/journalEntry", params);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error: any) {
        const message =
          error instanceof Error ? error.message : "Unknown error listing journal entries.";
        return {
          content: [
            {
              type: "text",
              text: `Error calling NetSuite journal entries: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "netsuite_create_journal_entry",
    {
      description: "Create a new NetSuite journal entry with debit/credit lines.",
    },
    async ({ subsidiary, tranDate, memo, externalId, line }: any) => {
      try {
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
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error: any) {
        const message =
          error instanceof Error ? error.message : "Unknown error creating journal entry.";
        return {
          content: [
            {
              type: "text",
              text: `Error creating NetSuite journal entry: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
