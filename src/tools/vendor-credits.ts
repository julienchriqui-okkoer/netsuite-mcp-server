import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { NetSuiteClient } from "../netsuite-client.js";
import { buildPaginationQuery } from "../utils/pagination.js";

export function registerVendorCreditTools(server: McpServer, client: NetSuiteClient): void {
  server.registerTool(
    "netsuite_get_vendor_credits",
    {
      description: "List NetSuite vendor credits with optional search and pagination.",
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

        const result = await client.get<unknown>("/vendorCredit", params);
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
          error instanceof Error ? error.message : "Unknown error listing vendor credits.";
        return {
          content: [
            {
              type: "text",
              text: `Error calling NetSuite vendor credits: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "netsuite_create_vendor_credit",
    {
      description: "Create a NetSuite vendor credit (credit note) and optionally apply it to vendor bills.",
    },
    async ({ entity, subsidiary, tranDate, memo, externalId, expenseList, applyList }: any) => {
      try {
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
          error instanceof Error ? error.message : "Unknown error creating vendor credit.";
        return {
          content: [
            {
              type: "text",
              text: `Error creating NetSuite vendor credit: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
