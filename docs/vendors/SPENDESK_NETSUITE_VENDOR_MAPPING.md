# 🔄 Spendesk → NetSuite Vendor Mapping

Ce document détaille comment mapper les champs d'un Supplier Spendesk vers un Vendor NetSuite.

---

## 📦 Tool : `netsuite_create_vendor`

### ✅ Champs Requis

| Spendesk | NetSuite | Type | Notes |
|----------|----------|------|-------|
| `name` ou `legal_name` | `companyName` | string | **REQUIS** - Nom principal du vendor |
| - | `subsidiary` | string | **REQUIS** - ID de la subsidiary NetSuite |

---

## 📝 Champs Optionnels

### Identification

| Spendesk | NetSuite | Type | Notes |
|----------|----------|------|-------|
| `supplier_id` | `externalId` | string | **IMPORTANT** - ID Spendesk pour idempotence (ex: `spk_sup_123`) |
| `supplier_code` | `entityId` | string | Code/référence du vendor |
| `legal_name` | `legalName` | string | Raison sociale |

### Contact

| Spendesk | NetSuite | Type | Notes |
|----------|----------|------|-------|
| `email` | `email` | string | Email principal |
| `phone` | `phone` | string | Téléphone principal |
| `address` | `defaultAddress` | string ou object | Adresse complète (voir structure ci-dessous) |

### Informations Financières

| Spendesk | NetSuite | Type | Notes |
|----------|----------|------|-------|
| `vat_number` | `vatRegNumber` | string | Numéro de TVA |
| `currency` | `currency` | string | **ID** de la devise NetSuite (voir ref data) |
| `payment_terms` | `terms` | string | **ID** des conditions de paiement NetSuite |
| `supplier_account_number` | `accountNumber` | string | Numéro de compte fournisseur |
| `iban` | - | - | ❌ Non supporté directement (utiliser custom field) |

### Classification & Analytiques

| Spendesk | NetSuite | Type | Notes |
|----------|----------|------|-------|
| `department` | `department` | string | **ID** du department NetSuite |
| `location` | `location` | string | **ID** de la location NetSuite |
| `category` ou `class` | `class` | string | **ID** de la classification NetSuite |
| `vendor_category` | `category` | string | **ID** de la catégorie vendor NetSuite |

### Autres

| Spendesk | NetSuite | Type | Notes |
|----------|----------|------|-------|
| `notes` | `memo` | string | Notes/commentaires |
| `is_active` | `isInactive` | boolean | **Inverse** : `isInactive = !is_active` |
| `is_individual` | `isPerson` | boolean | true si personne physique, false si société |

---

## 🏠 Structure Address (defaultAddress)

### Option 1 : String simple
```json
{
  "defaultAddress": "123 Rue de la Paix\n75001 Paris\nFrance"
}
```

### Option 2 : Objet structuré (recommandé)
```json
{
  "defaultAddress": {
    "addr1": "123 Rue de la Paix",
    "addr2": "Bâtiment A",
    "city": "Paris",
    "zip": "75001",
    "country": "FR",
    "addressee": "Nom de la société"
  }
}
```

**Champs disponibles :**
- `addr1` : Ligne 1
- `addr2` : Ligne 2
- `addr3` : Ligne 3
- `city` : Ville
- `state` : État/Région
- `zip` : Code postal
- `country` : Code pays (ISO 2 lettres)
- `addressee` : Destinataire

---

## 🔄 Exemple de Mapping Complet

### Supplier Spendesk (JSON)
```json
{
  "id": "spk_sup_abc123",
  "name": "Acme Corp",
  "legal_name": "Acme Corporation SARL",
  "email": "contact@acmecorp.fr",
  "phone": "+33 1 23 45 67 89",
  "vat_number": "FR12345678901",
  "currency": "EUR",
  "address": {
    "street": "123 Rue de la Paix",
    "city": "Paris",
    "postal_code": "75001",
    "country": "FR"
  },
  "is_active": true,
  "department": "Marketing",
  "category": "Services"
}
```

