import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { registerAllTools } from "./tools/index.js";

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
  const transport = new WebStandardStreamableHTTPServerTransport();
  const server = createMcpServer();
  await server.connect(transport);
  return transport.handleRequest(c.req.raw);
});

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
const HOST = process.env.HOST || "0.0.0.0";

console.error(`Starting NetSuite MCP HTTP server on ${HOST}:${PORT}`);
console.error(`Health check: http://${HOST}:${PORT}/`);
console.error(`MCP endpoint: http://${HOST}:${PORT}/mcp`);

serve({
  fetch: app.fetch,
  port: PORT,
  hostname: HOST,
});
