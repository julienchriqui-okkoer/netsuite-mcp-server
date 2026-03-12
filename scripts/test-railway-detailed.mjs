#!/usr/bin/env node

const RAILWAY_URL = "https://netsuite-mcp-server-production.up.railway.app/mcp";

async function testRailway() {
  console.log("🧪 Testing netsuite_create_vendor on Railway...\n");

  const payload = {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: {
      name: "netsuite_create_vendor",
      arguments: {
        companyName: "Test Vendor Railway Final",
        subsidiary: "1",
        email: "test.railway.final@example.com",
      },
    },
  };

  console.log("📤 Request:");
  console.log(JSON.stringify(payload, null, 2));
  console.log();

  try {
    const response = await fetch(RAILWAY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify(payload),
    });

    console.log(`📥 Response status: ${response.status}`);
    const responseText = await response.text();
    console.log("📥 Response:");
    console.log(responseText);
    
    // Parse SSE
    if (responseText.startsWith("event:")) {
      const lines = responseText.split("\n");
      const dataLine = lines.find((l) => l.startsWith("data: "));
      if (dataLine) {
        const data = JSON.parse(dataLine.replace("data: ", ""));
        const resultText = data.result?.content?.[0]?.text;
        if (resultText) {
          console.log("\n✅ Tool result:");
          console.log(resultText);
          
          // Check if params were transmitted
          if (resultText.includes("Missing required parameter: companyName")) {
            console.log("\n❌ FAIL: Parameters NOT transmitted");
            process.exit(1);
          } else if (resultText.includes("Address")) {
            console.log("\n✅ SUCCESS: Parameters transmitted (NetSuite needs address)");
          } else {
            console.log("\n✅ Result received");
          }
        }
      }
    }
  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
    process.exit(1);
  }
}

testRailway();
