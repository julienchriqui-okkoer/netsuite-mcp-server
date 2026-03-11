#!/usr/bin/env node
import "dotenv/config";
import crypto from "crypto";

const ACCOUNT_ID = process.env.NETSUITE_ACCOUNT_ID;
const CONSUMER_KEY = process.env.NETSUITE_CONSUMER_KEY;
const CONSUMER_SECRET = process.env.NETSUITE_CONSUMER_SECRET;
const TOKEN_ID = process.env.NETSUITE_TOKEN_ID;
const TOKEN_SECRET = process.env.NETSUITE_TOKEN_SECRET;

function generateOAuthSignature(method, url, params) {
  const paramString = Object.keys(params)
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
    .join("&");

  const baseString = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(paramString),
  ].join("&");

  const signingKey = `${encodeURIComponent(CONSUMER_SECRET)}&${encodeURIComponent(TOKEN_SECRET)}`;
  const signature = crypto.createHmac("sha256", signingKey).update(baseString).digest("base64");

  return signature;
}

function buildAuthHeader(method, url) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomBytes(16).toString("hex");

  const oauthParams = {
    oauth_consumer_key: CONSUMER_KEY,
    oauth_token: TOKEN_ID,
    oauth_signature_method: "HMAC-SHA256",
    oauth_timestamp: timestamp,
    oauth_nonce: nonce,
    oauth_version: "1.0",
  };

  const signature = generateOAuthSignature(method, url, oauthParams);
  oauthParams.oauth_signature = signature;

  const authHeader =
    "OAuth " +
    Object.keys(oauthParams)
      .map((k) => `${k}="${encodeURIComponent(oauthParams[k])}"`)
      .join(", ") +
    `, realm="${ACCOUNT_ID}"`;

  return authHeader;
}

async function testEndpoint(description, method, path, queryParams = {}) {
  console.log(`\n🧪 ${description}`);
  console.log("=".repeat(60));

  const baseUrl = `https://${ACCOUNT_ID}.suitetalk.api.netsuite.com/services/rest/record/v1`;
  const queryString = Object.keys(queryParams).length > 0 
    ? "?" + Object.entries(queryParams).map(([k, v]) => `${k}=${v}`).join("&")
    : "";
  const fullUrl = `${baseUrl}${path}${queryString}`;
  
  console.log(`Method: ${method}`);
  console.log(`URL: ${fullUrl}`);

  try {
    const authHeader = buildAuthHeader(method, fullUrl);
    
    const response = await fetch(fullUrl, {
      method,
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    console.log(`Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log("✅ Success!");
      console.log("Response sample:", JSON.stringify(data).substring(0, 200) + "...");
      return true;
    } else {
      const errorText = await response.text();
      console.log("❌ Failed!");
      console.log("Error:", errorText.substring(0, 300));
      return false;
    }
  } catch (error) {
    console.log("❌ Exception:", error.message);
    return false;
  }
}

async function main() {
  console.log("🔍 NetSuite Direct API Tests");
  console.log("=".repeat(60));
  console.log(`Account: ${ACCOUNT_ID}`);
  console.log("");

  const tests = [
    // Test 1: Liste vendors (on sait que ça marche)
    { 
      name: "GET /vendor (list) - BASELINE", 
      method: "GET", 
      path: "/vendor",
      params: { limit: 5 }
    },
    
    // Test 2: Single vendor by ID (basic)
    { 
      name: "GET /vendor/134775 (no params)", 
      method: "GET", 
      path: "/vendor/134775",
      params: {}
    },
    
    // Test 3: Single vendor with expandSubResources
    { 
      name: "GET /vendor/134775?expandSubResources=true", 
      method: "GET", 
      path: "/vendor/134775",
      params: { expandSubResources: "true" }
    },
    
    // Test 4: Try with a different ID
    { 
      name: "GET /vendor/120369 (different ID)", 
      method: "GET", 
      path: "/vendor/120369",
      params: {}
    },
    
    // Test 5: Try currency (usually less restrictive)
    { 
      name: "GET /currency/1 (reference data)", 
      method: "GET", 
      path: "/currency/1",
      params: {}
    },
  ];

  let successCount = 0;
  let failCount = 0;

  for (const test of tests) {
    const success = await testEndpoint(test.name, test.method, test.path, test.params);
    if (success) successCount++;
    else failCount++;
    
    // Wait to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log("\n" + "=".repeat(60));
  console.log(`✅ Success: ${successCount} / ${tests.length}`);
  console.log(`❌ Failed: ${failCount} / ${tests.length}`);
  
  console.log("\n💡 DIAGNOSTIC:");
  if (successCount === 1 && failCount === 4) {
    console.log("Seul GET /vendor (liste) fonctionne.");
    console.log("Causes possibles:");
    console.log("  1. Record Level Permissions: le rôle peut lister mais pas voir les détails");
    console.log("  2. Field Level Security: certains champs sont restreints");
    console.log("  3. REST Web Services: niveau insuffisant pour GET by ID");
    console.log("  4. API Version: peut-être que v1 ne supporte pas GET by ID sur vendor");
  }
}

main().catch(console.error);
