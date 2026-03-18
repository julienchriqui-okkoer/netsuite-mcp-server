# ✅ FIXES APPLIED — `netsuite_create_vendor` Tool

## 🎯 Problem
`netsuite_create_vendor` always returned `NetSuite 400: Bad Request` because NetSuite instances often require:
1. **Custom forms** (e.g., "Intercompany Vendor Form" id="297")
2. **Mandatory custom fields** specific to each form

## 🔧 Solutions Implemented

### 1. ✅ New Tool: `netsuite_get_vendor_forms`
**Discovery tool to find available custom form IDs:**
```typescript
Tool: netsuite_get_vendor_forms
Returns: { forms: [{ id: "297", name: "Custom Form 297" }], count: 1 }
```

**How it works:**
- Queries existing vendors via SuiteQL
- Extracts their `customform` IDs
- Deduplic human in code (avoids SQL DISTINCT issues)

**Usage:**
```
1. Call netsuite_get_vendor_forms
2. Get form ID (e.g., "297")
3. Use in netsuite_create_vendor with customForm: "297"
```

---

### 2. ✅ Added `customForm` Parameter
```typescript
customForm: z.string().optional()
```

**Usage:**
```json
{
  "companyName": "Test Vendor",
  "subsidiary": "1",
  "customForm": "297",  // ← NEW
  "email": "test@example.com"
}
```

---

### 3. ✅ Added `customFields` Parameter
**Key-value map for mandatory custom fields:**
```typescript
customFields: z.record(z.any()).optional()
```

**Usage:**
```json
{
  "companyName": "Test Vendor",
  "subsidiary": "1",
  "customForm": "297",
  "customFields": {
    "custentity_example_field": "value",
    "custentity_another_field": true
  }
}
```

**How it works:**
```typescript
// Serialized directly into body
if (customFields && typeof customFields === "object") {
  for (const [key, value] of Object.entries(customFields)) {
    body[key] = value;
  }
}
```

---

### 4. ✅ Idempotency Check (Pre-flight)
**Prevents duplicate vendor creation:**
```typescript
if (externalId) {
  // Query: SELECT id FROM vendor WHERE externalId = '<externalId>' LIMIT 1
  if (existing) {
    return { found: true, id: existingId, message: "Vendor already exists (idempotent)" };
  }
}
```

**Usage:**
```json
{
  "companyName": "Test Vendor",
  "subsidiary": "1",
  "externalId": "SPENDESK-VENDOR-001",  // ← Triggers idempotency check
}
```

**Result:**
```json
// First call
{ "success": true, "id": "136288", "location": "..." }

// Second call (same externalId)
{ "found": true, "id": "136288", "message": "Vendor with externalId 'SPENDESK-VENDOR-001' already exists (idempotent)" }
```

---

### 5. ✅ Improved Error Reporting
**Extract detailed validation errors from NetSuite:**
```typescript
// Before
throw new Error(`NetSuite 400: Bad Request`);

// After
const details = json['o:errorDetails']
  .map(err => err.detail)
  .join('; ');
throw new Error(`NetSuite 400: ${details}`);
```

**Example output:**
```
NetSuite 400: Please enter value(s) for: Custom Field X; 
              Form Y is required for vendors in subsidiary Z
```

---

### 6. ✅ Updated Tool Description
**Guides users on the workaround:**
```
"If vendor creation fails with 400, first call netsuite_get_vendor_forms 
to discover the correct customForm ID, then retry with customForm and 
any required customFields."
```

---

## 🧪 Test Script
**Located at:** `scripts/test-create-vendor-fixed.mjs`

**Tests:**
1. ✅ Get vendor forms (`netsuite_get_vendor_forms`)
2. ✅ Create vendor WITHOUT custom form (may fail if mandatory)
3. ✅ Create vendor WITH custom form
4. ✅ Idempotency check (re-create same vendor)
5. ✅ Create vendor with custom fields

**Run:**
```bash
node scripts/test-create-vendor-fixed.mjs
```

---

## 📋 Usage Example (Complete Workflow)

### Step 1: Discover Custom Forms
```
Tool: netsuite_get_vendor_forms
Result: { forms: [{ id: "297", name: "Custom Form 297" }] }
```

### Step 2: Create Vendor with Custom Form
```json
{
  "companyName": "Acme Corp",
  "subsidiary": "1",
  "email": "contact@acme.com",
  "phone": "+33123456789",
  "externalId": "SPENDESK-VENDOR-001",
  "customForm": "297",
  "customFields": {
    "custentity_vat_id": "FR12345678901",
    "custentity_payment_terms": "30"
  },
  "addr1": "123 Main St",
  "city": "Paris",
  "zip": "75001",
  "country": "FR"
}
```

### Step 3: Handle Idempotency
If you call `netsuite_create_vendor` again with the same `externalId`:
```json
{ "found": true, "id": "136288", "message": "Vendor already exists (idempotent)" }
```

---

## 🎯 Dust Test Prompt

```
Teste le tool netsuite_create_vendor fixé :

1. Appelle netsuite_get_vendor_forms pour découvrir les forms disponibles

2. Crée un vendor avec le premier form ID trouvé :
   - companyName: "Test Vendor Fixed Tool"
   - subsidiary: "1"
   - email: "test.fixed@example.com"
   - customForm: [utilise le premier ID trouvé à l'étape 1]
   - externalId: "DUST-VENDOR-FIXED-001"

3. Essaie de créer le même vendor une 2e fois (même externalId) 
   → Doit détecter qu'il existe déjà (idempotent)

Donne-moi les IDs et messages à chaque étape.
```

---

## 🚀 Deployment Status
- ✅ Code deployed to Railway
- ✅ All 6 fixes implemented
- ✅ Test script available
- ✅ Documentation complete

---

**Next:** Test in Dust to validate the complete workflow! 🎉
