#!/usr/bin/env node
/**
 * Test direct: Create Vendor avec NetSuiteClient
 * Ce script teste si on a les permissions pour créer un vendor
 */

import dotenv from "dotenv";
import { NetSuiteClient } from "../dist/netsuite-client.js";

dotenv.config();

async function testCreateVendor() {
  console.log("🔍 Test Manual: Create Vendor NetSuite");
  console.log("========================================");
  console.log("");

  // Check environment variables
  if (!process.env.NETSUITE_ACCOUNT_ID) {
    console.log("❌ Erreur: Variables d'environnement non chargées");
    console.log("   Vérifie que le fichier .env existe");
    process.exit(1);
  }

  // Initialize NetSuite client
  const client = new NetSuiteClient(
    process.env.NETSUITE_ACCOUNT_ID,
    process.env.NETSUITE_CONSUMER_KEY,
    process.env.NETSUITE_CONSUMER_SECRET,
    process.env.NETSUITE_TOKEN_ID,
    process.env.NETSUITE_TOKEN_SECRET
  );

  console.log("✅ NetSuite Client initialized");
  console.log(`   Account: ${process.env.NETSUITE_ACCOUNT_ID}`);
  console.log("");

  // Test 1: Get subsidiary first
  console.log("📝 Step 1: Get subsidiary ID...");
  try {
    const subsidiaries = await client.get("/subsidiary", { limit: "1" });
    const subsidiaryId = subsidiaries.items?.[0]?.id;
    console.log(`✅ Got subsidiary ID: ${subsidiaryId}`);
    console.log("");

    // Test 2: Create vendor with MINIMAL fields
    console.log("🧪 Step 2: Create Vendor avec champs MINIMAUX");
    console.log("   Body: { companyName, subsidiary }");
    console.log("");

    const vendorData = {
      companyName: `Test Direct ${Date.now()}`,
      subsidiary: { id: subsidiaryId },
    };

    console.log("📤 Sending request to NetSuite...");
    const result = await client.post("/vendor", vendorData);

    console.log("");
    console.log("📥 Réponse NetSuite:");
    console.log("====================");
    console.log(JSON.stringify(result, null, 2));
    console.log("");

    if (result.id) {
      console.log("✅ SUCCESS! Vendor créé avec succès");
      console.log(`   Vendor ID: ${result.id}`);
      console.log("");
      console.log("➡️  Les permissions NetSuite sont OK pour créer des vendors");
      console.log("➡️  Le problème est donc au niveau du MCP SDK / Dust");
      console.log("");
      console.log("💡 Solutions possibles:");
      console.log("   1. Tester directement dans Dust (l'environnement est différent)");
      console.log("   2. Vérifier les logs Railway pour voir les paramètres reçus");
      console.log("   3. Simplifier encore plus le tool (moins de paramètres)");
    }
  } catch (error) {
    console.log("");
    console.log("❌ ERREUR:");
    console.log("==========");
    console.log(error.message);
    console.log("");

    if (error.message.includes("INSUFFICIENT_PERMISSION")) {
      console.log("➡️  Tu n'as PAS la permission de créer des vendors");
      console.log("➡️  Solution: Demande à l'admin NetSuite d'activer:");
      console.log("     - Setup > Users/Roles > User Management");
      console.log("     - Ton rôle > Lists > Vendors > Create permission");
    } else if (error.message.includes("INVALID_LOGIN")) {
      console.log("➡️  Problème d'authentification OAuth");
      console.log("➡️  Vérifie tes credentials NetSuite dans .env");
    } else if (error.message.includes("REQUIRED_FIELD_MISSING")) {
      console.log("➡️  Champs requis manquants");
      console.log("➡️  NetSuite nécessite peut-être plus de champs que companyName + subsidiary");
    } else {
      console.log("➡️  Erreur NetSuite inattendue");
      console.log("➡️  Vérifie le message ci-dessus");
    }
  }

  console.log("");
  console.log("========================================");
  console.log("🏁 Test terminé");
}

testCreateVendor().catch((error) => {
  console.error("💥 Fatal error:", error);
  process.exit(1);
});
