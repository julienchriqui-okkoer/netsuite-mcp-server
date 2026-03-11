# Déploiement NetSuite MCP Server

Guide complet pour déployer sur GitHub, Railway et configurer Dust.

---

## Étape 1 : Préparer le projet pour GitHub

### 1.1 Créer le Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances de production
RUN npm ci --production

# Copier le code source et builder
COPY tsconfig.json ./
COPY src ./src
RUN npm install typescript @types/node --save-dev && \
    npm run build && \
    npm prune --production

# Supprimer les devDependencies et le code source
RUN rm -rf src tsconfig.json node_modules/@types

# Exposer le port
EXPOSE 3001

# Démarrer le serveur HTTP
CMD ["node", "dist/server-http.js"]
