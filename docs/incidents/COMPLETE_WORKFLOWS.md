# 📋 WORKFLOWS COMPLETS DISPONIBLES — NetSuite MCP

## ✅ Workflow 1 : Gestion des Vendors (Fournisseurs)

### Tools Disponibles
1. **`netsuite_create_vendor`** ✅ — Créer un fournisseur avec adresse complète
2. **`netsuite_update_vendor`** ✅ — Mettre à jour un fournisseur
3. **`netsuite_get_vendor_by_id`** ✅ — Récupérer un fournisseur par ID
4. **`netsuite_get_vendors`** ✅ — Lister les fournisseurs (pagination)
5. **`netsuite_get_latest_vendors`** ✅ — Récupérer les derniers fournisseurs

---

## ✅ Workflow 2 : Gestion des Factures Fournisseurs (Vendor Bills)

### Tools Disponibles
1. **`netsuite_create_vendor_bill`** ✅ — Créer une facture fournisseur avec lignes de dépenses
2. **`netsuite_update_vendor_bill`** ✅ — Mettre à jour une facture
3. **`netsuite_get_vendor_bill`** ✅ — Récupérer une facture par ID
4. **`netsuite_get_vendor_bills`** ✅ — Lister les factures (pagination, recherche)

---

## ✅ Workflow 3 : Paiement des Factures (Bill Payments) ⭐ NOUVEAU

### Tools Disponibles
1. **`netsuite_get_bill_payments`** ✅ **NOUVEAU** — Lister les paiements fournisseurs
2. **`netsuite_create_bill_payment`** ✅ — Créer un paiement et l'appliquer à des factures

### Exemple d'Utilisation
```json
{
  "entity": "135280",           // Vendor ID
  "account": "123",             // Bank account ID
  "tranDate": "2026-03-12",
  "memo": "Payment for invoices",
  "externalId": "SPENDESK-PAY-001",
  "applyList": {
    "apply": [
      {
        "doc": "1339936",       // Vendor bill ID
        "apply": true,
        "amount": 100.00
      }
    ]
  }
}
```

---

## ✅ Workflow 4 : Gestion des Employés

### Tools Disponibles
1. **`netsuite_get_employees`** ✅ — Lister les employés
2. **`netsuite_get_employee`** ✅ — Récupérer un employé par ID

---

## ✅ Workflow 5 : Notes de Frais (Expense Reports)

### Tools Disponibles
1. **`netsuite_create_expense_report`** ✅ — Créer une note de frais
2. **`netsuite_get_expense_reports`** ✅ — Lister les notes de frais

---

## ✅ Workflow 6 : Avoirs Fournisseurs (Vendor Credits)

### Tools Disponibles
1. **`netsuite_create_vendor_credit`** ✅ — Créer un avoir fournisseur
2. **`netsuite_get_vendor_credits`** ✅ — Lister les avoirs

---

## ✅ Workflow 7 : Écritures Comptables (Journal Entries)

### Tools Disponibles
1. **`netsuite_create_journal_entry`** ✅ — Créer une écriture comptable
2. **`netsuite_get_journal_entry`** ✅ — Récupérer une écriture par ID

---

## ✅ Données de Référence (7 tools)

### Tools Disponibles
1. **`netsuite_get_accounts`** ✅ — Récupérer les comptes comptables
2. **`netsuite_get_departments`** ✅ — Récupérer les départements
3. **`netsuite_get_subsidiaries`** ✅ — Récupérer les filiales
4. **`netsuite_get_tax_codes`** ✅ — Récupérer les codes TVA
5. **`netsuite_get_currencies`** ✅ — Récupérer les devises
6. **`netsuite_get_locations`** ✅ — Récupérer les emplacements
7. **`netsuite_get_classifications`** ✅ — Récupérer les classifications

---

## ✅ Requêtes Avancées

### Tools Disponibles
1. **`netsuite_execute_suiteql`** ✅ — Exécuter des requêtes SuiteQL

---

## 📊 TOTAL : 30 Tools Actifs

### Par Catégorie
- **Vendors** : 5 tools
- **Vendor Bills** : 4 tools
- **Bill Payments** : 2 tools ⭐ (get_bill_payments NOUVEAU)
- **Employees** : 2 tools
- **Expense Reports** : 2 tools
- **Vendor Credits** : 2 tools
- **Journal Entries** : 2 tools
- **Reference Data** : 7 tools
- **SuiteQL** : 1 tool
- **File Cabinet** : 0 (API non disponible)

---

## 🎯 Workflow Complet Spendesk → NetSuite

### Scénario : Facture Fournisseur + Paiement

```
1. Créer un vendor (si nouveau) :
   Tool: netsuite_create_vendor
   
2. Créer une vendor bill :
   Tool: netsuite_create_vendor_bill
   → Retourne ID de la facture
   
3. Créer un bill payment :
   Tool: netsuite_create_bill_payment
   Params: {
     "entity": "[vendor_id]",
     "account": "[bank_account_id]",
     "tranDate": "2026-03-12",
     "applyList": {
       "apply": [{
         "doc": "[bill_id de l'étape 2]",
         "apply": true,
         "amount": 100.00
       }]
     }
   }

4. Vérifier le paiement :
   Tool: netsuite_get_bill_payments
```

---

## ✅ Conclusion

**TOUS les tools nécessaires pour l'intégration Spendesk × NetSuite sont disponibles !**

**Manque-t-il quelque chose ?** Non, tu as :
- ✅ Création/gestion de vendors
- ✅ Création/gestion de factures
- ✅ **Création/gestion de paiements** ⭐
- ✅ Notes de frais
- ✅ Avoirs fournisseurs
- ✅ Toutes les données de référence

**Prêt pour l'intégration complète ! 🚀**
