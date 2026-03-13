import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { NetSuiteClient } from "../netsuite-client.js";
import { z } from "zod";
import { buildPaginationQuery } from "../utils/pagination.js";
import { canUseSuiteQL } from "../utils/suiteql-capability.js";
import { SUBSIDIARY_DEFAULT_BANK_ACCOUNTS } from "../config/subsidiary-bank-config.js";
import { executeSuiteQL } from "../lib/suiteql.js";
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
            ? (z
                .object({
                  type: z
                    .string()
                    .optional()
                    .describe("Account type filter: 'Bank', 'Expense', 'AccountsPayable', etc."),
                  limit: z.number().int().min(1).max(1000).optional(),
                  offset: z.number().int().min(0).optional(),
                })
                .strict() as any)
            : ({
                limit: z.number().optional(),
                offset: z.number().optional(),
              } as any),
      },
      async (args: any) => {
        try {
          const {
            limit,
            offset,
            signal,
            sendNotification,
            sendRequest,
            requestId,
            requestInfo,
            _meta,
            ...rest
          } = args;

          if (name === "netsuite_get_accounts") {
            const maxRows = typeof limit === "number" ? limit : 50;
            const offsetVal = typeof offset === "number" ? offset : 0;
            if (!(await canUseSuiteQL(client))) {
              return errorResponse(
                "netsuite_get_accounts requires SuiteQL in this implementation (REST API does not expose account names). Ask your NetSuite admin to enable SuiteQL or use a role with SuiteQL access."
              );
            }

            const type = rest.type as string | undefined;
            if (type) {
              const safeType = String(type).replace(/'/g, "''");
              const result = await executeSuiteQL(
                client,
                `SELECT id, acctnumber, fullname, type, description, currency
                 FROM account
                 WHERE type = '${safeType}'
                 ORDER BY acctnumber
                 FETCH FIRST ${maxRows} ROWS ONLY`,
                maxRows,
                offsetVal
              );
              return successResponse({
                count: result.items.length,
                accounts: result.items,
                source: "suiteql",
              });
            }

            const result = await executeSuiteQL(
              client,
              `SELECT id, acctnumber, fullname, type, currency
               FROM account
               WHERE isInactive = 'F'
               ORDER BY acctnumber
               FETCH FIRST ${maxRows} ROWS ONLY`,
              maxRows,
              offsetVal
            );
            return successResponse({
              count: result.items.length,
              total: result.totalResults,
              accounts: result.items,
              source: "suiteql",
            });
          }

          // Default REST-based pagination for other reference lists
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
          return errorResponse(`Error listing ${name.replace("netsuite_get_", "")}: ${error.message}`);
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
          const result = await executeSuiteQL(
            client,
            `SELECT a.id, a.acctNumber, a.fullName, a.description, a.currency
             FROM account a
             JOIN accountSubsidiaryMap asm ON asm.account = a.id
             WHERE a.acctType = 'Bank'
               AND asm.subsidiary = ${subsidiaryId}
             ORDER BY a.acctNumber
             FETCH FIRST 50 ROWS ONLY`,
            50,
            0
          );
          const items = result.items || [];
          const bankAccounts = items.map((row: any) => ({
            id: String(row.id),
            acctnumber: row.acctnumber ?? row.acctNumber,
            fullname: row.fullname ?? row.fullName,
            description: row.description ?? null,
            currency: row.currency ?? null,
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

