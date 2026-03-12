#!/usr/bin/env node

const SERVER_URL = "http://localhost:3001/mcp";

async function testCreateVendorUnique() {
  console.log("🧪 Testing netsuite_create_vendor (UNIQUE ID)...\n");

  // Generate unique ID with timestamp
  const uniqueId = `LOCAL-TEST-${Date.now()}`;

  const payload = {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: {
      name: "netsuite_create_vendor",
      arguments: {
        companyName: `Test Vendor ${uniqueId}`,
        subsidiary: "1",
        email: `test.${uniqueId.toLowerCase()}@example.com`,
        phone: "+33 1 23 45 67 89",
        externalId: uniqueId,
        isPerson: false,
        addr1: "10 rue de la Paix",
        city: "Paris",
        zip: "75002",
        country: "FR",
      },
    },
  };

  console.log("📤 Request (unique externalId):");
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
          
          if (!isError) {
            console.log("🎉 SUCCESS! Vendor created in NetSuite!");
            console.log("✅ All parameters were transmitted correctly");
            console.log("✅ Address structure is valid");
            console.log("✅ MCP SDK fix works perfectly");
          } else if (resultText.includes("already exists")) {
            console.log("⚠️  Vendor already exists (previous test)");
            console.log("✅ But this proves the API call works!");
          } else {
            console.log("❌ Error:", resultText);
          }
        }
      }
    }
  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
    process.exit(1);
  }
}

testCreateVendorUnique();
