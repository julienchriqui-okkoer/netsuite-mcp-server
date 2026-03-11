import "dotenv/config";
import { NetSuiteClient } from "../dist/netsuite-client.js";

async function main() {
  const {
    NETSUITE_ACCOUNT_ID,
    NETSUITE_CONSUMER_KEY,
    NETSUITE_CONSUMER_SECRET,
    NETSUITE_TOKEN_ID,
    NETSUITE_TOKEN_SECRET,
  } = process.env;

  if (
    !NETSUITE_ACCOUNT_ID ||
    !NETSUITE_CONSUMER_KEY ||
    !NETSUITE_CONSUMER_SECRET ||
    !NETSUITE_TOKEN_ID ||
    !NETSUITE_TOKEN_SECRET
  ) {
    console.error(
      "Missing NetSuite env vars. Please set NETSUITE_ACCOUNT_ID, NETSUITE_CONSUMER_KEY, NETSUITE_CONSUMER_SECRET, NETSUITE_TOKEN_ID, NETSUITE_TOKEN_SECRET."
    );
    process.exit(1);
  }

  const client = new NetSuiteClient({
    accountId: NETSUITE_ACCOUNT_ID,
    consumerKey: NETSUITE_CONSUMER_KEY,
    consumerSecret: NETSUITE_CONSUMER_SECRET,
    tokenId: NETSUITE_TOKEN_ID,
    tokenSecret: NETSUITE_TOKEN_SECRET,
  });

  try {
    const vendors = await client.get("/vendor", { limit: "5", offset: "0" });
    console.log(JSON.stringify(vendors, null, 2));
    console.error("✓ NetSuite vendors test passed.");
  } catch (err) {
    console.error("✗ NetSuite vendors test failed.");
    console.error(err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

