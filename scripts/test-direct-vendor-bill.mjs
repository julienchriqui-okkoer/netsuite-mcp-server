#!/usr/bin/env node

/**
 * Test create_vendor_bill avec structure expense.items correcte
 */

import dotenv from 'dotenv';
import { NetSuiteClient } from '../dist/netsuite-client.js';

dotenv.config();

async function testDirectVendorBill() {
  console.log("🧪 Testing vendor bill creation (direct API - correct structure)...\n");

  try {
    const client = new NetSuiteClient({
      accountId: process.env.NETSUITE_ACCOUNT_ID,
      consumerKey: process.env.NETSUITE_CONSUMER_KEY,
      consumerSecret: process.env.NETSUITE_CONSUMER_SECRET,
      tokenId: process.env.NETSUITE_TOKEN_ID,
      tokenSecret: process.env.NETSUITE_TOKEN_SECRET,
      baseUrl: process.env.NETSUITE_BASE_URL,
    });

    const billData = {
      entity: { id: "135280" },
      subsidiary: { id: "1" },
      tranDate: "2026-03-12",
      dueDate: "2026-03-12",
      currency: { id: "1" },
      memo: "Test from MCP fix",
      externalId: `MCP-BILL-${Date.now()}`,
      approvalStatus: { id: "2" },
      expense: {
        items: [{
          account: { id: "1210" },
          amount: 100.00,
          department: { id: "1" },
          class: { id: "1" },
          memo: "Software subscription"
        }]
      }
    };

    console.log("📤 Request body:");
    console.log(JSON.stringify(billData, null, 2));
    console.log();

    console.log("⏳ Calling NetSuite API...");
    const result = await client.post("/vendorBill", billData);
    
    console.log("\n✅ SUCCESS!");
    console.log("Response:", JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error("\n❌ FAILED!");
    console.error("Error:", error.message);
    process.exit(1);
  }
}

testDirectVendorBill();
