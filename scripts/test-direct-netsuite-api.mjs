#!/usr/bin/env node

/**
 * Test direct NetSuite API call (bypass MCP)
 * This validates the request structure before testing via MCP
 */

import dotenv from 'dotenv';
import { NetSuiteClient } from '../dist/netsuite-client.js';

// Load environment variables
dotenv.config();

async function testDirectNetSuiteCall() {
  console.log("🧪 Testing direct NetSuite vendor creation...\n");

  try {
    const client = new NetSuiteClient({
      accountId: process.env.NETSUITE_ACCOUNT_ID,
      consumerKey: process.env.NETSUITE_CONSUMER_KEY,
      consumerSecret: process.env.NETSUITE_CONSUMER_SECRET,
      tokenId: process.env.NETSUITE_TOKEN_ID,
      tokenSecret: process.env.NETSUITE_TOKEN_SECRET,
      baseUrl: process.env.NETSUITE_BASE_URL,
    });

    const vendorData = {
      companyName: "Test Vendor Direct API",
      subsidiary: { id: "1" },
      email: "test.direct.api@example.com",
      phone: "+33 1 23 45 67 89",
      externalId: "DIRECT-API-TEST-001",
      isPerson: false,
      addressbook: {
        items: [{
          defaultBilling: true,
          addressbookAddress: {
            addr1: "10 rue de la Paix",
            city: "Paris",
            zip: "75002",
            country: { id: "FR" },
          },
        }],
      },
    };

    console.log("📤 Request body:");
    console.log(JSON.stringify(vendorData, null, 2));
    console.log();

    console.log("⏳ Calling NetSuite API...");
    const result = await client.post("/vendor", vendorData);
    
    console.log("\n✅ SUCCESS!");
    console.log("Response:", JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error("\n❌ FAILED!");
    console.error("Error:", error.message);
    
    if (error.message.includes("Address")) {
      console.log("\n⚠️  Address error - check field requirements");
    } else if (error.message.includes("Missing required parameter")) {
      console.log("\n⚠️  Missing parameter - check structure");
    }
    
    process.exit(1);
  }
}

testDirectNetSuiteCall();
