# NetSuite REST API - Test Report

**Date**: 3/12/2026, 9:57:43 AM
**Account**: (sandbox — utiliser ton propre Account ID, ne pas le committer)
**Success Rate**: 81.82% (18/22)

## 📊 Summary by Category

| Category | Total | Success | Failed | Rate |
|----------|-------|---------|--------|------|
| Vendors | 4 | 4 | 0 | 100.0% |
| Vendor Bills | 2 | 1 | 1 | 50.0% |
| Employees | 2 | 1 | 1 | 50.0% |
| Expense Reports | 2 | 1 | 1 | 50.0% |
| Payments | 1 | 1 | 0 | 100.0% |
| Vendor Credits | 1 | 1 | 0 | 100.0% |
| Journal Entries | 1 | 1 | 0 | 100.0% |
| Reference - Accounts | 1 | 1 | 0 | 100.0% |
| Reference - Departments | 1 | 1 | 0 | 100.0% |
| Reference - Subsidiaries | 1 | 1 | 0 | 100.0% |
| Reference - Tax Codes | 1 | 1 | 0 | 100.0% |
| Reference - Currencies | 1 | 1 | 0 | 100.0% |
| Reference - Locations | 1 | 1 | 0 | 100.0% |
| Reference - Classifications | 1 | 1 | 0 | 100.0% |
| SuiteQL | 1 | 1 | 0 | 100.0% |
| File Cabinet | 1 | 0 | 1 | 0.0% |

## ❌ Failed Tests (4)

### 1. Vendor Bills - Get Vendor Bill by ID

- **Method**: `GET /record/v1/vendorBill/999999`
- **Status**: 400 Bad Request
- **Details**: Error while accessing a resource. Transaction type specified is incorrect.

### 2. Employees - Get Employee by ID

- **Method**: `GET /record/v1/employee/999999`
- **Status**: 404 Not Found
- **Details**: The record instance does not exist. Provide a valid record instance ID.

### 3. Expense Reports - Get Expense Report by ID

- **Method**: `GET /record/v1/expenseReport/999999`
- **Status**: 400 Bad Request
- **Details**: Error while accessing a resource. Transaction type specified is incorrect.

### 4. File Cabinet - List Files

- **Method**: `GET /record/v1/file`
- **Status**: 404 Not Found
- **Details**: Record type 'file' does not exist.

## ✅ Successful Tests (18)

| Category | Test Name | Status | Time (ms) |
|----------|-----------|--------|----------|
| Vendors | List Vendors (basic) | 200 | 704 |
| Vendors | List Vendors (with offset) | 200 | 204 |
| Vendors | Get Vendor by ID | 200 | 689 |
| Vendors | Get Vendor by ID (expandSubResources) | 200 | 404 |
| Vendor Bills | List Vendor Bills | 200 | 1009 |
| Employees | List Employees | 200 | 433 |
| Expense Reports | List Expense Reports | 200 | 683 |
| Payments | List Vendor Payments | 200 | 591 |
| Vendor Credits | List Vendor Credits | 200 | 435 |
| Journal Entries | List Journal Entries | 200 | 15951 |
| Reference - Accounts | List Accounts | 200 | 157 |
| Reference - Departments | List Departments | 200 | 169 |
| Reference - Subsidiaries | List Subsidiaries | 200 | 140 |
| Reference - Tax Codes | List Sales Tax Items | 200 | 717 |
| Reference - Currencies | List Currencies | 200 | 480 |
| Reference - Locations | List Locations | 200 | 409 |
| Reference - Classifications | List Classifications | 200 | 146 |
| SuiteQL | Execute SuiteQL Query (FETCH FIRST syntax) | 200 | 244 |

## 🔧 Recommendations

### Issues Found

1. **Vendor Bills - Get Vendor Bill by ID**: Bad request - check parameters and headers.
2. **Employees - Get Employee by ID**: Endpoint not found or record doesn't exist.
3. **Expense Reports - Get Expense Report by ID**: Bad request - check parameters and headers.
4. **File Cabinet - List Files**: Endpoint not found or record doesn't exist.
