/**
 * NetSuite account IDs for bank fees flow (journal entries).
 * Resolve IDs via netsuite_get_accounts or Setup → Accounting → Chart of Accounts.
 */
export const ACCOUNTS = {
  bankFees:       { id: "371",   code: "627800", name: "Services bancaires" },
  fxLoss:         { id: "TO_CONFIRM", code: "656000", name: "Pertes de change" },
  fxGain:         { id: "TO_CONFIRM", code: "766000", name: "Gains de change" },
  spendeskWallet: { id: "TO_CONFIRM", code: "58xxxx", name: "Compte Spendesk (virement interne)" },
  bankAccount:    { id: "1812",  code: "512451", name: "SPENDESK SAS PROD FS" },
  ap:             { id: "TO_CONFIRM", code: "401000", name: "Fournisseurs" },
} as const;
