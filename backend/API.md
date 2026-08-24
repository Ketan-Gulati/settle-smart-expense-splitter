# SETTLE BACKEND REST API DOCUMENTATION (v1)

## Base URL
All API requests must use the `/api/v1` prefix.
Example: `http://localhost:5000/api/v1`

---

## 1. Global Standard Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Paginated List Success Response
```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 45
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable error description"
  }
}
```

---

## 2. Authentication Headers & Rate Limiting
- **Access Token**: Sent as `Authorization: Bearer <ACCESS_TOKEN>` in HTTP headers.
- **Request Identification**: Every request automatically generates or propagates `X-Request-Id`.
- **Rate Limits**:
  - `30 requests / 15 minutes` for `/auth/*` endpoints.
  - `300 requests / 15 minutes` for general API endpoints.

---

## 3. Endpoints Specification

### 3.1 Authentication Module (`/api/v1/auth`)

#### `POST /api/v1/auth/register`
- **Body**: `{ "name": "string", "email": "string", "password": "string (min 8 chars)" }`
- **Response**: `{ user: { id, name, email, avatarUrl, createdAt }, tokens: { accessToken, refreshToken } }`

#### `POST /api/v1/auth/login`
- **Body**: `{ "email": "string", "password": "string" }`
- **Response**: `{ user: { id, name, email, avatarUrl, createdAt }, tokens: { accessToken, refreshToken } }`

#### `POST /api/v1/auth/refresh`
- **Body**: `{ "refreshToken": "string" }`
- **Behavior**: Rotates token. If an already revoked token is used, triggers `TOKEN_REUSE_DETECTED` and revokes all active user sessions.
- **Response**: `{ accessToken, refreshToken }`

#### `POST /api/v1/auth/logout`
- **Body**: `{ "refreshToken": "string" }`
- **Response**: `{ message: "Logged out successfully" }`

#### `POST /api/v1/auth/logout-all` (Auth Required)
- **Response**: `{ message: "All sessions logged out successfully" }`

#### `GET /api/v1/auth/me` (Auth Required)
- **Response**: `{ id, name, email }`

---

### 3.2 Users Module (`/api/v1/users`)

#### `GET /api/v1/users/me` (Auth Required)
- **Response**: `{ id, name, email, avatarUrl, createdAt }`

#### `PATCH /api/v1/users/me` (Auth Required)
- **Body**: `{ "name"?: "string", "avatarUrl"?: "string" }`
- **Response**: `{ id, name, email, avatarUrl, createdAt }`

#### `GET /api/v1/users/:id` (Auth Required)
- **Response**: `{ id, name, avatarUrl }`

---

### 3.3 Groups Module (`/api/v1/groups`)

#### `POST /api/v1/groups` (Auth Required)
- **Body**: `{ "name": "string", "currency"?: "INR", "initialMemberUserIds"?: ["string"] }`
- **Behavior**: Creates group and assigns creator as `OWNER` atomically.
- **Response**: Group details with member list.

#### `GET /api/v1/groups` (Auth Required)
- **Response**: List of groups where authenticated user is an active member.

#### `GET /api/v1/groups/:groupId` (Auth Required)
- **Authorization**: Must be group member.
- **Response**: `{ id, name, currency, createdBy, createdAt, isArchived, memberCount, members: [...] }`

#### `PATCH /api/v1/groups/:groupId` (Auth Required)
- **Authorization**: Group `OWNER` only.

#### `DELETE /api/v1/groups/:groupId` (Auth Required)
- **Authorization**: Group `OWNER` only. Sets `isArchived = true`.

#### `POST /api/v1/groups/:groupId/members` (Auth Required)
- **Body**: `{ "userId": "uuid" }`

#### `DELETE /api/v1/groups/:groupId/members/:userId` (Auth Required)
- **Authorization**: Group `OWNER` or member leaving group.

---

### 3.4 Expenses Module (`/api/v1/expenses`)

