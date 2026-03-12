#!/bin/bash
# Test NetSuite Create Vendor avec OAuth 1.0
# Ce script teste si tu as les permissions pour créer un vendor

source .env

echo "🔍 Test Manual: Create Vendor NetSuite"
echo "========================================"
echo ""

# Vérifier les variables d'environnement
if [ -z "$NETSUITE_CONSUMER_KEY" ]; then
  echo "❌ Erreur: Variables d'environnement NetSuite manquantes"
  echo "   Vérifie que le fichier .env est bien configuré"
  exit 1
fi

echo "✅ Credentials loaded"
echo "   Account: $NETSUITE_ACCOUNT_ID"
echo ""

# Construire l'URL
ACCOUNT_NORMALIZED=$(echo "$NETSUITE_ACCOUNT_ID" | sed 's/_SB/-sb/g' | tr '[:upper:]' '[:lower:]')
BASE_URL="https://${ACCOUNT_NORMALIZED}.suitetalk.api.netsuite.com"
ENDPOINT="/services/rest/record/v1/vendor"
FULL_URL="${BASE_URL}${ENDPOINT}"

echo "📍 Endpoint: POST $FULL_URL"
echo ""

# Test 1: Create Vendor MINIMAL (seulement les champs requis)
echo "🧪 Test 1: Create Vendor avec champs MINIMAUX"
echo "   Body: { companyName, subsidiary }"
echo ""

BODY_MINIMAL='{
  "companyName": "Test Manual Minimal",
  "subsidiary": { "id": "6" }
}'

# Utiliser curl avec OAuth 1.0 (node script pour générer la signature)
node - <<EOF
const crypto = require('crypto');

const consumerKey = "$NETSUITE_CONSUMER_KEY";
const consumerSecret = "$NETSUITE_CONSUMER_SECRET";
const tokenId = "$NETSUITE_TOKEN_ID";
const tokenSecret = "$NETSUITE_TOKEN_SECRET";
const accountId = "$NETSUITE_ACCOUNT_ID";
const realm = accountId;

