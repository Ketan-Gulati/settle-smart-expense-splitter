# SETTLE DATABASE ARCHITECTURE & SCHEMA DOCUMENTATION

## 1. Overview & Principles
Settle uses **PostgreSQL hosted on Neon** with pooled runtime queries and direct migration connections. The backend is designed with strict relational integrity, zero denormalized balance columns as a source of truth, and atomic transactions.

### Key Financial Principles
1. **Integer Minor Monetary Representation**: Every monetary value is stored as `BigInt` minor units (paise for INR, cents for USD/EUR). No floating-point data types (`FLOAT`, `DOUBLE`, `REAL`) are used.
2. **Derived Balances**: Balances and settlement obligations are derived on-the-fly from the canonical ledger (`expenses`, `expense_splits`, `settlements`).
3. **Atomic Financial Invariance**: An expense creation or modification must atomically commit `expenses` and all corresponding `expense_splits`. The invariant `SUM(splits.amount_minor) == expense.amount_minor` is strictly enforced before transaction commit.
4. **Relational Membership Enforcement**: Payers, split participants, settlement senders, and receivers must belong to the active group membership.

---

## 2. Entity Relationship Overview

```
User (UUID)
 ├── Groups Created (1:N)
 ├── GroupMemberships (1:N) ── Group (UUID)
 │                            ├── Expenses (1:N) ── ExpenseSplits (1:N) ── User
 │                            └── Settlements (1:N) (fromUser, toUser)
 ├── RefreshTokens (1:N, Token Rotation)
 └── AuditEvents (1:N)
```

---

## 3. Database Schema Specification

### 3.1 `users`
- `id` (`UUID`, PK): Server-generated UUID.
- `name` (`VARCHAR(255)`): User's full display name.
- `email` (`VARCHAR(255)`, UNIQUE): Normalized lowercase email address.
- `password_hash` (`VARCHAR(255)`, Nullable): Bcrypt hashed password (salt rounds = 12).
- `avatar_url` (`TEXT`, Nullable): Profile picture or avatar URI.
- `is_active` (`BOOLEAN`, Default `true`): Account status flag.
- `created_at` (`TIMESTAMPTZ(6)`, Default `now()`): Creation timestamp in UTC.
- `updated_at` (`TIMESTAMPTZ(6)`): Auto-updated timestamp in UTC.
- `last_login_at` (`TIMESTAMPTZ(6)`, Nullable): Last authentication timestamp.

**Indexes**:
- `UNIQUE("email")`
- `INDEX("is_active")`
- `INDEX("created_at")`

---

### 3.2 `refresh_tokens`
- `id` (`UUID`, PK): Refresh token session identifier.
- `user_id` (`UUID`, FK $\to$ `users.id` ON DELETE CASCADE): Owner of the session.
- `token_hash` (`VARCHAR(255)`, UNIQUE): SHA-256 cryptographic hash of the refresh token. (Raw tokens are never persisted).
- `expires_at` (`TIMESTAMPTZ(6)`): Expiration timestamp (e.g. 30 days).
- `created_at` (`TIMESTAMPTZ(6)`, Default `now()`): Issuance timestamp.
- `revoked_at` (`TIMESTAMPTZ(6)`, Nullable): Revocation timestamp if logged out or rotated.
- `replaced_by_token_id` (`UUID`, FK $\to$ `refresh_tokens.id` ON DELETE SET NULL): Token family lineage pointer for reuse detection.
- `device_id` (`VARCHAR(255)`, Nullable): Client device fingerprint.
- `user_agent` (`TEXT`, Nullable): HTTP user agent string.
- `ip_address` (`VARCHAR(45)`, Nullable): Client IPv4/IPv6 address.
- `last_used_at` (`TIMESTAMPTZ(6)`, Nullable): Timestamp of latest token exchange.

**Indexes**:
- `UNIQUE("token_hash")`
- `INDEX("user_id")`
- `INDEX("expires_at")`
- `INDEX("user_id", "revoked_at")`

---

### 3.3 `groups`
- `id` (`UUID`, PK): Group unique identifier.
- `name` (`VARCHAR(255)`): Group name (e.g., "Goa 2026", "Apartment Bills").
- `currency` (`VARCHAR(3)`, Default `'INR'`): ISO 4217 standard 3-letter currency code.
- `created_by` (`UUID`, FK $\to$ `users.id` ON DELETE RESTRICT): Group creator/owner.
- `created_at` (`TIMESTAMPTZ(6)`, Default `now()`): Creation timestamp.
- `updated_at` (`TIMESTAMPTZ(6)`): Modification timestamp.
- `is_archived` (`BOOLEAN`, Default `false`): Archive flag.

**Indexes**:
- `INDEX("created_by")`
- `INDEX("created_at")`
- `INDEX("is_archived")`
- `INDEX("created_by", "is_archived")`

---

### 3.4 `group_members`
- `id` (`UUID`, PK): Membership identifier.
- `group_id` (`UUID`, FK $\to$ `groups.id` ON DELETE CASCADE): Group reference.
- `user_id` (`UUID`, FK $\to$ `users.id` ON DELETE CASCADE): User reference.
- `role` (`ENUM('OWNER', 'MEMBER')`, Default `'MEMBER'`): Group permissions level.
- `joined_at` (`TIMESTAMPTZ(6)`, Default `now()`): Joining timestamp.
- `left_at` (`TIMESTAMPTZ(6)`, Nullable): Departure timestamp if member left.

