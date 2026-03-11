# 🔐 Comment vérifier les permissions NetSuite

## 📋 Permissions à vérifier

Pour que le MCP server fonctionne, ton compte NetSuite doit avoir :
1. **REST API Access** — Accès à l'API REST
2. **SOAP Web Services** — Accès aux web services
3. **SuiteQL** (optionnel) — Accès aux requêtes SuiteQL

---

## 🔍 Étape 1 : Vérifier le rôle de l'Integration Record

### 1. Aller dans Setup > Integrations > Manage Integrations

1. Dans NetSuite, va dans : **Setup > Integration > Manage Integrations > Manage Integrations**
2. Cherche ton intégration (celle avec le `CONSUMER_KEY` que tu utilises)
3. Clique sur **Edit**

### 2. Vérifier les permissions cochées

Dans l'écran d'édition, vérifie que ces cases sont cochées :

✅ **Token-Based Authentication** (TBA)  
✅ **REST Web Services**  
✅ **SOAP Web Services** (requis même pour REST)

**Screenshot des permissions :**
```
State: Enabled
Token-Based Authentication: ✓ (coché)
TBA: Authorization Flow: ✓
TBA: Consent Prompt: ☐
TBA: User Credentials: ☐
REST Web Services: ✓ (coché)
SOAP Web Services: ✓ (coché)
```

---

## 🔍 Étape 2 : Vérifier le rôle de l'utilisateur (Access Token)

### 1. Aller dans Setup > Users/Roles > Access Tokens

1. Va dans : **Setup > Users/Roles > Access Tokens**
2. Cherche ton token (celui avec le `TOKEN_ID` que tu utilises)
3. Clique sur **View** ou **Edit**

### 2. Vérifier le rôle associé

Note le **Role** associé au token (ex: "Administrator", "Accountant", "Custom Role", etc.)

---

## 🔍 Étape 3 : Vérifier les permissions du rôle

### 1. Aller dans Setup > Users/Roles > Manage Roles

1. Va dans : **Setup > Users/Roles > Manage Roles**
2. Cherche le rôle noté à l'étape 2
3. Clique sur **Edit**

### 2. Onglet "Permissions" > "Setup"

Dans l'onglet **Permissions**, section **Setup**, vérifie :

| Permission | Niveau requis | Description |
|------------|---------------|-------------|
| **REST Web Services** | Full | Accès complet à REST API |
| **SOAP Web Services** | Full | Requis même pour REST |
| **SuiteAnalytics Workbook** | View (minimum) | Pour SuiteQL |
| **Log in using Access Tokens** | Full | Pour TBA |

### 3. Onglet "Permissions" > "Lists"

Vérifie les permissions pour les records que tu veux accéder :

| Record | View | Create | Edit | Description |
|--------|------|--------|------|-------------|
| **Vendors** | ✓ | ✓ | ✓ | Fournisseurs |
| **Vendor Bills** | ✓ | ✓ | ✓ | Factures fournisseurs |
| **Employees** | ✓ | ☐ | ☐ | Employés |
| **Accounts** | ✓ | ☐ | ☐ | Plan comptable |
| **Departments** | ✓ | ☐ | ☐ | Départements |
| **Subsidiaries** | ✓ | ☐ | ☐ | Filiales |

---

## 🔍 Étape 4 : Tester les permissions

### Test rapide dans NetSuite

1. Va dans : **Setup > Integration > Integration Governance**
2. Cherche des logs d'erreur récents pour ton intégration
3. Les erreurs de permissions apparaîtront ici avec des détails

### Test avec Postman ou curl

```bash
# Remplace par tes credentials
ACCOUNT_ID="5762887_SB1"
CONSUMER_KEY="..."
CONSUMER_SECRET="..."
TOKEN_ID="..."
TOKEN_SECRET="..."

# Test GET /vendor
curl -X GET \
  "https://${ACCOUNT_ID}.suitetalk.api.netsuite.com/services/rest/record/v1/vendor?limit=1" \
  -H "Authorization: OAuth realm=\"${ACCOUNT_ID}\", oauth_consumer_key=\"${CONSUMER_KEY}\", oauth_token=\"${TOKEN_ID}\", oauth_signature_method=\"HMAC-SHA256\", oauth_timestamp=\"$(date +%s)\", oauth_nonce=\"$(uuidgen)\", oauth_version=\"1.0\", oauth_signature=\"...\""
```

---

## ❌ Erreurs courantes et solutions

### Erreur : "Invalid login attempt"
**Cause :** Token invalide ou expiré  
**Solution :** Régénérer un nouveau Access Token

### Erreur : "Insufficient permissions"
**Cause :** Le rôle n'a pas les bonnes permissions  
**Solution :** Ajouter les permissions manquantes au rôle

### Erreur : "REST Web Services feature is not enabled"
**Cause :** L'intégration n'a pas REST activé  
**Solution :** Éditer l'intégration et cocher "REST Web Services"

### Erreur : 400 Bad Request sur `/vendor/{id}`
**Cause possible 1 :** Le vendor n'existe pas ou est d'un type non supporté  
**Cause possible 2 :** Permissions insuffisantes pour "expandSubResources"  
**Solution :** Essayer sans `expandSubResources=true`

---

## 🎯 Permissions minimales recommandées

Pour le MCP Server NetSuite, voici les permissions minimales :

### Setup Permissions
- ✅ **REST Web Services** : Full
- ✅ **SOAP Web Services** : Full
- ✅ **Log in using Access Tokens** : Full
- ⚠️ **SuiteAnalytics Workbook** : View (pour SuiteQL - optionnel)

### Lists Permissions
- ✅ **Vendors** : View, Create, Edit
- ✅ **Vendor Bills** : View, Create, Edit
- ✅ **Employees** : View
- ✅ **Accounts** : View
- ✅ **Departments** : View
- ✅ **Subsidiaries** : View
- ✅ **Currencies** : View
- ✅ **Tax Items** : View

### Transactions Permissions
- ✅ **Enter Vendor Bills** : Full
- ✅ **Enter Journal Entries** : Full (si utilisé)
- ✅ **Expense Reports** : Full (si utilisé)

---

## 📸 Où trouver ces informations dans NetSuite

### Chemin rapide pour tout vérifier :

```
1. Setup > Integration > Manage Integrations
   └─> Éditer ton intégration
   └─> Vérifier : REST Web Services, SOAP Web Services

2. Setup > Users/Roles > Access Tokens
   └─> Trouver ton token
   └─> Noter le rôle associé

3. Setup > Users/Roles > Manage Roles
   └─> Éditer le rôle
   └─> Onglet "Permissions" > "Setup"
   └─> Onglet "Permissions" > "Lists"
   └─> Onglet "Permissions" > "Transactions"

4. Setup > Integration > Integration Governance
   └─> Voir les logs d'erreur (si applicable)
```

---

## 🚀 Si tu es Administrateur

Si tu as un rôle **Administrator**, tu as normalement toutes les permissions. Dans ce cas, l'erreur 400 sur `/vendor/{id}` vient probablement d'un autre problème :

1. **Format d'ID incorrect** — NetSuite est sensible au format
2. **Vendor inexistant** — L'ID n'existe pas dans ta base
3. **Type de vendor non supporté** — Certains types de vendors ne sont pas accessibles via REST

---

Dis-moi quel rôle tu utilises et je pourrai t'aider plus précisément ! 🔍
