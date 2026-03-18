# ✅ Checklist Déploiement - NetSuite MCP Server

Coche au fur et à mesure que tu avances dans le déploiement.

---

## 🔧 Phase 1 : Préparation Locale (5 min)

- [ ] Tests locaux passent : `npm run test:all`
- [ ] Pre-deployment check OK : `./scripts/pre-deploy-check.sh`
- [ ] `.env` n'est pas dans le repo : `git status` (ne doit pas apparaître)
- [ ] Credentials NetSuite notés quelque part (tu en auras besoin pour Railway)

---

## 📦 Phase 2 : GitHub (5 min)

- [ ] Repo créé sur github.com : `https://github.com/TON_USERNAME/netsuite-mcp-server`
- [ ] Git initialisé localement : `git init`
- [ ] Premier commit créé : `git add . && git commit -m "feat: NetSuite MCP Server"`
- [ ] Remote ajouté : `git remote add origin git@github.com:TON_USERNAME/netsuite-mcp-server.git`
- [ ] Code pushé : `git push -u origin main`
- [ ] Repo visible sur GitHub (vérifie dans ton navigateur)

---

## 🚂 Phase 3 : Railway (10 min)

### 3.1 Création du projet

- [ ] Compte Railway créé/connecté : [railway.app](https://railway.app)
- [ ] GitHub connecté à Railway
- [ ] Nouveau projet créé : "Deploy from GitHub repo"
- [ ] Repo `netsuite-mcp-server` sélectionné
- [ ] Build lancé automatiquement

### 3.2 Configuration

- [ ] Variables d'environnement ajoutées (Settings → Variables) :
  - [ ] `NETSUITE_ACCOUNT_ID`
  - [ ] `NETSUITE_CONSUMER_KEY`
  - [ ] `NETSUITE_CONSUMER_SECRET`
  - [ ] `NETSUITE_TOKEN_ID`
  - [ ] `NETSUITE_TOKEN_SECRET`
  - [ ] `PORT=3001`
  - [ ] `HOST=0.0.0.0`
  - [ ] `ALLOWED_HOSTS=*`

- [ ] Domaine généré (Settings → Networking → Generate Domain)
- [ ] URL Railway notée : `https://__________.up.railway.app`

### 3.3 Vérification

- [ ] Build terminé avec succès (Deployments → Latest)
- [ ] Service "Running" (status vert)
- [ ] Health check OK : `curl https://ton-projet.up.railway.app/`
  ```json
  {"status":"ok","service":"netsuite-mcp-server","version":"1.0.0"}
  ```

---

## 🤖 Phase 4 : Dust (5 min)

### 4.1 Configuration MCP

- [ ] Dust ouvert : Settings → Integrations → MCP Servers
- [ ] Nouveau serveur MCP ajouté :
  - Name : `netsuite-production`
  - URL : `https://ton-projet.up.railway.app/mcp`
  - Headers : `Accept: application/json, text/event-stream`
- [ ] Test Connection réussi
- [ ] 25 tools visibles dans la liste

### 4.2 Agent de test

- [ ] Nouvel Assistant créé : "NetSuite Test"
- [ ] Tools MCP activés : ✓ netsuite-production
- [ ] 25 tools cochés/disponibles

### 4.3 Tests

- [ ] Test 1 : "Liste les 5 premiers vendors NetSuite" → ✅ Résultats affichés
- [ ] Test 2 : "Liste les 3 premiers employees NetSuite" → ✅ Résultats affichés
- [ ] Test 3 : Requête SuiteQL custom → ✅ Fonctionne

---

## 🎉 Phase 5 : Validation Finale (5 min)

- [ ] Tous les tests Dust passent
- [ ] Logs Railway propres (pas d'erreurs)
- [ ] URL Railway accessible publiquement
- [ ] Documentation lue et comprise :
  - [ ] README.md
  - [ ] QUICKSTART.md (ou DEPLOY.md)
  - [ ] CHEATSHEET.md (pour référence future)

---

## 📋 Notes / Issues

_Espace pour noter les problèmes rencontrés ou questions :_

```
[Espace vide pour tes notes]
```

---

## 🆘 En cas de problème

### Railway build timeout
→ Voir CHEATSHEET.md section "Troubleshooting"

### Dust ne voit pas les tools
→ Vérifier URL + Header Accept dans config Dust

### NetSuite 401
→ Vérifier credentials dans Railway Variables

### Autres
→ Voir DEPLOY.md section "Troubleshooting"

---

## ✅ Projet Déployé !

Une fois toutes les cases cochées, ton serveur MCP NetSuite est prêt pour :

- ✅ Orchestrer les flows Spendesk × NetSuite via Dust
- ✅ Créer des agents d'automatisation
- ✅ Synchroniser vendors, bills, expenses, payments, etc.

**Prochaines étapes** : Créer des agents Dust pour automatiser tes workflows ! 🚀

---

**Durée totale estimée** : ~30 minutes (première fois)

**Coût** : Gratuit (Railway : 5$/mois de crédit)
