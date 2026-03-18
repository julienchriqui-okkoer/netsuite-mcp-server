# ✅ Version Simplifiée Déployée

## 🔧 **Changements Appliqués**

Les tools `create_vendor` et `update_vendor` ont été **simplifiés à 4 paramètres maximum** pour contourner le bug MCP SDK.

### `netsuite_create_vendor` (SIMPLIFIÉ)

**Paramètres disponibles** :
- ✅ `companyName` (required)
- ✅ `subsidiary` (required) 
- ✅ `email` (optional)
- ✅ `externalId` (optional)

**Paramètres RETIRÉS** (utiliser Postman pour ces champs) :
- ❌ `phone`, `vatRegNumber`, `legalName`, `isPerson`
- ❌ `department`, `location`, `class`, `category`
- ❌ `currency`, `terms`, `accountNumber`, `defaultAddress`

### `netsuite_update_vendor` (SIMPLIFIÉ)

**Paramètres disponibles** :
- ✅ `id` (required)
- ✅ `companyName` (optional)
- ✅ `email` (optional)
- ✅ `externalId` (optional)

---

## 🧪 **Test dans Dust**

Utilise ce prompt pour tester la version simplifiée :

```
Teste la création d'un vendor NetSuite avec la version simplifiée :

Tool: netsuite_create_vendor
Params: {
  "companyName": "Test Vendor Simplified",
  "subsidiary": "1",
  "email": "test.simplified@example.com",
  "externalId": "DUST-SIMPLE-001"
}

Affiche le résultat complet.
```

---

## 🎯 **Hypothèse Confirmée**

- ✅ **vendor_bill** avec 10 paramètres → Fonctionne
- ❌ **vendor** avec 20 paramètres → Ne fonctionne pas
- ✅ **vendor** avec 4 paramètres → À tester

**Conclusion** : Le MCP SDK a une limite sur le nombre de paramètres destructurés (~10-15 max).

---

## 🔄 **Workflow Recommandé**

### Pour créer un vendor COMPLET (avec tous les champs) :

1. **Utilise Postman** pour créer le vendor avec tous les champs :
   ```json
   {
     "companyName": "...",
     "subsidiary": {"id": "1"},
     "email": "...",
     "phone": "...",
     "vatRegNumber": "...",
     "externalId": "...",
     "isPerson": false,
     "addressbook": { ... }
   }
   ```

2. **Utilise le MCP tool** pour les opérations simples :
   - Mise à jour du nom/email
   - Recherche par externalId
   - Liste des vendors

---

## 📝 **Prochaine Étape**

**Teste dans Dust** avec le prompt ci-dessus et confirme que la version simplifiée fonctionne !
