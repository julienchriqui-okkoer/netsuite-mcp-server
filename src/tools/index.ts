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

let clientInstance: NetSuiteClient | null = null;

export function createNetSuiteClient(): NetSuiteClient {
  if (clientInstance) {
    return clientInstance;
  }

  const accountId = process.env.NETSUITE_ACCOUNT_ID;
  const consumerKey = process.env.NETSUITE_CONSUMER_KEY;
  const consumerSecret = process.env.NETSUITE_CONSUMER_SECRET;
  const tokenId = process.env.NETSUITE_TOKEN_ID;
  const tokenSecret = process.env.NETSUITE_TOKEN_SECRET;

  if (!accountId || !consumerKey || !consumerSecret || !tokenId || !tokenSecret) {
    console.error("❌ Missing NetSuite credentials!");
    console.error("Required environment variables:");
    console.error("  - NETSUITE_ACCOUNT_ID:", accountId ? "✓" : "✗ MISSING");
    console.error("  - NETSUITE_CONSUMER_KEY:", consumerKey ? "✓" : "✗ MISSING");
    console.error("  - NETSUITE_CONSUMER_SECRET:", consumerSecret ? "✓" : "✗ MISSING");
    console.error("  - NETSUITE_TOKEN_ID:", tokenId ? "✓" : "✗ MISSING");
    console.error("  - NETSUITE_TOKEN_SECRET:", tokenSecret ? "✓" : "✗ MISSING");
    throw new Error(
      "Missing NetSuite credentials. Please configure environment variables in Railway."
    );
  }

  console.error("✓ NetSuite credentials loaded successfully");

  clientInstance = new NetSuiteClient({
    accountId,
    consumerKey,
    consumerSecret,
    tokenId,
    tokenSecret,
  });

  return clientInstance;
}

export function registerAllTools(server: McpServer): void {
  console.error("Registering NetSuite MCP tools...");

  try {
    const client = createNetSuiteClient();
    
    registerVendorTools(server, client);
    registerVendorBillTools(server, client);
    registerEmployeeTools(server, client);
    registerExpenseReportTools(server, client);
    registerPaymentTools(server, client);
    registerVendorCreditTools(server, client);
    registerJournalEntryTools(server, client);
    registerReferenceTools(server, client);
    registerSuiteQLTools(server, client);
    registerAnalyticsTools(server, client);
    registerFileCabinetTools(server, client);

    console.error("✓ NetSuite MCP tools registered successfully");
  } catch (error) {
    console.error("✗ Failed to register NetSuite tools:", error);
    console.error("Server will start but tools will not be available until credentials are configured.");
  }
}

