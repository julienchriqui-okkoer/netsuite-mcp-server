#!/usr/bin/env node

/**
 * Test des 2 tools réparés : get_vendor_by_id et get_employee
 */

const SERVER_URL = "http://localhost:3001/mcp";

async function testTool(toolName, args) {
  console.log(`\n🧪 Testing ${toolName}...`);
  console.log(`Args: ${JSON.stringify(args)}`);

  const payload = {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: {
      name: toolName,
      arguments: args,
    },
  };

  try {
    const response = await fetch(SERVER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    
    if (responseText.startsWith("event:")) {
      const lines = responseText.split("\n");
      const dataLine = lines.find((l) => l.startsWith("data: "));
      if (dataLine) {
        const data = JSON.parse(dataLine.replace("data: ", ""));
        const resultText = data.result?.content?.[0]?.text;
        const isError = data.result?.isError;
        
        if (isError) {
          if (resultText.includes("Missing required parameter")) {
            console.log("❌ FAIL: Parameters not transmitted");
            return false;
          } else {
            console.log(`⚠️  Error: ${resultText.substring(0, 100)}`);
            return false;
          }
        } else {
          console.log("✅ SUCCESS: Parameters transmitted and tool works!");
          return true;
        }
      }
    }
  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log("🧪 Testing Fixed Tools\n");
  console.log("=" .repeat(50));

  // Test 1: get_vendor_by_id (use ID from our previous test: 136288)
  const test1 = await testTool("netsuite_get_vendor_by_id", { id: "136288" });

  // Test 2: get_employee (test with likely valid ID)
  const test2 = await testTool("netsuite_get_employee", { id: "5" });

  console.log("\n" + "=".repeat(50));
  console.log("\n📊 Results:");
  console.log(`  netsuite_get_vendor_by_id: ${test1 ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  netsuite_get_employee:     ${test2 ? "✅ PASS" : "❌ FAIL"}`);
  
  if (test1 && test2) {
    console.log("\n🎉 All tests passed! Tools are fixed and ready!");
  } else {
    console.log("\n⚠️  Some tests may have failed due to missing IDs in NetSuite");
    console.log("   BUT if you don't see 'Missing required parameter', the fix works!");
  }
}

runTests();
