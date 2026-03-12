#!/usr/bin/env node

const SERVER_URL = "http://localhost:3001/mcp";

async function testGetVendorBills() {
  console.log("🧪 Testing netsuite_get_vendor_bills (KNOWN WORKING)...\n");

  const payload = {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: {
      name: "netsuite_get_vendor_bills",
      arguments: {
        limit: 5,
      },
    },
  };

  console.log("📤 Request:");
  console.log(JSON.stringify(payload, null, 2));
  console.log();

  try {
    const response = await fetch(SERVER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify(payload),
    });

    console.log(`📥 Response status: ${response.status}`);
    const responseText = await response.text();
    console.log("📥 Raw response:");
    console.log(responseText.substring(0, 500));
  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
    process.exit(1);
  }
}

testGetVendorBills();
