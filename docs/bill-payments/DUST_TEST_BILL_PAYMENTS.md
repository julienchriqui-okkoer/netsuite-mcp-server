# 🧪 DUST TEST PROMPTS — Bill Payment Tools

## ✅ Test 1 : Lister les Paiements Fournisseurs

**Prompt Dust :**
```
Liste les 5 derniers paiements fournisseurs dans NetSuite
```

**Résultat Attendu :**
- ✅ Liste de 5 paiements avec leurs IDs
- ✅ Liens de pagination
- ✅ Structure : `{ items: [...], links: [...] }`

---

## ✅ Test 2 : Récupérer un Paiement par ID

**Prompt Dust :**
```
Récupère les détails du paiement fournisseur ID 1340036 dans NetSuite
```

**Résultat Attendu :**
- ✅ Détails complets du paiement (vendor, account, tranDate, currency, apply, etc.)
- ✅ Champ `externalId` si présent
- ✅ Montant total et liste des factures payées

---

## 🎯 Test 3 : Workflow Complet — Créer Vendor, Bill, et Payment

**Prompt Dust :**
```
Crée un workflow complet dans NetSuite :

1. Crée un nouveau vendor avec ces infos :
   - Nom : "Test Payment Workflow Corp"
   - Email : test.payment@example.com
   - Subsidiary : 1
   - Adresse : 123 Main St, Paris, 75001, FR
   - External ID : DUST-VENDOR-PAYMENT-001

2. Crée une vendor bill pour ce vendor :
   - Date : 2026-03-12
   - Subsidiary : 1
   - Expense line : account 1210, montant 150.00, memo "Services consulting"
   - External ID : DUST-BILL-PAYMENT-001

3. Crée un bill payment pour payer cette facture :
   - Account : 857 (compte bancaire)
   - Date : 2026-03-12
   - Currency : 1 (EUR)
   - Apply le paiement à la bill créée à l'étape 2
   - Memo : "Paiement via Dust MCP"
   - External ID : DUST-PAYMENT-001

Donne-moi les IDs de chaque création et confirme que le paiement a bien été appliqué à la facture.
```

**Résultat Attendu :**
- ✅ Vendor créé : `{ success: true, id: "xxxxx" }`
- ✅ Bill créée : `{ success: true, id: "xxxxx" }`
- ✅ Payment créé : `{ success: true, id: "xxxxx" }`
- ✅ Confirmation que le payment a été appliqué à la bill

---

## ✅ Test 4 : Créer un Payment avec Apply (données réelles)

**Prompt Dust :**
```
Crée un paiement fournisseur dans NetSuite avec ces détails :
- Vendor ID : 136482
- Bank Account : 857
- Date : 2026-03-12
- Currency : 1 (EUR)
- Memo : "Test paiement via Dust MCP"
- External ID : DUST-PAYMENT-TEST-002
- Apply ce paiement à la vendor bill ID 1339937 pour un montant de 100.00 EUR

Confirme la création et donne-moi l'ID du paiement créé.
```

**Résultat Attendu :**
- ✅ Paiement créé : `{ success: true, id: "xxxxx", location: "..." }`
- ✅ ID du paiement retourné
- ✅ Pas d'erreur 400 ou 500

---

## ✅ Test 5 : Créer un Payment Sans Apply (unapplied)

**Prompt Dust :**
```
Crée un paiement fournisseur NON APPLIQUÉ dans NetSuite :
- Vendor ID : 136482
- Bank Account : 857
- Date : 2026-03-12
- Currency : 1 (EUR)
- Memo : "Paiement non appliqué - à répartir manuellement"
- External ID : DUST-UNAPPLIED-PAYMENT-001

Note : Ne pas inclure de "apply" - je veux un paiement non appliqué.
```

**Résultat Attendu :**
- ✅ Paiement créé : `{ success: true, id: "xxxxx" }`
- ✅ Paiement créé SANS erreur (même sans `apply`)
- ✅ Peut être appliqué manuellement dans NetSuite UI plus tard

---

## ✅ Test 6 : Vérifier le Dernier Payment Créé

**Prompt Dust :**
```
Liste les 3 derniers paiements fournisseurs dans NetSuite et affiche leurs détails :
- ID du paiement
- Vendor
- Date
- Montant
- External ID (si présent)
- Factures appliquées (si présent)
```

**Résultat Attendu :**
- ✅ Liste des 3 derniers paiements
- ✅ Les paiements créés dans les tests précédents apparaissent
- ✅ `externalId` visible pour les paiements de test

---

## 🎯 Test 7 : Workflow Spendesk-like (Réaliste)

**Prompt Dust :**
```
Simule un workflow Spendesk → NetSuite :

1. Récupère le vendor ID pour "Final Test Corp" (ou utilise ID 136482)

2. Récupère les vendor bills non payées pour ce vendor

3. Crée un paiement pour payer la première bill trouvée :
   - Account bancaire : 857
   - Date du jour
   - Currency : 1
   - Memo : "Paiement Spendesk Settlement - {settlement_id}"
   - External ID : SPENDESK-SETTLEMENT-{timestamp}
   - Apply le montant exact de la bill

4. Confirme que le paiement a bien été créé et appliqué
```

**Résultat Attendu :**
- ✅ Vendor trouvé
- ✅ Bills listées
- ✅ Payment créé et appliqué
- ✅ Workflow complet sans erreur

---

## 📊 Checklist de Validation

Après avoir lancé les tests sur Dust, vérifie que :

- [ ] ✅ `netsuite_get_bill_payments` liste les paiements
- [ ] ✅ `netsuite_get_bill_payment` récupère un paiement par ID
- [ ] ✅ `netsuite_create_bill_payment` crée un paiement AVEC apply
- [ ] ✅ `netsuite_create_bill_payment` crée un paiement SANS apply (unapplied)
- [ ] ✅ Le workflow complet Vendor → Bill → Payment fonctionne
- [ ] ✅ Les `externalId` sont bien sauvegardés
- [ ] ✅ Les paiements créés apparaissent dans la liste
- [ ] ✅ Pas d'erreur 400, 500 ou MCP

---

## 🚀 Quick Test (Simple)

**Si tu veux juste tester rapidement :**

```
Crée un paiement fournisseur dans NetSuite :
- Vendor : 136482
- Account : 857
- Date : 2026-03-12
- Currency : 1
- Memo : "Test rapide Dust"
- External ID : DUST-QUICK-TEST-001
- Apply à la bill 1339937 pour 100 EUR

Donne-moi l'ID du paiement créé.
```

**Résultat attendu : `{ success: true, id: "xxxxx" }`** ✅

---

*Dernière mise à jour : 2026-03-12*
*Version : 1.0 - Post-validation Postman*
