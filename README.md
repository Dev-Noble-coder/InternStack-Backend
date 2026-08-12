# InternStack Backend API

Cookie-based Express API backed by MongoDB/Mongoose.

## 1. API base URL

Use one API base URL in the frontend:

```js
const API_URL = "https://internstack-backend.onrender.com";
// Local: http://localhost:4000
```

Requests must go to `${API_URL}/...`. If the frontend is hosted separately, do not call `/api/auth/...` without the API domain or a configured development proxy.

## 2. The frontend request rule

There are two separate things to send:

1. Authentication cookies: the browser manages these. Your code must use `credentials: "include"`.
2. CSRF token: send this in the `X-CSRF-Token` header. It is not part of the JSON body.

Use this wrapper for all API calls:

```js
let csrfToken = null;

export async function initializeApi() {
  const response = await fetch(`${API_URL}/api/auth/csrf`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) throw new Error("Could not initialize CSRF protection");
  const data = await response.json();
  csrfToken = data.csrfToken;
}

export async function apiFetch(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const headers = new Headers(options.headers || {});

  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    if (!csrfToken) await initializeApi();
    headers.set("X-CSRF-Token", csrfToken);
  }

  return fetch(`${API_URL}${path}`, {
    ...options,
    method,
    headers,
    credentials: "include",
  });
}
```

Call this once when the app starts:

```js
await initializeApi();
```

For Axios:

```js
axios.defaults.baseURL = API_URL;
axios.defaults.withCredentials = true;
```

### What CSRF means here

The browser automatically sends authentication cookies, even when a request was triggered by another website. CSRF protection requires an additional proof that your frontend intentionally made the request:

- `GET /api/auth/csrf` returns a token.
- The server also sets that token in the readable `csrf_token` cookie.
- The frontend sends the same token in the `X-CSRF-Token` header.
- The server compares the cookie value with the header value.
- If they do not match, the server returns `403 CSRF_INVALID`.

Do not add `csrfToken` to registration, login, or other JSON payloads. It belongs only in the header.

CSRF is required for every `POST`, `PUT`, `PATCH`, and `DELETE` request, including registration, login, verification, refresh, logout, and password reset. It is not required for `GET` requests such as `/health`, `/ready`, `/api/auth/csrf`, or `/api/auth/me`.

If the server returns `403` with code `CSRF_INVALID`, call `initializeApi()` again and retry the request once.

## 3. Cookies and separate frontend/backend domains

After login or refresh, the API sets:

- `access_token`: HTTP-only short-lived authentication cookie.
- `refresh_token`: HTTP-only longer-lived session cookie.
- `csrf_token`: readable CSRF cookie used with the `X-CSRF-Token` header.

JavaScript cannot read the access or refresh cookies. This is intentional. The browser sends them automatically when `credentials: "include"` is present.

Production settings for a separately hosted HTTPS frontend:

```env
NODE_ENV=production
CLIENT_URL=https://your-frontend-domain.com
COOKIE_SECURE=true
COOKIE_SAME_SITE=none
ACCESS_TOKEN_SECRET=<long-random-secret>
```

Local settings:

```env
NODE_ENV=development
CLIENT_URL=http://localhost:5173
COOKIE_SECURE=false
COOKIE_SAME_SITE=lax
```

Cookie settings do not change MongoDB data, password hashes, refresh-token hashes, IndexedDB, or encryption/key storage. Changing `ACCESS_TOKEN_SECRET` invalidates existing access tokens and users may need to log in again.

## 4. Response and error format

Successful responses are JSON. Errors use:

```json
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password"
  }
}
```

Common error codes include `CSRF_INVALID`, `UNAUTHENTICATED`, `FORBIDDEN`, `RATE_LIMITED`, `INVALID_CODE`, `EMAIL_NOT_VERIFIED`, and `INTERNAL_ERROR`.

## 5. Full authentication flow

### Step 0: Check the server

```http
GET /health
```

Response `200`:

```json
{ "status": "ok" }
```

`/health` confirms that the process is running. `/ready` also checks MongoDB:

```http
GET /ready
```

Response when ready:

```json
{ "status": "ready" }
```

It returns `503` when MongoDB is unavailable.

### Step 1: Initialize CSRF

```http
GET /api/auth/csrf
```

Use `credentials: "include"`.

Response:

```json
{ "csrfToken": "random-token-value" }
```

Save `csrfToken` in memory. Do not put it in localStorage and do not put it in later JSON bodies.

### Step 2: Register

```http
POST /api/auth/register
Content-Type: application/json
X-CSRF-Token: <csrfToken>
```

JSON body:

```json
{
  "firstName": "Ada",
  "lastName": "Lovelace",
  "email": "ada@example.com",
  "password": "a-strong-password"
}
```

Rules:

- `firstName` and `lastName`: 1–80 characters.
- `email`: valid email; normalized to lowercase.
- `password`: 8–128 characters.

Successful response: HTTP `201`.

```json
{
  "user": {
    "id": "user-id",
    "firstName": "Ada",
    "lastName": "Lovelace",
    "email": "ada@example.com",
    "role": "student",
    "status": "active",
    "emailVerified": false,
    "profilePicture": null,
    "lastLoginAt": null,
    "createdAt": "2026-08-12T19:00:00.000Z",
    "updatedAt": "2026-08-12T19:00:00.000Z"
  }
}
```

