#!/usr/bin/env node

const SERVER_URL = "http://localhost:3001/mcp";

async function testCreateVendorComplete() {
  console.log("🧪 Testing netsuite_create_vendor (WITH ADDRESS)...\n");

  const payload = {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: {
      name: "netsuite_create_vendor",
      arguments: {
        companyName: "Test Vendor Complete Local",
        subsidiary: "1",
        email: "test.complete@example.com",
        phone: "+33 1 23 45 67 89",
        externalId: "LOCAL-COMPLETE-001",
        isPerson: false,
        addr1: "10 rue de la Paix",
        city: "Paris",
        zip: "75002",
        country: "FR",
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
          
          if (resultText.includes("Missing required parameter")) {
            console.log("\n❌ FAIL: Parameters not transmitted");
            process.exit(1);
          } else if (resultText.includes("Address") || resultText.includes("address")) {
            console.log("\n⚠️  Still needs address (check NetSuite config)");
          } else if (!data.result.isError) {
            console.log("\n🎉 SUCCESS: Vendor created!");
            const content = JSON.parse(resultText);
            console.log("Vendor ID:", content.id);
          }
        }
      }
    }
  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
    process.exit(1);
  }
}

testCreateVendorComplete();
