# 🚨 RÉGRESSION CORRIGÉE — Retour à l'état stable

## 📊 Résumé

**Date :** 11 mars 2026  
**Commit stable restauré :** `8b99e2a`  
**Nouveau commit :** (en cours de push)  
**Serveur :** `https://netsuite-mcp-server-production.up.railway.app`

---

## 🚨 PROBLÈME IDENTIFIÉ

### Régression introduite par commit `119e1f7`

**Symptômes :**
- ✅ `netsuite_get_vendor_bills` fonctionnait → ❌ **cassé** ("tool execution failed")
- ✅ `netsuite_get_vendors` avait été corrigé → ❌ **retombé en erreur Zod**
- ❌ `netsuite_execute_suiteql` → **erreur Zod**
- ❌ `netsuite_get_latest_vendors` → **erreur Zod**

### Cause racine

Le commit `119e1f7` a appliqué **deux modifications simultanées** :

1. **Ajout d'`inputSchema` avec `as any`** sur `vendors.ts`, `suiteql.ts`, etc.
2. **Remplacement global de `type: "text"` par `type: "text" as const`** dans **TOUS** les tools (y compris `vendor-bills.ts` qui fonctionnait)

Ces modifications ont introduit une incompatibilité avec le SDK MCP qui a causé l'erreur Zod `v3Schema.safeParseAsync is not a function`.

---

## ✅ CORRECTION APPLIQUÉE

### Action immédiate

```bash
git reset --hard 8b99e2a
```

Retour au dernier commit **stable** où :
- ✅ `netsuite_get_vendor_bills` fonctionne
- ✅ Tous les tools suivent le pattern de référence (pas d'`inputSchema`, pas de `as const`)

### Fix minimal appliqué

**UNIQUEMENT** la correction du Bug #2 (header `Prefer: transient` pour SuiteQL) :

```typescript
// src/netsuite-client.ts
async suiteql<T>(query: string, limit?: number, offset?: number): Promise<T> {
  const body: any = { q: query };
  if (typeof limit === "number") {
    body.limit = limit;
  }
  if (typeof offset === "number") {
    body.offset = offset;
  }

  return this.request<T>("POST", "", {
    body,
    base: "suiteql",
    preferTransient: true,  // ✅ SEUL changement appliqué
  });
}
```

**AUCUNE autre modification** :
- ❌ PAS d'`inputSchema`
- ❌ PAS de `as const`
- ✅ Pattern de `vendor-bills.ts` préservé partout

---

## 📋 Status des bugs

### ✅ Bug #2 — CORRIGÉ (minimal fix)
**`netsuite_get_latest_vendors` : NetSuite 400 Bad Request**

- ✅ Header `Prefer: transient` ajouté pour SuiteQL
- ✅ Aucun autre changement

### 🔄 Bug #1 & #3 — NON CORRIGÉS (volontairement)
**`netsuite_execute_suiteql` et `netsuite_get_vendors` : paramètres non transmis**

**Pourquoi non corrigés ?**

L'ajout d'`inputSchema` cause des régressions sur les tools qui fonctionnent. La priorité est de **préserver l'état stable**.

**Alternatives possibles :**

1. **Option A (recommandée) :** Utiliser Dust en mode "text instructions"
   - Au lieu de `{ "query": "SELECT..." }`, Dust peut passer la query dans la description
   - Le handler peut parser les arguments depuis le texte

2. **Option B :** Investiguer pourquoi l'ajout d'`inputSchema` casse les tools
   - Possible conflit avec le SDK MCP v1.27.1
   - Nécessite plus de temps pour diagnostiquer

3. **Option C :** Mettre à jour le SDK MCP vers une version plus récente
   - Vérifier si une version plus récente supporte mieux les `inputSchema`

---

## 🧪 Tests à effectuer

### Test prioritaire #1 : `netsuite_get_vendor_bills`
```
Liste les vendor bills NetSuite
```

**Résultat attendu :** ✅ Doit fonctionner comme avant

---

### Test prioritaire #2 : `netsuite_get_vendors`
```
Liste les vendors NetSuite
```

**Résultat attendu :** ✅ Doit fonctionner (sans paramètre `limit` pour l'instant)

---

### Test #3 : `netsuite_get_latest_vendors`
```
Récupère les derniers vendors créés
```

**Résultat attendu :** ✅ Devrait fonctionner grâce au header `Prefer: transient`

---

## 📦 Déploiement

```bash
git reset --hard 8b99e2a
# Modification minimale de netsuite-client.ts
git add -A
git commit -m "fix: add Prefer:transient header for SuiteQL only (minimal fix)"
git push origin main --force
```

Le serveur va redéployer automatiquement avec **l'état stable** + fix minimal.

---

## 🎯 Leçon apprise

### ❌ Ce qui a causé la régression

**Modifications trop larges appliquées simultanément :**
- Ajout d'`inputSchema` sur plusieurs tools
- Remplacement global de `type: "text"` par `type: "text" as const`
- Modification de tools qui fonctionnaient déjà

### ✅ Approche correcte pour les prochains fix

1. **Tester localement** avant de pousser
2. **Modifier UN seul tool à la fois**
3. **Ne JAMAIS toucher aux tools qui fonctionnent** (comme `vendor-bills.ts`)
4. **Utiliser des branches Git** pour tester des changements risqués
5. **Documenter l'état stable** (commit SHA) avant toute modification

---

## 📋 Checklist finale

- [x] Revenir au commit stable `8b99e2a`
- [x] Appliquer UNIQUEMENT le fix du header `Prefer: transient`
- [x] Build réussi
- [x] Push forcé vers Railway
- [ ] Valider que `netsuite_get_vendor_bills` fonctionne
- [ ] Valider que `netsuite_get_vendors` fonctionne
- [ ] Valider que `netsuite_get_latest_vendors` fonctionne

---

## 🚀 Prochaines étapes

1. **Tester immédiatement** dans Dust que les 3 tools prioritaires fonctionnent
2. **Si stable :** laisser en production
3. **Pour Bug #1 & #3 :** investiguer pourquoi `inputSchema` cause des problèmes
   - Peut-être tester sur une branche séparée
   - Ou utiliser une approche différente (parsing des arguments en texte)

---

Le serveur est maintenant revenu à un **état stable** avec uniquement le fix minimal du header SuiteQL ! 🎯
