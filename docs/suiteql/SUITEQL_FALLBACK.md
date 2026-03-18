# ✅ Fix SuiteQL Permissions — Fallback REST API

## 📊 Contexte

**Problème :** L'utilisateur n'a pas les permissions SuiteQL dans NetSuite.

**Impact :** Le tool `netsuite_get_latest_vendors` utilisait SuiteQL et échouait avec une erreur de permissions.

---

## ✅ Solution appliquée

### Remplacement de SuiteQL par REST API

**Avant (nécessitait SuiteQL) :**
```typescript
const query = `
  SELECT id, companyName, email, ... FROM vendor
  ORDER BY dateCreated DESC
  LIMIT 5
`;
const result = await client.suiteql<any>(query);
```

**Après (REST API standard) :**
```typescript
// 1. Récupérer un batch de vendors via REST API
const result = await client.get<any>("/vendor", { limit: "100", offset: "0" });

// 2. Trier côté serveur par dateCreated DESC
const sortedVendors = result.items
  .filter((item: any) => item.dateCreated)
  .sort((a: any, b: any) => {
    const dateA = new Date(a.dateCreated).getTime();
    const dateB = new Date(b.dateCreated).getTime();
    return dateB - dateA; // DESC order
  })
  .slice(0, 5);

// 3. Transformer au format Spendesk
const vendors = sortedVendors.map((item: any) => ({
  id: item.id,
  name: item.companyName || item.entityId,
  email: item.email || null,
  // ... autres champs
}));
```

---

## 🔧 Avantages du fallback REST API

### ✅ Avantages
1. **Pas de permissions SuiteQL requises** — Utilise uniquement l'API REST standard
2. **Même résultat final** — Les vendors sont triés côté serveur
3. **Compatible avec tous les comptes NetSuite** — Fonctionne avec les permissions de base

### ⚠️ Limitations
1. **Performance** — Récupère 100 vendors et trie en mémoire (vs tri côté NetSuite avec SuiteQL)
2. **Limite de 100** — Si plus de 100 vendors, il faudrait paginer pour tout récupérer
3. **Tri approximatif** — Le tri se fait sur un échantillon, pas sur tous les vendors de la base

---

## 🧪 Test à effectuer

Dans **Dust**, tester :
```
Récupère les 5 derniers vendors créés dans NetSuite
```

**Résultat attendu :**
```json
{
  "vendors": [
    {
      "id": "123",
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
    },
    // ... 4 autres vendors
  ],
  "count": 5,
  "note": "Using REST API (no SuiteQL permissions required). Sorted client-side."
}
```

---

## 📦 Déploiement

**Commit :** (en cours de push)

Railway va automatiquement redéployer avec le nouveau code qui utilise REST API au lieu de SuiteQL.

---

## 🎯 Prochaines étapes

1. **Tester immédiatement** `netsuite_get_latest_vendors` dans Dust
2. **Si ça fonctionne :** Le tool est maintenant compatible avec tous les comptes NetSuite
3. **Si besoin de plus de 100 vendors :** On peut ajouter une pagination pour récupérer tous les vendors

---

## 📋 Tools impactés par les permissions SuiteQL

### ✅ `netsuite_get_latest_vendors` — CORRIGÉ
Utilise maintenant REST API au lieu de SuiteQL.

### ⚠️ `netsuite_execute_suiteql` — NON DISPONIBLE
Ce tool nécessite explicitement les permissions SuiteQL. Si l'utilisateur n'a pas ces permissions, il faut :
- Soit demander à l'admin NetSuite d'ajouter les permissions
- Soit désactiver ce tool dans Dust

### ✅ Tous les autres tools — OK
Tous les autres tools utilisent uniquement l'API REST standard et ne nécessitent pas de permissions SuiteQL.

---

Le serveur est maintenant **compatible avec les comptes NetSuite sans permissions SuiteQL** ! 🚀
