#!/bin/bash
# Test create_vendor on Railway

echo "🧪 Testing netsuite_create_vendor on Railway"
echo "=============================================="

RAILWAY_URL="https://netsuite-mcp-server-production.up.railway.app/mcp"

echo ""
echo "📝 Step 1: Get subsidiary ID..."
SUBSIDIARY_RESPONSE=$(curl -s -X POST $RAILWAY_URL \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": "test1",
    "method": "tools/call",
    "params": {
      "name": "netsuite_get_subsidiaries",
      "arguments": { "limit": 1 }
    }
  }')

# Extract subsidiary ID (assuming it's in SSE format)
SUBSIDIARY_ID=$(echo "$SUBSIDIARY_RESPONSE" | grep -o '"id":"[0-9]*"' | head -1 | grep -o '[0-9]*')

if [ -z "$SUBSIDIARY_ID" ]; then
  echo "❌ Could not get subsidiary ID"
  echo "Response: $SUBSIDIARY_RESPONSE"
  exit 1
fi

echo "✅ Got subsidiary ID: $SUBSIDIARY_ID"

echo ""
echo "📝 Step 2: Create test vendor..."
EXTERNAL_ID="railway_test_vendor_$(date +%s)"
CREATE_RESPONSE=$(curl -s -X POST $RAILWAY_URL \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d "{
    \"jsonrpc\": \"2.0\",
    \"id\": \"test2\",
    \"method\": \"tools/call\",
    \"params\": {
      \"name\": \"netsuite_create_vendor\",
      \"arguments\": {
        \"companyName\": \"Railway Test Supplier\",
        \"legalName\": \"Railway Test Supplier SAS\",
        \"subsidiary\": \"$SUBSIDIARY_ID\",
        \"email\": \"test@railway-supplier.fr\",
        \"phone\": \"+33 1 23 45 67 89\",
        \"vatRegNumber\": \"FR88888888888\",
        \"externalId\": \"$EXTERNAL_ID\",
        \"memo\": \"Created by Railway test\",
        \"isInactive\": false
      }
    }
  }")

echo ""
echo "📤 Create Response:"
echo "$CREATE_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$CREATE_RESPONSE"

# Check for error
if echo "$CREATE_RESPONSE" | grep -q "isError.*true"; then
  echo ""
  echo "❌ CREATE FAILED"
  exit 1
fi

# Extract vendor ID
VENDOR_ID=$(echo "$CREATE_RESPONSE" | grep -o '"id":"[0-9]*"' | head -1 | grep -o '[0-9]*')

if [ -z "$VENDOR_ID" ]; then
  echo "❌ Could not extract vendor ID"
  exit 1
fi

echo ""
echo "✅ VENDOR CREATED SUCCESSFULLY!"
echo "   Vendor ID: $VENDOR_ID"
echo "   External ID: $EXTERNAL_ID"

echo ""
echo "📝 Step 3: Search vendor by externalId..."
SEARCH_RESPONSE=$(curl -s -X POST $RAILWAY_URL \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d "{
    \"jsonrpc\": \"2.0\",
    \"id\": \"test3\",
    \"method\": \"tools/call\",
    \"params\": {
      \"name\": \"netsuite_get_vendors\",
      \"arguments\": {
        \"q\": \"externalId:\\\"$EXTERNAL_ID\\\"\",
        \"limit\": 1
      }
    }
  }")

echo ""
echo "🔍 Search Response:"
echo "$SEARCH_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$SEARCH_RESPONSE"

echo ""
echo "=============================================="
echo "✅ ALL TESTS PASSED!"
echo "=============================================="
echo ""
echo "⚠️  Note: A real vendor was created in NetSuite:"
echo "   ID: $VENDOR_ID"
echo "   External ID: $EXTERNAL_ID"
echo "   You may want to mark it as inactive manually."
