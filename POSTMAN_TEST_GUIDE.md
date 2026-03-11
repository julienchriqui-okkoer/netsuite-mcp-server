# 🧪 Test NetSuite avec Postman

## Configuration

1. **Importer la collection** : `NetSuite-API.postman_collection.json`

2. **Configurer les variables** (clic droit sur la collection > Edit > Variables) :
   - `base_url`: `https://5762887-sb1.suitetalk.api.netsuite.com` ✅ (déjà renseigné)
   - `account_realm`: `5762887_SB1` ✅ (déjà renseigné)
   - `consumer_key`: _(copier depuis `.env`)_
   - `consumer_secret`: _(copier depuis `.env`)_
   - `token_id`: _(copier depuis `.env`)_
   - `token_secret`: _(copier depuis `.env`)_
   - `vendor_id`: `134775` _(un des IDs qu'on a testés)_

3. **Vérifier l'authentification OAuth 1.0** :
   - Clic droit sur la collection > Edit > Authorization
   - Devrait être configuré comme OAuth 1.0 avec HMAC-SHA256

---

## Tests à effectuer (dans l'ordre)

### ✅ Test 1 : List Vendors
**Requête** : `Vendor > List Vendors`  
**Résultat attendu** : 200 OK + liste de vendors  
**Si ça échoue** : Problème d'authentification OAuth

### ✅ Test 2 : Get Vendor by ID
**Requête** : `Vendor > Get Vendor by ID`  
**Variable** : `vendor_id` = `134775`  
**Résultat attendu** : 200 OK + détails du vendor  
**Si ça échoue** : Noter le **message d'erreur exact** de NetSuite

---

## Messages d'erreur NetSuite possibles

### Si 400 Bad Request :

```json
{
  "type": "https://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.4.1",
  "title": "Bad Request",
  "status": 400,
  "o:errorDetails": [
    {
      "detail": "Invalid query parameter ...",
      "o:errorCode": "INVALID_QUERY_PARAM"
    }
  ]
}
```

### Si 403 Forbidden :

```json
{
  "type": "...",
  "title": "Forbidden",
  "status": 403,
  "o:errorDetails": [
    {
      "detail": "Insufficient permission to access this record",
      "o:errorCode": "INSUFFICIENT_PERMISSION"
    }
  ]
}
```

### Si 404 Not Found :

```json
{
  "title": "Not Found",
  "status": 404,
  "o:errorDetails": [
    {
      "detail": "Record not found or you don't have permission to view it",
      "o:errorCode": "RECORD_NOT_FOUND"
    }
  ]
}
```

---

## 🎯 Actions selon le résultat

| Résultat | Action |
|----------|--------|
| **200 OK** | Le problème vient du code MCP (OAuth signature différente). Envoyer la signature Postman pour comparaison. |
| **400 Bad Request** | Noter le `o:errorCode`. Si c'est `INVALID_QUERY_PARAM`, le problème vient de `expandSubResources`. |
| **403 Forbidden** | Problème de permissions NetSuite. Vérifier les **Field Level Permissions** (voir section suivante). |
| **404 Not Found** | Le vendor existe mais tu n'as pas le droit de le voir individuellement (record-level security). |

---

## 🔍 Si 403 ou 404 : Vérifier les Field Level Permissions

Certains champs sur le record Vendor peuvent être restreints et bloquer l'accès à l'endpoint GET by ID.

1. **Setup > Customization > Lists, Records, & Fields > Record Types**
2. Chercher **Vendor** et cliquer dessus
3. Onglet **Fields** : regarder la colonne **Access Level**
4. Si des champs critiques (comme `entityId`, `companyName`, `email`) ont **Access Level = Restricted**, cela peut bloquer l'accès
5. Solution : Customization > Fields > [Le champ restreint] > Edit > **Access** > Ajouter ton rôle

---

## 📸 Ce qu'on a besoin de voir

Si tu peux partager :
1. **Screenshot de la réponse Postman** pour GET Vendor by ID (avec le JSON d'erreur complet)
2. **Screenshot de l'onglet Console** dans Postman (pour voir les headers et l'URL exacte)
3. Le résultat de Test 1 (List Vendors) pour confirmer que l'auth fonctionne

Cela nous permettra de diagnostiquer précisément le problème ! 🚀
