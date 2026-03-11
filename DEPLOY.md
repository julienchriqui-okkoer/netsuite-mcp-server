# Déploiement GitHub → Railway → Dust

## Étape 1️⃣ : Push sur GitHub

### 1.1 Initialiser le repo Git

```bash
cd /Users/julien.chriqui/Netsuite-mcp-server
git init
git add .
git commit -m "feat: NetSuite MCP Server with 25 tools for Spendesk integration"
```

### 1.2 Créer le repo sur GitHub

1. Va sur [github.com/new](https://github.com/new)
2. Nom du repo : `netsuite-mcp-server`
3. Description : `MCP Server exposing NetSuite REST API for Spendesk × NetSuite integration flows`
4. **Private** (recommandé car contient de la logique métier)
5. Ne pas ajouter README/gitignore/license (déjà présents)
6. Créer le repo

### 1.3 Pusher le code

```bash
git remote add origin git@github.com:TON_USERNAME/netsuite-mcp-server.git
git branch -M main
git push -u origin main
```

---

## Étape 2️⃣ : Déployer sur Railway

### 2.1 Créer un compte Railway

1. Va sur [railway.app](https://railway.app)
2. Connecte-toi avec GitHub
3. Autorise Railway à accéder à tes repos

### 2.2 Créer un nouveau projet

1. Clique sur **"New Project"**
2. Sélectionne **"Deploy from GitHub repo"**
3. Cherche et sélectionne `netsuite-mcp-server`
4. Railway détecte automatiquement :
   - Node.js
   - Le Dockerfile
   - Les variables d'environnement nécessaires

### 2.3 Configurer les variables d'environnement

Dans Railway → Project → Settings → Variables, ajoute :

```bash
NETSUITE_ACCOUNT_ID=5762887_SB1
NETSUITE_CONSUMER_KEY=c3db4ccb1d01b9570129729ecdb726bf57c4d8d9e6f331ea86ed62bc31609a98
NETSUITE_CONSUMER_SECRET=8d8880f211d6aa134b9479a509da46279b9d92ccf496f2c80cdc9e21e5749f80
NETSUITE_TOKEN_ID=1365b23cf90ff9a7919ab76c328de6e16a6c1922ecf09b2ae5d56da9550133ea
NETSUITE_TOKEN_SECRET=e94cfc9a8ac81265838accb8d383806efe3e89822a85487a6fe1787cfd259233
PORT=3001
HOST=0.0.0.0
ALLOWED_HOSTS=*
```

**⚠️ Important** : Railway gère automatiquement HTTPS, donc tu n'as pas besoin de certificat SSL.

### 2.4 Configurer le déploiement

1. Railway → Settings → **Networking**
2. Clique sur **"Generate Domain"**
3. Railway va générer une URL du type : `netsuite-mcp-server-production.up.railway.app`
4. Note cette URL, tu en auras besoin pour Dust

### 2.5 Vérifier le déploiement

Railway va automatiquement :
- Builder l'image Docker
- Déployer le container
- Exposer le port 3001

Vérifie que le déploiement fonctionne :

```bash
# Health check
curl https://ton-projet.up.railway.app/

# Devrait retourner :
# {
#   "status": "ok",
#   "service": "netsuite-mcp-server",
#   "version": "1.0.0"
# }
```

### 2.6 Tester l'endpoint MCP

```bash
curl -X POST https://ton-projet.up.railway.app/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {
        "name": "test",
        "version": "1.0.0"
      }
    }
  }'
```

Si tu reçois une réponse SSE (event stream), c'est bon ! ✅

---

## Étape 3️⃣ : Configurer Dust

### 3.1 Accéder à la configuration MCP dans Dust

1. Va sur ton workspace Dust
2. Settings → **Integrations** → **MCP Servers**
3. Clique sur **"Add MCP Server"**

### 3.2 Configurer le serveur NetSuite

Remplis le formulaire :

```yaml
Name: netsuite-production
URL: https://ton-projet.up.railway.app/mcp
Headers:
  Accept: application/json, text/event-stream
```

**Note** : Dust gère automatiquement le protocole Streamable HTTP (JSON-RPC + SSE).

### 3.3 Tester la connexion

1. Dans Dust, clique sur **"Test Connection"**
2. Dust va appeler `tools/list` sur ton serveur MCP
3. Tu devrais voir les **25 tools** NetSuite apparaître :
   - `netsuite_get_vendors`
   - `netsuite_create_vendor_bill`
   - `netsuite_create_expense_report`
   - etc.

Si tu vois les 25 tools, c'est bon ! ✅

---

## Étape 4️⃣ : Créer un Agent Dust de test

### 4.1 Créer un nouvel Agent

1. Dans Dust → **Assistants** → **New Assistant**
2. Nom : `NetSuite Integration Test`
3. Description : `Test l'intégration NetSuite via MCP`

### 4.2 Activer les tools MCP NetSuite

Dans la configuration de l'Agent :
1. Section **Tools**
2. Coche **"netsuite-production"**
3. Tous les 25 tools NetSuite sont maintenant disponibles pour l'agent

### 4.3 Tester l'agent

Envoie ces messages dans le chat :

**Test 1 : Lister les vendors**
```
Liste les 5 premiers vendors NetSuite
```

L'agent devrait appeler `netsuite_get_vendors` avec `{ limit: 5 }` et afficher les résultats.

**Test 2 : Chercher un employee**
```
Liste les 3 premiers employees NetSuite
```

L'agent devrait appeler `netsuite_get_employees` avec `{ limit: 3 }`.

**Test 3 : SuiteQL**
```
Exécute cette requête SuiteQL : SELECT id, companyName FROM vendor WHERE id = '-3'
```

L'agent devrait appeler `netsuite_execute_suiteql` avec la requête.

---

## Étape 5️⃣ : Créer un flow complet de test

### Exemple : Sync d'un vendor Spendesk → NetSuite

Demande à l'agent Dust :

```
Je vais te donner les infos d'un fournisseur Spendesk, tu vas le créer dans NetSuite :

- Nom : "Test Supplier France"
- Email : "contact@test-supplier.fr"
- ExternalId : "spk_supplier_test_001"
- Subsidiary : "1" (à adapter selon ta config)

Crée ce vendor dans NetSuite.
```

L'agent devrait :
1. Appeler `netsuite_get_vendors` avec `q` pour vérifier s'il existe déjà
2. Si non, appeler `netsuite_create_vendor` avec les paramètres corrects
3. Retourner l'ID NetSuite du vendor créé

---

## Étape 6️⃣ : Monitoring et Logs

### Railway Logs

```
Railway → Project → Deployments → [Dernier déploiement] → Logs
```

Tu verras les logs du serveur MCP :
```
Starting NetSuite MCP HTTP server on 0.0.0.0:3001
Health check: http://0.0.0.0:3001/
MCP endpoint: http://0.0.0.0:3001/mcp
```

### Dust Logs

Dans Dust → Agent → Conversation, tu peux voir :
- Les tools appelés
- Les paramètres passés
- Les réponses NetSuite
- Les erreurs éventuelles

---

## Troubleshooting

### Erreur : Railway timeout pendant le build

**Solution** : Railway peut timeout sur le build TypeScript. Augmente le timeout :

```dockerfile
# Dans Dockerfile, ajoute avant RUN npm run build :
ENV NPM_CONFIG_BUILD_TIMEOUT=600000
```

### Erreur : Dust ne voit pas les tools

**Vérifications** :
1. URL Railway correcte dans Dust config
2. Header `Accept: application/json, text/event-stream` bien présent
3. Serveur Railway accessible : `curl https://ton-projet.up.railway.app/`

### Erreur NetSuite 401

**Vérifications** :
1. Les 5 variables d'environnement sont bien définies dans Railway
2. L'Access Token NetSuite n'est pas expiré (Setup > Access Tokens dans NetSuite)
3. Le rôle associé au token a les permissions REST API

---

## Étape 7️⃣ : Production (optionnel)

### Sécuriser l'endpoint MCP

Si tu veux sécuriser l'accès (recommandé en prod), ajoute une authentification :

**Option 1 : Basic Auth via Railway**

```bash
# Dans Railway, ajoute :
MCP_AUTH_TOKEN=ton_secret_token_ici
```

**Option 2 : IP Whitelist**

Railway Pro permet de whitelist les IPs de Dust.

### Auto-déploiement

Railway redéploie automatiquement à chaque push sur `main` :

```bash
git add .
git commit -m "feat: add new tool"
git push origin main
# Railway redéploie automatiquement
```

---

## Checklist finale ✅

- [ ] Code pushé sur GitHub
- [ ] Projet Railway créé et déployé
- [ ] 5 variables d'environnement NetSuite configurées
- [ ] Domain Railway généré et noté
- [ ] Health check `/` retourne `{"status":"ok"}`
- [ ] Serveur MCP configuré dans Dust
- [ ] 25 tools visibles dans Dust
- [ ] Agent Dust de test créé
- [ ] Test `netsuite_get_vendors` réussi
- [ ] Logs Railway visibles et propres

---

**Durée estimée** : 15-20 minutes

**Coût Railway** : Gratuit jusqu'à 5$ de crédit/mois (largement suffisant pour tester)

Une fois déployé, tu pourras utiliser les 25 tools NetSuite directement dans tes agents Dust pour orchestrer tous les flows Spendesk × NetSuite ! 🚀
