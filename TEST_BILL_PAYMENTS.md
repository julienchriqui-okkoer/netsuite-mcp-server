# ✅ TEST RÉSULTATS — Bill Payment Tools

## ✅ TEST 1: `netsuite_get_bill_payments` — SUCCÈS

```bash
✅ GET /vendorpayment fonctionne correctement
✅ Retourne une liste de 1000+ paiements
✅ Pagination fonctionnelle
```

## ❌ TEST 2: `netsuite_create_bill_payment` — ÉCHEC

### Erreur
```
NetSuite 400: Bad Request
```

### Body Envoyé
```json
{
  "entity": { "id": "136288" },
  "account": { "id": "1210" },
  "tranDate": "2026-03-12",
  "subsidiary": { "id": "1" },
  "memo": "Test payment from MCP script",
  "externalId": "TEST-PAY-xxx"
}
```

### Hypothèses de Cause
1. **Account non-bancaire** : L'account `1210` n'est peut-être pas un compte bancaire valide pour les paiements
2. **Champs manquants** : NetSuite peut requérir des champs supplémentaires (e.g., `currency`, `exchangeRate`)
3. **Permission insuffisante** : Le role TBA n'a peut-être pas la permission de créer des vendor payments
4. **Vendor non-payable** : Le vendor `136288` n'a peut-être pas de factures en attente de paiement

### 🔍 Prochaines Étapes
1. Tester dans Postman avec OAuth correct pour isoler le problème
2. Regarder la structure exacte d'un paiement existant (GET /vendorpayment/{id})
3. Vérifier les permissions NetSuite pour "Vendor Payment" (Create)

## 📊 Résumé
- **netsuite_get_bill_payments** : ✅ 100% fonctionnel
- **netsuite_create_bill_payment** : ❌ À débugger (400 Bad Request)
