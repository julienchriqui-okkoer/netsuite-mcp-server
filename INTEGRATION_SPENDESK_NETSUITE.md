# 🔗 Intégration Spendesk × NetSuite - Tools MCP Disponibles

**Date:** 2026-03-11  
**Status:** ✅ Ready for Integration

---

## 📦 Tools Disponibles (30 tools)

### 🏢 1. VENDORS (Suppliers) - 5 tools

| Tool | Action | Status | Use Case |
|------|--------|--------|----------|
| `netsuite_get_vendors` | List | ✅ | Rechercher vendors existants |
| `netsuite_get_latest_vendors` | List | ✅ | Sync périodique NetSuite → Spendesk |
| `netsuite_create_vendor` | Create | ✅ **NEW** | Créer supplier Spendesk → NetSuite |
| `netsuite_update_vendor` | Update | ✅ **NEW** | Mettre à jour supplier existant |
| `netsuite_get_vendor_by_id` | Get | ⚠️ Disabled | Bug MCP SDK (workaround via get_vendors) |

**Champs supportés pour create/update :**
- ✅ Identification: `companyName`, `entityId`, `legalName`, `externalId`
- ✅ Contact: `email`, `phone`, `defaultAddress`
- ✅ Financial: `currency`, `vatRegNumber`, `terms`, `accountNumber`
- ✅ Analytics: `department`, `location`, `class`, `category`
- ✅ Status: `isPerson`, `isInactive`, `memo`
- ❌ Custom fields: Non supportés (IBAN, SWIFT, etc.)

---

### 💰 2. VENDOR BILLS (Factures) - 4 tools

| Tool | Action | Status | Use Case |
|------|--------|--------|----------|
| `netsuite_get_vendor_bills` | List | ✅ | Lister factures |
| `netsuite_get_vendor_bill` | Get | ✅ | Récupérer détails facture |
| `netsuite_create_vendor_bill` | Create | ✅ | Créer invoice Spendesk → NetSuite |
| `netsuite_update_vendor_bill` | Update | ✅ | Mettre à jour statut/memo |

**Champs supportés pour create :**
- ✅ Header: `entity`, `subsidiary`, `tranDate`, `dueDate`, `tranId`, `memo`, `currency`, `exchangeRate`, `externalId`
- ✅ Lines (`expense` array): Required: `account`, `amount` (NET when VAT); Analytics: `department`, `location`, `class`; Optional: `memo`, `taxCode`
- ✅ **VAT** : `vatLines` (array of `{ taxCodeId, taxRate, vatAmount, netAmount }`) — updates tax authority ledger; use NET amount on expense when VAT present

---

### 💳 3. BILL PAYMENTS (Paiements) - 1 tool

| Tool | Action | Status | Use Case |
|------|--------|--------|----------|
| `netsuite_create_bill_payment` | Create | ✅ | Enregistrer paiement Spendesk → NetSuite |

**Champs supportés :**
- ✅ Required: `entity`, `account`, `tranDate`
- ✅ Optional: `externalId`, `memo`, `currency`, `exchangeRate`
- ✅ Apply to bills: `applyList` (array avec `doc`, `apply`, `amount`)

---

### 📊 4. REFERENCE DATA (Données de référence) - 7 tools

| Tool | Data | Status | Use Case |
|------|------|--------|----------|
| `netsuite_get_accounts` | Comptes comptables | ✅ | Mapper expense categories |
| `netsuite_get_departments` | Départements | ✅ | Analytique departement |
| `netsuite_get_subsidiaries` | Filiales | ✅ | Subsidiaries |
| `netsuite_get_tax_codes` | Codes TVA | ✅ | Mapper tax rates |
| `netsuite_get_currencies` | Devises | ✅ | Mapper currency codes |
| `netsuite_get_locations` | Localisations | ✅ | Analytique location |
| `netsuite_get_classifications` | Classes | ✅ | Analytique class |

---

### 👥 5. EMPLOYEES (Employés) - 2 tools

| Tool | Action | Status | Use Case |
|------|--------|--------|----------|
| `netsuite_get_employees` | List | ✅ | Mapper Spendesk Members → NetSuite |
| `netsuite_get_employee` | Get | ⚠️ Disabled | Bug MCP SDK |

---

