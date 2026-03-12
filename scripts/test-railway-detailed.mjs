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
    
    // Parse SSE
    if (responseText.startsWith("event:")) {
      const lines = responseText.split("\n");
      const dataLine = lines.find((l) => l.startsWith("data: "));
      if (dataLine) {
        const data = JSON.parse(dataLine.replace("data: ", ""));
        const resultText = data.result?.content?.[0]?.text;
        if (resultText) {
          console.log("\n📋 Tool result:");
          console.log(resultText);
          console.log();
          
          // Diagnostic
          if (resultText.includes("Missing required parameter: companyName")) {
            console.log("❌ FAIL: Parameters NOT transmitted");
            console.log("The destructuring fix did NOT work on Railway");
            process.exit(1);
          } else if (resultText.includes("Address") || resultText.includes("address")) {
            console.log("✅ SUCCESS: Parameters transmitted correctly!");
            console.log("NetSuite is just asking for an address field");
            console.log("This confirms the fix works on Railway ✅");
          } else if (resultText.includes("Bad Request")) {
            console.log("⚠️  UNCERTAIN: Got 400 Bad Request but can't determine cause");
            console.log("Need to check Railway logs for detailed error");
          } else {
            console.log("✅ Result received (check if vendor was created)");
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
