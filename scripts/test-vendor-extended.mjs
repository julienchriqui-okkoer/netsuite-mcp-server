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

async function testGetVendor(vendorId, testName) {
  console.log(`\n🧪 ${testName}`);
  console.log("=".repeat(60));

  try {
    const result = await callTool("netsuite_get_vendor", { id: vendorId });

    if (!result) {
      console.error(`❌ No result received`);
      return false;
    }

    if (result.error) {
      console.error(`❌ MCP Error:`, JSON.stringify(result.error, null, 2));
      return false;
    }

    if (result.result?.isError) {
      console.error(`❌ Tool Error:`, result.result.content[0]?.text);
      return false;
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
      console.log("  Is Inactive:", vendor.isInactive || false);
      console.log("  Created:", vendor.dateCreated || "N/A");
    }
    return true;
  } catch (error) {
    console.error(`❌ Exception:`, error.message);
    return false;
  }
}

async function main() {
  console.log("🧪 NetSuite Vendor GET Tests — Extended");
  console.log("=".repeat(60));
  console.log(`Server: ${MCP_SERVER_URL}`);

  // Test avec les IDs de get_latest_vendors (on sait qu'ils existent)
  const testIds = [
    { id: "134775", name: "Test ID 134775 (2024/03/04-177)" },
    { id: "134774", name: "Test ID 134774 (4002401872)" },
    { id: "126286", name: "Test ID 126286 (ACE CONSULTING)" },
    { id: "123028", name: "Test ID 123028 (@quarium.lounge)" },
    { id: "120369", name: "Test ID 120369 (28 ERE PARIS CENTRE)" },
  ];

  let successCount = 0;
  let failCount = 0;

  for (const test of testIds) {
    const success = await testGetVendor(test.id, test.name);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
    
    // Wait 500ms between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log("\n" + "=".repeat(60));
  console.log(`✅ Success: ${successCount} / ${testIds.length}`);
  console.log(`❌ Failed: ${failCount} / ${testIds.length}`);
  
  if (successCount === 0) {
    console.log("\n⚠️  DIAGNOSTIC:");
    console.log("Tous les tests ont échoué avec NetSuite 400.");
    console.log("Causes possibles:");
    console.log("  1. L'endpoint /vendor/{id} n'est pas disponible dans ton compte");
    console.log("  2. Le paramètre expandSubResources=true cause le problème");
    console.log("  3. Format de l'ID incorrect (string vs number)");
    console.log("\n💡 SOLUTION:");
    console.log("  Utilise netsuite_get_latest_vendors qui fonctionne parfaitement!");
  }
}

main().catch(console.error);
