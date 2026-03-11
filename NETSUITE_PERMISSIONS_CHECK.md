# 🔐 Vérification des Permissions NetSuite REST API

## Contexte
L'endpoint `GET /vendor/{id}` retourne systématiquement **400 Bad Request**, alors que `GET /vendor` (liste) fonctionne parfaitement. Cela indique un problème de permissions spécifiques.

---

## 📋 Étapes pour Vérifier les Permissions

### 1️⃣ Vérifier le Rôle de l'Integration Record

1. **Aller dans Setup > Integration > Manage Integrations**
2. Trouver ton integration (celle avec le Consumer Key dans `.env`)
3. Cliquer sur **Edit**
4. Vérifier la section **Authentication** :
   - ✅ Token-Based Authentication doit être coché
   - Note le **User** assigné (c'est le compte utilisé pour les appels API)

---

### 2️⃣ Vérifier les Permissions du Rôle Utilisateur

1. **Aller dans Setup > Users/Roles > Manage Roles**
2. Trouver le rôle assigné à l'utilisateur de l'integration
3. Cliquer sur **Edit**
4. Aller dans l'onglet **Permissions > Lists**
   ⚠️ **Note** : Selon ta configuration NetSuite, Vendor peut être dans **Lists** ou **Transactions**
5. Chercher **Vendor** dans la liste
6. Vérifier les niveaux d'accès :
   ```
   Vendor
   ├─ Level: Full ou View (minimum View requis)
   └─ Restrictions: Aucune restriction personnalisée
   ```

---

### 3️⃣ Vérifier les Permissions REST Web Services

1. **Rester dans le même écran (Edit Role)**
2. Aller dans l'onglet **Permissions > Setup**
3. Chercher **REST Web Services**
4. Vérifier le niveau :
   ```
   REST Web Services: Full
   ```
   ⚠️ **Si c'est "None" ou "View", les appels REST API seront limités**

---

### 4️⃣ Vérifier les Permissions de l'Objet Vendor

1. **Aller dans Customization > Lists, Records, & Fields > Record Types**
2. Chercher **Vendor** dans la liste
3. Cliquer sur **Customize** (ou **View**)
4. Aller dans l'onglet **Access**
5. Vérifier que ton rôle apparaît dans la liste avec :
   ```
   Role: [Ton Rôle]
   Permission Level: Full ou Edit ou View (minimum View)
   Restriction Level: None
   ```

---

### 5️⃣ Vérifier les Permissions REST Record API (NetSuite 2020.2+)

1. **Aller dans Setup > Company > Enable Features**
2. Onglet **SuiteCloud**
3. Vérifier que **REST Record API** est coché :
   ```
   ✅ REST Record Service
   ✅ REST Web Services
   ```

---

### 6️⃣ Tester avec un Endpoint Plus Simple

Avant de tester `/vendor/{id}`, essayons un endpoint encore plus basique pour confirmer que le GET by ID fonctionne en général.

**Test 1 : GET Currency by ID** (généralement moins restrictif)
```bash
curl -X GET \
  "https://${NETSUITE_ACCOUNT_ID}.suitetalk.api.netsuite.com/services/rest/record/v1/currency/1" \
  -H "Authorization: OAuth realm=\"${NETSUITE_ACCOUNT_ID}\", ..." \
  -H "Content-Type: application/json"
```

**Test 2 : GET Account by ID** (données de référence)
```bash
curl -X GET \
  "https://${NETSUITE_ACCOUNT_ID}.suitetalk.api.netsuite.com/services/rest/record/v1/account/1" \
  -H "Authorization: OAuth realm=\"${NETSUITE_ACCOUNT_ID}\", ..." \
  -H "Content-Type: application/json"
```

Si ces endpoints retournent aussi **400**, le problème est plus global (pas de permission GET by ID).

---

## 🧪 Test Direct avec Postman

1. **Importer la collection** : `NetSuite-API.postman_collection.json`
2. **Configurer les variables d'environnement** :
   ```
   ACCOUNT_ID: [Ton Account ID]
   CONSUMER_KEY: [Ta Consumer Key]
   CONSUMER_SECRET: [Ton Consumer Secret]
   TOKEN_ID: [Ton Token ID]
   TOKEN_SECRET: [Ton Token Secret]
   ```
3. **Tester la requête** : `GET Vendor by ID`
4. **Observer la réponse** :
   - Si 200 → Les permissions sont OK, problème dans le code MCP
   - Si 400 → Problème de permissions NetSuite (suivre les étapes ci-dessus)
   - Si 401 → Problème d'authentification OAuth

---

## 🔍 Causes Courantes de 400 Bad Request sur GET by ID

### Cause #1 : Role sans "View" sur Vendor
**Solution** : Ajouter "View" (minimum) dans Permissions > **Lists** > Vendor (ou Transactions > Vendor selon ta config)

### Cause #2 : REST Web Services désactivé
**Solution** : Setup > Company > Enable Features > SuiteCloud > ✅ REST Web Services

### Cause #3 : Record Type Vendor avec Restriction d'Accès
**Solution** : Customization > Record Types > Vendor > Access > Ajouter ton rôle

### Cause #4 : Subsidiary Restriction
**Solution** : Si ton rôle est limité à certaines subsidiaries, vérifie que le vendor appartient bien à l'une d'elles

### Cause #5 : Custom Record Type avec Permissions Personnalisées
**Solution** : Si Vendor a été customisé, vérifier les permissions personnalisées dans le record type

---

## ✅ Checklist de Vérification Rapide

```
[ ] Integration Record existe et est active
[ ] Token-Based Authentication est activé
[ ] User de l'integration a un rôle assigné
[ ] Rôle a "View" (minimum) sur Lists > Vendor (ou Transactions > Vendor)
[ ] Rôle a "Full" sur Setup > REST Web Services
[ ] REST Record Service est activé (Enable Features)
[ ] Record Type Vendor autorise le rôle (Access tab)
[ ] Pas de restriction de subsidiary bloquante
```

---

## 🎯 Si Tout Est OK et Ça Ne Marche Toujours Pas

**Option 1 : Contacter NetSuite Support**
Ouvre un ticket en précisant :
- Endpoint : `GET /services/rest/record/v1/vendor/{id}`
- Erreur : 400 Bad Request
- Context : GET /vendor (liste) fonctionne, GET /vendor/{id} échoue
- Demande : Vérification des permissions REST API pour cet endpoint

**Option 2 : Utiliser le Workaround (Recommandé)**
Le tool `netsuite_get_latest_vendors` fonctionne parfaitement et retourne toutes les données nécessaires. C'est la solution la plus pragmatique.

---

## 📞 Besoin d'Aide ?

Si tu bloques sur une étape, partage-moi :
1. Des screenshots des pages de permissions
2. Le nom du rôle utilisé par l'integration
3. Le résultat d'un test Postman sur `/vendor/{id}`
