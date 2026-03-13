/**
 * Default bank account ID per subsidiary when SuiteQL is not available.
 * Populate from NetSuite UI or after first successful SuiteQL discovery.
 * Used by netsuite_get_bank_accounts_by_subsidiary (fallback) and netsuite_create_bill_payment.
 */
export const SUBSIDIARY_DEFAULT_BANK_ACCOUNTS: Record<string, string> = {
  // Example: "1": "857",   // SPENDESK SAS
  // "2": "308",            // SPENDESK GmbH
};
