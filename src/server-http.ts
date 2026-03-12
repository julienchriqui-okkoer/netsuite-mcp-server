import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { registerAllTools } from "./tools/index.js";

// Helper to create a new MCP server instance per request
function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "netsuite-mcp-server",
    version: "1.0.0",
  });
  
  registerAllTools(server);
  
  return server;
}

const app = new Hono();

app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowHeaders: [
      "Content-Type",
      "mcp-session-id",
      "Last-Event-ID",
      "mcp-protocol-version",
    ],
    exposeHeaders: ["mcp-session-id", "mcp-protocol-version"],
  })
);

app.get("/", (c) =>
  c.json({
    status: "ok",
    service: "netsuite-mcp-server",
    version: "1.0.0",
  })
);

app.all("/mcp", async (c) => {
  try {
    const clonedReq = c.req.raw.clone();
    const bodyText = await clonedReq.text();
    console.log("🔍 [server-http] Incoming request body:", bodyText);
    
    // Create fresh server and transport for each request
    const server = createMcpServer();
    const transport = new WebStandardStreamableHTTPServerTransport();
    await server.connect(transport);
    return transport.handleRequest(c.req.raw);
  } catch (error: any) {
    console.error("❌ [server-http] Error:", error);
    return c.json({ error: error.message }, 500);
  }
});

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
const HOST = "0.0.0.0"; // Railway needs 0.0.0.0

console.error(`Starting NetSuite MCP HTTP server on ${HOST}:${PORT}`);
console.error(`PORT env var: ${process.env.PORT || "not set (using default 3001)"}`);
console.error(`Health check: http://${HOST}:${PORT}/`);
console.error(`MCP endpoint: http://${HOST}:${PORT}/mcp`);

serve(
  {
    fetch: app.fetch,
    port: PORT,
    hostname: HOST,
  },
  (info) => {
    console.error(`✓ Server is listening on ${info.address}:${info.port}`);
    console.error(`✓ Ready to accept connections`);
  }
);
