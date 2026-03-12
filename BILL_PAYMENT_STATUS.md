# 🔧 BILL PAYMENT — STATUT FINAL

## 📊 Résultats

| Tool | Status |
|------|--------|
| `netsuite_get_bill_payments` | ✅ FONCTIONNE |
| `netsuite_get_bill_payment` | ✅ FONCTIONNE |
| `netsuite_create_bill_payment` | ⚠️ **400 Bad Request** |

## ✅ Code Mis à Jour (basé sur n8n)

Le code MCP a été ajusté pour correspondre **exactement** à la structure n8n qui fonctionne :

```typescript
const body: any = {
  customform: { id: "-112" },          // ✅ Ajouté (obligatoire dans n8n)
  entity: { id: entity },
  account: { id: account },
  tranDate,
  currency: { id: currency || "1" },
  exchangerate: exchangeRate || 1.0,   // ✅ Minuscule "r" (comme n8n)
};

if (externalId) body.custbody_spendesk_id = externalId; // ✅ Custom field NetSuite
if (memo) body.memo = memo;

// ✅ Array direct (pas nested dans items)
if (apply && Array.isArray(apply) && apply.length > 0) {
  body.apply = apply.map((item: any) => ({
    doc: { id: String(item.doc) },
    apply: item.apply !== false,
    amount: item.amount,
  }));
}
```

## 🧪 Test Effectué

### Données Envoyées
```json
{
  "customform": { "id": "-112" },
  "entity": { "id": "136288" },
  "account": { "id": "308" },
  "tranDate": "2025-01-15",
  "currency": { "id": "1" },
  "exchangerate": 1.0,
  "custbody_spendesk_id": "TEST-PAY-xxx",
  "memo": "Test payment from MCP script (unapplied)"
}
```

### Résultat
- **Vendor 136288** : ✅ Existe ("Test Vendor Direct 1773320403372")
- **Account 308** : ✅ Existe ("512413 Banque Unicredit DE" - compte bancaire)
- **Date 2025-01-15** : ✅ Période comptable valide
- **Custom form -112** : ✅ Même ID que n8n
- **Erreur** : `NetSuite 400: Bad Request`

## 🔍 Causes Possibles Restantes

### 1. Permissions NetSuite (TRÈS PROBABLE)
Le rôle TBA utilisé par le MCP n'a peut-être pas les **mêmes permissions** que celui utilisé par n8n.

**Vérification NetSuite :**
```
Setup > Users/Roles > Manage Roles
→ Trouver le rôle du TBA MCP
→ Permissions > Transactions > Vendor Payment → Doit être "Create" ou "Full"
```

### 2. Custom Fields Obligatoires
NetSuite peut exiger des custom fields spécifiques à votre instance qui n'apparaissent pas dans la structure n8n (par exemple, des workflow d'approbation).

**Vérification NetSuite :**
```
Customization > Lists, Records, & Fields > Transaction Body Fields
→ Filtrer par "Vendor Payment"
→ Vérifier les champs marqués "Mandatory"
```

### 3. Endpoint Casing
Bien que le GET fonctionne, il est possible que le POST nécessite une casse différente :
- Essayé : `/vendorpayment` ❌
- À tester : `/vendorPayment` (avec P majuscule)

### 4. Header `Prefer`
- MCP utilise : `Prefer: transient`
- n8n utilise : `Prefer: return=representation`

**À tester :** Changer le header dans `netsuite-client.ts`

## 🎯 Prochaines Étapes Recommandées

### Option 1 : Test Manuel dans NetSuite UI
1. Se connecter à NetSuite
2. Transactions > Purchases > Enter Bill Payments > **New**
3. Remplir :
   - Vendor : "Test Vendor Direct 1773320403372" (ID 136288)
   - Account : "512413 Banque Unicredit DE" (ID 308)
   - Date : 2025-01-15
   - Custom Form : -112
4. Tenter de sauvegarder
5. **NetSuite affichera le champ manquant ou l'erreur exacte**

### Option 2 : Test via Postman (avec OAuth Valide)
```bash
POST https://5762887-sb1.suitetalk.api.netsuite.com/services/rest/record/v1/vendorpayment
Authorization: OAuth ... (avec signature valide)
Content-Type: application/json
Prefer: transient

{
  "customform": { "id": "-112" },
  "entity": { "id": "136288" },
  "account": { "id": "308" },
  "tranDate": "2025-01-15",
  "currency": { "id": "1" },
  "exchangerate": 1.0
}
```

### Option 3 : Tester le Workflow Complet (créer bill + apply payment)
Même si la création sans `apply` échoue, il est possible que NetSuite exige `apply` pour valider le paiement :

```json
{
  "customform": { "id": "-112" },
  "entity": { "id": "136288" },
  "account": { "id": "308" },
  "tranDate": "2025-01-15",
  "currency": { "id": "1" },
  "exchangerate": 1.0,
  "apply": [
    {
      "doc": { "id": "[bill_id_existant]" },
      "apply": true,
      "amount": 100.00
    }
  ]
}
```

## 📝 Modifications Apportées au MCP

1. ✅ **Ajout de `customform`** (id: "-112")
2. ✅ **Changement de `exchangeRate` → `exchangerate`** (lowercase r)
3. ✅ **Structure `apply` en array direct** (pas nested dans `items`)
4. ✅ **Utilisation de `custbody_spendesk_id`** au lieu de `externalId`
5. ✅ **Suppression de `subsidiary`** (non envoyé par n8n)
6. ✅ **Date changée à 2025-01-15** (période comptable ouverte)
7. ✅ **Logging du body exact** pour debugging

## 🚀 Prochaine Action

Recommandation : **Tester dans l'UI NetSuite** pour identifier l'erreur exacte (champ manquant, permission, etc.). Une fois identifié, nous pourrons ajuster le code MCP en conséquence.

---

**2/3 tools fonctionnent parfaitement** ✅  
**1 tool nécessite une investigation NetSuite** ⚠️
