# 📚 Leçons Apprises — Pattern MCP SDK Validé

## 🎯 3 Règles Obligatoires pour TOUS les Tools

### 1. ✅ inputSchema avec Raw Zod Object
```typescript
server.registerTool(
  "tool_name",
  {
    description: "...",
    inputSchema: {  // ← Raw object, NOT z.object()
      param1: z.string(),
      param2: z.number().optional(),
    } as any,  // ← Type cast pour TypeScript
  },
  // ...
);
```

### 2. ✅ Destructuration DIRECTE dans la Signature
```typescript
async ({ param1, param2, param3 }: any) => {
  // ✅ Params disponibles directement
}

// ❌ NE PAS FAIRE :
async (args: any) => {
  const { param1 } = args;  // ❌ Ne fonctionne pas !
}
```

### 3. ✅ Gestion du 204 No Content (Créations/Updates)
```typescript
// ✅ Déjà géré dans netsuite-client.ts
if (response.status === 204) {
  const location = response.headers.get("Location") || "";
  const id = location.split("/").pop() || "unknown";
  return { success: true, id, location };
}
```

---

## 🔧 Tools à Corriger IMMÉDIATEMENT

### ❌ netsuite_get_vendor_by_id
**Problème** : Paramètre `id` non transmis  
**Solution** : Ajouter inputSchema + destructuration directe

### ❌ netsuite_get_employee  
**Problème** : Paramètre `id` non transmis  
**Solution** : Ajouter inputSchema + destructuration directe

### ⚠️ netsuite_execute_suiteql
**Problème potentiel** : Paramètre `query` peut avoir le même bug  
**Solution** : Vérifier et appliquer le pattern

---

## ✅ Tools Déjà Conformes

Ces tools utilisent déjà le bon pattern (destructuration directe) :

- ✅ `netsuite_get_vendor_bills`
- ✅ `netsuite_create_vendor_bill`
- ✅ `netsuite_update_vendor_bill`
- ✅ `netsuite_create_expense_report`
- ✅ `netsuite_create_journal_entry`
- ✅ `netsuite_create_bill_payment`
- ✅ `netsuite_create_vendor_credit`

**Action** : Ajouter `inputSchema` à tous pour cohérence

---

## 📋 Plan d'Action

### Phase 1 : Corriger les Tools Cassés (2 tools)
1. ✅ `netsuite_get_vendor_by_id` → Ajouter inputSchema
2. ✅ `netsuite_get_employee` → Ajouter inputSchema
3. ✅ Tester et réactiver

### Phase 2 : Uniformiser TOUS les Tools (18 tools)
1. Ajouter `inputSchema` à TOUS les tools qui n'en ont pas
2. Vérifier la destructuration directe partout
3. S'assurer que TOUS les tools de création/update gèrent le 204

### Phase 3 : Validation Complète
1. Tester localement tous les tools
2. Déployer sur Railway
3. Tester dans Dust

---

## 🎯 Bénéfices Immédiats

### Pour les 2 Tools Désactivés
- ✅ Réactivation immédiate
- ✅ Intégration Spendesk complète possible

### Pour les 18 Tools Actifs
- ✅ Code uniforme et maintenable
- ✅ Validation automatique des paramètres
- ✅ Meilleure documentation (via inputSchema)
- ✅ Prévention de bugs futurs

---

## 🚀 Prochaines Étapes

**Option 1 : Corriger d'abord les 2 tools cassés**
→ Réactivation rapide de `get_vendor_by_id` et `get_employee`

**Option 2 : Uniformiser tous les tools en une seule passe**
→ Application systématique du pattern à tous les 20 tools

**Recommandation** : Option 1 (quick wins) puis Option 2 (qualité)
