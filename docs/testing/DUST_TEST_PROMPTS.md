# 🧪 PROMPTS DE TEST DUST — MCP NetSuite Server

## 📋 Tests Prioritaires (3 tools critiques)

### Test 1 : `netsuite_create_vendor` ⭐ (Le plus important)

```
Teste la création d'un vendor NetSuite avec tous les champs validés :

Tool: netsuite_create_vendor
Params: {
  "companyName": "Test Vendor Dust Complete",
  "subsidiary": "1",
  "email": "test.dust.complete@example.com",
  "phone": "+33 1 23 45 67 89",
  "externalId": "DUST-TEST-001",
  "isPerson": false,
  "addr1": "10 rue de la Paix",
  "city": "Paris",
  "zip": "75002",
  "country": "FR"
}

Affiche le résultat complet avec l'ID du vendor créé.
```

**Résultat attendu** :
```json
{
  "success": true,
  "id": "XXXXX",
  "location": "https://YOUR_ACCOUNT_ID-sb1.suitetalk.api.netsuite.com/services/rest/record/v1/vendor/XXXXX"
}
```

---

### Test 2 : `netsuite_get_vendor_by_id` ⭐ (Nouvellement réactivé)

```
Récupère le vendor NetSuite que tu viens de créer avec son ID :

Tool: netsuite_get_vendor_by_id
Params: {
  "id": "[utilise l'ID retourné par create_vendor]"
}

Affiche les détails complets du vendor.
```

**Résultat attendu** : Objet JSON avec tous les détails du vendor (companyName, email, addressbook, etc.)

---

### Test 3 : `netsuite_get_employee` ⭐ (Nouvellement réactivé)

```
Récupère un employé NetSuite par son ID :

Tool: netsuite_get_employee
Params: {
  "id": "5"
}

Affiche les détails de l'employé.
```

**Résultat attendu** : Objet JSON avec les détails de l'employé

---

## 🔄 Tests Complémentaires (Validation d'intégration)

### Test 4 : Recherche de vendors

```
Liste les 5 derniers vendors créés dans NetSuite :

Tool: netsuite_get_latest_vendors
Params: {
  "limit": 5
}

Affiche la liste avec leurs détails principaux.
```

---

### Test 5 : Récupération de données de référence

```
Récupère les subsidiaries disponibles dans NetSuite :

Tool: netsuite_get_subsidiaries

Affiche la liste complète des subsidiaries.
```

---

### Test 6 : Création d'une vendor bill (facture)

```
Crée une facture fournisseur pour le vendor que tu as créé :

Tool: netsuite_create_vendor_bill
Params: {
  "entity": "[ID du vendor créé au Test 1]",
  "subsidiary": "1",
  "tranDate": "2026-03-12",
  "memo": "Test invoice from Dust",
  "externalId": "DUST-BILL-001",
  "expense": [{
    "account": "404",
    "amount": 100.00,
    "memo": "Test expense"
  }]
}

Affiche le résultat avec l'ID de la facture créée.
```

---

## 📊 Scénario Complet — Flux Spendesk → NetSuite

### Prompt Complet (Toutes les étapes)

```
Simule un flux complet d'intégration Spendesk → NetSuite :

1. Crée un nouveau vendor (fournisseur) :
   Tool: netsuite_create_vendor
   Params: {
     "companyName": "Acme Corp",
     "subsidiary": "1",
     "email": "contact@acmecorp.com",
     "phone": "+33 1 23 45 67 89",
     "externalId": "SPENDESK-ACME-001",
     "isPerson": false,
     "addr1": "123 rue de Rivoli",
     "city": "Paris",
     "zip": "75001",
     "country": "FR"
   }

2. Vérifie que le vendor a bien été créé :
   Tool: netsuite_get_vendor_by_id
   Params: { "id": "[ID du vendor créé]" }

3. Crée une facture pour ce vendor :
   Tool: netsuite_create_vendor_bill
   Params: {
     "entity": "[ID du vendor créé]",
     "subsidiary": "1",
     "tranDate": "2026-03-12",
     "memo": "Invoice from Spendesk",
     "externalId": "SPENDESK-INV-001",
     "expense": [{
       "account": "404",
       "amount": 250.00,
       "memo": "Software subscription"
     }]
   }

4. Affiche un résumé de toutes les opérations effectuées.
```

---

## ✅ Critères de Succès

### Pour chaque test, vérifie que :

**✅ Pas d'erreur MCP** :
- Pas de `MCP error -32602`
- Pas de `Missing required parameter`
- Pas de `Invalid tools/call result`

**✅ Pas d'erreur NetSuite** :
- Status code 200 ou 204 (succès)
- Objet de retour valide avec `id` pour les créations
- Données complètes pour les récupérations

**✅ Format de réponse correct** :
- Pour créations : `{ success: true, id: "...", location: "..." }`
- Pour récupérations : Objet JSON avec les données complètes

---

## 🚀 Ordre Recommandé

1. **Test 1** (`create_vendor`) — Le plus critique
2. **Test 2** (`get_vendor_by_id`) — Vérification immédiate
3. **Test 3** (`get_employee`) — Validation du fix
4. **Test 6** (`create_vendor_bill`) — Intégration complète

Les tests 4 et 5 sont optionnels mais recommandés pour valider l'ensemble.

---

## 📝 Notes Importantes

- Utilise des `externalId` uniques pour chaque test (ajoute un timestamp si besoin)
- Si une erreur "already exists" apparaît, change juste l'`externalId`
- Pour les IDs NetSuite, utilise toujours des strings (ex: `"1"` et non `1`)
- Le `country` doit être un code ISO comme `"FR"`, `"US"`, etc.

**Commence par le Test 1 et partage le résultat ! 🚀**
