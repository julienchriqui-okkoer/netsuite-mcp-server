# 🏗️ NetSuite MCP - Méthodologie de Construction des Tools

## 🎯 Objectif

Créer une approche **uniforme, testable et non-régressive** pour tous les MCP tools.

---

## 📋 Principes de Construction

### 1. Structure Uniforme des Tools

Tous les tools doivent suivre cette structure :

```typescript
export function registerXxxTools(server: McpServer, client: NetSuiteClient): void {
  server.registerTool(
    "netsuite_action_resource", // Naming: netsuite_{action}_{resource}
    {
      description: "Clear description with required parameters and examples",
    },
    async ({ param1, param2, ...rest }: any) => {  // ✅ Destructuring pour MCP SDK
      try {
        // 1. Validation des paramètres
        if (!param1) {
          return errorResponse("'param1' is required");
        }

        // 2. Appel NetSuite via client
        const result = await client.get<T>(`/endpoint/${param1}`, params);

        // 3. Retour succès
        return successResponse(result);
      } catch (error: any) {
        // 4. Gestion d'erreur uniforme
        return errorResponse(`Error: ${error.message}`);
      }
    }
  );
}
```

### 2. Helpers Uniformes

Créer des helpers réutilisables :

```typescript
// Success response
function successResponse(data: unknown) {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
  };
}

// Error response
function errorResponse(message: string) {
  return {
    content: [{ type: "text", text: message }],
    isError: true,
  };
}
```

---

## 🧪 Méthodologie de Test

### Phase 1 : Inventaire Complet

1. **Lister tous les tools existants**
2. **Identifier les endpoints NetSuite utilisés**
3. **Catégoriser par priorité** (critique, important, optionnel)

### Phase 2 : Standardisation Tool par Tool

Pour chaque tool :

```
1. ✅ Vérifier l'endpoint NetSuite (test direct)
2. ✅ Standardiser la signature (destructuring)
3. ✅ Ajouter validation des paramètres
4. ✅ Utiliser les helpers uniformes
5. ✅ Tester en isolation
6. ✅ Valider non-régression
7. ✅ Documenter
```

### Phase 3 : Tests de Non-Régression

Après chaque modification :
1. Build TypeScript
2. Test du tool modifié
3. Test des tools déjà validés (smoke test)
4. Commit si tous les tests passent

---

## 📊 Template de Test par Tool

```javascript
// test-tool-{name}.mjs
async function testToolName() {
  const tests = [
    {
      name: "Test basique",
      args: { id: "123" },
      expectedStatus: "success",
    },
    {
      name: "Test sans paramètre requis",
      args: {},
      expectedStatus: "error",
      expectedMessage: "required",
    },
    {
      name: "Test avec ID inexistant",
      args: { id: "999999" },
      expectedStatus: "error",
      expectedMessage: "Not Found",
    },
  ];

  for (const test of tests) {
    console.log(`  Testing: ${test.name}...`);
    const result = await callTool("netsuite_tool_name", test.args);
    // Assertions...
  }
}
```

---

## 🗂️ Organisation des Fichiers

```
src/tools/
├── _helpers.ts          # Helpers communs (NEW)
├── _test-helpers.ts     # Helpers de test (NEW)
├── vendors.ts           # ✅ VALIDÉ
├── vendor-bills.ts      # ⏳ À valider
├── employees.ts         # ⏳ À valider
├── expense-reports.ts   # ⏳ À valider
├── payments.ts          # ⏳ À valider
├── vendor-credits.ts    # ⏳ À valider
├── journal-entries.ts   # ⏳ À valider
├── reference.ts         # ✅ VALIDÉ
├── suiteql.ts          # ✅ VALIDÉ
└── file-cabinet.ts      # ❌ Non disponible

scripts/
├── test-tool-vendors.mjs           # ✅ VALIDÉ
├── test-tool-vendor-bills.mjs      # ⏳ À créer
├── test-tool-employees.mjs         # ⏳ À créer
└── test-all-validated-tools.mjs    # Test de non-régression (NEW)
```