### Tool Call : `netsuite_create_vendor`
```json
{
  "companyName": "Acme Corp",
  "legalName": "Acme Corporation SARL",
  "subsidiary": "1",
  "externalId": "spk_sup_abc123",
  "email": "contact@acmecorp.fr",
  "phone": "+33 1 23 45 67 89",
  "vatRegNumber": "FR12345678901",
  "currency": "1",
  "defaultAddress": {
    "addr1": "123 Rue de la Paix",
    "city": "Paris",
    "zip": "75001",
    "country": "FR"
  },
  "isInactive": false,
  "department": "5",
  "category": "12",
  "memo": "Created from Spendesk"
}
```

---

## 🔑 Étapes de Mapping

### 1. Récupérer les Reference Data NetSuite

Avant de créer un vendor, récupère les IDs des champs de référence :

```javascript
// Currencies
const currencies = await netsuite_get_currencies();
const euroCurrency = currencies.items.find(c => c.symbol === "EUR");

// Departments
const departments = await netsuite_get_departments();
const marketingDept = departments.items.find(d => d.name === "Marketing");

// Subsidiaries
const subsidiaries = await netsuite_get_subsidiaries();
const mainSubsidiary = subsidiaries.items[0];
```

### 2. Mapper les Champs

```javascript
const netsuiteVendor = {
  companyName: spendesk.name,
  legalName: spendesk.legal_name,
  subsidiary: mainSubsidiary.id,
  externalId: `spk_sup_${spendesk.id}`,
  email: spendesk.email,
  phone: spendesk.phone,
  vatRegNumber: spendesk.vat_number,
  currency: euroCurrency?.id,
  department: marketingDept?.id,
  isInactive: !spendesk.is_active,
  defaultAddress: {
    addr1: spendesk.address.street,
    city: spendesk.address.city,
    zip: spendesk.address.postal_code,
    country: spendesk.address.country
  }
};
```

### 3. Créer le Vendor

```javascript
const result = await netsuite_create_vendor(netsuiteVendor);
```

### 4. Update (si existe déjà)

```javascript
// Recherche par externalId
const existingVendors = await netsuite_get_vendors({ 
  q: `externalId:"spk_sup_${spendesk.id}"` 
});

if (existingVendors.items.length > 0) {
  // Update
  await netsuite_update_vendor({
    id: existingVendors.items[0].id,
    ...netsuiteVendor
  });
} else {
  // Create
  await netsuite_create_vendor(netsuiteVendor);
}
```

---

## ⚠️ Champs Non Supportés

Ces champs Spendesk nécessitent des **custom fields** NetSuite :

| Spendesk | NetSuite | Workaround |
|----------|----------|------------|
| `iban` | - | Créer un custom field `custentity_iban` |
| `swift_code` | - | Créer un custom field `custentity_swift` |
| `bank_name` | - | Créer un custom field `custentity_bank_name` |
| `risk_level` | - | Utiliser `category` ou custom field |
| `criticality_level` | - | Utiliser `category` ou custom field |

---

## 🎯 Idempotence

**IMPORTANT :** Toujours utiliser `externalId` avec l'ID Spendesk pour éviter les doublons :

```json
{
  "externalId": "spk_sup_abc123"
}
```

Ensuite, pour vérifier si un vendor existe déjà :
```javascript
const existing = await netsuite_get_vendors({ 
  q: `externalId:"spk_sup_abc123"` 
});
```

---

## 📊 Résumé des Tools Disponibles

| Tool | Action | Use Case |
|------|--------|----------|
| `netsuite_create_vendor` | Créer | Nouveau supplier Spendesk → NetSuite |
| `netsuite_update_vendor` | Modifier | Mise à jour d'un supplier existant |
| `netsuite_get_vendors` | Lister | Recherche, vérification d'existence |
| `netsuite_get_latest_vendors` | Lister récents | Sync périodique NetSuite → Spendesk |

---

## 🔗 Reference Data Tools Nécessaires

Ces tools permettent de récupérer les IDs des champs de référence :

- `netsuite_get_currencies` - Devises
- `netsuite_get_departments` - Départements
- `netsuite_get_subsidiaries` - Filiales
- `netsuite_get_locations` - Localisations
- `netsuite_get_classifications` - Classes/Catégories
