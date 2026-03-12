#!/usr/bin/env node
import "dotenv/config";
import crypto from "crypto";
import fs from "fs";

const ACCOUNT_ID = process.env.NETSUITE_ACCOUNT_ID;
const CONSUMER_KEY = process.env.NETSUITE_CONSUMER_KEY;
const CONSUMER_SECRET = process.env.NETSUITE_CONSUMER_SECRET;
const TOKEN_ID = process.env.NETSUITE_TOKEN_ID;
const TOKEN_SECRET = process.env.NETSUITE_TOKEN_SECRET;

function rfc3986Encode(value) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
}

function generateOAuthSignature(method, url, params) {
  const paramString = Object.keys(params)
    .sort()
    .map((k) => `${rfc3986Encode(k)}=${rfc3986Encode(params[k])}`)
    .join("&");

  const baseString = [
    method.toUpperCase(),
    rfc3986Encode(url),
    rfc3986Encode(paramString),
  ].join("&");

  const signingKey = `${rfc3986Encode(CONSUMER_SECRET)}&${rfc3986Encode(TOKEN_SECRET)}`;
  const signature = crypto.createHmac("sha256", signingKey).update(baseString).digest("base64");

  return signature;
}

function buildAuthHeader(method, url, queryParams = {}) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomBytes(16).toString("hex");

  const oauthParams = {
    oauth_consumer_key: CONSUMER_KEY,
    oauth_token: TOKEN_ID,
    oauth_signature_method: "HMAC-SHA256",
    oauth_timestamp: timestamp,
    oauth_nonce: nonce,
    oauth_version: "1.0",
    ...queryParams,
  };

  const signature = generateOAuthSignature(method, url, oauthParams);
  
  const headerParams = {
    realm: ACCOUNT_ID,
    oauth_consumer_key: CONSUMER_KEY,
    oauth_token: TOKEN_ID,
    oauth_signature_method: "HMAC-SHA256",
    oauth_timestamp: timestamp,
    oauth_nonce: nonce,
    oauth_version: "1.0",
    oauth_signature: signature,
  };

  const authHeader = "OAuth " + Object.entries(headerParams)
    .map(([k, v]) => `${rfc3986Encode(k)}="${rfc3986Encode(v)}"`)
    .join(", ");

  return authHeader;
}

async function testEndpoint(test) {
  const { category, name, method, path, queryParams = {}, body = null, headers = {} } = test;
  
  const baseUrl = `https://${ACCOUNT_ID.toLowerCase().replace("_", "-")}.suitetalk.api.netsuite.com/services/rest`;
  const queryString = Object.keys(queryParams).length > 0 
    ? "?" + Object.entries(queryParams).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&")
    : "";
  const fullUrl = `${baseUrl}${path}${queryString}`;
  const urlForAuth = `${baseUrl}${path}`;
  
  const authHeader = buildAuthHeader(method, urlForAuth, queryParams);
  
  const requestHeaders = {
    "Authorization": authHeader,
    "Content-Type": "application/json",
    "Accept": "application/json",
    ...headers,
  };

  try {
    const startTime = Date.now();
    const response = await fetch(fullUrl, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });
    const elapsed = Date.now() - startTime;

    const responseText = await response.text();
    let responseData;
    try {
      responseData = responseText ? JSON.parse(responseText) : null;
    } catch {
      responseData = responseText;
    }

    return {
      category,
      name,
      method,
      path,
      status: response.status,
      statusText: response.statusText,
      success: response.ok,
      elapsed,
      headers: {
        request: requestHeaders,
        response: Object.fromEntries(response.headers.entries()),
      },
      response: responseData,
    };
  } catch (error) {
    return {
      category,
      name,
      method,
      path,
      status: 0,
      statusText: "FAILED",
      success: false,
      error: error.message,
    };
  }
}

