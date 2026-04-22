# Firebase Security Requirements

## 1. Data Invariants
- `locations` must have `workspaceId == 'global'`.
- Subcollections must check if parent `locations` document exists.
- Payload string constraints and array bounds apply.
- Must be signed in with a verified email.

## 2. Dirty Dozen Payloads

1. **Unauthenticated Read/Write**: Attempt to read or write without a valid auth token. (Fail)
2. **Missing Verified Email**: Auth token present, but `email_verified: false`. (Fail)
3. **Ghost Field Poisoning**: `Location` create with an extra `isAdmin: true` field. (Fail)
4. **Blanket Query Attempt**: Client lists `locations` without `where("workspaceId", "==", "global")`. (Fail)
5. **No Parent Guard (Subcollection Create)**: Attempt to create `sampul` when `locations/{id}` does not exist. (Fail)
6. **No Parent Guard (Subcollection Read)**: Attempt to read `bobot` when `locations/{id}` does not exist. (Fail)
7. **Giant String Attack**: `namaProyek` exceeding 50KB size limit. (Fail)
8. **Invalid Workspace**: `Location` create with `workspaceId: "hacked"`. (Fail)
9. **Timestamp Forgery**: `Location` create with `createdAt` not equal to server timestamp. (Fail)
10. **Immutable Field Modification**: `Location` update trying to change `workspaceId`. (Fail)
11. **Orphan Relational Update**: Update `locationId` in subcollection to a different ID than path variable. (Fail)
12. **Infinite Array Drain**: `pekanList` exceeding 500 length limit. (Fail)

## 3. Test Runner
We will generate tests in `firestore.rules.test.ts`.
