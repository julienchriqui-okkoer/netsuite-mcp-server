# Quick Start - Déployer sur Railway + Dust

## 📋 Prérequis (5 min)

1. Compte GitHub
2. Compte Railway (gratuit : [railway.app](https://railway.app))
3. Compte Dust avec accès MCP
4. Credentials NetSuite (Integration + Access Token)

---

## 🚀 Déploiement (10 min)

### 1. Push sur GitHub

```bash
cd /Users/julien.chriqui/Netsuite-mcp-server

# Init git
git init
git add .
git commit -m "feat: NetSuite MCP Server - 25 tools"

# Créer le repo sur github.com/new (nom: netsuite-mcp-server, private)
git remote add origin git@github.com:TON_USERNAME/netsuite-mcp-server.git
git push -u origin main
```

### 2. Déployer sur Railway

1. **Connecter GitHub à Railway**
   - Va sur [railway.app](https://railway.app)
   - Clique **"New Project"** → **"Deploy from GitHub repo"**
   - Sélectionne `netsuite-mcp-server`

2. **Configurer les variables d'environnement**
   
   Ne mets jamais de vrais secrets dans le dépôt Git : utilise uniquement le **Raw Editor** Railway (ou un gestionnaire de secrets) avec tes propres valeurs NetSuite.

   Railway → Settings → Variables → **Raw Editor**, colle (exemple — remplace par tes credentials) :

   ```bash
   NETSUITE_ACCOUNT_ID=TON_ACCOUNT_ID_SB1
   NETSUITE_CONSUMER_KEY=TON_CONSUMER_KEY
   NETSUITE_CONSUMER_SECRET=TON_CONSUMER_SECRET
   NETSUITE_TOKEN_ID=TON_TOKEN_ID
   NETSUITE_TOKEN_SECRET=TON_TOKEN_SECRET
   PORT=3001
   HOST=0.0.0.0
   ALLOWED_HOSTS=*
   ```

3. **Générer le domaine public**
   
   Railway → Settings → **Networking** → **Generate Domain**
   
   Note l'URL : `https://ton-projet.up.railway.app`

4. **Vérifier le déploiement**

   ```bash
   curl https://ton-projet.up.railway.app/
   # Devrait retourner: {"status":"ok","service":"netsuite-mcp-server","version":"1.0.0"}
   ```

---

## 🤖 Configurer Dust (5 min)

### 1. Ajouter le serveur MCP

Dust → Settings → **Integrations** → **MCP Servers** → **Add MCP Server**

```yaml
Name: netsuite-production
URL: https://ton-projet.up.railway.app/mcp
Headers:
  Accept: application/json, text/event-stream
```

Clique **Test Connection** → Tu devrais voir **25 tools** ✅

### 2. Créer un Agent de test

Dust → **Assistants** → **New Assistant**

```yaml
Name: NetSuite Test
Description: Test l'intégration NetSuite
Tools: ✓ netsuite-production (25 tools activés)
```

### 3. Tester

Envoie dans le chat :

```
Liste les 5 premiers vendors NetSuite
```

L'agent devrait appeler `netsuite_get_vendors` et afficher les résultats ! 🎉

---

## ✅ Checklist

- [ ] Code pushé sur GitHub
- [ ] Projet Railway créé
- [ ] Variables d'environnement configurées
- [ ] Domaine Railway généré
- [ ] Health check OK (`curl /`)
- [ ] MCP Server configuré dans Dust
- [ ] 25 tools visibles dans Dust
- [ ] Test `netsuite_get_vendors` réussi

---

## 🔧 Commandes utiles

```bash
# Pre-deployment check
./scripts/pre-deploy-check.sh

# Tester localement avant déploiement
npm run build
npm run start:http
npm run test:all

# Logs Railway
railway logs --tail

# Re-déployer après modifications
git add .
git commit -m "fix: update tool"
git push origin main
# Railway redéploie automatiquement
```

---

## 🆘 Troubleshooting

### Railway build timeout

Augmente le timeout dans `Dockerfile` :

```dockerfile
ENV NPM_CONFIG_BUILD_TIMEOUT=600000
```

### Dust ne voit pas les tools

Vérifie :
1. URL Railway correcte
2. Header `Accept` bien configuré
3. `curl https://ton-projet.up.railway.app/mcp` retourne du SSE

### NetSuite 401

Vérifie les 5 credentials dans Railway Variables.

---

**Durée totale** : ~20 minutes

**Coût** : Gratuit (Railway : 5$/mois de crédit gratuit)

Une fois configuré, tu peux créer des agents Dust pour automatiser les flows Spendesk × NetSuite ! 🚀