const API_TESTS = [
  // ============================================
  // VENDORS
  // ============================================
  {
    category: "Vendors",
    name: "List Vendors (basic)",
    method: "GET",
    path: "/record/v1/vendor",
    queryParams: { limit: 5 },
  },
  {
    category: "Vendors",
    name: "List Vendors (with offset)",
    method: "GET",
    path: "/record/v1/vendor",
    queryParams: { limit: 5, offset: 10 },
  },
  {
    category: "Vendors",
    name: "Get Vendor by ID",
    method: "GET",
    path: "/record/v1/vendor/134775",
  },
  {
    category: "Vendors",
    name: "Get Vendor by ID (expandSubResources)",
    method: "GET",
    path: "/record/v1/vendor/134775",
    queryParams: { expandSubResources: "true" },
  },
  
  // ============================================
  // VENDOR BILLS
  // ============================================
  {
    category: "Vendor Bills",
    name: "List Vendor Bills",
    method: "GET",
    path: "/record/v1/vendorBill",
    queryParams: { limit: 5 },
  },
  {
    category: "Vendor Bills",
    name: "Get Vendor Bill by ID",
    method: "GET",
    path: "/record/v1/vendorBill/999999", // Fake ID to test endpoint
    queryParams: { expandSubResources: "true" },
  },
  
  // ============================================
  // EMPLOYEES
  // ============================================
  {
    category: "Employees",
    name: "List Employees",
    method: "GET",
    path: "/record/v1/employee",
    queryParams: { limit: 5 },
  },
  {
    category: "Employees",
    name: "Get Employee by ID",
    method: "GET",
    path: "/record/v1/employee/999999", // Fake ID
  },
  
  // ============================================
  // EXPENSE REPORTS
  // ============================================
  {
    category: "Expense Reports",
    name: "List Expense Reports",
    method: "GET",
    path: "/record/v1/expenseReport",
    queryParams: { limit: 5 },
  },
  {
    category: "Expense Reports",
    name: "Get Expense Report by ID",
    method: "GET",
    path: "/record/v1/expenseReport/999999",
  },
  
  // ============================================
  // PAYMENTS
  // ============================================
  {
    category: "Payments",
    name: "List Vendor Payments",
    method: "GET",
    path: "/record/v1/vendorPayment",
    queryParams: { limit: 5 },
  },
  
  // ============================================
  // VENDOR CREDITS
  // ============================================
  {
    category: "Vendor Credits",
    name: "List Vendor Credits",
    method: "GET",
    path: "/record/v1/vendorCredit",
    queryParams: { limit: 5 },
  },
  
  // ============================================
  // JOURNAL ENTRIES
  // ============================================
  {
    category: "Journal Entries",
    name: "List Journal Entries",
    method: "GET",
    path: "/record/v1/journalEntry",
    queryParams: { limit: 5 },
  },
  
  // ============================================
  // REFERENCE DATA
  // ============================================
  {
    category: "Reference - Accounts",
    name: "List Accounts",
    method: "GET",
    path: "/record/v1/account",
    queryParams: { limit: 10 },
  },
  {
    category: "Reference - Departments",
    name: "List Departments",
    method: "GET",
    path: "/record/v1/department",
    queryParams: { limit: 10 },
  },
  {
    category: "Reference - Subsidiaries",
    name: "List Subsidiaries",
    method: "GET",
    path: "/record/v1/subsidiary",
    queryParams: { limit: 10 },
  },
  {
    category: "Reference - Tax Codes",
    name: "List Sales Tax Items",
    method: "GET",
    path: "/record/v1/salestaxitem",
    queryParams: { limit: 10 },
  },
  {
    category: "Reference - Currencies",
    name: "List Currencies",
    method: "GET",
    path: "/record/v1/currency",
    queryParams: { limit: 10 },
  },
  {
    category: "Reference - Locations",
    name: "List Locations",
    method: "GET",
    path: "/record/v1/location",
    queryParams: { limit: 10 },
  },
  {
    category: "Reference - Classifications",
    name: "List Classifications",
    method: "GET",
    path: "/record/v1/classification",
    queryParams: { limit: 10 },
  },
  
  // ============================================
  // SUITEQL (with corrected syntax)
  // ============================================
  {
    category: "SuiteQL",
    name: "Execute SuiteQL Query (FETCH FIRST syntax)",
    method: "POST",
    path: "/query/v1/suiteql",
    headers: { "Prefer": "transient" },
    body: { q: "SELECT id, companyName FROM vendor WHERE id < 100 FETCH FIRST 5 ROWS ONLY" },
  },
  
  // ============================================
  // FILE CABINET (corrected)
  // ============================================
  {
    category: "File Cabinet",
    name: "List Files",
    method: "GET",
    path: "/record/v1/file",
    queryParams: { limit: 5 },
  },
];

