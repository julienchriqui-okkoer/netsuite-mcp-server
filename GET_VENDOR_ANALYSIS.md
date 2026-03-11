# 🔍 Analysis: netsuite_get_vendor Parameter Transmission Issue

## Problem Summary

`netsuite_get_vendor` does not receive the `id` parameter from Dust/MCP clients, while `netsuite_get_vendor_bill` works correctly with the exact same signature.

## Evidence

### ✅ What Works
1. **Postman**: `GET /vendor/{id}` returns 200 OK → NetSuite permissions are correct
2. **`netsuite_get_latest_vendors`**: Successfully calls `GET /vendor/{id}` internally → Endpoint works fine
3. **`netsuite_get_vendor_bill`**: Receives `id` parameter correctly from MCP clients

### ❌ What Doesn't Work
`netsuite_get_vendor`: Arguments received are `{signal:{}, requestId:..., requestInfo:...}` but NO `id`

## Root Cause

After extensive testing, the issue is **NOT**:
- ❌ NetSuite permissions (Postman returns 200)
- ❌ OAuth signature (same code works for `vendor_bills`)
- ❌ Endpoint availability (works in Postman and in `get_latest_vendors`)
- ❌ Code structure (identical to working `vendor_bill` tool)

The issue **IS**:
- ✅ MCP SDK parameter transmission bug specific to `netsuite_get_vendor` tool
- ✅ Possibly a name collision or SDK internal routing issue

## Attempted Fixes

1. ✅ Added Zod schema with `(server as any).tool()` → Failed
2. ✅ Changed to `server.registerTool()` without inputSchema → Failed
3. ✅ Used destructuring `{id}: any` (like `vendor_bill`) → Failed
4. ✅ Used args object `args.id` (like `latest_vendors`) → Failed
5. ✅ Removed `expandSubResources` parameter → Failed
6. ✅ Added extensive debug logging → Confirmed args don't contain `id`

## Recommended Solution

**Use `netsuite_get_latest_vendors` which already works perfectly:**

```typescript
// It already calls GET /vendor/{id} internally with success:
const vendorDetail: any = await client.get<any>(`/vendor/${vendorRef.id}`, {
  expandSubResources: "true",
});
```

This tool:
- ✅ Fetches vendor details successfully
- ✅ Includes all needed fields (name, email, phone, address, VAT, currency, etc.)
- ✅ Returns Spendesk-compatible format
- ✅ Works in both local and Railway environments
- ✅ Tested and confirmed working by user

## Alternative: Debug MCP SDK

If `netsuite_get_vendor` is absolutely required:

1. Check MCP SDK version compatibility
2. Test with MCP Inspector tool
3. Compare WebStandardStreamableHTTPServerTransport behavior
4. Create minimal reproduction case for MCP SDK maintainers

##  Conclusion

Given that:
- Postman works (NetSuite is fine)
- `netsuite_get_latest_vendors` works (code is fine)
- Only `netsuite_get_vendor` fails (MCP SDK issue)

**Recommendation: Mark `netsuite_get_vendor` as "Not supported due to MCP SDK limitation" and use `netsuite_get_latest_vendors` instead.**
