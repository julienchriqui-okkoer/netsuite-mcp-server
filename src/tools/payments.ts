import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { NetSuiteClient } from "../netsuite-client.js";

export function registerPaymentTools(server: McpServer, client: NetSuiteClient): void {
  server.registerTool(
    "netsuite_create_bill_payment",
    {
      description: "Create a NetSuite vendor payment (bill payment) and apply it to one or more vendor bills.",
    },
    async ({ entity, account, tranDate, externalId, memo, currency, exchangeRate, applyList }: any) => {
      try {
        const body: any = {
          entity: { id: entity },
          account: { id: account },
          tranDate,
        };

        if (externalId) body.externalId = externalId;
        if (memo) body.memo = memo;
        if (currency) body.currency = { id: currency };
        if (exchangeRate) body.exchangeRate = exchangeRate;

        if (applyList?.apply && Array.isArray(applyList.apply)) {
          body.applyList = {
            apply: applyList.apply.map((item: any) => ({
              doc: item.doc,
              apply: item.apply ?? true,
              amount: item.amount,
            })),
          };
        }

        const result = await client.post<unknown>("/vendorpayment", body);
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
          error instanceof Error ? error.message : "Unknown error creating bill payment.";
        return {
          content: [
            {
              type: "text",
              text: `Error creating NetSuite bill payment: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