async function runAllTests() {
  console.log("🧪 NetSuite REST API - Endpoint Permission & Parameter Test");
  console.log("=".repeat(80));
  console.log(`Account: ${ACCOUNT_ID}`);
  console.log(`Base URL: https://${ACCOUNT_ID.toLowerCase().replace("_", "-")}.suitetalk.api.netsuite.com`);
  console.log(`Total Tests: ${API_TESTS.length}`);
  console.log("");

  const results = [];
  const categories = {};

  for (const test of API_TESTS) {
    process.stdout.write(`Testing: ${test.category} - ${test.name}...`);
    const result = await testEndpoint(test);
    results.push(result);
    
    if (!categories[result.category]) {
      categories[result.category] = { total: 0, success: 0, failed: 0 };
    }
    categories[result.category].total++;
    if (result.success) {
      categories[result.category].success++;
      console.log(` ✅ ${result.status}`);
    } else {
      categories[result.category].failed++;
      console.log(` ❌ ${result.status} ${result.statusText}`);
    }
    
    // Rate limiting: wait 500ms between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Generate Report
  console.log("\n" + "=".repeat(80));
  console.log("📊 SUMMARY BY CATEGORY");
  console.log("=".repeat(80));
  
  Object.entries(categories).forEach(([category, stats]) => {
    const successRate = ((stats.success / stats.total) * 100).toFixed(1);
    console.log(`\n${category}:`);
    console.log(`  Total: ${stats.total} | Success: ${stats.success} | Failed: ${stats.failed} | Rate: ${successRate}%`);
  });

  // Detailed Failures
  const failures = results.filter(r => !r.success);
  if (failures.length > 0) {
    console.log("\n" + "=".repeat(80));
    console.log("❌ FAILED TESTS (Detailed)");
    console.log("=".repeat(80));
    
    failures.forEach(failure => {
      console.log(`\n${failure.category} - ${failure.name}`);
      console.log(`  Method: ${failure.method} ${failure.path}`);
      console.log(`  Status: ${failure.status} ${failure.statusText}`);
      if (failure.error) {
        console.log(`  Error: ${failure.error}`);
      }
      if (failure.response) {
        const errorDetail = failure.response?.["o:errorDetails"]?.[0]?.detail || 
                           failure.response?.detail || 
                           failure.response?.message || 
                           JSON.stringify(failure.response).substring(0, 200);
        console.log(`  Details: ${errorDetail}`);
      }
    });
  }

  // Success Summary
  const successes = results.filter(r => r.success);
  console.log("\n" + "=".repeat(80));
  console.log("✅ SUCCESSFUL TESTS");
  console.log("=".repeat(80));
  console.log(`Total: ${successes.length}/${results.length}`);
  
  // Save full report to file
  const report = {
    timestamp: new Date().toISOString(),
    account: ACCOUNT_ID,
    summary: {
      total: results.length,
      success: successes.length,
      failed: failures.length,
      successRate: ((successes.length / results.length) * 100).toFixed(2) + "%",
    },
    categories,
    results,
  };

  const reportPath = "./NETSUITE_API_TEST_REPORT.json";
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Full report saved to: ${reportPath}`);

  // Generate Markdown Report
  const mdReport = generateMarkdownReport(report, failures, successes);
  const mdPath = "./NETSUITE_API_TEST_REPORT.md";
  fs.writeFileSync(mdPath, mdReport);
  console.log(`📄 Markdown report saved to: ${mdPath}`);
}

function generateMarkdownReport(report, failures, successes) {
  let md = `# NetSuite REST API - Test Report\n\n`;
  md += `**Date**: ${new Date(report.timestamp).toLocaleString()}\n`;
  md += `**Account**: ${report.account}\n`;
  md += `**Success Rate**: ${report.summary.successRate} (${report.summary.success}/${report.summary.total})\n\n`;

  md += `## 📊 Summary by Category\n\n`;
  md += `| Category | Total | Success | Failed | Rate |\n`;
  md += `|----------|-------|---------|--------|------|\n`;
  
  Object.entries(report.categories).forEach(([category, stats]) => {
    const rate = ((stats.success / stats.total) * 100).toFixed(1) + "%";
    md += `| ${category} | ${stats.total} | ${stats.success} | ${stats.failed} | ${rate} |\n`;
  });

  if (failures.length > 0) {
    md += `\n## ❌ Failed Tests (${failures.length})\n\n`;
    failures.forEach((failure, idx) => {
      md += `### ${idx + 1}. ${failure.category} - ${failure.name}\n\n`;
      md += `- **Method**: \`${failure.method} ${failure.path}\`\n`;
      md += `- **Status**: ${failure.status} ${failure.statusText}\n`;
      if (failure.error) {
        md += `- **Error**: ${failure.error}\n`;
      }
      if (failure.response) {
        const errorDetail = failure.response?.["o:errorDetails"]?.[0]?.detail || 
                           failure.response?.detail || 
                           failure.response?.message || 
                           "See full JSON report";
        md += `- **Details**: ${errorDetail}\n`;
      }
      md += `\n`;
    });
  }

  md += `## ✅ Successful Tests (${successes.length})\n\n`;
  md += `| Category | Test Name | Status | Time (ms) |\n`;
  md += `|----------|-----------|--------|----------|\n`;
  successes.forEach(success => {
    md += `| ${success.category} | ${success.name} | ${success.status} | ${success.elapsed || 'N/A'} |\n`;
  });

  md += `\n## 🔧 Recommendations\n\n`;
  if (failures.length === 0) {
    md += `✅ All endpoints are working correctly! No issues found.\n`;
  } else {
    md += `### Issues Found\n\n`;
    failures.forEach((failure, idx) => {
      md += `${idx + 1}. **${failure.category} - ${failure.name}**: `;
      if (failure.status === 403) {
        md += `Permission issue - check role permissions for this record type.\n`;
      } else if (failure.status === 404) {
        md += `Endpoint not found or record doesn't exist.\n`;
      } else if (failure.status === 400) {
        md += `Bad request - check parameters and headers.\n`;
      } else {
        md += `Investigate error details.\n`;
      }
    });
  }

  return md;
}

runAllTests().catch(console.error);
