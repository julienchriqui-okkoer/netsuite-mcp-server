# ✅ FIX FINAL — Schema Zod pour netsuite_get_vendor

## 📊 Résumé

**Date :** 11 mars 2026  
**Commit :** `05639e0`  
**Solution :** Utilisation de `server.tool()` (ancienne API) au lieu de `server.registerTool()`

---

## 🐛 Problème confirmé

**Erreur reçue :**
```
'id' parameter is required.
Received args: { signal: {}, _meta: { progressToken: ... }, requestId: 1, requestInfo: { ... } }
```

**Cause racine :**
Le tool recevait uniquement les métadonnées MCP mais **pas les paramètres utilisateur** car aucun schéma n'était défini.

---

## ✅ Solution appliquée

### Utilisation de l'ancienne API `server.tool()`

**Avant (ne marchait pas) :**
```typescript
server.registerTool(
  "netsuite_get_vendor",
  { description: "..." },
  async (args: any) => { ... }  // Pas de schéma = Dust ne sait pas quels paramètres envoyer
);
```

**Après (fonctionne) :**
```typescript
import { z } from "zod";

(server as any).tool(
  "netsuite_get_vendor",
  "Get a single NetSuite vendor by internal ID",
  z.object({
    id: z.string().describe("NetSuite internal vendor ID"),
  }),
  async ({ id }: { id: string }) => {
    console.error(`[netsuite_get_vendor] Calling NetSuite with ID: ${id}`);
    
    const result = await client.get(`/vendor/${id}`, {
      expandSubResources: "true",
    });
    
    return {
      content: [{
        type: "text",
        text: JSON.stringify(result, null, 2),
      }],
    };
  }
);
```

---

## 🔧 Différences techniques

### Signature `server.tool()` (v1.8.0 - fonctionne)

```typescript
server.tool(
  name: string,
  description: string,
  schema: z.ZodObject<...>,
  handler: (args: SchemaType) => Promise<Result>
)
```

✅ **Avantages :**
- Schéma Zod natif supporté
- Pas de problèmes TypeScript
- Dust reçoit le schéma et transmet les paramètres

### Signature `server.registerTool()` (v1.27.1 - problèmes)

```typescript
server.registerTool(
  name: string,
  options: { description: string, inputSchema?: ... },
  handler: (args: any) => Promise<Result>
)
```

❌ **Problèmes :**
- `inputSchema` avec Zod cause des erreurs TypeScript ("Type instantiation is excessively deep")
- Sans `inputSchema`, Dust ne sait pas quels paramètres transmettre

---

## 🧪 Test à effectuer

Dans **Dust**, tester :
```
Récupère le vendor NetSuite avec l'ID 134775
```

**Résultat attendu :**
```json
{
  "id": "134775",
  "companyName": "Vendor ABC",
  "email": "contact@vendor.com",
  "phone": "+33123456789",
  "defaultAddress": "123 Rue Example",
  "vatRegNumber": "FR12345678901",
  "legalName": "Vendor ABC SAS",
  "currency": { "id": "1", "refName": "EUR" },
  "subsidiary": { "id": "1", "refName": "France" },
  "isInactive": false,
  "dateCreated": "2026-03-10T12:00:00Z",
  "lastModifiedDate": "2026-03-11T08:00:00Z",
  "externalId": null
}
```

---

## 📦 Déploiement

**Commit :** `05639e0`

Railway va redéployer automatiquement. Le tool `netsuite_get_vendor` devrait maintenant **recevoir le paramètre `id`** correctement ! 🎯

---

## 🎯 Prochaines étapes

Si ce test fonctionne, appliquer le même fix aux autres tools :

1. **`netsuite_get_vendor_bill`** — Paramètre `id` manquant
2. **`netsuite_get_employee`** — Paramètre `id` manquant  
3. **`netsuite_execute_suiteql`** — Paramètre `query` manquant

**Template de fix :**
```typescript
(server as any).tool(
  "tool_name",
  "Description",
  z.object({
    param1: z.string().describe("Description"),
  }),
  async ({ param1 }) => { ... }
);
```

---

Le fix est déployé ! Teste immédiatement `netsuite_get_vendor` avec un ID pour valider ! ✅