### 💼 6. EXPENSE REPORTS (Notes de frais) - 2 tools

| Tool | Action | Status | Use Case |
|------|--------|--------|----------|
| `netsuite_get_expense_reports` | List | ✅ | Lister expense reports |
| `netsuite_create_expense_report` | Create | ✅ | Créer expense Spendesk → NetSuite |

**Champs supportés :**
- ✅ Header: `employee`, `subsidiary`, `tranDate`, `memo`, `externalId`
- ✅ Lines: `expenseDate`, `account`, `amount`, `taxCode`, `department`, `location`, `class`, `currency`

---

### 🧾 7. VENDOR CREDITS (Avoirs) - 2 tools

| Tool | Action | Status | Use Case |
|------|--------|--------|----------|
| `netsuite_get_vendor_credits` | List | ✅ | Lister avoirs |
| `netsuite_create_vendor_credit` | Create | ✅ | Créer avoir (Spendesk credit notes / refunds) |

**Champs supportés pour create :** `entity`, `subsidiary`, `tranDate`, `memo`, `externalId` (idempotence), `expenseList` (items: account, amount, department, memo), `applyList` (items: doc, apply, amount) pour appliquer l’avoir à une facture existante.

---

### 📖 8. JOURNAL ENTRIES (Écritures) - 2 tools

| Tool | Action | Status | Use Case |
|------|--------|--------|----------|
| `netsuite_get_journal_entries` | List | ✅ | Lister écritures |
| `netsuite_create_journal_entry` | Create | ✅ | Créer écriture manuelle |

---

### 🗂️ 9. FILE CABINET (Fichiers) - 3 tools

| Tool | Action | Status | Use Case |
|------|--------|--------|----------|
| `netsuite_list_files` | List | ⚠️ Disabled | API non disponible |
| `netsuite_upload_file` | Upload | ⚠️ Disabled | API non disponible |
| `netsuite_attach_file_to_record` | Attach | ⚠️ Disabled | API non disponible |

---

### 🔍 10. SUITEQL (Requêtes SQL) - 1 tool

| Tool | Action | Status | Use Case |
|------|--------|--------|----------|
| `netsuite_execute_suiteql` | Query | ✅ | Requêtes SQL personnalisées |

⚠️ **Note:** Nécessite les permissions SuiteQL dans NetSuite

---

## 🚀 Flows d'Intégration Spendesk × NetSuite

### Flow 1️⃣ : Sync Suppliers (Spendesk → NetSuite)

**Objectif :** Créer/mettre à jour les vendors NetSuite depuis Spendesk

```
1. GET Spendesk API /suppliers
2. Pour chaque supplier:
   a. Récupérer reference data NetSuite (currencies, departments, subsidiaries)
   b. Mapper les champs (voir SPENDESK_NETSUITE_VENDOR_MAPPING.md)
   c. Vérifier si existe: netsuite_get_vendors(q: externalId)
   d. Si existe: netsuite_update_vendor
      Sinon: netsuite_create_vendor
```

**Tools utilisés :**
- `netsuite_get_currencies`
- `netsuite_get_departments`
- `netsuite_get_subsidiaries`
- `netsuite_get_vendors` (recherche)
- `netsuite_create_vendor` ⭐
- `netsuite_update_vendor` ⭐

---

### Flow 2️⃣ : Create Vendor Bills / Credits (Spendesk Payables → NetSuite)

**Objectif :** Créer les factures fournisseurs ou avoirs selon le type de payable

**Step 2b — Route by payable type (for Dust system prompt):**
- If `payable.type == "creditNote"`:
  - Create vendor **credit** (not bill) → `netsuite_create_vendor_credit`
  - `externalId`: `"spk_payable_<payableId>"`
  - Expense amount: `abs(payable.netAmount / 100)` (credit notes are negative in Spendesk)
  - If you can find the original bill via `payable.originalPayableId` (e.g. `netsuite_get_vendor_bill_by_external_id("spk_payable_<originalPayableId>")`), add it to `applyList` to offset the original bill
  - Log as "credit note" in report
- If `payable.type` in `["invoicePurchase", "subscriptionCard", ...]`:
  - Normal bill flow (Steps 3–5 below)

