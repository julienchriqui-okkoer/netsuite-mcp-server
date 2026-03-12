#!/bin/bash

# Test netsuite_create_vendor on Railway

RAILWAY_URL="https://netsuite-mcp-server-production.up.railway.app"

echo "🧪 Testing netsuite_create_vendor on Railway..."
echo "URL: $RAILWAY_URL/mcp"
echo ""

curl -X POST "$RAILWAY_URL/mcp" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "netsuite_create_vendor",
      "arguments": {
        "companyName": "Test Vendor Railway Final",
        "subsidiary": "1",
        "email": "test.railway.final@example.com"
      }
    }
  }' | grep -o '"text":"[^"]*"' | head -1

echo ""
echo "✅ Test completed"
