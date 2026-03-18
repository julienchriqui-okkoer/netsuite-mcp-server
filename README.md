# netsuite-mcp-server

Serveur MCP (Model Context Protocol) qui expose l'API REST NetSuite pour orchestrer les flux d'intégration Spendesk × NetSuite.

## Architecture

Ce projet suit la même architecture que le serveur MCP Spendesk (`mcp-poc`) en production :

- **Node.js 20 + TypeScript**
- **@modelcontextprotocol/sdk** pour le serveur MCP
- **OAuth 1.0a TBA (HMAC-SHA256)** pour l'authentification NetSuite
- **Deux modes de démarrage** :
  - `stdio` : pour Cursor, Claude Desktop
  - `HTTP Streamable` : pour Dust, ChatGPT, déploiement cloud

## Prérequis

### 1. Node.js 20+

```bash
node --version  # v20+
```

### 2. Credentials NetSuite (Sandbox)

Tu dois créer une **Integration** et un **Access Token** dans ton compte sandbox NetSuite :

#### Créer l'Integration

1. Va dans **Setup > Integration > Manage Integrations > New**
2. Remplis :
   - Name: `Spendesk MCP Server`
   - State: `Enabled`
   - Coche **Token-Based Authentication**
3. Sauvegarde et note le **Consumer Key** et **Consumer Secret**

#### Créer l'Access Token

1. Va dans **Setup > Users/Roles > Access Tokens > New**
2. Sélectionne :
   - Application Name: `Spendesk MCP Server`
   - User: ton utilisateur (avec les bons rôles)
   - Role: **Administrator** ou custom role avec accès REST API
3. Sauvegarde et note le **Token ID** et **Token Secret**

## Installation

```bash
# Clone le repo
cd netsuite-mcp-server

# Installe les dépendances
npm install

# Configure les credentials
cp .env.example .env
# puis édite .env avec tes vraies credentials
```

### Fichier `.env`

```bash
# NetSuite Sandbox credentials
NETSUITE_ACCOUNT_ID=TSTDRV1234567        # ton account ID sandbox
NETSUITE_CONSUMER_KEY=xxx
NETSUITE_CONSUMER_SECRET=xxx
NETSUITE_TOKEN_ID=xxx
NETSUITE_TOKEN_SECRET=xxx

# HTTP server (pour mode HTTP Streamable)
PORT=3001
HOST=0.0.0.0
ALLOWED_HOSTS=localhost
```

**⚠️ Sécurité** : `.env` est dans `.gitignore`, ne committe jamais tes vrais credentials.

## Utilisation

### Mode stdio (Cursor, Claude Desktop)

```bash
# Build
npm run build

# Lancer le serveur stdio
npm start
```

#### Configuration Cursor

Ajoute dans ton MCP config (`~/.cursor/mcp.json` ou équivalent) :

```json
{
  "mcpServers": {
    "netsuite": {
      "command": "node",
      "args": ["/chemin/absolu/vers/netsuite-mcp-server/dist/index.js"],
      "env": {
        "NETSUITE_ACCOUNT_ID": "TSTDRV1234567",
        "NETSUITE_CONSUMER_KEY": "xxx",
        "NETSUITE_CONSUMER_SECRET": "xxx",
        "NETSUITE_TOKEN_ID": "xxx",
        "NETSUITE_TOKEN_SECRET": "xxx"
      }
    }
  }
}
```

### Mode HTTP Streamable (Dust, ChatGPT, déploiement)

```bash
# Build
npm run build

# Lancer le serveur HTTP
npm run start:http
```

Le serveur écoute sur `http://0.0.0.0:3001` par défaut.

Endpoints :
- `GET /` : health check
- `POST /mcp` : endpoint MCP Streamable HTTP (JSON-RPC + SSE)

#### Test du serveur HTTP

```bash
# Dans un terminal, lance le serveur :
npm run start:http

# Dans un autre terminal, teste :
npm run test:http
```

## Tools MCP disponibles

Le serveur expose **25 tools** pour orchestrer les flows Spendesk × NetSuite :

### Vendors (Fournisseurs)

