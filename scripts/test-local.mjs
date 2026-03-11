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
  console.log("🧪 Testing netsuite_get_vendor locally");
  console.log("=".repeat(60));
  console.log(`Server: ${MCP_SERVER_URL}`);
  console.log("⚠️  Check terminal logs for [NetSuiteClient] debug output");
  console.log("");

  try {
    const result = await callTool("netsuite_get_vendor", { id: "134775" });

    if (!result) {
      console.error("❌ No result received");
      return;
    }

    if (result.error) {
      console.error("❌ MCP Error:", JSON.stringify(result.error, null, 2));
      return;
    }

    if (result.result?.isError) {
      console.error("❌ Tool Error:", result.result.content[0]?.text);
      return;
    }

    console.log("✅ Success!");
    const content = result.result?.content?.[0]?.text;
    if (content) {
      const vendor = JSON.parse(content);
      console.log("\n📋 Vendor Details:");
      console.log("  ID:", vendor.id);
      console.log("  Name:", vendor.companyName || vendor.entityId);
    }
  } catch (error) {
    console.error("❌ Exception:", error.message);
  }
}

main().catch(console.error);
