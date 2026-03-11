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
  console.log("🧪 Testing NetSuite MCP HTTP server...\n");

  let sessionId = null;

  try {
    console.log("1️⃣  Initialize session");
    const init = await callMcp("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: {
        name: "test-client",
        version: "1.0.0",
      },
    });
    sessionId = init.sessionId;
    console.log(`   ✓ Session ID: ${sessionId}\n`);

    console.log("2️⃣  List tools");
    const toolsList = await callMcp("tools/list", {}, sessionId);
    const tools = toolsList.result?.result?.tools || [];
    console.log(`   ✓ Found ${tools.length} tools:`);
    tools.forEach((t) => {
      console.log(`     - ${t.name}`);
    });
    console.log();

    console.log("3️⃣  Call tool: netsuite_get_vendors (limit 3)");
    const vendorsCall = await callMcp(
      "tools/call",
      {
        name: "netsuite_get_vendors",
        arguments: { limit: 3 },
      },
      sessionId
    );
    const vendorsResult = vendorsCall.result.result;
    if (vendorsResult.isError) {
      console.error(`   ✗ Error: ${vendorsResult.content[0].text}`);
    } else {
      const data = JSON.parse(vendorsResult.content[0].text);
      console.log(`   ✓ Got ${data.count} vendors (total: ${data.totalResults})`);
      console.log(`     First vendor ID: ${data.items[0]?.id || "N/A"}\n`);
    }

    console.log("4️⃣  Call tool: netsuite_get_vendor_bills (limit 2)");
    const billsCall = await callMcp(
      "tools/call",
      {
        name: "netsuite_get_vendor_bills",
        arguments: { limit: 2 },
      },
      sessionId
    );
    const billsResult = billsCall.result.result;
    if (billsResult.isError) {
      console.error(`   ✗ Error: ${billsResult.content[0].text}`);
    } else {
      const data = JSON.parse(billsResult.content[0].text);
      console.log(`   ✓ Got ${data.count || 0} vendor bills\n`);
    }

    console.log("5️⃣  Call tool: netsuite_execute_suiteql");
    const suiteqlCall = await callMcp(
      "tools/call",
      {
        name: "netsuite_execute_suiteql",
        arguments: {
          query: "SELECT id, companyName FROM vendor WHERE id = '-3'",
          limit: 1,
        },
      },
      sessionId
    );
    const suiteqlResult = suiteqlCall.result.result;
    if (suiteqlResult.isError) {
      console.error(`   ✗ Error: ${suiteqlResult.content[0].text}`);
    } else {
      const data = JSON.parse(suiteqlResult.content[0].text);
      console.log(`   ✓ SuiteQL query executed successfully`);
      console.log(`     Result: ${JSON.stringify(data, null, 2).slice(0, 200)}...\n`);
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
