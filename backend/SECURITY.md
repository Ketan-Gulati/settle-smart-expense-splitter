# SETTLE BACKEND SECURITY ARCHITECTURE & GUIDELINES

## 1. Authentication Lifecycle

### Dual Token Architecture
- **Access Token**:
  - **Lifetime**: 15 minutes (`ACCESS_TOKEN_EXPIRES_IN="15m"`).
  - **Format**: Signed JWT (`HS256`) containing `sub: userId`, `email`, and `role`.
  - **Storage**: In-memory on client; never stored in localStorage / persistent unencrypted storage.
- **Refresh Token**:
  - **Lifetime**: 30 days (`REFRESH_TOKEN_EXPIRES_IN="30d"`).
  - **Format**: Cryptographically random 64-byte hex string.
  - **Database Persistence**: Stored strictly as a SHA-256 hash (`token_hash`) in `refresh_tokens`. Raw refresh tokens are never written to disk or logs.
  - **Transmission**: Returned in HTTP-only, secure, SameSite cookies or secure client storage headers.

---

## 2. Refresh Token Rotation & Reuse Detection

### Rotation Workflow
1. When client requests an access token refresh with `raw_refresh_token`:
2. Compute `hash = SHA256(raw_refresh_token)`.
3. Locate active token record in database.
4. If found and active:
   - Mark old token as revoked (`revoked_at = now()`).
   - Generate `new_raw_token` and `new_hash = SHA256(new_raw_token)`.
   - Insert new record with `replaced_by_token_id = old_token.id`.
   - Return new access token and new refresh token to client.
5. **Reuse Detection**:
   - If a refresh token with `revoked_at != null` is presented, a token theft event is detected.
   - The server traverses the entire token lineage (`replaced_by_token_id`) and immediately revokes all active refresh tokens for that user session, logging a security audit event.

---

## 3. Password Security
- **Algorithm**: `bcrypt` with work factor / cost of 12 salt rounds (`BCRYPT_SALT_ROUNDS=12`).
- **Policy**: Minimum 8 characters, non-trivial complexity.
- **Exposure**: `password_hash` is stripped at the Prisma/repository layer and is never returned in API payloads.

---

## 4. Operational Logging & Secret Redaction
- **Structured JSON Logging**: Standard output formats logs as structured JSON containing `timestamp`, `level`, `message`, and sanitized `meta`.
- **Sensitive Field Redaction**: The logger utility automatically replaces keys containing `password`, `secret`, `token`, `tokenHash`, `authorization`, and database credentials with `[REDACTED]`.

---

## 5. Network & HTTP Security Headers
- **Helmet**: Enforces standard secure HTTP headers (HSTS, Content Security Policy, X-Frame-Options, DNS Prefetch Control).
- **CORS Allowlist**: Configured strictly to trusted frontend origins (`CLIENT_URL`, `http://localhost:8081`).
- **Body Parser Limits**: Limited to 1MB to prevent memory exhaustion attacks.