const method = "POST";
const url = "$FULL_URL";
const body = \`$BODY_MINIMAL\`;

// OAuth 1.0 parameters
const timestamp = Math.floor(Date.now() / 1000);
const nonce = crypto.randomBytes(16).toString('hex');

const oauthParams = {
  oauth_consumer_key: consumerKey,
  oauth_token: tokenId,
  oauth_signature_method: "HMAC-SHA256",
  oauth_timestamp: timestamp,
  oauth_nonce: nonce,
  oauth_version: "1.0",
  realm: realm
};

// Sort parameters
const sortedParams = Object.keys(oauthParams)
  .filter(k => k !== 'realm')
  .sort()
  .map(k => \`\${encodeURIComponent(k)}=\${encodeURIComponent(oauthParams[k])}\`)
  .join('&');

// Signature base string
const signatureBase = \`\${method}&\${encodeURIComponent(url)}&\${encodeURIComponent(sortedParams)}\`;

// Signing key
const signingKey = \`\${encodeURIComponent(consumerSecret)}&\${encodeURIComponent(tokenSecret)}\`;

// Generate signature
const signature = crypto.createHmac('sha256', signingKey).update(signatureBase).digest('base64');

// Authorization header
const authHeader = \`OAuth realm="\${realm}", oauth_consumer_key="\${consumerKey}", oauth_token="\${tokenId}", oauth_signature_method="HMAC-SHA256", oauth_timestamp="\${timestamp}", oauth_nonce="\${nonce}", oauth_version="1.0", oauth_signature="\${encodeURIComponent(signature)}"\`;

console.log("CURL_CMD_START");
console.log(\`curl -X POST "\${url}" \\\\\`);
console.log(\`  -H "Authorization: \${authHeader}" \\\\\`);
console.log(\`  -H "Content-Type: application/json" \\\\\`);
console.log(\`  -H "Prefer: return=representation" \\\\\`);
console.log(\`  -d '\${body}'\`);
console.log("CURL_CMD_END");
EOF

echo ""
echo "📤 Exécution de la requête..."
echo ""

# Extraire et exécuter la commande curl
CURL_OUTPUT=$(mktemp)
node - <<EOF | grep -A 10 "CURL_CMD_START" | grep -B 10 "CURL_CMD_END" | grep -v "CURL" | sh 2>&1 | tee $CURL_OUTPUT
const crypto = require('crypto');

const consumerKey = "$NETSUITE_CONSUMER_KEY";
const consumerSecret = "$NETSUITE_CONSUMER_SECRET";
const tokenId = "$NETSUITE_TOKEN_ID";
const tokenSecret = "$NETSUITE_TOKEN_SECRET";
const accountId = "$NETSUITE_ACCOUNT_ID";
const realm = accountId;

const method = "POST";
const url = "$FULL_URL";
const body = \`$BODY_MINIMAL\`;

const timestamp = Math.floor(Date.now() / 1000);
const nonce = crypto.randomBytes(16).toString('hex');

const oauthParams = {
  oauth_consumer_key: consumerKey,
  oauth_token: tokenId,
  oauth_signature_method: "HMAC-SHA256",
  oauth_timestamp: timestamp,
  oauth_nonce: nonce,
  oauth_version: "1.0",
  realm: realm
};

const sortedParams = Object.keys(oauthParams)
  .filter(k => k !== 'realm')
  .sort()
  .map(k => \`\${encodeURIComponent(k)}=\${encodeURIComponent(oauthParams[k])}\`)
  .join('&');

const signatureBase = \`\${method}&\${encodeURIComponent(url)}&\${encodeURIComponent(sortedParams)}\`;
const signingKey = \`\${encodeURIComponent(consumerSecret)}&\${encodeURIComponent(tokenSecret)}\`;
const signature = crypto.createHmac('sha256', signingKey).update(signatureBase).digest('base64');

const authHeader = \`OAuth realm="\${realm}", oauth_consumer_key="\${consumerKey}", oauth_token="\${tokenId}", oauth_signature_method="HMAC-SHA256", oauth_timestamp="\${timestamp}", oauth_nonce="\${nonce}", oauth_version="1.0", oauth_signature="\${encodeURIComponent(signature)}"\`;

console.log("CURL_CMD_START");
console.log(\`curl -X POST "\${url}" \\\\\`);
console.log(\`  -H "Authorization: \${authHeader}" \\\\\`);
console.log(\`  -H "Content-Type: application/json" \\\\\`);
console.log(\`  -H "Prefer: return=representation" \\\\\`);
console.log(\`  -d '\${body}'\`);
console.log("CURL_CMD_END");
EOF

echo ""
echo "📥 Réponse NetSuite:"
echo "===================="
cat $CURL_OUTPUT

echo ""
echo ""

# Analyser la réponse
if grep -q "\"id\"" $CURL_OUTPUT; then
  VENDOR_ID=$(grep -o '"id":"[0-9]*"' $CURL_OUTPUT | head -1 | grep -o '[0-9]*')
  echo "✅ SUCCESS! Vendor créé avec succès"
  echo "   Vendor ID: $VENDOR_ID"
  echo ""
  echo "➡️  Les permissions NetSuite sont OK pour créer des vendors"
  echo "➡️  Le problème est donc bien au niveau du MCP SDK"
elif grep -q "INSUFFICIENT_PERMISSION" $CURL_OUTPUT; then
  echo "❌ ERREUR DE PERMISSION NetSuite"
  echo ""
  echo "➡️  Tu n'as PAS la permission de créer des vendors"
  echo "➡️  Solution: Demande à l'admin NetSuite d'activer:"
  echo "     - Lists > Vendors > Create permission"
elif grep -q "error" $CURL_OUTPUT || grep -q "Error" $CURL_OUTPUT; then
  echo "❌ ERREUR NetSuite"
  echo ""
  echo "➡️  Vérifie le message d'erreur ci-dessus"
  echo "➡️  Possible que certains champs soient requis ou invalides"
else
  echo "⚠️  Réponse inattendue"
  echo "➡️  Vérifie la réponse ci-dessus pour comprendre le problème"
fi

rm -f $CURL_OUTPUT

echo ""
echo "========================================"
echo "🏁 Test terminé"
