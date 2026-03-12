#!/usr/bin/env node
/**
 * Comprehensive inventory of all NetSuite MCP tools
 * Run this to get a complete list of available tools from the server
 */

import "dotenv/config";

const MCP_SERVER_URL = process.env.MCP_SERVER_URL || "http://localhost:3001/mcp";

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

async function listTools() {
  const response = await fetch(MCP_SERVER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json, text/event-stream",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list",
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return await parseSseResponse(response);
}

async function main() {
  console.log("🔍 NetSuite MCP - Tool Inventory");
  console.log("=".repeat(70));
  console.log(`Server: ${MCP_SERVER_URL}\n`);

  try {
    const result = await listTools();
    const tools = result?.result?.tools || [];

    console.log(`Total Tools: ${tools.length}\n`);

    // Categorize tools
    const categories = {
      "Vendors": [],
      "Vendor Bills": [],
      "Employees": [],
      "Expense Reports": [],
      "Vendor Payments": [],
      "Vendor Credits": [],
      "Journal Entries": [],
      "Reference Data": [],
      "Analytics": [],
      "SuiteQL": [],
      "File Cabinet": [],
      "Other": [],
    };

    tools.forEach(tool => {
      const name = tool.name;
      
      if (name.includes("_vendor") && !name.includes("bill") && !name.includes("payment") && !name.includes("credit")) {
        categories["Vendors"].push(tool);
      } else if (name.includes("_vendor_bill")) {
        categories["Vendor Bills"].push(tool);
      } else if (name.includes("_employee")) {
        categories["Employees"].push(tool);
      } else if (name.includes("_expense_report")) {
        categories["Expense Reports"].push(tool);
      } else if (name.includes("_vendor_payment")) {
        categories["Vendor Payments"].push(tool);
      } else if (name.includes("_vendor_credit")) {
        categories["Vendor Credits"].push(tool);
      } else if (name.includes("_journal_entry")) {
        categories["Journal Entries"].push(tool);
      } else if (name.includes("_get_accounts") || name.includes("_get_departments") || 
                 name.includes("_get_subsidiaries") || name.includes("_get_tax") ||
                 name.includes("_get_currencies") || name.includes("_get_locations") ||
                 name.includes("_get_classifications")) {
        categories["Reference Data"].push(tool);
      } else if (name.includes("_suiteql")) {
        categories["SuiteQL"].push(tool);
      } else if (name.includes("_file") || name.includes("_attach")) {
        categories["File Cabinet"].push(tool);
      } else {
        categories["Other"].push(tool);
      }
    });

    // Display by category
    Object.entries(categories).forEach(([category, categoryTools]) => {
      if (categoryTools.length > 0) {
        console.log(`\n📂 ${category} (${categoryTools.length})`);
        console.log("-".repeat(70));
        categoryTools.forEach((tool, idx) => {
          console.log(`  ${idx + 1}. ${tool.name}`);
          if (tool.description) {
            const desc = tool.description.split("\n")[0].substring(0, 60);
            console.log(`     ${desc}${desc.length === 60 ? "..." : ""}`);
          }
        });
      }
    });

    // Summary table
    console.log("\n" + "=".repeat(70));
    console.log("📊 SUMMARY");
    console.log("=".repeat(70));
    console.log("\n| Category | Count |");
    console.log("|----------|-------|");
    Object.entries(categories).forEach(([category, categoryTools]) => {
      if (categoryTools.length > 0) {
        console.log(`| ${category.padEnd(20)} | ${categoryTools.length.toString().padStart(5)} |`);
      }
    });
    console.log(`| **TOTAL** | **${tools.length}** |`);

  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

main();
