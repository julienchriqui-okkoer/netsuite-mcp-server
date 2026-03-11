#!/bin/bash

echo "🔍 Pre-deployment checks for NetSuite MCP Server"
echo ""

# Check if required files exist
echo "📁 Checking required files..."
required_files=(
  "package.json"
  "tsconfig.json"
  "Dockerfile"
  ".dockerignore"
  ".gitignore"
  "README.md"
  "DEPLOY.md"
  "src/index.ts"
  "src/server-http.ts"
  "src/netsuite-client.ts"
)

all_files_exist=true
for file in "${required_files[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✓ $file"
  else
    echo "  ✗ $file MISSING"
    all_files_exist=false
  fi
done

if [ "$all_files_exist" = false ]; then
  echo ""
  echo "❌ Some required files are missing. Please check."
  exit 1
fi

echo ""
echo "🔨 Building TypeScript..."
npm run build > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "  ✓ Build successful"
else
  echo "  ✗ Build failed"
  exit 1
fi

echo ""
echo "🐳 Checking Docker..."
if command -v docker &> /dev/null; then
  echo "  ✓ Docker installed"
else
  echo "  ⚠️  Docker not installed (optional for local testing)"
fi

echo ""
echo "📝 Environment variables needed for Railway:"
echo "  • NETSUITE_ACCOUNT_ID"
echo "  • NETSUITE_CONSUMER_KEY"
echo "  • NETSUITE_CONSUMER_SECRET"
echo "  • NETSUITE_TOKEN_ID"
echo "  • NETSUITE_TOKEN_SECRET"
echo "  • PORT (default: 3001)"
echo "  • HOST (default: 0.0.0.0)"
echo "  • ALLOWED_HOSTS (default: *)"

echo ""
echo "✅ All checks passed! Ready to deploy."
echo ""
echo "Next steps:"
echo "  1. git init && git add . && git commit -m 'Initial commit'"
echo "  2. Create GitHub repo and push: git push -u origin main"
echo "  3. Deploy to Railway (see DEPLOY.md)"
echo "  4. Configure in Dust"
