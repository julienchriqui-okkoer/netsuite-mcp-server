#!/usr/bin/env node

/**
 * Test netsuite_create_vendor locally (simplified 4-param version)
 */

const SERVER_URL = "http://localhost:3001/mcp";

async function testCreateVendor() {
  console.log("🧪 Testing netsuite_create_vendor (simplified version)...\n");

  const payload = {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: {
      name: "netsuite_create_vendor",
      arguments: {
        companyName: "Test Vendor Simplified Local",
        subsidiary: "1",
        email: "test.simplified.local@example.com",
        externalId: "LOCAL-TEST-SIMPLE-001",
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
    console.log(responseText);
    console.log();

    // Parse SSE or JSON
    let data;
    if (responseText.startsWith("event:")) {
      // SSE format - extract JSON from data: lines
      const lines = responseText.split("\n");
      const dataLine = lines.find((l) => l.startsWith("data: "));
      if (dataLine) {
        data = JSON.parse(dataLine.replace("data: ", ""));
      }
    } else {
      data = JSON.parse(responseText);
    }

    console.log("📥 Parsed data:");
    console.log(JSON.stringify(data, null, 2));

    if (data.error) {
      console.error("\n❌ ERROR:", data.error);
      process.exit(1);
    }

    if (data.result?.content?.[0]?.text) {
      const resultText = data.result.content[0].text;
      console.log("\n✅ Tool result:");
      console.log(resultText);

      const parsedResult = JSON.parse(resultText);
      if (parsedResult.isError) {
        console.error("\n❌ Tool execution error:", parsedResult.content);
        process.exit(1);
      } else {
        console.log("\n🎉 SUCCESS - Vendor created!");
        console.log("NetSuite response:", JSON.stringify(parsedResult.content, null, 2));
      }
    }
  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
    console.error("Stack:", error.stack);
    process.exit(1);
  }
}

testCreateVendor();
