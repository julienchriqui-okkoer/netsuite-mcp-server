/**
 * Map Spendesk costCenter ID/name → NetSuite department ID for vendor bill expense lines.
 * Resolve department IDs via netsuite_get_departments. If costCenter not in map, omit department (NS accepts null).
 */
export const COST_CENTER_MAP: Record<
  string,
  { netsuiteDeptId: string }
> = {
  // Example: "marketing": { netsuiteDeptId: "41" },
  // "engineering": { netsuiteDeptId: "47" },
};
