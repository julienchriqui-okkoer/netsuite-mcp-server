import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { NetSuiteClient } from "../netsuite-client.js";
import { buildPaginationQuery } from "../utils/pagination.js";
import { successResponse, errorResponse } from "./_helpers.js";

export function registerVendorBillTools(server: McpServer, client: NetSuiteClient): void {
  server.registerTool(
    "netsuite_get_vendor_bills",
    {
      description: "List NetSuite vendor bills with optional search and pagination. Optional parameters: limit (number), offset (number), q (string, search query), status (string, e.g. 'VendBill:A' for open bills)",
    },
    async (allArgs: any) => {
      console.log("🔍 [get_vendor_bills] Raw args:", JSON.stringify(allArgs, null, 2));
      const { limit, offset, q, status } = allArgs;
      console.log("🔍 [get_vendor_bills] Destructured:", { limit, offset, q, status });
      
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
        return successResponse(result);
      } catch (error: any) {
        return errorResponse(`Error listing vendor bills: ${error.message}`);
      }
    }
  );

  server.registerTool(
    "netsuite_get_vendor_bill",
    {
      description: "Get a single NetSuite vendor bill by internal ID. Returns full bill details with expanded sub-resources (expense lines, items). Required parameter: id (string, NetSuite internal vendor bill ID)",
    },
    async ({ id }: any) => {
      try {
        // Validate required parameter
        if (!id || typeof id !== "string") {
          return errorResponse("Missing required parameter: id (string)");
        }
        
        const result = await client.get<unknown>(`/vendorBill/${id}`, {
          expandSubResources: "true",
        });
        return successResponse(result);
      } catch (error: any) {
        return errorResponse(`Error getting vendor bill: ${error.message}`);
      }
    }
  );

  server.registerTool(
    "netsuite_create_vendor_bill",
    {
      description: "Create a new NetSuite vendor bill with expense lines. Required parameters: entity (string, vendor ID), subsidiary (string), tranDate (string, YYYY-MM-DD). Optional: dueDate, tranId, memo, currency, exchangeRate, externalId (for idempotence), expense (array of lines with account, amount, department, location, class, memo, taxCode)",
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
        return successResponse(result);
      } catch (error: any) {
        return errorResponse(`Error creating vendor bill: ${error.message}`);
      }
    }
  );

  server.registerTool(
    "netsuite_update_vendor_bill",
    {
      description: "Update an existing NetSuite vendor bill (e.g. status, memo). Required parameter: id (string). Optional: status (string), memo (string)",
    },
    async ({ id, status, memo }: any) => {
      try {
        // Validate required parameter
        if (!id || typeof id !== "string") {
          return errorResponse("Missing required parameter: id (string)");
        }
        
        const body: any = {};
        if (status) body.status = status;
        if (memo) body.memo = memo;

        const result = await client.patch<unknown>(`/vendorBill/${id}`, body);
        return successResponse(result);
      } catch (error: any) {
        return errorResponse(`Error updating vendor bill: ${error.message}`);
      }
    }
  );
}