**Constraints & Indexes**:
- `UNIQUE("group_id", "user_id")` (A user cannot have duplicate active membership in a group)
- `INDEX("group_id")`
- `INDEX("user_id")`

---

### 3.5 `expenses`
- `id` (`UUID`, PK): Expense identifier.
- `group_id` (`UUID`, FK $\to$ `groups.id` ON DELETE CASCADE): Group containing this expense.
- `description` (`VARCHAR(255)`): Plain text description entered by user.
- `amount_minor` (`BIGINT`): Total amount in integer minor units (paise/cents). Must be $> 0$.
- `currency` (`VARCHAR(3)`, Default `'INR'`): Transaction currency.
- `paid_by_user_id` (`UUID`, FK $\to$ `users.id` ON DELETE RESTRICT): Member who paid the bill upfront.
- `split_method` (`ENUM('EQUAL', 'EXACT', 'PERCENTAGE', 'SHARES')`, Default `'EQUAL'`): Method used to calculate participant splits.
- `category` (`VARCHAR(100)`, Nullable): Optional category tag (e.g. `'dining'`, `'transport'`).
- `notes` (`TEXT`, Nullable): Optional notes.
- `created_at` (`TIMESTAMPTZ(6)`, Default `now()`): Creation timestamp in UTC.
- `updated_at` (`TIMESTAMPTZ(6)`): Update timestamp.
- `deleted_at` (`TIMESTAMPTZ(6)`, Nullable): Soft-deletion timestamp. When non-null, excluded from balance calculations while preserving audit trail.

**Indexes**:
- `INDEX("group_id", "created_at" DESC)` (For group chronological feed)
- `INDEX("group_id", "deleted_at")` (For filtering active expenses)
- `INDEX("paid_by_user_id")` (For querying expenses paid by a member)
- `INDEX("created_at" DESC)` (For global activity feeds)

---

### 3.6 `expense_splits`
- `id` (`UUID`, PK): Split row identifier.
- `expense_id` (`UUID`, FK $\to$ `expenses.id` ON DELETE CASCADE): Parent expense.
- `user_id` (`UUID`, FK $\to$ `users.id` ON DELETE RESTRICT): Member responsible for this portion.
- `amount_minor` (`BIGINT`): Exact share in integer minor units. Must be $\ge 0$.
- `created_at` (`TIMESTAMPTZ(6)`, Default `now()`): Creation timestamp.

**Constraints & Indexes**:
- `UNIQUE("expense_id", "user_id")` (A member cannot be listed twice on the same expense)
- `INDEX("expense_id")`
- `INDEX("user_id")`

---

### 3.7 `settlements`
- `id` (`UUID`, PK): Settlement transaction identifier.
- `group_id` (`UUID`, FK $\to$ `groups.id` ON DELETE CASCADE): Group context.
- `from_user_id` (`UUID`, FK $\to$ `users.id` ON DELETE RESTRICT): Debtor sending payment.
- `to_user_id` (`UUID`, FK $\to$ `users.id` ON DELETE RESTRICT): Creditor receiving payment.
- `amount_minor` (`BIGINT`): Exact settled amount in minor units. Must be $> 0$.
- `currency` (`VARCHAR(3)`, Default `'INR'`): Settlement currency.
- `note` (`TEXT`, Nullable): Optional memo or confirmation note.
- `created_at` (`TIMESTAMPTZ(6)`, Default `now()`): Timestamp of payment execution.
- `deleted_at` (`TIMESTAMPTZ(6)`, Nullable): Soft-delete / reversal timestamp.

**Indexes**:
- `INDEX("group_id", "created_at" DESC)`
- `INDEX("from_user_id")`
- `INDEX("to_user_id")`
- `INDEX("group_id", "from_user_id")`
- `INDEX("group_id", "to_user_id")`

---

### 3.8 `audit_events`
- `id` (`UUID`, PK): Audit record identifier.
- `actor_user_id` (`UUID`, Nullable, FK $\to$ `users.id` ON DELETE SET NULL): User triggering mutation.
- `event_type` (`VARCHAR(100)`): Mutation action (e.g. `'EXPENSE_CREATED'`, `'SETTLEMENT_RECORDED'`).
- `entity_type` (`VARCHAR(100)`): Resource type (e.g. `'EXPENSE'`, `'GROUP'`).
- `entity_id` (`VARCHAR(255)`): Targeted entity ID.
- `metadata` (`JSONB`, Nullable): Audit context. Sensitive data (passwords, tokens) is strictly redacted.
- `created_at` (`TIMESTAMPTZ(6)`, Default `now()`): Event log timestamp.

**Indexes**:
- `INDEX("actor_user_id", "created_at" DESC)`
- `INDEX("entity_type", "entity_id")`
- `INDEX("event_type", "created_at" DESC)`

---

## 4. Migration & Seed Strategy
- **Migration Directory**: `backend/prisma/migrations/20260823191548_init/migration.sql`
- **Migration Command**: `npx prisma migrate dev`
- **Seed Command**: `npx tsx prisma/seed.ts`
- **Deterministic Seed**: Pre-populates 6 users (Ketan, Rohit, Raj, Aman, Sneha, Pooja), 3 realistic groups (Goa 2026, Apartment Bills, Weekend Dinner), and 6 sample expenses with split sums matching amounts.
