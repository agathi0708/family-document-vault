# FamilyVault — Role-Based Access Control Test Report

## 1. Overview

This document records permission testing performed on the FamilyVault FastAPI backend. The tests verify that family members can access documents according to their assigned roles.

## 2. Roles and Permissions

| Operation | Owner | Member | Viewer |
|---|---|---|---|
| View documents | Allowed | Allowed | Allowed |
| Download documents | Allowed | Allowed | Allowed |
| Upload documents | Allowed | Allowed | Denied |
| Edit document details | Allowed | Allowed | Denied |
| Delete documents | Allowed | Denied | Denied |

## 3. Test Results

| Test | Expected result | Observed result | Status |
|---|---|---|---|
| Viewer views documents | HTTP 200 | HTTP 200 | PASS |
| Viewer uploads a document | HTTP 403 | HTTP 403 | PASS |
| Viewer edits document details | HTTP 403 | HTTP 403 | PASS |
| Viewer deletes a document | HTTP 403 | HTTP 403 | PASS |
| Member uploads a document | Successful upload | Successful upload | PASS |
| Member edits document details | HTTP 200 | HTTP 200 | PASS |
| Member deletes a document | HTTP 403 | HTTP 403 | PASS |
| Owner edits document details | HTTP 200 | HTTP 200 | PASS |
| Owner deletes a document | HTTP 204 | HTTP 204 | PASS |

## 4. Owner Deletion Verification

A disposable test file, `owner_delete_test.txt`, was uploaded to Family ID 17.

- Document ID: 32
- Owner user ID: 3
- Delete endpoint: `DELETE /documents/17/32`
- Response: `204 No Content`
- Verification: The test file no longer appeared in the frontend document list after refresh.
- Existing family documents remained visible.

## 5. Conclusion

The tested role-based document permissions behaved as expected. Owners can manage and delete documents, Members can upload and edit documents but cannot delete them, and Viewers can view and download documents without modifying them.

**Note:** These results document the tests performed during this development session. Run the tests again after future permission-related code changes.