- **`netsuite_get_vendors`** : Liste les vendors avec pagination
- **`netsuite_get_vendor`** : Récupère un vendor par ID

### Vendor Bills (Factures Fournisseurs)

- **`netsuite_get_vendor_bills`** : Liste les vendor bills
- **`netsuite_get_vendor_bill`** : Récupère une vendor bill par ID
- **`netsuite_create_vendor_bill`** : Crée une nouvelle vendor bill avec lignes de dépense (supporte `department`, `location`, `class`)
- **`netsuite_update_vendor_bill`** : Met à jour une vendor bill existante

### Journal Entries (Écritures Comptables)

- **`netsuite_get_journal_entries`** : Liste les journal entries
- **`netsuite_create_journal_entry`** : Crée une journal entry avec lignes débit/crédit (supporte `department`, `location`, `class`)

### Employees (Master Data)

- **`netsuite_get_employees`** : Liste les employees (pour matcher Spendesk Members → NetSuite Employees)
- **`netsuite_get_employee`** : Récupère un employee par ID

### Expense Reports (Notes de Frais)

- **`netsuite_get_expense_reports`** : Liste les expense reports
- **`netsuite_create_expense_report`** : Crée un expense report pour un employee avec lignes de dépense (supporte devise étrangère, analytics)

### Bill Payments (Paiements Fournisseurs)

- **`netsuite_create_bill_payment`** : Crée un vendor payment et l'applique à une ou plusieurs vendor bills

### Vendor Credits (Avoirs Fournisseurs)

- **`netsuite_get_vendor_credits`** : Liste les vendor credits
- **`netsuite_create_vendor_credit`** : Crée un vendor credit (credit note) et l'applique optionnellement à des vendor bills

### Référentiel

- **`netsuite_get_accounts`** : Liste le plan comptable
- **`netsuite_get_departments`** : Liste les départements / cost centers
- **`netsuite_get_subsidiaries`** : Liste les subsidiaries
- **`netsuite_get_tax_codes`** : Liste les codes de taxe
- **`netsuite_get_currencies`** : Liste les devises

### Champs Analytiques (Analytics)

- **`netsuite_get_locations`** : Liste les locations (dimension analytique)
- **`netsuite_get_classifications`** : Liste les classifications / classes (dimension analytique)

Les trois dimensions analytiques NetSuite (`department`, `location`, `class`) sont supportées dans tous les tools de création (vendor bills, journal entries, expense reports, vendor credits).

### File Cabinet (Pièces Jointes)

- **`netsuite_upload_file`** : Upload un fichier (PDF, PNG, JPEG...) dans le File Cabinet NetSuite, retourne l'ID du fichier
- **`netsuite_attach_file_to_record`** : Attache un fichier (via son ID) à un record NetSuite (vendor bill, expense report, vendor credit)

### SuiteQL

- **`netsuite_execute_suiteql`** : Exécute une requête SuiteQL (read-only, SELECT uniquement)

Exemples de requêtes SuiteQL :

```sql
-- Trouver un vendor par externalId
SELECT id, companyName, email FROM vendor WHERE externalId = 'spk_supplier_xxx'

-- Lister les vendor bills non approuvées
SELECT id, tranId, entity, amount, status FROM transaction
WHERE type = 'VendBill' AND status = 'VendBill:B'

-- Mapping account par numéro
SELECT id, acctNumber, acctName, type FROM account WHERE acctNumber LIKE '6%'
```

## Tests

```bash
# Test de connexion NetSuite (liste 5 vendors)
npm run test:vendors

# Test du serveur HTTP MCP complet
npm run test:http

# Test de tous les 25 tools MCP
npm run test:all
```

## Documentation détaillée

Pour les guides complets et les rapports métier, voir le dossier `docs/` :

- Guides de déploiement : `docs/deploy/` (Quickstart, checklist, guide complet Railway/Dust)
- Permissions & setup NetSuite : `docs/setup/`
- Scénarios de test & rapports : `docs/testing/`
- SuiteQL & fallbacks REST : `docs/suiteql/`
- Mapping métier (vendors, bills, payments, expense reports) : `docs/overview/`, `docs/vendors/`, `docs/bill-payments/`

