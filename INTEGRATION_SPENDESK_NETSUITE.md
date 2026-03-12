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
- ✅ Lines (`expense` array):
  - Required: `account`, `amount`
  - Analytics: `department`, `location`, `class`
  - Optional: `memo`, `taxCode`

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
| `netsuite_create_vendor_credit` | Create | ✅ | Créer avoir |

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

### Flow 2️⃣ : Create Vendor Bills (Spendesk Invoices → NetSuite)

**Objectif :** Créer les factures fournisseurs dans NetSuite

```
1. GET Spendesk API /invoices (status: approved)
2. Pour chaque invoice:
   a. Vérifier si existe: netsuite_get_vendor_bills(q: externalId)
   b. Si n'existe pas:
      - Mapper vendor: netsuite_get_vendors(q: externalId)
      - Mapper accounts: netsuite_get_accounts
      - Mapper tax codes: netsuite_get_tax_codes
      - Créer: netsuite_create_vendor_bill(
          entity: vendor.id,
          externalId: `spk_inv_${invoice.id}`,
          expense: [{
            account, amount, department, location, class, taxCode
          }]
        )
```

**Tools utilisés :**
- `netsuite_get_vendors` (find vendor)
- `netsuite_get_accounts` (expense accounts)
- `netsuite_get_tax_codes`
- `netsuite_get_departments`
- `netsuite_get_vendor_bills` (check existence)
- `netsuite_create_vendor_bill` ⭐

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
