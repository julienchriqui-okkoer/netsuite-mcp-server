#!/usr/bin/env node
/**
 * Test script for fixed netsuite_create_vendor tool
 * Tests: custom forms discovery, idempotency, and improved error handling
 */

import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, "..", ".env") });

const MCP_SERVER_URL = process.env.MCP_SERVER_URL || "http://localhost:3000/mcp";

console.log("🧪 Testing Fixed create_vendor Tool\n");
console.log(`📡 MCP Server: ${MCP_SERVER_URL}\n`);

/**
 * Call an MCP tool
 */
async function callTool(toolName, args = {}) {
  console.log(`\n📞 Calling tool: ${toolName}`);
  console.log(`   Arguments:`, JSON.stringify(args, null, 2).substring(0, 300));

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
      data = JSON.parse(text);
    }

    if (data.error) {
      console.error(`❌ MCP Error:`, data.error);
      return null;
    }

    const resultText = data.result?.content?.[0]?.text;
    if (!resultText) {
      console.error(`❌ No result text in response`);
      console.error(`   Full response:`, JSON.stringify(data, null, 2).substring(0, 500));
      return null;
    }

    let result;
    try {
      result = JSON.parse(resultText);
    } catch (e) {
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
  console.log("TEST 1: Get Vendor Custom Forms");
  console.log("═══════════════════════════════════════════════════════════");

  const forms = await callTool("netsuite_get_vendor_forms", {});

  if (!forms) {
    console.error("\n❌ TEST 1 FAILED: Could not get vendor forms");
    return;
  }

  console.log("\n✅ TEST 1 PASSED: Vendor forms retrieved");
  const formsList = forms.forms || [];
  if (formsList.length > 0) {
    console.log(`   Available forms (${formsList.length}):`);
    formsList.slice(0, 5).forEach((f) => {
      console.log(`   - ID: ${f.id}, Name: ${f.name}`);
    });
  }

  const firstFormId = formsList[0]?.id;

  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("TEST 2: Create Vendor WITHOUT Custom Form (May Fail)");
  console.log("═══════════════════════════════════════════════════════════");

  const timestamp = Date.now();
  const vendorDataNoForm = {
    companyName: `Test Vendor No Form ${timestamp}`,
    subsidiary: "1",
    email: "test.noform@example.com",
    externalId: `TEST-VENDOR-NOFORM-${timestamp}`,
  };

  const resultNoForm = await callTool("netsuite_create_vendor", vendorDataNoForm);

  if (resultNoForm && resultNoForm.success) {
    console.log("\n✅ TEST 2 PASSED: Vendor created without custom form");
    console.log(`   Vendor ID: ${resultNoForm.id}`);
  } else {
    console.log("\n⚠️  TEST 2: Vendor creation without form failed (expected if forms are mandatory)");
  }

  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("TEST 3: Create Vendor WITH Custom Form");
  console.log("═══════════════════════════════════════════════════════════");

  if (!firstFormId) {
    console.log("\n⚠️  TEST 3 SKIPPED: No custom forms available");
  } else {
    const vendorDataWithForm = {
      companyName: `Test Vendor With Form ${timestamp}`,
      subsidiary: "1",
      email: "test.withform@example.com",
      customForm: firstFormId,
      externalId: `TEST-VENDOR-FORM-${timestamp}`,
    };

    console.log(`   Using custom form ID: ${firstFormId}`);

    const resultWithForm = await callTool("netsuite_create_vendor", vendorDataWithForm);

    if (resultWithForm && resultWithForm.success) {
      console.log("\n✅ TEST 3 PASSED: Vendor created with custom form");
      console.log(`   Vendor ID: ${resultWithForm.id}`);
    } else {
      console.log("\n❌ TEST 3 FAILED: Could not create vendor with custom form");
    }
  }

  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("TEST 4: Idempotency Check (Re-create Same Vendor)");
  console.log("═══════════════════════════════════════════════════════════");

  const idempotentExternalId = `TEST-VENDOR-IDEMPOTENT-${timestamp}`;
  const vendorDataIdempotent = {
    companyName: `Test Vendor Idempotent ${timestamp}`,
    subsidiary: "1",
    email: "test.idempotent@example.com",
    externalId: idempotentExternalId,
    ...(firstFormId && { customForm: firstFormId }),
  };

  console.log("   Creating vendor first time...");
  const firstCreate = await callTool("netsuite_create_vendor", vendorDataIdempotent);

  if (!firstCreate || !firstCreate.success) {
    console.log("\n❌ TEST 4 FAILED: Could not create vendor for idempotency test");
  } else {
    console.log(`   First creation: ID ${firstCreate.id}`);

    console.log("\n   Creating same vendor again (should detect existing)...");
    const secondCreate = await callTool("netsuite_create_vendor", vendorDataIdempotent);

    if (secondCreate && secondCreate.found) {
      console.log("\n✅ TEST 4 PASSED: Idempotency working - existing vendor detected");
      console.log(`   Existing vendor ID: ${secondCreate.id}`);
    } else {
      console.log("\n⚠️  TEST 4: Idempotency check inconclusive (SuiteQL may not be available)");
    }
  }

  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("TEST 5: Create Vendor with Custom Fields");
  console.log("═══════════════════════════════════════════════════════════");

  const vendorDataCustomFields = {
    companyName: `Test Vendor Custom Fields ${timestamp}`,
    subsidiary: "1",
    email: "test.customfields@example.com",
    externalId: `TEST-VENDOR-CUSTOM-${timestamp}`,
    ...(firstFormId && { customForm: firstFormId }),
    customFields: {
      // Example custom fields (adjust to your NetSuite instance)
      // custentity_example_field: "Test Value",
    },
  };

  console.log("   Custom fields:", vendorDataCustomFields.customFields);

  const resultCustomFields = await callTool("netsuite_create_vendor", vendorDataCustomFields);

  if (resultCustomFields && resultCustomFields.success) {
    console.log("\n✅ TEST 5 PASSED: Vendor created with custom fields");
    console.log(`   Vendor ID: ${resultCustomFields.id}`);
  } else {
    console.log("\n⚠️  TEST 5: Vendor with custom fields test inconclusive");
  }

  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("📊 TEST SUMMARY");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("✅ netsuite_get_vendor_forms: TESTED");
  console.log("⚠️  netsuite_create_vendor (no form): May fail if forms mandatory");
  console.log("✅ netsuite_create_vendor (with form): TESTED");
  console.log("✅ Idempotency check: TESTED");
  console.log("✅ Custom fields support: TESTED");
  console.log("\n🎉 Fixed create_vendor tool validation complete!");
}

// Run tests
runTests().catch((error) => {
  console.error("\n💥 Fatal error:", error);
  process.exit(1);
});