```
1. GET Spendesk API /invoices or payables (status: approved)
2. Pour chaque payable:
   a. Step 2b: si creditNote → netsuite_create_vendor_credit; sinon continuer
   b. Vérifier si existe: netsuite_get_vendor_bills(q: externalId) ou get_vendor_credits
   c. Si n'existe pas (bills):
      - Mapper vendor: netsuite_get_vendors(q: externalId)
      - Mapper accounts: netsuite_get_accounts
      - Mapper tax codes: netsuite_get_tax_codes
      - Créer: netsuite_create_vendor_bill(
          entity: vendor.id,
          externalId: `spk_inv_${invoice.id}`,
          expense: [{ account, amount (NET si VAT), department, location, class, memo, taxCode }],
          vatLines: si payable.vatAmount > 0 → [{ taxCodeId, taxRate, vatAmount, netAmount }]
        )
```

**Step 4 — Bill creation — expense line + VAT (for Dust system prompt):**
- Expense line: `expense: [{ account: account.id, amount: payable.netAmount / 100, memo: "<category> — <costCenter>", department: CLIENT_CONFIG.COST_CENTER_MAP[payable.costCenter]?.netsuiteDeptId ?? undefined, location, class }]`. If department is TO_CONFIRM or costCenter not in COST_CENTER_MAP → omit department (NS accepts null). Log ⚠️ if costCenter not in COST_CENTER_MAP.
- If `payable.vatAmount > 0`:
  - `expense[0].amount` = `payable.netAmount / 100` (NET only)
  - Resolve `taxCodeId` from `CLIENT_CONFIG.TAX_CODES[payable.vatRate]` (or `netsuite_get_tax_codes`)
  - Pass `vatLines: [{ taxCodeId, taxRate, vatAmount: payable.vatAmount/100, netAmount: payable.netAmount/100 }]`
- If `payable.vatAmount == 0`:
  - `expense[0].amount` = `payable.grossAmount / 100` (no VAT)
  - Do not pass `vatLines`

**Step 5 — Attach invoice PDF to bill (after bill created successfully):**
- If payable has attachment:
  1. `spendesk_get_payable_attachments(payableId)` → if no attachment → skip silently.
  2. Download PDF: `fetch(attachment.url, { headers: { Authorization: "Bearer " + SPENDESK_API_KEY } })` → base64 encode.
  3. `netsuite_upload_file(name: "INV-<invoiceNumber>-<supplierName>.pdf", fileType: "PDF", content: base64Content, folder: CLIENT_CONFIG.NS_FILE_CABINET_FOLDER_ID)` → fileId.
  4. `netsuite_attach_file_to_record(recordType: "vendorBill", recordId: billId, fileId)`.
  5. Log "PDF attached ✅" or "No attachment ⚠️".

**CLIENT_CONFIG** (for Dust / agent):
- **TAX_CODES** (resolve IDs in NetSuite: Setup → Accounting → Tax Codes):
```json
{
  "0.20":  { "id": "TO_CONFIRM", "name": "TVA 20%" },
  "0.10":  { "id": "TO_CONFIRM", "name": "TVA 10%" },
  "0.055": { "id": "TO_CONFIRM", "name": "TVA 5.5%" },
  "0.00":  { "id": "TO_CONFIRM", "name": "Exonéré / Hors champ" }
}
```
- **NS_FILE_CABINET_FOLDER_ID**: `"TO_CONFIRM"` — NetSuite: Documents → Files → Accounting → folder Internal ID. Used when attaching invoice PDF to bill.
- **COST_CENTER_MAP**: `{ [costCenterId]: { netsuiteDeptId: "41" } }` — Map Spendesk costCenter → NetSuite department ID for expense line. See `src/config/cost-center-map.ts`.

See `src/config/tax-codes.ts`, `src/config/file-cabinet-config.ts`, `src/config/cost-center-map.ts` in the repo.

**Tools utilisés :**
- `netsuite_get_vendors` (find vendor)
- `netsuite_get_accounts` (expense accounts)
- `netsuite_get_tax_codes`
- `netsuite_get_departments`
- `netsuite_get_vendor_bills` / `netsuite_get_vendor_credits` (check existence)
- `netsuite_create_vendor_bill` ⭐ (invoices)
- `netsuite_create_vendor_credit` ⭐ (credit notes / refunds)
- `netsuite_get_vendor_bill_by_external_id` (find original bill for applyList)
- `netsuite_upload_file` (invoice PDF → File Cabinet; enable in tools-config when API available)
- `netsuite_attach_file_to_record` (attach file to vendorBill after upload)

