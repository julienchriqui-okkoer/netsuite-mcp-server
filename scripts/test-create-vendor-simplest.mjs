#!/usr/bin/env node

const SERVER_URL = "http://localhost:3001/mcp";

async function testCreateVendorSimplest() {
  console.log("🧪 Testing netsuite_create_vendor (SIMPLEST - no externalId)...\n");

  const payload = {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: {
      name: "netsuite_create_vendor",
      arguments: {
        companyName: "Test Vendor MCP Fixed",
        subsidiary: "1",
        email: "test.mcp.fixed@example.com",
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
    
    if (responseText.startsWith("event:")) {
      const lines = responseText.split("\n");
      const dataLine = lines.find((l) => l.startsWith("data: "));
      if (dataLine) {
        const data = JSON.parse(dataLine.replace("data: ", ""));
        const resultText = data.result?.content?.[0]?.text;
        if (resultText) {
          console.log("\n✅ Tool result:");
          console.log(resultText);
        }
      }
    }
  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
    process.exit(1);
  }
}

testCreateVendorSimplest();