---

## 🚦 Statuts des Tools

### ✅ Validés (5 catégories)
- [x] Vendors (4 tools)
- [x] Reference Data (7 tools)
- [x] SuiteQL (1 tool)
- [x] Vendor Payments (2 tools)
- [x] Journal Entries (2 tools)

### ⏳ À Valider (4 catégories)
- [ ] Vendor Bills (4 tools)
- [ ] Employees (2 tools)
- [ ] Expense Reports (3 tools)
- [ ] Vendor Credits (2 tools)

### ❌ Non Disponibles
- [ ] File Cabinet (3 tools) - Feature désactivée

---

## 📝 Checklist de Validation par Tool

```markdown
## Tool: netsuite_xxx_yyy

### 1. Structure
- [ ] Nom conforme : `netsuite_{action}_{resource}`
- [ ] Description claire avec exemples
- [ ] Destructuring des paramètres `({ param }: any)`
- [ ] Helpers uniformes (successResponse, errorResponse)

### 2. Validation
- [ ] Paramètres requis validés
- [ ] Messages d'erreur clairs
- [ ] Gestion try/catch

### 3. Tests
- [ ] Test avec paramètres valides
- [ ] Test sans paramètres requis (erreur)
- [ ] Test avec ID inexistant (erreur NetSuite)
- [ ] Test avec pagination (si applicable)

### 4. Non-Régression
- [ ] Build TypeScript OK
- [ ] Tool fonctionne en isolation
- [ ] Autres tools toujours fonctionnels
- [ ] Tests automatisés passent

### 5. Documentation
- [ ] Description à jour
- [ ] Exemples d'utilisation
- [ ] Limitations documentées
```

---

## 🎯 Ordre de Validation Recommandé

### Phase 1 : Critique (Tools utilisés pour Spendesk)
1. ✅ Vendors (VALIDÉ)
2. **Vendor Bills** (priorité #1)
3. **Employees** (priorité #2)
4. **Expense Reports** (priorité #3)

### Phase 2 : Important
5. **Vendor Credits**
6. **Vendor Payments** (déjà OK, à valider formellement)

### Phase 3 : Support
7. ✅ Reference Data (VALIDÉ)
8. ✅ SuiteQL (VALIDÉ)
9. ✅ Journal Entries (déjà OK, à valider formellement)

---

## 🔄 Workflow de Validation

```bash
# 1. Standardiser un tool
# Éditer src/tools/vendor-bills.ts

# 2. Build
npm run build

# 3. Tester le tool modifié
node scripts/test-tool-vendor-bills.mjs

# 4. Test de non-régression
node scripts/test-all-validated-tools.mjs

# 5. Si tout passe, commit
git add -A
git commit -m "refactor: standardize vendor-bills tools"
git push

# 6. Passer au tool suivant
```

---

## 📊 Tracking de Progression

| Tool Category | Total | Validés | Statut |
|---------------|-------|---------|--------|
| Vendors | 4 | 4 | ✅ 100% |
| Vendor Bills | 4 | 0 | ⏳ 0% |
| Employees | 2 | 0 | ⏳ 0% |
| Expense Reports | 3 | 0 | ⏳ 0% |
| Vendor Credits | 2 | 0 | ⏳ 0% |
| Vendor Payments | 2 | 0 | ⏳ 0% |
| Journal Entries | 2 | 0 | ⏳ 0% |
| Reference Data | 7 | 7 | ✅ 100% |
| SuiteQL | 1 | 1 | ✅ 100% |
| **TOTAL** | **27** | **12** | **44%** |

---

## 🚀 Prochaines Étapes

1. Créer les helpers uniformes (`_helpers.ts`)
2. Créer le script de test de non-régression
3. Commencer par **Vendor Bills** (priorité #1)
4. Valider tool par tool sans casser les précédents