#### `POST /api/v1/expenses` (Auth Required)
- **Headers**: `Idempotency-Key` (Optional)
- **Body**:
```json
{
  "groupId": "uuid",
  "description": "Dinner at Jamie's",
  "amountMinor": 25000,
  "paidByUserId": "uuid",
  "splitMethod": "EQUAL",
  "participants": [
    { "userId": "uuid1" },
    { "userId": "uuid2" },
    { "userId": "uuid3" }
  ]
}
```
- **Behavior**: Validates all memberships, calculates splits server-side, validates integer sum invariant `SUM(splits) === amountMinor`, and executes inside a database transaction.
- **Response**: Expense details with split allocations.

#### `GET /api/v1/expenses/:expenseId` (Auth Required)
- **Response**: Expense details.

#### `PATCH /api/v1/expenses/:expenseId` (Auth Required)
- **Body**: `{ "description"?, "amountMinor"?, "paidByUserId"?, "splitMethod"?, "participants"? }`

#### `DELETE /api/v1/expenses/:expenseId` (Auth Required)
- **Behavior**: Sets `deleted_at = now()`, excluding from active balance derivations while preserving audit history.

#### `GET /api/v1/groups/:groupId/expenses` (Auth Required)
- **Query**: `?page=1&limit=20` (Max limit: 100)
- **Response**: Paginated list of active expenses (newest first).

---

### 3.5 Balances Module (`/api/v1/groups/:groupId/balances`)

#### `GET /api/v1/groups/:groupId/balances` (Auth Required)
- **Behavior**: Derives net member balances dynamically from canonical ledger.
- **Response**:
```json
{
  "groupId": "uuid",
  "userNetBalanceMinor": 16666,
  "members": [
    { "userId": "uuid1", "name": "Ketan", "netBalanceMinor": 16666 },
    { "userId": "uuid2", "name": "Rohit", "netBalanceMinor": -8333 },
    { "userId": "uuid3", "name": "Raj", "netBalanceMinor": -8333 }
  ]
}
```

#### `GET /api/v1/groups/:groupId/balances/:userId` (Auth Required)
- **Behavior**: Bilateral breakdown calculation powering Person Balance Detail screen.
- **Response**:
```json
{
  "person": { "id": "uuid", "name": "Rohit", "avatarUrl": null },
  "netBalanceWithPersonMinor": 8333,
  "youPaidForPersonMinor": 8333,
  "personPaidForYouMinor": 0,
  "sharedExpenseCount": 1,
  "sharedExpenses": [ ... ]
}
```

---

### 3.6 Settlements Module (`/api/v1/groups/:groupId/settlements`)

#### `POST /api/v1/groups/:groupId/settlements` (Auth Required)
- **Headers**: `Idempotency-Key` (Optional)
- **Body**: `{ "toUserId": "uuid", "amountMinor": 10000, "note"?: "Paid via UPI" }`
- **Behavior**: Prohibits self-settlement, verifies mutual membership, records payment, and immediately reduces outstanding ledger debt.

#### `GET /api/v1/groups/:groupId/settlements` (Auth Required)
- **Query**: `?page=1&limit=20`
- **Response**: Paginated historical recorded settlements.

---

### 3.7 Activity & Dashboard Modules (`/api/v1/activity`, `/api/v1/dashboard`)

#### `GET /api/v1/activity` (Auth Required)
- **Query**: `?page=1&limit=20`
- **Response**: Chronological unified stream of shared expense and settlement events across all user groups.

#### `GET /api/v1/dashboard` (Auth Required)
- **Behavior**: Powers Home screen. Guaranteed invariant: `totalNetBalanceMinor === sum(group.userNetBalanceMinor)`.
- **Response**:
```json
{
  "totalNetBalanceMinor": 299666,
  "groups": [
    {
      "id": "uuid",
      "name": "Goa 2026",
      "currency": "INR",
      "userNetBalanceMinor": 436666,
      "unsettledExpenseCount": 3,
      "memberCount": 4
    }
  ],
  "recentActivity": [ ... ]
}
```
