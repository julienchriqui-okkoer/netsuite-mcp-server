/**
 * Configuration for enabling/disabling MCP tools
 * 
 * Set a tool to `false` to temporarily disable it if it's broken.
 * This allows us to keep the server stable while debugging specific tools.
 */

export const TOOLS_CONFIG = {
  // ✅ WORKING TOOLS
  vendors: {
    netsuite_get_vendors: true,
    netsuite_get_vendor_by_id: true, // ✅ FIXED - Added inputSchema
    netsuite_get_latest_vendors: true,
    netsuite_get_vendor_forms: true, // ✅ NEW - Get available custom forms
    netsuite_create_vendor: true,
    netsuite_update_vendor: true,
    netsuite_get_vendor_by_external_id: true,
    netsuite_search_vendors_by_name: true,
  },
  
  vendorBills: {
    netsuite_get_vendor_bills: true,
    netsuite_get_vendor_bill: true,
    netsuite_get_vendor_bill_by_external_id: true,
    netsuite_get_vendor_bills_for_vendor: true,
    netsuite_create_vendor_bill: true,
    netsuite_update_vendor_bill: true,
  },
  
  reference: {
    netsuite_get_accounts: true,
    netsuite_get_departments: true,
    netsuite_get_subsidiaries: true,
    netsuite_get_tax_codes: true,
    netsuite_get_currencies: true,
    netsuite_get_locations: true,
    netsuite_get_classifications: true,
    netsuite_get_bank_accounts_by_subsidiary: true,
  },
  
  journalEntries: {
    netsuite_get_journal_entries: true,
    netsuite_get_journal_entry_by_external_id: true,
    netsuite_create_journal_entry: true,
    netsuite_get_journal_entry: true,
  },
  
  employees: {
    netsuite_get_employees: true,
    netsuite_get_employee: true, // ✅ FIXED - Added inputSchema
  },
  
  expenseReports: {
    netsuite_get_expense_reports: true,
    netsuite_create_expense_report: true,
  },
  
  billPayments: {
    netsuite_get_bill_payments: true,
    netsuite_get_bill_payment: true,
    netsuite_create_bill_payment: true,
  },
  
  vendorCredits: {
    netsuite_get_vendor_credits: true,
    netsuite_create_vendor_credit: true,
  },
  
  fileCabinet: {
    netsuite_list_files: false, // ❌ DISABLED - API not available in instance
    netsuite_upload_file: false, // Enable when File Cabinet API is available (attach invoice PDF to bill)
    netsuite_attach_file_to_record: false, // Enable with netsuite_upload_file
  },
  
  suiteql: {
    netsuite_execute_suiteql: true,
  },
} as const;

/**
 * Helper to check if a tool is enabled
 */
export function isToolEnabled(category: keyof typeof TOOLS_CONFIG, toolName: string): boolean {
  const categoryConfig = TOOLS_CONFIG[category];
  if (!categoryConfig) return false;
  
  return (categoryConfig as any)[toolName] === true;
}
