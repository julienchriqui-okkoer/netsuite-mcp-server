# 🔧 Tools désactivés temporairement

Ce document liste les tools MCP désactivés et les raisons de leur désactivation.

## ❌ Tools désactivés

### 1. `netsuite_get_vendor_by_id`

**Catégorie :** Vendors  
**Raison :** Problème de transmission du paramètre `id` via le MCP SDK  
**Date :** 2026-03-11  
**Statut :** En investigation

**Symptôme :**
- L'appel direct à l'API NetSuite fonctionne (testé sur Postman avec ID 135280 → 200 OK)
- Le tool MCP retourne `Missing required parameter: id`
- Les arguments reçus dans le handler sont : `{ signal: {}, _meta: {...} }` (pas de `id`)

**Tentatives de fix :**
1. ✅ Destructuration `async ({ id }: any)` → Ne fonctionne pas
2. ✅ Extraction manuelle `async (args: any)` puis `args?.id` → Ne fonctionne pas
3. ❌ Ajout de `inputSchema` Zod → Casse d'autres tools (régression)

**Workaround actuel :**
- Utiliser `netsuite_get_latest_vendors` qui appelle en interne `client.get(\`/vendor/\${id}\`)` → ✅ Fonctionne

**Hypothèses à investiguer :**
1. Bug dans `@modelcontextprotocol/sdk` version `1.27.1` pour les tools avec un seul paramètre requis
2. Incompatibilité entre le transport HTTP Streamable et certains patterns de handler
3. Problème de sérialisation des arguments côté Dust → MCP

**Prochaines étapes :**
- [ ] Tester avec une version différente du SDK MCP (`1.8.0` ou `2.x`)
- [ ] Créer un tool minimal de test avec un seul paramètre pour isoler le problème
- [ ] Comparer le transport stdio vs HTTP pour ce tool spécifique
- [ ] Vérifier les logs Railway pour voir les arguments reçus côté serveur

---

### 2. `netsuite_get_employee`

**Catégorie :** Employees  
**Raison :** Même problème de transmission de paramètre que `netsuite_get_vendor_by_id`  
**Date :** 2026-03-11  
**Statut :** Non testé (désactivé par précaution)

**Note :** Partage le même pattern de handler avec un seul paramètre `id`.

---

### 3. File Cabinet Tools

**Catégorie :** File Cabinet  
**Raison :** API `/file` et `/folder` non disponibles dans l'instance NetSuite (404)  
**Date :** 2026-03-11  
**Statut :** Fonctionnalité non activée dans NetSuite

**Tools désactivés :**
- `netsuite_list_files`
- `netsuite_upload_file`
- `netsuite_attach_file`

**Prochaines étapes :**
- [ ] Vérifier si le "File Cabinet REST API" feature est activé dans NetSuite
- [ ] Demander l'activation à l'admin NetSuite si nécessaire

---

## ✅ Tools validés et fonctionnels

### Vendors
- ✅ `netsuite_get_vendors` (list)
- ✅ `netsuite_get_latest_vendors` (list + details)

### Vendor Bills
- ✅ `netsuite_get_vendor_bills` (list)
- ✅ `netsuite_get_vendor_bill` (get by id) ← **Ce tool fonctionne avec `id` !**
- ✅ `netsuite_create_vendor_bill`
- ✅ `netsuite_update_vendor_bill`

### Reference Data
- ✅ `netsuite_get_accounts`
- ✅ `netsuite_get_departments`
- ✅ `netsuite_get_subsidiaries`
- ✅ `netsuite_get_tax_codes`
- ✅ `netsuite_get_currencies`
- ✅ `netsuite_get_locations`
- ✅ `netsuite_get_classifications`

### Other
- ✅ `netsuite_execute_suiteql`
- ✅ Journal Entries tools
- ✅ Expense Reports tools
- ✅ Bill Payments tools
- ✅ Vendor Credits tools

---

## 🔍 Mystère à résoudre

**Pourquoi `netsuite_get_vendor_bill` avec paramètre `id` fonctionne, mais `netsuite_get_vendor_by_id` avec le même pattern ne fonctionne pas ?**

```typescript
// ✅ Fonctionne
server.registerTool("netsuite_get_vendor_bill", { ... }, async ({ id }: any) => { ... });

// ❌ Ne fonctionne pas
server.registerTool("netsuite_get_vendor_by_id", { ... }, async ({ id }: any) => { ... });
```

Différences potentielles :
- Ordre d'enregistrement des tools ?
- Nom du tool (longueur, caractères) ?
- Fichier source différent (`vendor-bills.ts` vs `vendors.ts`) ?
- Autre tool dans le même fichier qui interfère ?

---

## 🎯 Plan d'action

1. **Court terme :** Continuer avec Phase 2 (Vendor Bills) qui fonctionne
2. **Moyen terme :** Investiguer le bug MCP avec un test isolé
3. **Long terme :** Activer les File Cabinet APIs si nécessaire
