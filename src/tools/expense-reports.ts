import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { NetSuiteClient } from "../netsuite-client.js";
import { buildPaginationQuery } from "../utils/pagination.js";

export function registerExpenseReportTools(server: McpServer, client: NetSuiteClient): void {
  server.registerTool(
    "netsuite_get_expense_reports",
    {
      description: "List NetSuite expense reports with optional search and pagination.",
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

        const result = await client.get<unknown>("/expensereport", params);
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
          error instanceof Error ? error.message : "Unknown error listing expense reports.";
        return {
          content: [
            {
              type: "text",
              text: `Error calling NetSuite expense reports: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "netsuite_create_expense_report",
    {
      description: "Create a new NetSuite expense report for an employee with expense lines.",
    },
    async ({ employee, subsidiary, tranDate, memo, externalId, expenseList }: any) => {
      try {
        const body: any = {
          employee: { id: employee },
          subsidiary: { id: subsidiary },
          tranDate,
        };

        if (memo) body.memo = memo;
        if (externalId) body.externalId = externalId;

        if (expenseList?.expense && Array.isArray(expenseList.expense)) {
          body.expenseList = {
            expense: expenseList.expense.map((line: any) => {
              const expLine: any = {
                expenseDate: line.expenseDate,
                account: { id: line.account },
                amount: line.amount,
              };
              if (line.taxCode) expLine.taxCode = { id: line.taxCode };
              if (line.department) expLine.department = { id: line.department };
              if (line.location) expLine.location = { id: line.location };
              if (line.class) expLine.class = { id: line.class };
              if (line.memo) expLine.memo = line.memo;
              if (line.currency) expLine.currency = { id: line.currency };
              if (line.exchangeRate) expLine.exchangeRate = line.exchangeRate;
              if (line.foreignAmount) expLine.foreignAmount = line.foreignAmount;
              return expLine;
            }),
          };
        }

        const result = await client.post<unknown>("/expensereport", body);
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
          error instanceof Error ? error.message : "Unknown error creating expense report.";
        return {
          content: [
            {
              type: "text",
              text: `Error creating NetSuite expense report: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
