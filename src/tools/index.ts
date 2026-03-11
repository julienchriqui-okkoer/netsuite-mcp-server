import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import dotenv from "dotenv";
import { NetSuiteClient } from "../netsuite-client.js";
import { registerVendorTools } from "./vendors.js";
import { registerReferenceTools } from "./reference.js";
import { registerVendorBillTools } from "./vendor-bills.js";
import { registerJournalEntryTools } from "./journal-entries.js";
import { registerSuiteQLTools } from "./suiteql.js";
import { registerEmployeeTools } from "./employees.js";
import { registerExpenseReportTools } from "./expense-reports.js";
import { registerPaymentTools } from "./payments.js";
import { registerVendorCreditTools } from "./vendor-credits.js";
import { registerAnalyticsTools } from "./analytics.js";
import { registerFileCabinetTools } from "./file-cabinet.js";

dotenv.config();

export function createNetSuiteClient(): NetSuiteClient {
  const accountId = process.env.NETSUITE_ACCOUNT_ID;
  const consumerKey = process.env.NETSUITE_CONSUMER_KEY;
  const consumerSecret = process.env.NETSUITE_CONSUMER_SECRET;
  const tokenId = process.env.NETSUITE_TOKEN_ID;
  const tokenSecret = process.env.NETSUITE_TOKEN_SECRET;

  if (!accountId || !consumerKey || !consumerSecret || !tokenId || !tokenSecret) {
    throw new Error(
      "Missing NetSuite credentials. Please set NETSUITE_ACCOUNT_ID, NETSUITE_CONSUMER_KEY, NETSUITE_CONSUMER_SECRET, NETSUITE_TOKEN_ID, NETSUITE_TOKEN_SECRET."
    );
  }

  return new NetSuiteClient({
    accountId,
    consumerKey,
    consumerSecret,
    tokenId,
    tokenSecret,
  });
}

export function registerAllTools(server: McpServer): void {
  const client = createNetSuiteClient();

  registerVendorTools(server, client);
  registerReferenceTools(server, client);
  registerVendorBillTools(server, client);
  registerJournalEntryTools(server, client);
  registerSuiteQLTools(server, client);
  registerEmployeeTools(server, client);
  registerExpenseReportTools(server, client);
  registerPaymentTools(server, client);
  registerVendorCreditTools(server, client);
  registerAnalyticsTools(server, client);
  registerFileCabinetTools(server, client);
}

