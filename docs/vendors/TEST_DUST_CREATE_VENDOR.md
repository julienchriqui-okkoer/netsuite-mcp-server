# 🧪 Test Dust : Create Vendor

Postman fonctionne ✅ → Teste maintenant dans Dust pour voir si l'environnement MCP officiel gère mieux les paramètres.

---

## Prompt de Test Dust

```
Teste la création d'un vendor NetSuite avec les mêmes champs que Postman :

Tool: netsuite_create_vendor
Params: {
  "companyName": "Test Vendor from Dust",
  "subsidiary": "1",
  "email": "test.vendor.dust@example.com",
  "phone": "+33 1 23 45 67 89",
  "externalId": "DUST-VENDOR-TEST-001",
  "isPerson": false
}

Affiche le résultat complet.
```

---

## Résultats Possibles

### ✅ Si ça marche dans Dust :
```
Vendor created successfully!
ID: 123456
External ID: DUST-VENDOR-TEST-001
```

→ **Problème résolu !** Le tool fonctionne en production.  
→ Le problème était l'environnement de test curl/Railway local.

### ❌ Si "Missing required parameter: companyName" :
```
Error: Missing required parameter: companyName (string)
```

→ **Bug MCP SDK confirmé même dans Dust**  
→ Solutions :
1. Créer un tool simplifié `create_vendor_minimal` avec 2-3 champs max
2. Utiliser Postman/API directe pour créer les vendors
3. Reporter le bug à l'équipe MCP SDK

### ❌ Si autre erreur NetSuite :
→ Analysons l'erreur pour ajuster le tool

---

## Note sur addressbook

Le body Postman inclut `addressbook` avec une structure complexe :
```json
"addressbook": {
  "items": [
    {
      "defaultBilling": true,
      "addressbookAddress": {
        "addr1": "10 rue de la Paix",
        "city": "Paris",
        "zip": "75002",
        "country": {"id": "FR"}
      }
    }
  ]
}
```

Le tool actuel utilise `defaultAddress` (string simple).  
Si Dust demande une adresse structurée, on devra adapter le tool.

---

## Prochaines Étapes

1. **Test dans Dust** avec le prompt ci-dessus
2. **Si ça marche** → Tool validé, problème résolu ✅
3. **Si ça ne marche pas** → On crée un workaround (script direct ou tool minimal)
