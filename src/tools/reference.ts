import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { NetSuiteClient } from "../netsuite-client.js";
import { z } from "zod";
import { buildPaginationQuery } from "../utils/pagination.js";
import { canUseSuiteQL } from "../utils/suiteql-capability.js";
import { SUBSIDIARY_DEFAULT_BANK_ACCOUNTS } from "../config/subsidiary-bank-config.js";
import { executeSuiteQL } from "../lib/suiteql.js";
import { parseNetSuiteError } from "../lib/errors.js";
import { withRetry } from "../lib/retry.js";
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
            const type = rest.type as string | undefined;
            const typeFilter = type ? `accttype IS "${type}"` : "";

            const listParams: Record<string, string> = {
              limit: String(maxRows),
              offset: String(offsetVal),
            };
            if (typeFilter) {
              listParams.q = typeFilter;
            }

            const listRes: any = await withRetry(
              () => client.get<any>("/account", listParams),
              "get_accounts list"
            );
            const items = listRes?.items ?? [];

            const accounts = await Promise.all(
              items.map((item: any) =>
                withRetry(
                  () => client.get<any>(`/account/${item.id}`),
                  "get_accounts detail"
                )
                  .then((a: any) => ({
                    id: a.id,
                    acctnumber: a.acctNumber,
                    fullname: a.acctName ?? a.fullName,
                    type: a.type?.id ?? a.type,
                    description: a.description,
                  }))
                  .catch(() => ({ id: item.id }))
              )
            );

            return successResponse({
              count: accounts.length,
              total: listRes?.totalResults,
              source: "rql",
              accounts,
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

          const result = await withRetry(
            () => client.get<unknown>(path, params),
            name
          );
          return successResponse(result);
        } catch (error: any) {
          return errorResponse(
            `Error listing ${name.replace("netsuite_get_", "")}: ${parseNetSuiteError(error)}`
          );
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

  // Get bank accounts for a given subsidiary (config or RQL fallback)
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

        // 1) Config map shortcut
        const configAccount = SUBSIDIARY_DEFAULT_BANK_ACCOUNTS[subsidiaryId];
        if (configAccount) {
          const account: any = await withRetry(
            () => client.get<any>(`/account/${configAccount}`),
            "get_bank_accounts_by_subsidiary config account"
          );
          return successResponse({
            subsidiaryId,
            source: "config",
            count: 1,
            bankAccounts: [
              {
                id: account.id,
                acctnumber: account.acctNumber,
                fullname: account.acctName ?? account.fullName,
                isDefault: true,
              },
            ],
          });
        }

        // 2) RQL on account list: accttype IS "Bank"
        const listRes: any = await withRetry(
          () =>
            client.get<any>("/account", {
              q: `accttype IS "Bank"`,
              limit: "100",
            }),
          "get_bank_accounts_by_subsidiary list"
        );
        const items = listRes?.items ?? [];

        const accounts = await Promise.all(
          items.map((item: any) =>
            withRetry(
              () => client.get<any>(`/account/${item.id}`),
              "get_bank_accounts_by_subsidiary detail"
            )
              .then((a: any) => ({
                id: a.id,
                acctnumber: a.acctNumber,
                fullname: a.acctName ?? a.fullName,
                subsidiaries:
                  a.subsidiaryList?.items?.map((s: any) => String(s.id)) ?? [],
              }))
              .catch(() => ({ id: item.id, subsidiaries: [] as string[] }))
          )
        );

        const filtered = accounts.filter(
          (a) =>
            a.subsidiaries.length === 0 ||
            a.subsidiaries.includes(String(subsidiaryId))
        );

        return successResponse({
          subsidiaryId,
          source: "rql",
          count: filtered.length,
          bankAccounts: filtered,
        });
      } catch (e: any) {
        return errorResponse(
          `get_bank_accounts_by_subsidiary failed: ${parseNetSuiteError(e)}`
        );
      }
    }
  );
}

