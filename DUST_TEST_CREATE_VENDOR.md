# 🧪 DUST TEST PROMPT — Fixed `netsuite_create_vendor`

## 🎯 Test Complet du Workflow

```
Teste le workflow complet de création de vendor dans NetSuite :

1. Découvre les custom forms disponibles :
   Tool: netsuite_get_vendor_forms
   → Note le premier form ID trouvé

2. Crée un vendor avec ce custom form :
   - companyName: "Dust Test Vendor Corp"
   - subsidiary: "1"
   - email: "test.dust@example.com"
   - customForm: [utilise le form ID de l'étape 1]
   - externalId: "DUST-VENDOR-TEST-001"
   - Adresse: 123 Main St, Paris, 75001, FR

3. Vérifie que le vendor a été créé en récupérant ses détails :
   Tool: netsuite_get_vendor_by_id avec l'ID retourné

4. Essaie de créer le même vendor une 2e fois (même externalId)
   → NetSuite doit retourner "entity already exists"

Donne-moi :
- Le form ID trouvé
- L'ID du vendor créé
- Les détails du vendor
- La confirmation que le duplicate est détecté
```

---

## ✅ Résultat Attendu

### Étape 1: Découverte des Forms
```json
{
  "forms": [
    { "id": "297", "name": "Custom Form 297" }
  ],
  "count": 1
}
```

### Étape 2: Création du Vendor
```json
{
  "success": true,
  "id": "136683",
  "location": "https://...netsuite.com/.../vendor/136683"
}
```

### Étape 3: Vérification
```json
{
  "id": "136683",
  "companyName": "Dust Test Vendor Corp",
  "email": "test.dust@example.com",
  "customForm": {
    "id": "297",
    "refName": "Custom Form Name"
  },
  "externalId": "DUST-VENDOR-TEST-001",
  "addressbook": { ...adresse... }
}
```

### Étape 4: Idempotence
```
NetSuite 400: This entity already exists
```
✅ **Attendu** — NetSuite détecte le duplicate via `externalId`

---

## 🚀 Test Rapide (Simplifié)

```
Crée un vendor dans NetSuite avec ces paramètres :

1. D'abord, appelle netsuite_get_vendor_forms pour obtenir un form ID

2. Puis crée le vendor :
   - companyName: "Quick Test Vendor"
   - subsidiary: "1"
   - email: "quick@example.com"
   - customForm: [form ID de l'étape 1]
   - externalId: "DUST-QUICK-001"
   - addr1: "123 Test St"
   - city: "Paris"
   - zip: "75001"
   - country: "FR"

Donne-moi l'ID du vendor créé.
```

---

## 📊 Checklist de Validation

Après le test sur Dust, vérifie que :

- [ ] ✅ `netsuite_get_vendor_forms` retourne au moins 1 form ID
- [ ] ✅ `netsuite_create_vendor` fonctionne AVEC `customForm`
- [ ] ✅ Le vendor créé a bien le `customForm.id` attendu
- [ ] ✅ L'`externalId` est bien sauvegardé
- [ ] ✅ L'adresse est correctement enregistrée
- [ ] ✅ Pas d'erreur 400 "Bad Request"
- [ ] ✅ La tentative de re-création détecte le duplicate

---

## 🎯 Ce Qui a été Fixé

### Avant (❌ Broken)
```
netsuite_create_vendor({ companyName: "Test", subsidiary: "1" })
→ NetSuite 400: Bad Request (no details)
```

### Après (✅ Fixed)
```
1. netsuite_get_vendor_forms()
   → { forms: [{ id: "297" }] }

2. netsuite_create_vendor({
     companyName: "Test",
     subsidiary: "1",
     customForm: "297",      // ← NEW
     customFields: { ... },  // ← NEW
     externalId: "...",      // ← Idempotency
     addr1: "...", city: "...", zip: "...", country: "..."
   })
   → { success: true, id: "136683" } ✅
```

---

## 💡 Notes Importantes

1. **Custom Forms sont Obligatoires** dans cette instance NetSuite
   - Toujours utiliser `netsuite_get_vendor_forms` d'abord
   - Inclure `customForm` avec l'ID découvert

2. **Adresse Requise**
   - NetSuite exige au minimum : `addr1`, `city`, `zip`, `country`
   - Structure nested : `addressbook.items[].addressbookAddress`

3. **Idempotence via ExternalId**
   - Le pre-flight SuiteQL check peut échouer (permissions)
   - Mais NetSuite valide quand même l'unicité de `externalId`
   - Erreur "entity already exists" est **attendue** pour les duplicates

4. **Custom Fields**
   - Utiliser `customFields: { "custentity_xxx": "value" }`
   - Les fields sont sérialisés directement dans le body

---

*Dernière mise à jour : 2026-03-12*
*Status : ✅ Tous les tests passent*
*Ready for Dust : 🎉 OUI*
