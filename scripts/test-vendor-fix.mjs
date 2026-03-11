#!/usr/bin/env node
import "dotenv/config";

const MCP_SERVER_URL = process.env.MCP_SERVER_URL || "https://netsuite-mcp-server-production.up.railway.app/mcp";

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

async function testGetVendor(vendorId) {
  console.log(`\n🧪 Testing netsuite_get_vendor with ID: ${vendorId}`);
  console.log("=".repeat(60));

  try {
    const result = await callTool("netsuite_get_vendor", { id: vendorId });

    if (!result) {
      console.error(`❌ No result received`);
      return;
    }

    if (result.error) {
      console.error(`❌ MCP Error:`, JSON.stringify(result.error, null, 2));
      return;
    }

    if (result.result?.isError) {
      console.error(`❌ Tool Error:`, result.result.content[0]?.text);
      return;
    }

    console.log(`✅ Success!`);
    const content = result.result?.content?.[0]?.text;
    if (content) {
      const vendor = JSON.parse(content);
      console.log("\n📋 Vendor Details:");
      console.log("  ID:", vendor.id);
      console.log("  Name:", vendor.companyName || vendor.entityId);
      console.log("  Email:", vendor.email || "N/A");
      console.log("  Phone:", vendor.phone || "N/A");
      console.log("  VAT Number:", vendor.vatRegNumber || "N/A");
      console.log("  Created:", vendor.dateCreated || "N/A");
    }
  } catch (error) {
    console.error(`❌ Exception:`, error.message);
  }
}

async function testGetLatestVendors() {
  console.log(`\n🧪 Testing netsuite_get_latest_vendors`);
  console.log("=".repeat(60));

  try {
    const result = await callTool("netsuite_get_latest_vendors", { limit: 5 });

    if (!result) {
      console.error(`❌ No result received`);
      return;
    }

    if (result.error) {
      console.error(`❌ MCP Error:`, JSON.stringify(result.error, null, 2));
      return;
    }

    if (result.result?.isError) {
      console.error(`❌ Tool Error:`, result.result.content[0]?.text);
      return;
    }

    console.log(`✅ Success!`);
    const content = result.result?.content?.[0]?.text;
    if (content) {
      const data = JSON.parse(content);
      console.log(`\n📋 Latest ${data.count} Vendors:`);
      data.vendors.forEach((v, i) => {
        console.log(`\n  ${i + 1}. ${v.name} (ID: ${v.id})`);
        console.log(`     Email: ${v.email || "N/A"}`);
        console.log(`     VAT: ${v.vatNumber || "N/A"}`);
        console.log(`     Created: ${v.createdAt || "N/A"}`);
      });
    }
  } catch (error) {
    console.error(`❌ Exception:`, error.message);
  }
}

async function main() {
  console.log("🧪 NetSuite MCP Server — Test Suite");
  console.log("=".repeat(60));
  console.log(`Server: ${MCP_SERVER_URL}`);

  // Test 1: Get specific vendor with ID parameter
  await testGetVendor("134775");
  
  // Test 2: Try another vendor ID
  await testGetVendor("134774");

  // Test 3: Get latest vendors
  await testGetLatestVendors();

  console.log("\n" + "=".repeat(60));
  console.log("✅ All tests completed");
}

main().catch(console.error);
