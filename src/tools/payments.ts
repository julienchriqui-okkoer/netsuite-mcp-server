import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { NetSuiteClient } from "../netsuite-client.js";
import { z } from "zod";
import { buildPaginationQuery } from "../utils/pagination.js";
import { canUseSuiteQL } from "../utils/suiteql-capability.js";
import { SUBSIDIARY_DEFAULT_BANK_ACCOUNTS } from "../config/subsidiary-bank-config.js";
import { withRetry } from "../lib/retry.js";
import { successResponse, errorResponse } from "./_helpers.js";

const sessionBankCache: Record<string, string> = {};

async function resolveBankAccountId(
  client: NetSuiteClient,
  entityId: string,
  explicitAccountId?: string
): Promise<{ ok: true; accountId: string } | { ok: false; error: string }> {
  if (explicitAccountId) {
    return { ok: true, accountId: explicitAccountId };
  }

  try {
    const vendor: any = await withRetry(
      () =>
        client.get<any>(`/vendor/${entityId}`, {
          expandSubResources: "false",
        }),
      `resolveBankAccountId vendor ${entityId}`
    );
    const subsidiaryId = vendor?.subsidiary?.id;
    const subsidiaryName = vendor?.subsidiary?.refName || vendor?.subsidiary?.name;

    if (!subsidiaryId) {
      return {
        ok: false,
        error: "Could not resolve vendor subsidiary. Please provide a bank account ID explicitly.",
      };
    }

    if (await canUseSuiteQL(client)) {
      if (sessionBankCache[subsidiaryId]) {
        return { ok: true, accountId: sessionBankCache[subsidiaryId] };
      }
      const res: any = await client.suiteql(
        `SELECT a.id, a.acctNumber, a.fullName FROM account a JOIN accountSubsidiaryMap asm ON asm.account = a.id WHERE a.acctType = 'Bank' AND asm.subsidiary = ${subsidiaryId} ORDER BY a.acctNumber`,
        50
      );
      const items = res?.items || [];
      if (items.length === 0) {
        return {
          ok: false,
          error: `No bank account found for subsidiary ${subsidiaryId} (${subsidiaryName || "unknown"}). Please create one or provide account ID explicitly.`,
        };
      }
      if (items.length > 1) {
        const list = items
          .slice(0, 10)
          .map((row: any) => {
            const number = row.acctnumber ?? row.acctNumber;
            const name = (row.fullname ?? row.fullName) || "";
            return `${row.id} - ${number} ${name}`.trim();
          })
          .join("; ");
        return {
          ok: false,
          error: `Multiple bank accounts found for subsidiary ${subsidiaryId} (${subsidiaryName || "unknown"}). Please specify 'account' explicitly. Candidates: ${list}`,
        };
      }
      const accountId = String(items[0].id);
      sessionBankCache[subsidiaryId] = accountId;
      return { ok: true, accountId };
    }

    const accountId = SUBSIDIARY_DEFAULT_BANK_ACCOUNTS[subsidiaryId];
    if (accountId) {
      return { ok: true, accountId };
    }
    return {
      ok: false,
      error: `SuiteQL is not available. Provide 'account' (bank account ID) explicitly, or add subsidiaryId ${subsidiaryId} to SUBSIDIARY_DEFAULT_BANK_ACCOUNTS in src/config/subsidiary-bank-config.ts.`,
    };
  } catch (e: any) {
    return {
      ok: false,
      error: `Failed to auto-resolve bank account: ${e.message}`,
    };
  }
}

export function registerPaymentTools(server: McpServer, client: NetSuiteClient): void {
  // List vendor payments (bill payments)
  server.registerTool(
    "netsuite_get_bill_payments",
    {
      description: "List NetSuite vendor payments (bill payments) with optional search and pagination. Optional parameters: limit (number), offset (number), q (string, search query)",
      inputSchema: {
        limit: z.number().optional(),
        offset: z.number().optional(),
        q: z.string().optional(),
      } as any,
    },
    async ({ limit, offset, q }: any) => {
      try {
        const pagination = buildPaginationQuery({ limit, offset });
        const params: Record<string, string> = { ...pagination };
        if (q) {
          params.q = q;
        }

        const result = await withRetry(
          () => client.get<unknown>("/vendorPayment", params),
          "get_bill_payments"
        );
        return successResponse(result);
      } catch (error: any) {
        return errorResponse(`Error listing bill payments: ${error.message}`);
      }
    }
  );

  // Get a single vendor payment by ID
  server.registerTool(
    "netsuite_get_bill_payment",
    {
      description: "Get a single NetSuite vendor payment (bill payment) by ID. Required parameter: id (string, payment ID)",
      inputSchema: {
        id: z.string(),
      } as any,
    },
    async ({ id }: any) => {
      try {
        if (!id || typeof id !== "string") {
          return errorResponse("Missing required parameter: id (string, payment ID)");
        }

        const result = await withRetry(
          () => client.get<unknown>(`/vendorPayment/${id}`),
          `get_bill_payment ${id}`
        );
        return successResponse(result);
      } catch (error: any) {
        return errorResponse(`Error getting bill payment: ${error.message}`);
      }
    }
  );

  // Create vendor payment (bill payment)
  server.registerTool(
    "netsuite_create_bill_payment",
    {
      description:
        "Create a NetSuite vendor payment (bill payment) and apply it to one or more vendor bills. Required parameters: entity (string, vendor ID), tranDate (string, YYYY-MM-DD). Optional: account (string, bank account ID, auto-resolved from vendor subsidiary if not provided), currency (string, defaults to '1' for EUR), externalId (for idempotence), memo, apply (array of {doc: billId, apply: true, amount: number}). NOTE: Without apply array, creates an unapplied payment.",
      inputSchema: {
        entity: z.string(),
        account: z.string().optional(),
        tranDate: z.string(),
        currency: z.string().optional(),
        externalId: z.string().optional(),
        memo: z.string().optional(),
        apply: z.array(z.any()).optional(),
      } as any,
    },
    async ({ entity, account, tranDate, currency, externalId, memo, apply }: any) => {
      try {
        // Validate required parameters
        if (!entity || typeof entity !== "string") {
          return errorResponse("Missing required parameter: entity (string, vendor ID)");
        }
        if (!tranDate || typeof tranDate !== "string") {
          return errorResponse("Missing required parameter: tranDate (string, YYYY-MM-DD)");
        }

        // Resolve bank account if not provided
        const resolved = await resolveBankAccountId(client, entity, account);
        if (!resolved.ok) {
          return errorResponse(resolved.error);
        }
        const accountId = resolved.accountId;

        const body: any = {
          entity: { id: entity },
          account: { id: accountId },
          tranDate,
          currency: { id: currency || "1" }, // Default to EUR
        };

        if (externalId) body.externalId = externalId; // Direct externalId like Postman
        if (memo) body.memo = memo;

        // CRITICAL: apply must be nested in { items: [...] } like Postman
        if (apply && Array.isArray(apply) && apply.length > 0) {
          body.apply = {
            items: apply.map((item: any) => ({
              doc: { id: String(item.doc) }, // Document ID (bill ID)
              apply: item.apply !== false, // Default to true
              amount: item.amount,
            })),
          };
        }

        const result = await withRetry(
          () => client.post<unknown>("/vendorPayment", body),
          "create_bill_payment"
        );
        return successResponse(result);
      } catch (error: any) {
        return errorResponse(`Error creating bill payment: ${error.message}`);
      }
    }
  );
}
