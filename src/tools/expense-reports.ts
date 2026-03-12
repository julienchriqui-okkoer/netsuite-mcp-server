import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { NetSuiteClient } from "../netsuite-client.js";
import { buildPaginationQuery } from "../utils/pagination.js";
import { successResponse, errorResponse } from "./_helpers.js";

export function registerExpenseReportTools(server: McpServer, client: NetSuiteClient): void {
  server.registerTool(
    "netsuite_get_expense_reports",
    {
      description: "List NetSuite expense reports with optional search and pagination. Optional parameters: limit (number), offset (number), q (string, search query), status (string, e.g. 'ExpRpt:A' for approved)",
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
    },
    async ({ employee, subsidiary, tranDate, memo, externalId, expenseList }: any) => {
      try {
        // Validate required parameters
        if (!employee || typeof employee !== "string") {
          return errorResponse("Missing required parameter: employee (string, employee ID)");
        }
        if (!subsidiary || typeof subsidiary !== "string") {
          return errorResponse("Missing required parameter: subsidiary (string)");
        }
        if (!tranDate || typeof tranDate !== "string") {
          return errorResponse("Missing required parameter: tranDate (string, YYYY-MM-DD)");
        }

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

        const result = await client.post<unknown>("/expenseReport", body);
        return successResponse(result);
      } catch (error: any) {
        return errorResponse(`Error creating expense report: ${error.message}`);
      }
    }
  );
}
