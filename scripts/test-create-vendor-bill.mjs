#!/usr/bin/env node

/**
 * Test create_vendor_bill avec inputSchema
 */

const SERVER_URL = "http://localhost:3001/mcp";

async function testCreateVendorBill() {
  console.log("🧪 Testing netsuite_create_vendor_bill (with inputSchema fix)...\n");

  const payload = {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: {
      name: "netsuite_create_vendor_bill",
      arguments: {
        entity: "136288", // Vendor ID from previous test
        subsidiary: "1",
        tranDate: "2026-03-12",
        memo: "Test bill from local test",
        externalId: `LOCAL-BILL-${Date.now()}`,
        expense: [{
          account: "404",
          amount: 150.00,
          memo: "Test expense line"
        }]
      },
    },
  };

  console.log("📤 Request:");
  console.log(JSON.stringify(payload.params.arguments, null, 2));
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
        const isError = data.result?.isError;
        
        if (resultText) {
          console.log("\n📋 Tool result:");
          console.log(resultText);
          console.log();
          
          if (resultText.includes("Missing required parameter")) {
            console.log("❌ FAIL: Parameters not transmitted");
            console.log("The inputSchema fix didn't work!");
            process.exit(1);
          } else if (!isError) {
            console.log("🎉 SUCCESS!");
            console.log("✅ Parameters transmitted correctly");
            console.log("✅ Vendor bill created in NetSuite");
            const result = JSON.parse(resultText);
            if (result.id) {
              console.log(`✅ Bill ID: ${result.id}`);
            }
          } else {
            console.log(`⚠️  Error from NetSuite: ${resultText.substring(0, 200)}`);
          }
        }
      }
    }
  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
    process.exit(1);
  }
}

testCreateVendorBill();
