# 🔍 Guide de Debug: Create Vendor Permissions

## Problème Actuel

Le tool `netsuite_create_vendor` ne reçoit pas les paramètres correctement via le MCP SDK.

**Symptôme:** `Missing required parameter: companyName` même quand le paramètre est envoyé.

**Outils qui fonctionnent:** `netsuite_get_vendors`, `netsuite_create_vendor_bill` (même pattern!)

---

## 🧪 Options de Debug

### Option 1: Test Direct dans Postman (RECOMMANDÉ)

1. **Importe la collection Postman** : `NetSuite-API.postman_collection.json`

2. **Configure les variables** (Edit Collection > Variables) :
   ```
   base_url: https://5762887-sb1.suitetalk.api.netsuite.com
   account_realm: 5762887_SB1
   consumer_key: <from .env NETSUITE_CONSUMER_KEY>
   consumer_secret: <from .env NETSUITE_CONSUMER_SECRET>
   token_id: <from .env NETSUITE_TOKEN_ID>
   token_secret: <from .env NETSUITE_TOKEN_SECRET>
   ```

3. **Lance la requête "Create Vendor"** :
   - Ouvre: Vendor > Create Vendor
   - Body actuel:
     ```json
     {
       "entityId": "SUPPLIER-001",
       "companyName": "Fournisseur Test",
       "email": "contact@fournisseur.fr",
       "custentity_spendesk_id": "{{spendesk_id}}"
     }
     ```

4. **Teste avec body MINIMAL** (pour isoler le problème) :
   ```json
   {
       "companyName": "Test Minimal",
       "subsidiary": { "id": "6" }
   }
   ```

5. **Analyse la réponse** :

   **✅ Si 200 OK avec un ID** :
   ```json
   {
     "id": "123456",
     "companyName": "Test Minimal",
     ...
   }
   ```
   → **Permissions OK !** Le problème est au niveau du MCP SDK

   **❌ Si 403 INSUFFICIENT_PERMISSION** :
   ```json
   {
     "o:errorCode": "INSUFFICIENT_PERMISSION"
   }
   ```
   → **Pas de permissions** - Va dans NetSuite :
   - Setup > Users/Roles > User Management
   - Cherche ton rôle (ou Integration Administrator)
   - Lists > Vendors → Create (doit être coché)

   **❌ Si 400 REQUIRED_FIELD_MISSING** :
   ```json
   {
     "o:errorCode": "REQUIRED_FIELD_MISSING",
     "detail": "Field XXX is required"
   }
   ```
   → **Champs manquants** - Ajoute le champ requis au body

---

### Option 2: Test dans Dust (PLUS SIMPLE)

1. **Va dans Dust** et utilise ce prompt :

```
Teste la création d'un vendor NetSuite pour vérifier les permissions :

Tool: netsuite_create_vendor
Params: {
  "companyName": "Dust Permission Test",
  "subsidiary": "6",
  "email": "test@dust-permission-test.fr",
  "externalId": "dust_perm_test_001"
}

Affiche le résultat complet (erreur ou succès).
```

2. **Analyse le résultat Dust** :

   **✅ Si succès** :
   ```
   Vendor created successfully!
   ID: 123456
   ```
   → Le tool fonctionne dans Dust ! (l'environnement MCP est différent)

   **❌ Si "Missing required parameter: companyName"** :
   → Bug MCP SDK confirmé, même dans Dust

   **❌ Si "INSUFFICIENT_PERMISSION"** :
   → Problème de permissions NetSuite

---

### Option 3: Vérifier les Permissions NetSuite Manuellement

1. **Connecte-toi à NetSuite**

2. **Va dans Setup > Users/Roles > User Management > View Login Audit Trail**
   - Cherche les tentatives de login de ton Integration
   - S'il y a des "INSUFFICIENT_PERMISSION", tu verras quel champ/action est bloqué

3. **Vérifie ton rôle** (Setup > Users/Roles > Manage Roles) :
   - Cherche le rôle assigné à ton Token (ex: "Integration Administrator")
   - Onglet "Lists" :
     - Vendors : Create ✅ (doit être coché)
     - Vendors : Edit ✅
     - Vendors : View ✅

4. **Vérifie les champs custom** :
   - Setup > Customization > Entity Fields
   - Si tu as des champs custom sur Vendor avec "Mandatory" coché
   - Tu devras les ajouter au tool create_vendor

---

## 🎯 Prochaines Étapes Selon le Résultat

### Cas 1: Postman fonctionne = Permissions OK
→ **Le problème est MCP SDK / code**
   - Solutions:
     1. Tester dans Dust (environnement différent)
     2. Simplifier le tool (moins de paramètres)
     3. Créer une version "create_vendor_minimal" avec seulement 2-3 champs

### Cas 2: Postman échoue avec INSUFFICIENT_PERMISSION
→ **Problème de permissions NetSuite**
   - Solutions:
     1. Demander à l'admin NetSuite d'activer les permissions
     2. Créer un nouveau rôle avec les bonnes permissions
     3. Utiliser un autre Token avec plus de permissions

### Cas 3: Dust fonctionne mais pas curl/Railway
→ **Environnement MCP différent**
   - Solutions:
     1. Utiliser uniquement via Dust
     2. Documenter cette limitation
     3. Investiguer les différences entre SDK MCP versions

---

## 📝 Checklist de Debug

- [ ] Test Postman avec body minimal (companyName + subsidiary)
- [ ] Vérifier permissions NetSuite (Setup > Roles > Lists > Vendors > Create)
- [ ] Test dans Dust avec le prompt fourni
- [ ] Vérifier Login Audit Trail pour erreurs de permissions
- [ ] Si Postman OK mais MCP non → Bug MCP SDK confirmé
- [ ] Si Postman NON → Problème permissions NetSuite

---

## 💡 Workaround Immédiat

Si aucune solution ne marche, tu peux :

1. **Créer les vendors manuellement dans NetSuite** avec un externalId Spendesk
2. **Utiliser le tool `netsuite_update_vendor`** pour mettre à jour des vendors existants
3. **Utiliser SuiteQL** pour synchroniser les vendors si besoin

---

**Quelle option veux-tu tester en premier ?**

1. Postman (le plus fiable pour vérifier les permissions)
2. Dust (le plus simple, environnement réel)
3. NetSuite UI (vérification manuelle des permissions)
