# ✅ Fix get_vendor ID parameter + Amélioration get_latest_vendors

## 📊 Résumé

**Date :** 11 mars 2026  
**Commit :** (en cours de push)

---

## 🐛 Bug #1 — `netsuite_get_vendor` : paramètre `id` non transmis

### Problème

Dust ne transmet pas le paramètre `id` au tool, donc NetSuite reçoit une requête mal formée (`GET /vendor/undefined`).

### Solution appliquée

**Ajout de validation explicite et logs de debug :**

```typescript
server.registerTool(
  "netsuite_get_vendor",
  {
    description: "Get a single NetSuite vendor by internal ID. Pass the vendor ID as 'id' parameter.",
  },
  async (args: any) => {
    console.error(`[netsuite_get_vendor] Args received:`, JSON.stringify(args));
    
    const id = args?.id;
    
    if (!id) {
      return {
        content: [{
          type: "text",
          text: `Error: 'id' parameter is required. Received args: ${JSON.stringify(args)}`,
        }],
        isError: true,
      };
    }
    
    console.error(`[netsuite_get_vendor] Calling NetSuite with ID: ${id}`);
    
    const result = await client.get(`/vendor/${id}`, {
      expandSubResources: "true",
    });
    
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);
```

**Logs ajoutés :**
- Log des arguments reçus pour diagnostiquer si Dust transmet bien le paramètre
- Log de l'ID avant l'appel NetSuite
- Message d'erreur explicite si `id` est manquant

---

## ✅ Amélioration — `netsuite_get_latest_vendors`

### Nouvelle logique (3 étapes)

**Avant :** Récupérait 100 vendors avec données partielles

**Après :** Récupère les IDs, trie, puis fetch les détails complets

```typescript
// Step 1: Get vendor list (lighter call)
const listResult = await client.get("/vendor", { limit: "50" });

// Step 2: Sort by ID DESC (higher ID = more recent)
const sortedVendorIds = listResult.items
  .map(item => ({ id: item.id }))
  .sort((a, b) => parseInt(b.id) - parseInt(a.id))
  .slice(0, 5);

// Step 3: Fetch full details for each vendor
for (const vendorRef of sortedVendorIds) {
  const vendorDetail = await client.get(`/vendor/${vendorRef.id}`, {
    expandSubResources: "true",
  });
  
  // Transform to Spendesk format
  vendors.push({
    id: vendorDetail.id,
    name: vendorDetail.companyName,
    email: vendorDetail.email || null,
    phone: vendorDetail.phone || null,
    address: vendorDetail.defaultAddress || null,
    vatNumber: vendorDetail.vatRegNumber || null,
    legalName: vendorDetail.legalName,
    currency: vendorDetail.currency?.refName || null,
    subsidiary: vendorDetail.subsidiary?.refName || null,
    isActive: !vendorDetail.isInactive,
    createdAt: vendorDetail.dateCreated,
    updatedAt: vendorDetail.lastModifiedDate,
    externalId: vendorDetail.externalId || null,
  });
}
```

### Avantages

✅ **Données complètes** — Chaque vendor est récupéré avec `expandSubResources=true`  
✅ **Tri par ID DESC** — Les IDs NetSuite sont croissants, donc ID élevé = récent  
✅ **Pas de SuiteQL** — Fonctionne sans permissions SuiteQL  
✅ **Format Spendesk** — Mapping exact des champs attendus  
✅ **Logs détaillés** — Traçabilité complète pour debug

---

## 🧪 Tests à effectuer

### Test #1 : `netsuite_get_vendor` avec logs

Dans **Dust**, tester :
```
Récupère le vendor NetSuite avec l'ID 134775
```

**Attendu :**
- Logs Railway montreront : `[netsuite_get_vendor] Args received: { "id": "134775" }`
- Si Dust ne transmet pas l'ID : `[netsuite_get_vendor] Args received: {}`
- Cela nous dira si le problème vient de Dust ou du MCP server

---

### Test #2 : `netsuite_get_latest_vendors` amélioré

Dans **Dust**, tester :
```
Récupère les 5 derniers vendors créés dans NetSuite au format Spendesk
```

**Attendu :**
```json
{
  "vendors": [
    {
      "id": "134775",
      "name": "Vendor ABC",
      "email": "contact@vendor.com",
      "phone": "+33123456789",
      "address": "123 Rue Example",
      "vatNumber": "FR12345678901",
      "legalName": "Vendor ABC SAS",
      "currency": "EUR",
      "subsidiary": "France",
      "isActive": true,
      "createdAt": "2026-03-10T12:00:00Z",
      "updatedAt": "2026-03-11T08:00:00Z",
      "externalId": null
    }
    // ... 4 autres vendors
  ],
  "count": 5,
  "note": "Using REST API (no SuiteQL permissions required). Sorted by ID DESC (higher ID = more recent)."
}
```

**Logs Railway montreront :**
```
[netsuite_get_latest_vendors] Fetching latest 5 vendors
[netsuite_get_latest_vendors] Retrieved 50 vendors from list
[netsuite_get_latest_vendors] Selected top 5 vendor IDs: 134775, 134774, 126286, 123028, 120369
[netsuite_get_latest_vendors] Successfully retrieved 5 vendor details
```

---

## 🔍 Diagnostic du problème ID

Une fois le test #1 effectué, on saura :

**Scénario A :** Logs montrent `Args received: {}`
→ **Dust ne transmet pas le paramètre** → Il faut exposer un `inputSchema` (mais ça casse tout...)

**Scénario B :** Logs montrent `Args received: { "id": "134775" }`
→ **Le paramètre arrive bien** → Le bug est ailleurs (URL construction?)

**Scénario C :** Logs montrent `Args received: { "0": "134775" }` ou autre format bizarre
→ **Le paramètre arrive dans un format inattendu** → Il faut adapter le parsing

---

## 📦 Déploiement

**Commit :** (en cours de push)

Railway va redéployer avec :
- ✅ Logs de debug pour `netsuite_get_vendor`
- ✅ Nouvelle logique 3-step pour `netsuite_get_latest_vendors`
- ✅ Données complètes avec `expandSubResources=true`

---

## 📋 Checklist

- [x] Ajout logs debug `netsuite_get_vendor`
- [x] Validation explicite du paramètre `id`
- [x] Amélioration logique `netsuite_get_latest_vendors` (3 steps)
- [x] Fetch complet avec `expandSubResources=true`
- [x] Mapping Spendesk-compatible
- [x] Build réussi
- [ ] Déployé sur Railway (en cours)
- [ ] Test #1 avec logs Railway
- [ ] Test #2 avec nouveau format

---

Teste maintenant et regarde les **logs Railway** pour diagnostiquer le problème du paramètre `id` ! 🔍
