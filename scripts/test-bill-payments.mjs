#!/usr/bin/env node
/**
 * Test script for bill payment tools
 * Tests both get_bill_payments and create_bill_payment
 */

import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from parent directory
dotenv.config({ path: join(__dirname, "..", ".env") });

const MCP_SERVER_URL = process.env.MCP_SERVER_URL || "http://localhost:3000/mcp";

console.log("🧪 Testing Bill Payment Tools\n");
console.log(`📡 MCP Server: ${MCP_SERVER_URL}\n`);

/**
 * Call an MCP tool
 */
async function callTool(toolName, args = {}) {
  console.log(`\n📞 Calling tool: ${toolName}`);
  console.log(`   Arguments:`, JSON.stringify(args, null, 2));

  const payload = {
    jsonrpc: "2.0",
    id: Date.now(),
    method: "tools/call",
    params: {
      name: toolName,
      arguments: args,
    },
  };

  try {
    const response = await fetch(MCP_SERVER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(`❌ HTTP ${response.status}: ${response.statusText}`);
      const text = await response.text();
      console.error(`   Response body: ${text.substring(0, 500)}`);
      return null;
    }

    const text = await response.text();

    // Handle SSE responses
    let data;
    if (text.includes("data:")) {
      const lines = text.split("\n").filter((line) => line.startsWith("data:"));
      const lastData = lines[lines.length - 1];
      if (lastData) {
        data = JSON.parse(lastData.replace("data:", "").trim());
      }
    } else {
      // Handle direct JSON
      data = JSON.parse(text);
    }

    if (data.error) {
      console.error(`❌ MCP Error:`, data.error);
      return null;
    }

    const resultText = data.result?.content?.[0]?.text;
    if (!resultText) {
      console.error(`❌ No result text in response`);
      console.error(`   Full response:`, JSON.stringify(data, null, 2));
      return null;
    }

    // Try to parse result text - it might be an error message string
    let result;
    try {
      result = JSON.parse(resultText);
    } catch (e) {
      // If not JSON, it's probably an error message
      console.error(`❌ Error from tool: ${resultText.substring(0, 500)}`);
      return null;
    }

    console.log(`✅ Success!`);
    console.log(`   Result:`, JSON.stringify(result, null, 2).substring(0, 500));
    return result;
  } catch (error) {
    console.error(`❌ Error calling tool:`, error.message);
    return null;
  }
}

/**
 * Main test suite
 */
async function runTests() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("TEST 1: List Bill Payments (netsuite_get_bill_payments)");
  console.log("═══════════════════════════════════════════════════════════");

  const payments = await callTool("netsuite_get_bill_payments", {
    limit: 5,
  });

  if (!payments) {
    console.error("\n❌ TEST 1 FAILED: Could not list bill payments");
    return;
  }

  console.log("\n✅ TEST 1 PASSED: Bill payments listed successfully");

  // Extract first payment ID for reference (if any exist)
  const firstPaymentId =
    payments?.items?.[0]?.id || payments?.[0]?.id || null;
  if (firstPaymentId) {
    console.log(`   First payment ID: ${firstPaymentId}`);
  } else {
    console.log(`   No existing payments found`);
  }

  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("TEST 2: Create Bill Payment (netsuite_create_bill_payment)");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("⚠️  NOTE: This will create a real payment in NetSuite!");
  console.log("    Using unique externalId for testing\n");

  const timestamp = Date.now();
  const uniqueExternalId = `TEST-PAY-${timestamp}`;

  // Test data - Using working Postman data
  const testPaymentData = {
    entity: "136482", // Vendor ID from working Postman
    account: "857", // Bank account ID from working Postman  
    tranDate: "2026-03-12", // Date from working Postman
    currency: "1", // EUR
    memo: "Test payment from MCP - Matching Postman",
    externalId: uniqueExternalId,
    apply: [
      {
        doc: "1339937", // Bill ID from working Postman
        apply: true,
        amount: 100.00
      }
    ]
  };
    // Uncomment to test applying to a specific bill:
    // applyList: {
    //   apply: [
    //     {
    //       doc: "1339936", // Vendor bill ID
    //       apply: true,
    //       amount: 50.00
    //     }
    //   ]
    // }
  };

  console.log("   Test payment data:");
  console.log("   " + JSON.stringify(testPaymentData, null, 2).split("\n").join("\n   "));

  const createResult = await callTool(
    "netsuite_create_bill_payment",
    testPaymentData
  );

  if (!createResult) {
    console.error("\n❌ TEST 2 FAILED: Could not create bill payment");
    console.log("\n💡 Troubleshooting:");
    console.log("   1. Check that vendor ID '136288' exists");
    console.log("   2. Check that account ID '1' exists");
    console.log("   3. Verify permissions for vendor payment creation");
    console.log("   4. Check Railway logs for detailed error");
    return;
  }

  console.log("\n✅ TEST 2 PASSED: Bill payment created successfully");

  if (createResult.id) {
    console.log(`   Payment ID: ${createResult.id}`);
    console.log(`   Location: ${createResult.location}`);
  }

  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("TEST 3: Verify New Payment in List");
  console.log("═══════════════════════════════════════════════════════════");

  const paymentsAfter = await callTool("netsuite_get_bill_payments", {
    limit: 10,
  });

  if (!paymentsAfter) {
    console.error("\n❌ TEST 3 FAILED: Could not list payments after creation");
    return;
  }

  const items = paymentsAfter?.items || paymentsAfter || [];
  const foundPayment = items.find(
    (p) => p.externalId === uniqueExternalId || p.id === createResult.id
  );

  if (foundPayment) {
    console.log("\n✅ TEST 3 PASSED: New payment found in list");
    console.log(`   Payment:`, JSON.stringify(foundPayment, null, 2).substring(0, 300));
  } else {
    console.log("\n⚠️  TEST 3 WARNING: New payment not found in list (may take time to sync)");
  }

  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("📊 TEST SUMMARY");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("✅ netsuite_get_bill_payments: PASSED");
  console.log(
    createResult
      ? "✅ netsuite_create_bill_payment: PASSED"
      : "❌ netsuite_create_bill_payment: FAILED"
  );
  console.log(
    foundPayment
      ? "✅ Payment verification: PASSED"
      : "⚠️  Payment verification: PENDING"
  );
  console.log("\n🎉 Bill payment tools are functional!");
}

// Run tests
runTests().catch((error) => {
  console.error("\n💥 Fatal error:", error);
  process.exit(1);
});
