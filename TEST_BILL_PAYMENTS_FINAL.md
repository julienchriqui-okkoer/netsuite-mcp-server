# ✅ TEST BILL PAYMENT TOOLS — RÉSULTATS

## 📊 Résumé

| Tool | Status | Note |
|------|--------|------|
| `netsuite_get_bill_payments` | ✅ **SUCCÈS** | Liste les paiements avec pagination |
| `netsuite_get_bill_payment` | ✅ **SUCCÈS** | Récupère un paiement par ID |
| `netsuite_create_bill_payment` | ⚠️ **BLOQUÉ** | NetSuite 400 Bad Request |

## ✅ Tools Fonctionnels

### 1. `netsuite_get_bill_payments`
- ✅ Liste les paiements fournisseurs
- ✅ Pagination fonctionnelle
- ✅ 1000+ paiements disponibles dans l'instance

### 2. `netsuite_get_bill_payment`
- ✅ Récupère un paiement complet par ID
- ✅ Tous les champs retournés (entity, account, subsidiary, currency, apply, memo, etc.)
- ✅ Utilisé pour inspecter la structure d'un paiement existant

## ⚠️ Tool Bloqué : `netsuite_create_bill_payment`

### Symptôme
```
NetSuite 400: Bad Request
```

### Body Envoyé (après corrections)
```json
{
  "entity": { "id": "136288" },
  "account": { "id": "308" },      // ← Compte bancaire valide d'un payment existant
  "tranDate": "2026-03-12",
  "subsidiary": { "id": "1" },
  "currency": { "id": "1" },       // ← EUR
  "exchangeRate": 1,
  "memo": "Test payment from MCP script",
  "externalId": "TEST-PAY-xxx"
}
```

### Corrections Apportées
1. ✅ Ajout de `subsidiary` (id: "1")
2. ✅ Ajout de `currency` (id: "1" pour EUR)
3. ✅ Ajout de `exchangeRate` (default: 1)
4. ✅ Utilisation d'un `account` bancaire valide (id: "308")
5. ✅ Structure `apply.items[]` corrigée (au lieu de `applyList.apply[]`)

### Causes Possibles du 400

#### 1. 🔐 **Permissions Insuffisantes** (Probable)
Le rôle TBA n'a peut-être pas la permission de **créer** des vendor payments.

**Vérification NetSuite :**
- Setup > Users/Roles > Manage Roles
- Trouver le rôle associé au TBA
- Permissions > Transactions > **Vendor Payment** → Doit être **Create** ou **Full**

#### 2. 📅 **Date Invalide**
La date `2026-03-12` est peut-être en dehors de la période comptable autorisée.

**Solution :** Utiliser une date dans la période comptable ouverte (ex: `2025-01-15`)

#### 3. 💰 **Compte Non-Bancaire**
Même si `308` apparaît dans un paiement existant, il est possible que ce ne soit pas un compte valide pour créer de **nouveaux** paiements.

**Vérification NetSuite :**
- Setup > Accounting > Chart of Accounts
- Vérifier que le compte `308` est de type "Bank"
- Vérifier qu'il n'est pas **inactif**

#### 4. 🚫 **Vendor Non-Payable**
Le vendor `136288` n'a peut-être pas de factures impayées, ce qui rend le paiement invalide sans `apply.items`.

**Solution :** 
- Créer d'abord une vendor bill
- Puis créer le payment avec `applyList` pour l'appliquer à cette bill

#### 5. 📋 **Champ Obligatoire Manquant**
NetSuite peut exiger un champ custom ou standard non documenté (ex: `apAcct`, `customForm`, `postingPeriod`).

**Inspection :** Le paiement existant (ID 567931) contient des champs qu'on n'envoie pas :
```json
{
  "apAcct": { "id": "1217" },        // ← AP Account ?
  "customForm": { "id": "134" },     // ← Custom form ?
  "postingPeriod": { "id": "241" },  // ← Posting period ?
  ...
}
```

## 🔧 Prochaines Étapes Recommandées

### Option 1 : Débugger dans NetSuite UI
1. Se connecter à NetSuite
2. Transactions > Purchases > Enter Bill Payments > **New**
3. Remplir avec les mêmes données (vendor 136288, account 308, date 2026-03-12)
4. Tenter de sauvegarder → NetSuite affichera l'erreur précise

### Option 2 : Tester via Postman avec OAuth Valide
Créer un paiement avec l'API directe :
```bash
POST /services/rest/record/v1/vendorpayment
Authorization: OAuth ...
Content-Type: application/json
Prefer: transient

{
  "entity": { "id": "136288" },
  "account": { "id": "308" },
  "tranDate": "2025-01-15",
  "subsidiary": { "id": "1" },
  "currency": { "id": "1" },
  "exchangeRate": 1
}
```

### Option 3 : Tester avec un Workflow Complet
1. Créer un vendor → Récupérer son ID
2. Créer une vendor bill pour ce vendor → Récupérer bill ID
3. Créer un payment avec `apply.items` :
   ```json
   {
     "entity": { "id": "[vendor_id]" },
     "account": { "id": "308" },
     "tranDate": "2025-01-15",
     "subsidiary": { "id": "1" },
     "currency": { "id": "1" },
     "apply": {
       "items": [{
         "doc": { "id": "[bill_id]" },
         "apply": true,
         "amount": 100.00
       }]
     }
   }
   ```

## 📝 Conclusion

**2 tools sur 3 fonctionnent parfaitement** :
- ✅ `netsuite_get_bill_payments` : Liste les paiements
- ✅ `netsuite_get_bill_payment` : Récupère un paiement par ID

**1 tool bloqué** :
- ⚠️ `netsuite_create_bill_payment` : 400 Bad Request (permissions ou configuration NetSuite)

**Recommandation :** Tester d'abord via l'UI NetSuite ou Postman pour identifier l'erreur exacte, puis ajuster le tool MCP en conséquence.