## Déploiement

### Docker

Un `Dockerfile` est prévu (à créer si besoin, inspiré du `mcp-poc`) :

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY dist ./dist
EXPOSE 3001
CMD ["node", "dist/server-http.js"]
```

### Railway / Render / Fly.io

1. Configure les **variables d'environnement** (les 5 credentials NetSuite + PORT)
2. Commande de build : `npm run build`
3. Commande de start : `npm run start:http`
4. Port : `3001`

## Architecture technique

```
src/
├── index.ts                    # Entry point stdio
├── server-http.ts              # Entry point HTTP Streamable (Hono)
├── netsuite-client.ts          # Client REST NetSuite (OAuth 1.0a)
├── tools/
│   ├── index.ts                # Enregistre tous les tools
│   ├── vendors.ts              # Tools vendors
│   ├── vendor-bills.ts         # Tools vendor bills (+ location, class)
│   ├── journal-entries.ts      # Tools journal entries (+ location, class)
│   ├── employees.ts            # Tools employees (NEW)
│   ├── expense-reports.ts      # Tools expense reports (NEW)
│   ├── payments.ts             # Tools bill payments (NEW)
│   ├── vendor-credits.ts       # Tools vendor credits (NEW)
│   ├── analytics.ts            # Tools locations + classifications (NEW)
│   ├── file-cabinet.ts         # Tools file upload + attach (NEW)
│   ├── reference.ts            # Tools référentiel
│   └── suiteql.ts              # Tool SuiteQL
└── utils/
    ├── oauth1.ts               # Génération header OAuth 1.0a HMAC-SHA256
    └── pagination.ts           # Helper pagination NetSuite
```

### Authentification NetSuite

Le client utilise **OAuth 1.0a avec signature HMAC-SHA256**, implémenté from scratch (pas de lib externe) dans `utils/oauth1.ts`.

Chaque requête inclut un header `Authorization: OAuth ...` avec :

- `oauth_consumer_key`, `oauth_token`
- `oauth_signature_method=HMAC-SHA256`
- `oauth_timestamp`, `oauth_nonce`
- `oauth_signature` (HMAC-SHA256 de la Signature Base String)

### Gestion des erreurs

Tous les tools MCP catchent les erreurs NetSuite et retournent des messages clairs, ex :

```
NetSuite 401: Invalid credentials. Check NETSUITE_TOKEN_ID and NETSUITE_TOKEN_SECRET.
NetSuite 400: Bad Request
```

### Idempotence

Les tools de création acceptent un paramètre `externalId` (ex: `spendesk_supplier_id`, `spendesk_payable_id`) pour éviter les doublons si l'agent rejoue un flow.

## Logs

Les logs sont sur **stderr** (pas stdout, qui est réservé au protocole stdio MCP).

Exemple :

```bash
Starting NetSuite MCP HTTP server on 0.0.0.0:3001
Health check: http://0.0.0.0:3001/
MCP endpoint: http://0.0.0.0:3001/mcp
```

## Ressources

- [NetSuite REST API Documentation](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/chapter_1540391670.html)
- [Model Context Protocol Spec](https://modelcontextprotocol.io/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [SuiteQL Reference](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_156257770590.html)

## Dépannage

### Erreur 401 Invalid credentials

Vérifie que :

- Les 5 variables d'environnement sont correctement renseignées
- L'Access Token n'est pas expiré (dans NetSuite : Setup > Access Tokens)
- Le rôle associé au token a les permissions REST API

### Erreur 400 Bad Request sur un endpoint

Certains endpoints référentiels (`/account`, `/department`, etc.) peuvent ne pas exister ou nécessiter une syntaxe différente selon la version NetSuite. Utilise **SuiteQL** comme alternative :

```sql
SELECT id, acctNumber, acctName FROM account LIMIT 10
```

### Le serveur HTTP ne répond pas

Vérifie que le port 3001 est libre :

```bash
lsof -ti:3001  # Si un PID apparaît, kill-le
npm run start:http
```

## Licence

MIT