---

### Flow 3️⃣ : Create Bill Payments (Spendesk Payments → NetSuite)

**Objectif :** Enregistrer les paiements dans NetSuite

```
1. GET Spendesk API /payments (status: paid)
2. Pour chaque payment:
   a. Trouver vendor bill: netsuite_get_vendor_bills(q: externalId)
   b. Récupérer bank account: netsuite_get_accounts(type: Bank)
   c. Créer payment: netsuite_create_bill_payment(
        entity: vendor.id,
        account: bankAccount.id,
        externalId: `spk_pay_${payment.id}`,
        applyList: { apply: [{ doc: bill.id, amount }] }
      )
```

**Tools utilisés :**
- `netsuite_get_vendor_bills` (find bill)
- `netsuite_get_accounts` (bank account)
- `netsuite_create_bill_payment` ⭐

---

### Flow 4️⃣ : Create Expense Reports (Spendesk → NetSuite)

**Objectif :** Créer les notes de frais dans NetSuite

```
1. GET Spendesk API /expense-reports (status: approved)
2. Pour chaque expense report:
   a. Mapper employee: netsuite_get_employees(q: email)
   b. Mapper accounts: netsuite_get_accounts
   c. Créer: netsuite_create_expense_report(
        employee: employee.id,
        externalId: `spk_exp_${report.id}`,
        expenseList: { expense: [...] }
      )
```

**Tools utilisés :**
- `netsuite_get_employees` (find employee)
- `netsuite_get_accounts`
- `netsuite_get_subsidiaries`
- `netsuite_create_expense_report` ⭐

---

## ✅ Statut d'Implémentation

### Complété ✅
- [x] Vendors CRUD (create, update, list)
- [x] Vendor Bills CRUD (create, update, list, get)
- [x] Bill Payments (create)
- [x] Expense Reports (create, list)
- [x] Reference Data (7 types)
- [x] Tous les champs analytiques (department, location, class)
- [x] Idempotence via externalId
- [x] Documentation de mapping Spendesk → NetSuite
- [x] Test suite automatisé (89% success rate)

### En Attente ⏳
- [ ] Support des custom fields (IBAN, SWIFT, etc.)
- [ ] File Cabinet API (upload attachments)
- [ ] Fix MCP SDK parameter bug (get by ID)

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| `SPENDESK_NETSUITE_VENDOR_MAPPING.md` | Mapping détaillé Supplier Spendesk → Vendor NetSuite |
| `TOOL_STANDARDIZATION_COMPLETE.md` | Liste complète des 30 tools |
| `DISABLED_TOOLS.md` | Tools désactivés et raisons |
| `NETSUITE_API_TEST_REPORT.md` | Rapport de tests des endpoints API |
| `README.md` | Installation, configuration, usage |

---

## 🎯 Prochaines Étapes

1. **Tester les nouveaux tools dans Dust**
   ```
   Créer un vendor de test:
   Tool: netsuite_create_vendor
   Params: {
     companyName: "Test Supplier",
     subsidiary: "1",
     email: "test@example.com",
     externalId: "test_123"
   }
   ```

2. **Implémenter Flow 1 : Sync Suppliers**
   - Créer un agent Dust pour la synchronisation Spendesk → NetSuite
   - Utiliser `netsuite_create_vendor` et `netsuite_update_vendor`

3. **Implémenter Flow 2 : Create Vendor Bills**
   - Récupérer les invoices Spendesk approuvées
   - Créer les bills avec `netsuite_create_vendor_bill`

4. **Implémenter Flow 3 : Create Payments**
   - Récupérer les payments Spendesk
   - Enregistrer avec `netsuite_create_bill_payment`

---

## 🔗 URLs Utiles

- **Railway:** https://netsuite-mcp-server-production.up.railway.app/
- **GitHub:** https://github.com/julienchriqui-okkoer/netsuite-mcp-server
- **Spendesk API:** https://developer.spendesk.com/
- **NetSuite REST API:** https://{account}.suitetalk.api.netsuite.com/
