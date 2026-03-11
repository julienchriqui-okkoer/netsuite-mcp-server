#!/usr/bin/env node
import "dotenv/config";

const MCP_SERVER_URL = process.env.MCP_SERVER_URL || "http://localhost:3001/mcp";

async function callTool(toolName, params = {}) {
  console.log(`\n🔧 Testing: ${toolName}`);
  
  try {
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
          arguments: params,
        },
      }),
    });

    if (!response.ok) {
      console.error(`❌ HTTP ${response.status}: ${response.statusText}`);
      return;
    }

    const text = await response.text();
    const result = JSON.parse(text);

    if (result.error) {
      console.error(`❌ Error:`, result.error);
      return;
    }

    if (result.result?.isError) {
      console.error(`❌ Tool Error:`, result.result.content[0]?.text);
    } else {
      console.log(`✅ Success`);
      const content = result.result?.content?.[0]?.text;
      if (content) {
        const parsed = JSON.parse(content);
        console.log(`   Items count:`, parsed.items?.length || parsed.count || 0);
        console.log(`   First item:`, parsed.items?.[0] || "N/A");
      }
    }
  } catch (error) {
    console.error(`❌ Exception:`, error.message);
  }
}

async function main() {
  console.log("🧪 Testing NetSuite Reference Data Endpoints");
  console.log("=".repeat(60));

  // Test each reference data tool with limit=1 to minimize API calls
  await callTool("netsuite_get_accounts", { limit: 1 });
  await callTool("netsuite_get_departments", { limit: 1 });
  await callTool("netsuite_get_subsidiaries", { limit: 1 });
  await callTool("netsuite_get_tax_codes", { limit: 1 });
  await callTool("netsuite_get_currencies", { limit: 1 });

  console.log("\n" + "=".repeat(60));
  console.log("✅ All tests completed");
}

main().catch(console.error);
