# 🔍 NetSuite MCP Server — Analyse & Corrections

## 📊 Résumé de l'analyse

**Date :** 11 mars 2026  
**Serveur :** `https://netsuite-mcp-server-production.up.railway.app`  
**Référence fonctionnelle :** `netsuite_get_vendor_bills`

---

## ✅ Bug #1 — Zod v3 incompatibility (RÉSOLU)

### 🐛 Symptômes
- **Tools affectés :** `netsuite_get_vendors`, `netsuite_get_latest_vendors`, `netsuite_execute_suiteql`
- **Erreur :** `v3Schema.safeParseAsync is not a function`

### 🔍 Cause racine identifiée
Les fichiers `vendors.ts` et `suiteql.ts` ont été modifiés avec :
1. **Schémas Zod** (`import { z } from "zod"` + `inputSchema: zodSchema`)
2. **Type assertions** (`type: "text" as const`)

Le SDK MCP v1.27.1 utilisé dans ce projet **n'attend PAS de schémas Zod** dans `inputSchema`. La référence `vendor-bills.ts` qui fonctionne n'a **AUCUN des deux**.

### ✅ Solution appliquée
**Revenir au pattern de `vendor-bills.ts` :**

**Avant (cassé) :**
```typescript
import { z } from "zod";

const schema = z.object({
  id: z.string().describe("Vendor ID"),
});

server.registerTool(
  "netsuite_get_vendor",
  { description: "...", inputSchema: schema },
  async ({ id }: any) => {
    return {
      content: [{ type: "text" as const, text: "..." }],
    };
  }
);
```

**Après (fonctionnel) :**
```typescript
server.registerTool(
  "netsuite_get_vendor",
  { description: "..." },  // PAS de inputSchema
  async ({ id }: any) => {
    return {
      content: [{ type: "text", text: "..." }],  // PAS de "as const"
    };
  }
);
```

### 📦 Commits
- `17d5b64` - "fix: revert to working pattern (no Zod schemas, no as const)"

---

## 🟡 Bug #2 — NetSuite 400 Bad Request (EN COURS)

### 🐛 Symptômes
- **Tools affectés :** `netsuite_get_accounts`, `netsuite_get_departments`, `netsuite_get_subsidiaries`, `netsuite_get_tax_codes`, `netsuite_get_currencies`
- **Erreur :** `NetSuite 400: Bad Request`

### 🔍 Hypothèses à tester
1. **Problème de casse (camelCase)** :
   - `/taxitem` → devrait être `/taxItem` (NetSuite REST API utilise camelCase)
   - Les autres endpoints semblent corrects

2. **Endpoints non supportés par NetSuite REST API** :
   - Certains record types n'ont pas d'endpoint REST direct
   - Nécessite SuiteQL comme fallback

### 🧪 Tests à effectuer
Script de test créé : `scripts/test-reference-endpoints.mjs`

```bash
npm run build
node scripts/test-reference-endpoints.mjs
```

### ✅ Solution proposée
Si les endpoints REST retournent 400, utiliser **SuiteQL comme fallback** :

```typescript
// Fallback pour les endpoints qui ne supportent pas REST
async function getSuiteQLData(client, table, limit, offset) {
  const query = `SELECT * FROM ${table} LIMIT ${limit} OFFSET ${offset || 0}`;
  const result = await client.suiteql(query);
  return result;
}
```

**Mapping SuiteQL :**
- `account` → `SELECT id, acctNumber, acctName, acctType FROM account`
- `department` → `SELECT id, name FROM department`
- `subsidiary` → `SELECT id, name FROM subsidiary`
- `taxItem` → `SELECT id, itemId, description, rate FROM taxItem`
- `currency` → `SELECT id, symbol, name FROM currency`

---

## 🟡 Bug #3 — Tool execution failed (EN COURS)

### 🐛 Symptômes
- **Tools affectés :** `netsuite_get_journal_entries`, `netsuite_get_employees`, `netsuite_get_expense_reports`, `netsuite_get_vendor_credits`, `netsuite_get_locations`, `netsuite_get_classifications`
- **Erreur :** `Error: tool execution failed` (crash avant NetSuite)

### 🔍 Analyse du code

Tous ces tools suivent déjà le pattern correct de `vendor-bills.ts` :
- ✅ Pas de schémas Zod
- ✅ Pas de `as const`
- ✅ Structure identique

### 🧪 Tests à effectuer

Vérifier que les tools sont bien enregistrés :

```typescript
// src/tools/index.ts
import { registerEmployeeTools } from "./employees.js";
import { registerExpenseReportTools } from "./expense-reports.js";
import { registerJournalEntryTools } from "./journal-entries.js";
import { registerVendorCreditTools } from "./vendor-credits.js";
import { registerAnalyticsTools } from "./analytics.js";

export function registerAllTools(server: McpServer): void {
  // ... autres registrations
  registerEmployeeTools(server, client);
  registerExpenseReportTools(server, client);
  registerJournalEntryTools(server, client);
  registerVendorCreditTools(server, client);
  registerAnalyticsTools(server, client);
}
```

### ✅ Solutions possibles

1. **Vérifier l'enregistrement des tools**
   - Tous les tools doivent être appelés dans `registerAllTools()`

2. **Vérifier les endpoints NetSuite**
   - `/employee` → Correct
   - `/expensereport` → **Devrait être `/expenseReport`** (camelCase)
   - `/journalEntry` → Correct
   - `/vendorcredit` → **Devrait être `/vendorCredit`** (camelCase)
   - `/location` → Correct
   - `/classification` → Correct

3. **Ajouter des logs de debug**
   ```typescript
   console.error(`[netsuite_get_xxx] Calling NetSuite endpoint: ${path}`);
   ```

---

## 📋 Checklist de validation

### ✅ Bug #1 - Zod incompatibility
- [x] Supprimer imports Zod dans `vendors.ts`
- [x] Supprimer imports Zod dans `suiteql.ts`
- [x] Supprimer `inputSchema` Zod
- [x] Supprimer `as const` sur `type: "text"`
- [x] Build réussi
- [x] Déployé sur Railway (commit `17d5b64`)

### 🟡 Bug #2 - NetSuite 400
- [ ] Tester tous les endpoints de référence
- [ ] Corriger casse (camelCase) si nécessaire
- [ ] Implémenter fallback SuiteQL si endpoints REST non disponibles

### 🟡 Bug #3 - Tool execution failed
- [ ] Vérifier enregistrement dans `registerAllTools()`
- [ ] Corriger casse des endpoints (`expenseReport`, `vendorCredit`)
- [ ] Tester chaque tool individuellement

---

## 🚀 Prochaines étapes

1. **Tester les endpoints de référence :**
   ```bash
   node scripts/test-reference-endpoints.mjs
   ```

2. **Corriger la casse des endpoints :**
   - `expensereport` → `expenseReport`
   - `vendorcredit` → `vendorCredit`
   - `taxitem` → `taxItem`

3. **Implémenter fallback SuiteQL si nécessaire**

4. **Vérifier l'enregistrement de tous les tools**

5. **Tester tous les tools dans Dust**

---

## 📚 Références

- **Pattern fonctionnel :** `src/tools/vendor-bills.ts`
- **Client NetSuite :** `src/netsuite-client.ts`
- **Documentation SDK MCP :** Version 1.27.1 (pas de schémas Zod)
- **NetSuite REST API :** Utilise camelCase pour les record types
