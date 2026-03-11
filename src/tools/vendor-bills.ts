import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { NetSuiteClient } from "../netsuite-client.js";
import { buildPaginationQuery } from "../utils/pagination.js";

export function registerVendorBillTools(server: McpServer, client: NetSuiteClient): void {
  server.registerTool(
    "netsuite_get_vendor_bills",
    {
      description: "List NetSuite vendor bills with optional search and pagination.",
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

        const result = await client.get<unknown>("/vendorBill", params);
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
          error instanceof Error ? error.message : "Unknown error listing vendor bills.";
        return {
          content: [
            {
              type: "text",
              text: `Error calling NetSuite vendor bills: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "netsuite_get_vendor_bill",
    {
      description: "Get a single NetSuite vendor bill by internal ID.",
    },
    async ({ id }: any) => {
      try {
        const result = await client.get<unknown>(`/vendorBill/${id}`, {
          expandSubResources: "true",
        });
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
          error instanceof Error ? error.message : "Unknown error getting vendor bill.";
        return {
          content: [
            {
              type: "text",
              text: `Error calling NetSuite vendor bill: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "netsuite_create_vendor_bill",
    {
      description: "Create a new NetSuite vendor bill with expense lines.",
    },
    async ({
      entity,
      subsidiary,
      tranDate,
      dueDate,
      tranId,
      memo,
      currency,
      exchangeRate,
      externalId,
      expense,
    }: any) => {
      try {
        const body: any = {
          entity: { id: entity },
          subsidiary: { id: subsidiary },
          tranDate,
        };

        if (dueDate) body.dueDate = dueDate;
        if (tranId) body.tranId = tranId;
        if (memo) body.memo = memo;
        if (currency) body.currency = { id: currency };
        if (exchangeRate) body.exchangeRate = exchangeRate;
        if (externalId) body.externalId = externalId;

        if (expense && Array.isArray(expense)) {
          body.expense = expense.map((line: any) => {
            const expenseLine: any = {
              account: { id: line.account },
              amount: line.amount,
            };
            if (line.department) expenseLine.department = { id: line.department };
            if (line.location) expenseLine.location = { id: line.location };
            if (line.class) expenseLine.class = { id: line.class };
            if (line.memo) expenseLine.memo = line.memo;
            if (line.taxCode) expenseLine.taxCode = { id: line.taxCode };
            return expenseLine;
          });
        }

        const result = await client.post<unknown>("/vendorBill", body);
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
          error instanceof Error ? error.message : "Unknown error creating vendor bill.";
        return {
          content: [
            {
              type: "text",
              text: `Error creating NetSuite vendor bill: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "netsuite_update_vendor_bill",
    {
      description: "Update an existing NetSuite vendor bill (e.g. status, memo).",
    },
    async ({ id, status, memo }: any) => {
      try {
        const body: any = {};
        if (status) body.status = status;
        if (memo) body.memo = memo;

        const result = await client.patch<unknown>(`/vendorBill/${id}`, body);
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
          error instanceof Error ? error.message : "Unknown error updating vendor bill.";
        return {
          content: [
            {
              type: "text",
              text: `Error updating NetSuite vendor bill: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
