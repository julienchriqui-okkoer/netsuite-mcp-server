# Cheat Sheet - Commandes Utiles

## 🏗️ Développement Local

```bash
# Installer les dépendances
npm install

# Build TypeScript
npm run build

# Lancer en mode stdio (Cursor)
npm start

# Lancer en mode HTTP (Dust)
npm run start:http

# Dev avec hot reload
npm run dev          # stdio
npm run dev:http     # HTTP
```

## 🧪 Tests

```bash
# Test client NetSuite (OAuth1 + vendors)
npm run test:vendors

# Test serveur HTTP MCP (vendors + bills)
npm run test:http

# Test complet (25 tools)
npm run test:all

# Pre-deployment checks
./scripts/pre-deploy-check.sh
```

## 🚀 Git & Déploiement

```bash
# Init git (première fois seulement)
git init
git add .
git commit -m "feat: NetSuite MCP Server - 25 tools"

# Ajouter remote GitHub
git remote add origin git@github.com:USERNAME/netsuite-mcp-server.git
git push -u origin main

# Commits suivants
git add .
git commit -m "fix: update vendor bill tool"
git push origin main
# Railway redéploie automatiquement
```

## 🐳 Docker (Local)

```bash
# Build l'image
docker build -t netsuite-mcp-server .

# Run le container
docker run -p 3001:3001 \
  -e NETSUITE_ACCOUNT_ID=xxx \
  -e NETSUITE_CONSUMER_KEY=xxx \
  -e NETSUITE_CONSUMER_SECRET=xxx \
  -e NETSUITE_TOKEN_ID=xxx \
  -e NETSUITE_TOKEN_SECRET=xxx \
  netsuite-mcp-server

# Tester
curl http://localhost:3001/
```

## 🔧 Railway CLI (optionnel)

```bash
# Installer Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link project
railway link

# Voir les logs en temps réel
railway logs --tail

# Run command dans l'env Railway
railway run npm run test:all

# Deploy manuellement
railway up
```

## 🧪 Test Endpoints (Local ou Railway)

```bash
# Health check
curl https://ton-projet.up.railway.app/

# Initialize MCP session
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
      "clientInfo": {"name": "test", "version": "1.0.0"}
    }
  }'

# List tools
curl -X POST https://ton-projet.up.railway.app/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list",
    "params": {}
  }'

# Call tool (vendors)
curl -X POST https://ton-projet.up.railway.app/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "netsuite_get_vendors",
      "arguments": {"limit": 5}
    }
  }'
```

## 🔍 Debug & Troubleshooting

```bash
# Voir les logs du serveur HTTP local
npm run start:http
# Logs apparaissent sur stderr

# Tester OAuth1 signature
node -e "
import('./dist/utils/oauth1.js').then(m => {
  const header = m.buildOAuth1Header({
    method: 'GET',
    url: 'https://example.com/test',
    consumerKey: 'key',
    consumerSecret: 'secret',
    tokenId: 'token',
    tokenSecret: 'tokensecret',
    realm: 'TEST'
  });
  console.log(header);
});
"

# Vérifier les variables d'environnement Railway
railway vars

# Redémarrer le service Railway
railway restart

# Check build status
railway status
```

## 🎯 Dust - Exemples de prompts

```plaintext
# Test simple
Liste les 5 premiers vendors NetSuite

# Recherche
Trouve le vendor NetSuite avec l'externalId "spk_supplier_001"

# Création
Crée un vendor bill NetSuite pour le vendor ID 123 avec :
- Date: 2024-03-15
- Montant: 1000 EUR
- Compte: 60100
- Département: 1

# SuiteQL
Exécute cette requête SuiteQL : 
SELECT id, companyName, email FROM vendor WHERE companyName LIKE '%Test%'

# Flow complet
Je vais te donner une facture Spendesk, crée la vendor bill correspondante dans NetSuite
```

## 📊 Monitoring

```bash
# Railway metrics
railway metrics

# Check uptime
curl -I https://ton-projet.up.railway.app/

# Test avec timeout
timeout 5 curl https://ton-projet.up.railway.app/mcp

# Watch logs en continu
railway logs --tail | grep -i error
```

## 🔐 Sécurité

```bash
# Vérifier que .env n'est pas committé
git status

# Vérifier .gitignore
cat .gitignore | grep .env

# Rotate credentials NetSuite
# 1. Créer nouveau Access Token dans NetSuite
# 2. Update variables Railway
# 3. Railway redéploie automatiquement

# Backup credentials
railway vars > railway-vars-backup.txt
# ⚠️ Ne jamais committer ce fichier !
```

---

**Tip** : Sauvegarde ce cheat sheet dans tes favoris pour accès rapide ! 📑
