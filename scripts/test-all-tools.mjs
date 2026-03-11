import "dotenv/config";

const BASE_URL = process.env.MCP_BASE_URL || "http://localhost:3001";
const MCP_ENDPOINT = `${BASE_URL}/mcp`;

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

async function callMcp(method, params = {}, sessionId = null) {
  const headers = {
    "Content-Type": "application/json",
    "Accept": "application/json, text/event-stream",
  };
  if (sessionId) {
    headers["mcp-session-id"] = sessionId;
  }

  const body = JSON.stringify({
    jsonrpc: "2.0",
    id: Date.now(),
    method,
    params,
  });

  const response = await fetch(MCP_ENDPOINT, {
    method: "POST",
    headers,
    body,
  });

  const newSessionId = response.headers.get("mcp-session-id");
  const contentType = response.headers.get("content-type") || "";

  let result;
  if (contentType.includes("text/event-stream")) {
    result = await parseSseResponse(response);
  } else {
    result = await response.json();
  }

  return { result, sessionId: newSessionId || sessionId };
}

async function main() {
  console.log("🧪 Testing NetSuite MCP HTTP server (all tools)...\n");

  let sessionId = null;

  try {
    console.log("1️⃣  Initialize session");
    const init = await callMcp("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: {
        name: "test-client-complete",
        version: "1.0.0",
      },
    });
    sessionId = init.sessionId;
    console.log(`   ✓ Session ID: ${sessionId}\n`);

    console.log("2️⃣  List all tools");
    const toolsList = await callMcp("tools/list", {}, sessionId);
    const tools = toolsList.result?.result?.tools || [];
    console.log(`   ✓ Found ${tools.length} tools:\n`);

    const expectedTools = [
      // Vendors
      "netsuite_get_vendors",
      "netsuite_get_vendor",
      // Reference
      "netsuite_get_accounts",
      "netsuite_get_departments",
      "netsuite_get_subsidiaries",
      "netsuite_get_tax_codes",
      "netsuite_get_currencies",
      // Vendor Bills
      "netsuite_get_vendor_bills",
      "netsuite_get_vendor_bill",
      "netsuite_create_vendor_bill",
      "netsuite_update_vendor_bill",
      // Journal Entries
      "netsuite_get_journal_entries",
      "netsuite_create_journal_entry",
      // SuiteQL
      "netsuite_execute_suiteql",
      // Employees (NEW)
      "netsuite_get_employees",
      "netsuite_get_employee",
      // Expense Reports (NEW)
      "netsuite_get_expense_reports",
      "netsuite_create_expense_report",
      // Payments (NEW)
      "netsuite_create_bill_payment",
      // Vendor Credits (NEW)
      "netsuite_get_vendor_credits",
      "netsuite_create_vendor_credit",
      // Analytics (NEW)
      "netsuite_get_locations",
      "netsuite_get_classifications",
      // File Cabinet (NEW)
      "netsuite_upload_file",
      "netsuite_attach_file_to_record",
    ];

    const toolNames = tools.map((t) => t.name);
    let allPresent = true;

    expectedTools.forEach((expectedTool) => {
      if (toolNames.includes(expectedTool)) {
        console.log(`     ✓ ${expectedTool}`);
      } else {
        console.log(`     ✗ MISSING: ${expectedTool}`);
        allPresent = false;
      }
    });

    if (allPresent) {
      console.log(`\n   ✅ All ${expectedTools.length} expected tools are present!\n`);
    } else {
      console.log(`\n   ❌ Some tools are missing!\n`);
      process.exit(1);
    }

    console.log("3️⃣  Test new tool: netsuite_get_employees (limit 2)");
    const employeesCall = await callMcp(
      "tools/call",
      {
        name: "netsuite_get_employees",
        arguments: { limit: 2 },
      },
      sessionId
    );
    const employeesResult = employeesCall.result.result;
    if (employeesResult.isError) {
      console.error(`   ✗ Error: ${employeesResult.content[0].text}`);
    } else {
      const data = JSON.parse(employeesResult.content[0].text);
      console.log(`   ✓ Got ${data.count || 0} employees\n`);
    }

    console.log("4️⃣  Test new tool: netsuite_get_locations (limit 2)");
    const locationsCall = await callMcp(
      "tools/call",
      {
        name: "netsuite_get_locations",
        arguments: { limit: 2 },
      },
      sessionId
    );
    const locationsResult = locationsCall.result.result;
    if (locationsResult.isError) {
      console.error(`   ✗ Error: ${locationsResult.content[0].text}`);
    } else {
      const data = JSON.parse(locationsResult.content[0].text);
      console.log(`   ✓ Got ${data.count || 0} locations\n`);
    }

    console.log("✅ All tests passed!");
  } catch (error) {
    console.error("❌ Test failed:");
    console.error(error);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
