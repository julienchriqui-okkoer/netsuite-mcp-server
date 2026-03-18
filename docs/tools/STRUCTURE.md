# 📂 Structure du Projet

```
netsuite-mcp-server/
├── 📄 README.md                    # Documentation principale
├── 📄 QUICKSTART.md                # Guide déploiement rapide (20 min)
├── 📄 DEPLOY.md                    # Guide déploiement détaillé
├── 📄 SUMMARY.md                   # Récapitulatif technique
├── 📄 CHEATSHEET.md                # Commandes utiles
│
├── 🔧 Configuration
│   ├── package.json                # Dependencies & scripts
│   ├── tsconfig.json               # TypeScript config
│   ├── Dockerfile                  # Docker multi-stage build
│   ├── .dockerignore               # Exclusions Docker
│   ├── .gitignore                  # Exclusions Git
│   ├── .env.example                # Template variables d'env
│   └── .github/
│       └── workflows/
│           └── build.yml           # CI GitHub Actions
│
├── 📁 src/                         # Code source TypeScript
│   ├── index.ts                    # Entry stdio (Cursor)
│   ├── server-http.ts              # Entry HTTP (Dust/Railway)
│   ├── netsuite-client.ts          # Client REST OAuth1
│   │
│   ├── tools/                      # 25 MCP Tools
│   │   ├── index.ts                # Tool registry
│   │   ├── vendors.ts              # 2 tools
│   │   ├── vendor-bills.ts         # 4 tools
│   │   ├── journal-entries.ts      # 2 tools
│   │   ├── employees.ts            # 2 tools
│   │   ├── expense-reports.ts      # 2 tools
│   │   ├── payments.ts             # 1 tool
│   │   ├── vendor-credits.ts       # 2 tools
│   │   ├── analytics.ts            # 2 tools (locations, classes)
│   │   ├── file-cabinet.ts         # 2 tools (upload, attach)
│   │   ├── reference.ts            # 5 tools
│   │   └── suiteql.ts              # 1 tool
│   │
│   └── utils/
│       ├── oauth1.ts               # OAuth 1.0a HMAC-SHA256
│       └── pagination.ts           # Pagination helper
│
├── 📁 scripts/                     # Scripts utilitaires
│   ├── test-netsuite-vendors.mjs   # Test client NetSuite
│   ├── test-netsuite-http.mjs      # Test serveur HTTP
│   ├── test-all-tools.mjs          # Test 25 tools
│   └── pre-deploy-check.sh         # Checks pre-déploiement
│
└── 📁 dist/                        # Build TypeScript (généré)
    ├── index.js
    ├── server-http.js
    └── ...
```

---

## 🎯 Points d'entrée

### Mode stdio (Cursor, Claude Desktop)
```bash
node dist/index.js
```

### Mode HTTP (Dust, Railway)
```bash
node dist/server-http.js
```

---

## 🔌 Endpoints HTTP

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Health check |
| `/mcp` | POST | MCP JSON-RPC + SSE |

---

## 🛠️ 25 Tools MCP

### Master Data
- `netsuite_get_vendors`, `netsuite_get_vendor`
- `netsuite_get_employees`, `netsuite_get_employee`

### Transactions
- `netsuite_get_vendor_bills`, `netsuite_get_vendor_bill`
- `netsuite_create_vendor_bill`, `netsuite_update_vendor_bill`
- `netsuite_get_expense_reports`, `netsuite_create_expense_report`
- `netsuite_create_bill_payment`
- `netsuite_get_vendor_credits`, `netsuite_create_vendor_credit`
- `netsuite_get_journal_entries`, `netsuite_create_journal_entry`

### Référentiel
- `netsuite_get_accounts`, `netsuite_get_departments`
- `netsuite_get_subsidiaries`, `netsuite_get_tax_codes`, `netsuite_get_currencies`
- `netsuite_get_locations`, `netsuite_get_classifications`

### File Cabinet
- `netsuite_upload_file`, `netsuite_attach_file_to_record`

### Query
- `netsuite_execute_suiteql`

---

## 📊 Tests

| Script | Description | Statut |
|--------|-------------|--------|
| `npm run test:vendors` | Test OAuth1 + listing vendors | ✅ 3493 vendors |
| `npm run test:http` | Test serveur HTTP + tools basiques | ✅ 14 tools |
| `npm run test:all` | Test 25 tools complets | ✅ 25/25 tools |

---

## 🚀 Déploiement

```mermaid
graph LR
    A[Local Dev] --> B[GitHub Push]
    B --> C[Railway Build]
    C --> D[Railway Deploy]
    D --> E[Dust MCP Config]
    E --> F[Agent Dust]
```

1. **Local** : Développement + tests
2. **GitHub** : Versioning + CI
3. **Railway** : Build Docker + Deploy
4. **Dust** : Configuration MCP
5. **Agent** : Orchestration flows Spendesk × NetSuite

---

## 📝 Documentation

| Fichier | Usage |
|---------|-------|
| `README.md` | Doc générale, installation, usage |
| `QUICKSTART.md` | Déploiement rapide (20 min) |
| `DEPLOY.md` | Guide complet pas à pas |
| `SUMMARY.md` | Récap technique & flows |
| `CHEATSHEET.md` | Commandes & troubleshooting |

---

**Version** : 1.0.0  
**Tools** : 25  
**Statut** : ✅ Prêt pour production
