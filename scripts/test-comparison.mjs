#!/usr/bin/env node
import "dotenv/config";

const MCP_SERVER_URL = "http://localhost:3001/mcp";

async function parseSseResponse(response) {
  const text = await response.text();
  const lines = text.split("\n");
  const messages = [];
  let currentMessage = "";

  for (const line of lines) {
    if (line.startsWith("data: ")) {
      currentMessage += line.slice(6);
    } else if (line === "") {
      if (currentMessage) {
        try {
          messages.push(JSON.parse(currentMessage));
        } catch {
          // ignore
        }
        currentMessage = "";
      }
    }
  }

  return messages.length > 0 ? messages[messages.length - 1] : null;
}

async function callTool(toolName, args) {
  console.log(`\n🔍 Calling ${toolName} with args:`, JSON.stringify(args));
  
  const response = await fetch(MCP_SERVER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json, text/event-stream",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: {
        name: toolName,
        arguments: args,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return await parseSseResponse(response);
}

async function main() {
  console.log("🧪 Testing both get_vendor_bill (working) and get_vendor (broken)");
  console.log("=".repeat(70));
  console.log(`Server: ${MCP_SERVER_URL}`);
  console.log("");

  // Test 1: vendor_bill (working tool)
  console.log("Test 1: netsuite_get_vendor_bill (this WORKS on Railway)");
  console.log("-".repeat(70));
  try {
    const result = await callTool("netsuite_get_vendor_bill", { id: "12345" });
    
    if (result?.result?.isError) {
      console.log("❌ Tool Error (expected, fake ID):", result.result.content[0]?.text.substring(0, 100));
    } else {
      console.log("✅ Parameters transmitted successfully!");
    }
  } catch (error) {
    console.log("❌ Exception:", error.message);
  }

  // Test 2: vendor (broken tool)
  console.log("\nTest 2: netsuite_get_vendor (this FAILS)");
  console.log("-".repeat(70));
  try {
    const result = await callTool("netsuite_get_vendor", { id: "134775" });
    
    if (result?.result?.isError) {
      console.log("❌ Tool Error:", result.result.content[0]?.text.substring(0, 150));
    } else {
      console.log("✅ Success!");
    }
  } catch (error) {
    console.log("❌ Exception:", error.message);
  }
}

main().catch(console.error);