Registration creates the account and sends a six-digit verification code. It does not log the user in.

### Step 3: Verify email

```http
POST /api/auth/verify-email
Content-Type: application/json
X-CSRF-Token: <csrfToken>
```

JSON body:

```json
{
  "email": "ada@example.com",
  "code": "123456"
}
```

The code must contain exactly six digits.

Successful response: HTTP `200` with the same public user shape, but `emailVerified` is `true`.

### Step 4: Resend verification code

```http
POST /api/auth/resend-verification
Content-Type: application/json
X-CSRF-Token: <csrfToken>
```

JSON body:

```json
{ "email": "ada@example.com" }
```

Successful response:

```json
{ "message": "If the account exists, a verification code was sent" }
```

The response intentionally does not reveal whether the email exists. Rate limits and a resend cooldown apply.

### Step 5: Login

```http
POST /api/auth/login
Content-Type: application/json
X-CSRF-Token: <csrfToken>
```

JSON body:

```json
{
  "email": "ada@example.com",
  "password": "a-strong-password"
}
```

Successful response: HTTP `200`.

```json
{
  "user": {
    "id": "user-id",
    "firstName": "Ada",
    "lastName": "Lovelace",
    "email": "ada@example.com",
    "role": "student",
    "status": "active",
    "emailVerified": true,
    "profilePicture": null,
    "lastLoginAt": "2026-08-12T19:10:00.000Z",
    "createdAt": "2026-08-12T19:00:00.000Z",
    "updatedAt": "2026-08-12T19:10:00.000Z"
  }
}
```

The response also sets the HTTP-only `access_token` and `refresh_token` cookies. The token values are not returned in JSON. Do not store tokens in localStorage or sessionStorage.

### Step 6: Load the current user

```http
GET /api/auth/me
```

Use `credentials: "include"`.

Successful response:

```json
{
  "user": {
    "id": "user-id",
    "firstName": "Ada",
    "lastName": "Lovelace",
    "email": "ada@example.com",
    "role": "student",
    "status": "active",
    "emailVerified": true,
    "profilePicture": null,
    "lastLoginAt": "2026-08-12T19:10:00.000Z",
    "createdAt": "2026-08-12T19:00:00.000Z",
    "updatedAt": "2026-08-12T19:10:00.000Z"
  }
}
```

Use this when the frontend starts to restore the session.

### Step 7: Refresh the session

```http
POST /api/auth/refresh
X-CSRF-Token: <csrfToken>
```

No JSON body is required. The browser supplies the refresh cookie.

Successful response:

```json
{ "message": "Session refreshed" }
```

The server rotates the refresh session and sets new access and refresh cookies.

Recommended startup logic:

1. Call `/api/auth/me`.
2. If it returns `401`, call `/api/auth/refresh`.
3. Retry `/api/auth/me` once.
4. If refresh fails, clear frontend auth state and show login.

### Step 8: Logout

```http
POST /api/auth/logout
X-CSRF-Token: <csrfToken>
```

No JSON body is required.

Successful response:

```json
{ "message": "Logged out" }
```

The server revokes the refresh session and clears the access and refresh cookies.

## 6. Password reset flow

### Request a reset code

```http
POST /api/auth/forgot-password
Content-Type: application/json
X-CSRF-Token: <csrfToken>
```

Body:

```json
{ "email": "ada@example.com" }
```

Response:

```json
{ "message": "If the account exists, a reset code was sent" }
```

### Verify the reset code

```http
POST /api/auth/verify-password-reset
Content-Type: application/json
X-CSRF-Token: <csrfToken>
```

Body:

```json
{
  "email": "ada@example.com",
  "code": "123456"
}
```

Response:

```json
{ "message": "Code verified" }
```

### Set the new password

```http
POST /api/auth/reset-password
Content-Type: application/json
X-CSRF-Token: <csrfToken>
```

Body:

```json
{
  "email": "ada@example.com",
  "code": "123456",
  "password": "another-strong-password"
}
```

Response:

```json
{ "message": "Password reset successfully" }
```

The reset code is single-use. After a successful reset, all refresh sessions are revoked and the user must log in again.

## 7. Admin logs

```http
GET /api/logs?page=1&limit=50
```

This requires the access cookie and an authenticated user with the `admin` role. `limit` is capped at 100.

Response shape:

```json
{
  "logs": [],
  "page": 1,
  "limit": 50,
  "total": 0,
  "pages": 0
}
```

## 8. Rate limits

Authentication endpoints use IP and/or account limits. A `429` response includes a `Retry-After` header. The current limiter is process-local; use Redis before running multiple API instances.

## 9. Run locally

```bash
npm install
npm run dev
```

The local server listens on port `4000` and expects MongoDB at `mongodb://127.0.0.1:27017/internstack`, unless `MONGODB_URI` is configured.

Production validates that `ACCESS_TOKEN_SECRET`, secure cookies, and email credentials are configured.

## 10. Validation commands

```bash
npm run typecheck
npm run build
npm test
```