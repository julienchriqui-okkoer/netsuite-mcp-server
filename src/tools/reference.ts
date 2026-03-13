import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { NetSuiteClient } from "../netsuite-client.js";
import { z } from "zod";
import { buildPaginationQuery } from "../utils/pagination.js";
import { canUseSuiteQL } from "../utils/suiteql-capability.js";
import { SUBSIDIARY_DEFAULT_BANK_ACCOUNTS } from "../config/subsidiary-bank-config.js";
import { successResponse, errorResponse } from "./_helpers.js";

export function registerReferenceTools(server: McpServer, client: NetSuiteClient): void {
  function registerSimpleListTool(
    name: string,
    description: string,
    path: string
  ) {
    server.registerTool(
      name,
      {
        description,
        inputSchema:
          name === "netsuite_get_accounts"
            ? ({
                limit: z.number().optional(),
                offset: z.number().optional(),
                type: z.string().optional(),
              } as any)
            : ({
                limit: z.number().optional(),
                offset: z.number().optional(),
              } as any),
      },
      async (args: any) => {
        try {
          const { limit, offset, signal, sendNotification, sendRequest, requestId, requestInfo, _meta, ...rest } = args;
          // Special handling for accounts with type filter (SuiteQL or REST fallback)
          if (name === "netsuite_get_accounts" && rest.type) {
            const { type, ..._rest } = rest;
            const acctTypeFilter = String(rest.type);
            const maxRows = typeof limit === "number" ? limit : 50;
            const offsetVal = typeof offset === "number" ? offset : 0;

            if (await canUseSuiteQL(client)) {
              const safeType = acctTypeFilter.replace(/'/g, "''");
              const res: any = await client.suiteql(
                `SELECT id, acctNumber, acctName, acctType FROM account WHERE acctType = '${safeType}'`,
                maxRows,
                offsetVal
              );
              const items = res?.items || [];
              const accounts = items.map((row: any) => ({
                id: row.id,
                number: row.acctnumber ?? row.acctNumber,
                name: row.acctname ?? row.acctName,
                type: row.accttype ?? row.acctType,
              }));
              return successResponse({ accounts, count: accounts.length, source: "suiteql" });
            }

            const page: any = await client.get<any>("/account", { limit: "1000", offset: "0" });
            const all = page?.items || [];
            const filtered = all.filter((a: any) => (a.acctType || a.accttype || "") === acctTypeFilter);
            const accounts = filtered
              .slice(offsetVal, offsetVal + maxRows)
              .map((row: any) => ({
                id: row.id,
                number: row.acctNumber ?? row.acctnumber,
                name: row.acctName ?? row.acctname,
                type: row.acctType ?? row.accttype,
              }));
            return successResponse({ accounts, count: accounts.length, source: "rest-filter" });
          }

          // Default REST-based pagination
          const pagination = buildPaginationQuery({ limit, offset });
          const params: Record<string, string> = {
            ...pagination,
          };

          Object.entries(rest).forEach(([key, value]) => {
            if (value === undefined || value === null) return;
            params[key] = String(value);
          });

          const result = await client.get<unknown>(path, params);
          return successResponse(result);
        } catch (error: any) {
          return errorResponse(`Error listing ${name.replace('netsuite_get_', '')}: ${error.message}`);
        }
      }
    );
  }

  registerSimpleListTool(
    "netsuite_get_accounts",
    "List NetSuite accounts (chart of accounts) with optional filter by type. Optional parameters: limit (number), offset (number), type (string, e.g. 'Bank', 'Expense')",
    "/account"
  );

  registerSimpleListTool(
    "netsuite_get_departments",
    "List NetSuite departments / cost centers for analytical tracking. Optional parameters: limit (number), offset (number)",
    "/department"
  );

  registerSimpleListTool(
    "netsuite_get_subsidiaries",
    "List NetSuite subsidiaries (legal entities). Optional parameters: limit (number), offset (number)",
    "/subsidiary"
  );

  registerSimpleListTool(
    "netsuite_get_tax_codes",
    "List NetSuite sales tax items. Returns tax codes with rates and descriptions. Optional parameters: limit (number), offset (number)",
    "/salestaxitem"
  );

  registerSimpleListTool(
    "netsuite_get_currencies",
    "List NetSuite currencies with exchange rates. Optional parameters: limit (number), offset (number)",
    "/currency"
  );

  // Get bank accounts for a given subsidiary (SuiteQL or config fallback)
  server.registerTool(
    "netsuite_get_bank_accounts_by_subsidiary",
    {
      description:
        "Get bank accounts (type = 'Bank') available for a given subsidiary. Required: subsidiaryId (string). Returns list of { id, acctnumber, fullname, description }.",
      inputSchema: {
        subsidiaryId: z.string(),
      } as any,
    },
    async ({ subsidiaryId }: any) => {
      try {
        if (!subsidiaryId || typeof subsidiaryId !== "string") {
          return errorResponse("Missing required parameter: subsidiaryId (string)");
        }

        if (await canUseSuiteQL(client)) {
          const res: any = await client.suiteql(
            `SELECT a.id, a.acctNumber, a.fullName, a.description FROM account a JOIN accountSubsidiaryMap asm ON asm.account = a.id WHERE a.acctType = 'Bank' AND asm.subsidiary = ${subsidiaryId} ORDER BY a.acctNumber`,
            50
          );
          const items = res?.items || [];
          const bankAccounts = items.map((row: any) => ({
            id: String(row.id),
            acctnumber: row.acctnumber ?? row.acctNumber,
            fullname: row.fullname ?? row.fullName,
            description: row.description ?? null,
          }));
          return successResponse({ subsidiaryId, bankAccounts, count: bankAccounts.length, source: "suiteql" });
        }

        const accountId = SUBSIDIARY_DEFAULT_BANK_ACCOUNTS[subsidiaryId];
        if (accountId) {
          return successResponse({
            subsidiaryId,
            bankAccounts: [{ id: accountId, acctnumber: null, fullname: null, description: "from config" }],
            count: 1,
            source: "config",
          });
        }
        return successResponse({
          subsidiaryId,
          bankAccounts: [],
          count: 0,
          message:
            "SuiteQL is not available. Add this subsidiaryId to SUBSIDIARY_DEFAULT_BANK_ACCOUNTS in src/config/subsidiary-bank-config.ts or use a role with SuiteQL.",
        });
      } catch (error: any) {
        return errorResponse(`Error getting bank accounts by subsidiary: ${error.message}`);
      }
    }
  );
}

