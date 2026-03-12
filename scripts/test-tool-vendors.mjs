#!/usr/bin/env node
/**
 * Test suite for Vendor tools
 * Tests: netsuite_get_vendors, netsuite_get_vendor_by_id, netsuite_get_latest_vendors
 */

import { runAllToolTests } from "./_test-helpers.mjs";

const VENDOR_TESTS = [
  // ========================================
  // netsuite_get_vendors
  // ========================================
  {
    toolName: "netsuite_get_vendors",
    tests: [
      {
        name: "List vendors (basic)",
        args: { limit: 5 },
        expectedStatus: "success",
      },
      {
        name: "List vendors with offset",
        args: { limit: 5, offset: 10 },
        expectedStatus: "success",
      },
      {
        name: "List vendors with search query",
        args: { q: "companyName IS NOT NULL", limit: 3 },
        expectedStatus: "success",
      },
      {
        name: "List vendors (no parameters)",
        args: {},
        expectedStatus: "success",
      },
    ],
  },

  // ========================================
  // netsuite_get_vendor_by_id
  // ========================================
  {
    toolName: "netsuite_get_vendor_by_id",
    tests: [
      {
        name: "Get vendor by valid ID",
        args: { id: "134775" },
        expectedStatus: "success",
      },
      {
        name: "Get vendor without ID parameter",
        args: {},
        expectedStatus: "error",
        expectedMessage: "required",
      },
      {
        name: "Get vendor with invalid ID",
        args: { id: "999999" },
        expectedStatus: "error",
        expectedMessage: "Bad Request",
      },
    ],
  },

  // ========================================
  // netsuite_get_latest_vendors
  // ========================================
  {
    toolName: "netsuite_get_latest_vendors",
    tests: [
      {
        name: "Get latest 5 vendors (default)",
        args: {},
        expectedStatus: "success",
      },
      {
        name: "Get latest 3 vendors (custom limit)",
        args: { limit: 3 },
        expectedStatus: "success",
      },
      {
        name: "Get latest 10 vendors",
        args: { limit: 10 },
        expectedStatus: "success",
      },
    ],
  },
];

async function main() {
  const result = await runAllToolTests(VENDOR_TESTS);
  
  // Exit with error code if not all tests passed
  if (result.overallPassRate < 100) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("\n❌ Fatal error:", error.message);
  process.exit(1);
});
