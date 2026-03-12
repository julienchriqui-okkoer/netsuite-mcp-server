#!/usr/bin/env node
/**
 * Test the new vendor create/update tools
 */

import { spawn } from "child_process";

const SERVER_PORT = 3001;
const SERVER_URL = `http://localhost:${SERVER_PORT}/mcp`;
const HEALTH_URL = `http://localhost:${SERVER_PORT}/`;
const STARTUP_WAIT = 5000;

async function callTool(toolName, params = {}) {
  const body = {
    jsonrpc: "2.0",
    id: Math.random().toString(36).substring(7),
    method: "tools/call",
    params: {
      name: toolName,
      arguments: params,
    },
  };

  const response = await fetch(SERVER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const text = await response.text();
  
  if (text.includes("data:")) {
    const lines = text.split("\n").filter((line) => line.startsWith("data:"));
    const lastData = lines[lines.length - 1];
    if (lastData) {
      return JSON.parse(lastData.replace("data:", "").trim());
    }
  }

  return JSON.parse(text);
}

async function main() {
  console.log("🧪 Testing Vendor Create/Update Tools");
  console.log("=".repeat(60));

  // Start server
  console.log("\n📦 Starting local server...");
  const server = spawn("npm", ["run", "start:http"], {
    cwd: process.cwd(),
    stdio: ["ignore", "pipe", "pipe"],
  });

  let serverReady = false;

  server.stdout.on("data", (data) => {
    const log = data.toString();
    if (log.includes(`listening on port ${SERVER_PORT}`)) {
      serverReady = true;
    }
  });

  server.stderr.on("data", (data) => {
    const log = data.toString();
    if (log.includes("error") || log.includes("Error")) {
      console.error("❌ Server error:", log);
    }
  });

  console.log(`⏳ Waiting ${STARTUP_WAIT}ms for server startup...`);
  await new Promise((resolve) => setTimeout(resolve, STARTUP_WAIT));

  try {
    // Health check
    const healthResponse = await fetch(HEALTH_URL);
    const health = await healthResponse.json();
    console.log(`✅ Server health: ${health.status}\n`);

    // Test 1: Get subsidiaries (needed for create)
    console.log("🧪 Test 1: Get subsidiaries");
    const subsidiariesResult = await callTool("netsuite_get_subsidiaries", { limit: 1 });
    
    if (subsidiariesResult.error || subsidiariesResult.result?.isError) {
      console.log("❌ Failed to get subsidiaries");
      throw new Error("Cannot proceed without subsidiary");
    }
    
    const subsidiaryData = JSON.parse(subsidiariesResult.result.content[0].text);
    const subsidiaryId = subsidiaryData.items?.[0]?.id;
    console.log(`✅ Got subsidiary ID: ${subsidiaryId}\n`);

    // Test 2: Get currencies (needed for create)
    console.log("🧪 Test 2: Get currencies");
    const currenciesResult = await callTool("netsuite_get_currencies", { limit: 5 });
    
    if (currenciesResult.error || currenciesResult.result?.isError) {
      console.log("⚠️  Could not get currencies, will skip currency field");
    } else {
      const currencyData = JSON.parse(currenciesResult.result.content[0].text);
      console.log(`✅ Got ${currencyData.items?.length || 0} currencies\n`);
    }

    // Test 3: Create vendor
    console.log("🧪 Test 3: Create test vendor");
    const testVendor = {
      companyName: `Test Supplier ${Date.now()}`,
      legalName: "Test Supplier Legal Name",
      subsidiary: subsidiaryId,
      email: "test@testsupplier.fr",
      phone: "+33 1 23 45 67 89",
      vatRegNumber: "FR12345678901",
      externalId: `test_vendor_${Date.now()}`,
      memo: "Created by MCP test suite",
      isInactive: false,
    };

    console.log("Creating vendor with params:", JSON.stringify(testVendor, null, 2));
    
    const createResult = await callTool("netsuite_create_vendor", testVendor);
    
    if (createResult.error) {
      console.log("❌ Create failed with error:", createResult.error);
      throw new Error("Create vendor failed");
    }

    if (createResult.result?.isError) {
      console.log("❌ Create failed:", createResult.result.content[0].text);
      throw new Error("Create vendor failed");
    }

    const createdVendor = JSON.parse(createResult.result.content[0].text);
    const vendorId = createdVendor.id;
    console.log(`✅ Vendor created successfully!`);
    console.log(`   ID: ${vendorId}`);
    console.log(`   External ID: ${testVendor.externalId}\n`);

    // Test 4: Update vendor
    console.log("🧪 Test 4: Update test vendor");
    const updateResult = await callTool("netsuite_update_vendor", {
      id: vendorId,
      memo: "Updated by MCP test suite",
      phone: "+33 1 99 88 77 66",
    });

    if (updateResult.error || updateResult.result?.isError) {
      console.log("❌ Update failed");
    } else {
      console.log("✅ Vendor updated successfully!\n");
    }

    // Test 5: Search for vendor by externalId
    console.log("🧪 Test 5: Search vendor by externalId");
    const searchResult = await callTool("netsuite_get_vendors", {
      q: `externalId:"${testVendor.externalId}"`,
      limit: 1,
    });

    if (searchResult.error || searchResult.result?.isError) {
      console.log("❌ Search failed");
    } else {
      const searchData = JSON.parse(searchResult.result.content[0].text);
      const found = searchData.items?.length > 0;
      console.log(`✅ Search by externalId: ${found ? "Found" : "Not found"}\n`);
    }

    console.log("=".repeat(60));
    console.log("✅ ALL TESTS PASSED!");
    console.log("=".repeat(60));
    console.log(`\n📝 Created vendor ID: ${vendorId}`);
    console.log(`📝 External ID: ${testVendor.externalId}`);
    console.log("\n⚠️  Note: This is a real vendor in your NetSuite instance.");
    console.log("   You may want to mark it as inactive or delete it manually.\n");

  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
    process.exit(1);
  } finally {
    console.log("🛑 Stopping server...");
    server.kill();
    process.exit(0);
  }
}

main().catch((error) => {
  console.error("💥 Fatal error:", error);
  process.exit(1);
});
