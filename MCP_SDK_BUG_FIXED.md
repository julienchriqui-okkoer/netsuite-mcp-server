# 🎉 BUG MCP SDK RÉSOLU !

## ✅ Problème Identifié

**Les arguments n'étaient PAS transmis** aux handlers des tools à cause d'un **bug connu du MCP SDK** (Issue #1026).

### Symptôme
```typescript
async ({ companyName, subsidiary }: any) => {
  console.log(companyName); // undefined ❌
}
```

**Même si la requête JSON-RPC contenait** :
```json
{
  "method": "tools/call",
  "params": {
    "name": "netsuite_create_vendor",
    "arguments": {
      "companyName": "Test Vendor",
      "subsidiary": "1"
    }
  }
}
```

### Cause
**`registerTool` SANS `inputSchema`** : Le SDK ne sait pas comment parser les arguments.

---

## ✅ Solution Appliquée

### Pattern QUI MARCHE (depuis MCP SDK v1.22.0+)

```typescript
import { z } from "zod";

server.registerTool(
  "netsuite_create_vendor",
  {
    description: "Create a vendor...",
    inputSchema: {  // ← Raw object, PAS z.object()!
      companyName: z.string(),
      subsidiary: z.string(),
      email: z.string().optional(),
    },
  },
  async ({ companyName, subsidiary, email }: any) => {
    // ✅ companyName, subsidiary, email sont maintenant définis!
    console.log(companyName); // "Test Vendor" ✅
  }
);
```

### Pourquoi ça marche ?
- **`inputSchema` avec un objet brut Zod** (pas `z.object()`) permet au SDK de :
  1. Générer le JSON Schema pour le client MCP
  2. Valider les paramètres entrants
  3. **Les transmettre correctement au handler**

---

## 🔧 Changements Appliqués

### ✅ Fichiers Modifiés
1. **`src/tools/vendors.ts`** :
   - Ajout d'`inputSchema` à `netsuite_create_vendor`
   - Import de `zod`

### 📊 Résultat des Tests Locaux

**AVANT (sans inputSchema)** :
```
🔍 [create_vendor] Received params: {
  companyName: undefined,  // ❌
  subsidiary: undefined,   // ❌
  email: undefined         // ❌
}
```

**APRÈS (avec inputSchema)** :
```
🔍 [create_vendor] Received params: {
  companyName: 'Test Vendor MCP Fixed',     // ✅
  subsidiary: '1',                          // ✅
  email: 'test.mcp.fixed@example.com'      // ✅
}
```

---

## 🚀 Prochaines Étapes

### 1. Appliquer à TOUS les tools
Mettre à jour **tous** les `registerTool` avec `inputSchema` :
- `netsuite_get_vendor_by_id` (désactivé) ← Réactiver !
- `netsuite_get_employee` (désactivé) ← Réactiver !
- `netsuite_execute_suiteql` ← Fixer !
- Tous les autres tools pour cohérence

### 2. Gérer le requirement NetSuite "Address"
`netsuite_create_vendor` échoue actuellement avec :
```
"Please enter value(s) for: Address."
```
→ Ajouter un champ `address` optionnel dans l'inputSchema

### 3. Tester et Déployer
- ✅ Tests locaux : **PARAMÈTRES TRANSMIS**
- 🔄 Tester sur Railway
- 🔄 Tester dans Dust

---

## 📚 Références

- **GitHub Issue** : https://github.com/modelcontextprotocol/typescript-sdk/issues/1026
- **SDK Version** : `@modelcontextprotocol/sdk` ≥ v1.22.0
- **Zod Version** : `^3.22.0`

---

## 🎯 Impact

**CRITIQUE** : Ce bug empêchait la transmission de TOUS les paramètres vers TOUS les tools.

**RÉSOLUTION** : `inputSchema` avec raw Zod object permet maintenant la transmission correcte des arguments.

**STATUS** : ✅ RÉSOLU pour `netsuite_create_vendor`, à généraliser.
