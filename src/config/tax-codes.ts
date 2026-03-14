/**
 * NetSuite tax code ID lookup by rate (for Spendesk payables VAT mapping).
 * Resolve actual IDs in NetSuite: Setup → Accounting → Tax Codes.
 */
export const TAX_CODES: Record<
  string,
  { id: string; name: string }
> = {
  "0.20": { id: "TO_CONFIRM", name: "TVA 20%" },
  "0.10": { id: "TO_CONFIRM", name: "TVA 10%" },
  "0.055": { id: "TO_CONFIRM", name: "TVA 5.5%" },
  "0.00": { id: "TO_CONFIRM", name: "Exonéré / Hors champ" },
};
