import { apiDocs, ApiDoc } from "./apiDocs";

const serverUrl = "https://internstack-backend.onrender.com";

const escapeHtml = (value: string) => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const json = (value: unknown) => JSON.stringify(value, null, 2);
const slug = (value: string) => value.toLowerCase().replaceAll(" ", "-");
const groups = [...new Set(apiDocs.map((doc) => doc.group))];

const icons = {
  search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"></circle><path d="m16 16 4.5 4.5"></path></svg>',
  chevron: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"></path></svg>',
  sun: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"></path></svg>',
  moon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z"></path></svg>',
  menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"></path></svg>',
};

const statusFor = (doc: ApiDoc): string => {
  if (doc.method === "WS") return "WebSocket";
  if (doc.path === "/health" || doc.path === "/ready") return "200";
  if (doc.method === "POST" && (doc.path.includes("register") || doc.path.includes("invitation") || doc.path === "/api/applications" || doc.path === "/api/submissions" || doc.path === "/api/student/submissions")) return "201";
  if (doc.path === "/api/auth/csrf") return "200";
  return "200";
};

const responseExample = (doc: ApiDoc): string => {
  const user = { _id: "665f2c9e8f1a2b3c4d5e6f70", firstName: "Ada", lastName: "Lovelace", email: "ada@example.com", role: "student", isVerified: true };
  const listing = { _id: "64f000000000000000000000", title: "Software Engineering Intern", companyId: { _id: "64f000000000000000000001", name: "Example Co", website: "https://example.com" }, status: "published", workMode: "hybrid", locations: ["Lagos"], skills: ["TypeScript", "MongoDB"] };
  const application = { _id: "665f2d1a8f1a2b3c4d5e6f71", studentId: user._id, listingId: listing._id, companyId: "64f000000000000000000001", status: "applied", cvSnapshot: { url: "https://cdn.example.com/cv/ada-lovelace.pdf", filename: "ada-lovelace.pdf" }, appliedAt: "2026-09-25T10:30:00.000Z" };
  const pagination = { page: 1, limit: 20, total: 1, pages: 1, hasNext: false, hasPrevious: false };

  if (doc.method === "WS") return doc.success;
  if (doc.path === "/health") return json({ status: "ok" });
  if (doc.path === "/ready") return json({ status: "ready" });
  if (doc.path === "/api/auth/csrf") return json({ csrfToken: "csrf-token-from-server" });
  if (doc.path === "/api/auth/register" || doc.path === "/api/auth/me") return json({ user });
  if (doc.path === "/api/auth/login") return json({ user });
  if (doc.path === "/api/auth/verify-email") return json({ user: { ...user, isVerified: true } });
  if (doc.path === "/api/auth/resend-verification") return json({ message: "If the account exists, a verification code was sent" });
  if (doc.path === "/api/auth/refresh") return json({ message: "Session refreshed" });
  if (doc.path === "/api/auth/logout") return json({ message: "Logged out" });
  if (doc.path === "/api/auth/forgot-password") return json({ message: "If the account exists, a reset code was sent" });
  if (doc.path === "/api/auth/reset-password") return json({ message: "Password reset successfully" });
  if (doc.path === "/api/auth/accept-invitation") return json({ success: true, data: { email: "admin@example.com" } });
  if (doc.path === "/api/listings") return json({ success: true, data: { items: [listing], pagination } });
  if (doc.path === "/api/listings/:id") return json({ success: true, data: listing });
  if (doc.path === "/api/applications") return json({ success: true, data: application });
  if (doc.path === "/api/submissions") return json({ success: true, data: { submissionId: "665f2e2a8f1a2b3c4d5e6f72", status: "pending" } });
  if (doc.path === "/api/student/profile") return json({ success: true, data: { userId: user._id, institution: "Example University", matricNumber: "EX/2026/001", level: "400L", skills: ["TypeScript", "MongoDB"], completionPercentage: 80 } });
  if (doc.path === "/api/student/dashboard") return json({ success: true, data: { profile: { firstName: "Ada", profilePicture: null, completionPercentage: 80 }, applications: { active: 1, total: 1 }, suggestedListings: [listing], notifications: { unreadCount: 2 } } });
  if (doc.path.includes("/applications")) return json({ success: true, data: { items: [application], pagination } });
  if (doc.path.includes("/submissions")) return json({ success: true, data: { items: [{ _id: "665f2e2a8f1a2b3c4d5e6f72", type: "url", sourceUrl: "https://example.com/internship", status: "pending" }], pagination } });
  if (doc.path.includes("/notifications/unread-count")) return json({ success: true, data: { unreadCount: 2 } });
  if (doc.path.includes("/notifications")) return json({ success: true, data: { items: [{ _id: "665f2f3a8f1a2b3c4d5e6f73", type: "APPLICATION_SUBMITTED", title: "Application submitted", message: "Your application was submitted.", isRead: false }], pagination } });
  if (doc.group === "Admin") return json({ success: true, data: { _id: "665f2c9e8f1a2b3c4d5e6f70", status: "active", name: "Example record", updatedAt: "2026-09-25T10:30:00.000Z" } });
  if (doc.group === "Invitations") return json({ success: true, data: { _id: "665f304a8f1a2b3c4d5e6f74", email: "admin@example.com", status: "pending", expiresAt: "2026-10-02T10:30:00.000Z" } });
  return json({ success: true, data: {} });
};

const normalizeCode = (value: string) => value.replaceAll("\\n", "\n");
const highlightCode = (value: string) => escapeHtml(normalizeCode(value)).replace(
  /(&quot;(?:[^&]|&(?!quot;))*?&quot;)(?=\s*:)|(&quot;(?:[^&]|&(?!quot;))*?&quot;)|\b(GET|POST|PUT|PATCH|DELETE|WS)\b|\b(const|let|var|await|return|new|true|false|null)\b|\b(fetch|JSON\.stringify|response\.json|console\.log|Invoke-RestMethod)\b/g,
  (match, key, string, method, keyword, functionName) => {
    if (key) return '<span class="tok-key">' + key + '</span>';
    if (string) return '<span class="tok-string">' + string + '</span>';
    if (method) return '<span class="tok-method">' + method + '</span>';
    if (keyword) return '<span class="tok-keyword">' + keyword + '</span>';
    return '<span class="tok-function">' + functionName + '</span>';
  },
);
const code = (value: string) => '<div class="code-block"><div class="code-toolbar"><span>Code example</span><button class="copy" type="button">Copy</button></div><pre><code>' + highlightCode(value) + '</code></pre></div>';

type ContractRow = { name: string; value: string; description: string };

const table = (rows: ContractRow[], empty: string) => rows.length
  ? '<table class="contract-table"><thead><tr><th>Name</th><th>Value</th><th>Details</th></tr></thead><tbody>' +
    rows.map((row) => '<tr><td><code>' + escapeHtml(row.name) + '</code></td><td>' + escapeHtml(row.value) + '</td><td>' + escapeHtml(row.description) + '</td></tr>').join("") +
    '</tbody></table>'
  : '<p class="muted">' + escapeHtml(empty) + '</p>';

const errorTitle = (status: string, description: string): string => {
  const detail = description.replace(/\.$/, "").trim();
  const normalized = detail.toLowerCase();
  if (normalized === "validation error") return "Request validation failed";
  if (normalized === "authentication") return "Authentication required";
  if (normalized.includes("csrf") || normalized.includes("role")) return detail.replace(/failure/gi, "required");
  if (detail && !/^(only|when|this endpoint|request error)/i.test(detail)) {
    const readable = detail.includes("_") ? detail.toLowerCase().replaceAll("_", " ") : detail;
    return readable.charAt(0).toUpperCase() + readable.slice(1);
  }
  if (status === "400") return "Validation error";
  if (status === "401") return "Authentication required";
  if (status === "403") return "Permission denied";
  if (status === "404") return "Resource not found";
  if (status === "409") return "Conflict";
  if (status === "429") return "Rate limited";
  if (status === "503") return "Service unavailable";
  if (status === "1008") return "WebSocket policy error";
  if (status.startsWith("2")) return "Successful outcome";
  return "Request error";
};

const errors = (failureText: string) => '<div class="error-list">' + failureText.split(";").map((failure) => {
  const item = failure.trim();
  const match = item.match(/^(\d{3,4})\s+(.*)$/);
  const status = match ? match[1] : "—";
  const description = match ? match[2] : item;
  const detail = description.toLowerCase() === "validation error"
    ? "The request body or parameters did not pass server validation."
    : description;
  return '<div class="error-row"><span class="error-status error-status-' + status.charAt(0) + '">' + escapeHtml(status) + '</span><div><strong>' + escapeHtml(errorTitle(status, description)) + '</strong><p>' + escapeHtml(detail) + '</p></div></div>';
}).join("") + '</div>';

const pathParameters = (doc: ApiDoc): ContractRow[] =>
  doc.path.includes(":id")
    ? [{ name: "id", value: "MongoDB ObjectId", description: "Required route identifier, for example 64f000000000000000000000." }]
    : [];

const queryParameters = (doc: ApiDoc): ContractRow[] => {
  if (doc.path === "/api/listings") return [
    { name: "page", value: "integer, default 1", description: "Page number; must be at least 1." },
    { name: "limit", value: "integer, default 20, max 100", description: "Number of records to return." },
    { name: "location", value: "string", description: "Filter published listings by location." },
    { name: "internshipType", value: "string", description: "Filter by internship type." },
    { name: "workMode", value: "onsite | remote | hybrid", description: "Filter by work mode." },
    { name: "category", value: "string", description: "Filter by listing category." },
    { name: "search", value: "string", description: "Text search across indexed listing fields." },
  ];
  if (doc.group === "Admin" && doc.path.includes("/applications")) return [
    { name: "page", value: "integer, default 1", description: "Page number." },
    { name: "limit", value: "integer, default 20, max 100", description: "Number of records to return." },
    { name: "status", value: "string", description: "Filter applications by status." },
    { name: "listingId / companyId / studentId", value: "ObjectId", description: "Filter by related resource." },
    { name: "search", value: "string", description: "Search student name, email, or matric number." },
  ];
  if (doc.path.includes("/applications")) return [
    { name: "page", value: "integer, default 1", description: "Page number." },
    { name: "limit", value: "integer, default 20, max 100", description: "Number of records to return." },
    { name: "status", value: "string", description: "Filter applications by status." },
  ];
  if (doc.path.includes("/submissions")) return [
    { name: "page", value: "integer, default 1", description: "Page number." },
    { name: "limit", value: "integer, default 20, max 100", description: "Number of records to return." },
    { name: "status", value: "string", description: "Filter submissions by status." },
  ];
  if (doc.path === "/api/notifications") return [
    { name: "page", value: "integer, default 1", description: "Page number." },
    { name: "limit", value: "integer, default 20, max 100", description: "Number of records to return." },
    { name: "isRead", value: "true | false", description: "Filter by notification read state." },
  ];
  if (doc.path === "/api/admin/audit-logs") return [
    { name: "page", value: "integer, default 1", description: "Page number." },
    { name: "limit", value: "integer, default 20, max 100", description: "Number of records to return." },
    { name: "action", value: "string", description: "Filter by audit action." },
    { name: "performedBy", value: "ObjectId", description: "Filter by performing user." },
    { name: "targetType", value: "string", description: "Filter by target resource type." },
    { name: "targetId", value: "ObjectId", description: "Filter by target resource." },
    { name: "from / to", value: "ISO date", description: "Filter the timestamp range." },
  ];
  if (doc.path === "/api/logs") return [
    { name: "page", value: "integer, default 1", description: "Page number." },
    { name: "limit", value: "integer, default 50, max 100", description: "Number of logs to return." },
  ];
  return [];
};

const requestHeaders = (doc: ApiDoc): ContractRow[] => {
  if (doc.method === "WS") return [
    { name: "Origin", value: "approved CLIENT_URL", description: "The server rejects unapproved origins during the WebSocket upgrade." },
    { name: "Cookie", value: "access_token=<session>", description: "Authentication is read from the access token cookie." },
  ];
  const headers: ContractRow[] = [
    { name: "Accept", value: "application/json", description: "Requests JSON responses." },
  ];
  if (["POST", "PUT", "PATCH", "DELETE"].includes(doc.method)) {
    headers.push({ name: "Content-Type", value: "application/json", description: "Required when sending a JSON request body." });
    headers.push({ name: "X-CSRF-Token", value: "<csrf-token>", description: "Must match the csrf_token cookie issued by GET /api/auth/csrf." });
  }
  if (doc.path === "/api/submissions") {
    headers.push({ name: "Idempotency-Key", value: "opportunity-123", description: "Optional for normal requests; required when the raw URL exceeds 512 characters and prevents duplicate jobs." });
  }
  return headers;
};

const requestCookies = (doc: ApiDoc): ContractRow[] => {
  const cookies: ContractRow[] = [];
  if (doc.method === "WS" || /Authenticated|Student|Admin|Super Admin/.test(doc.access)) {
    cookies.push({ name: "access_token", value: "<session-cookie>", description: "HttpOnly access session issued by login or refresh." });
  }
  if (["POST", "PUT", "PATCH", "DELETE"].includes(doc.method)) {
    cookies.push({ name: "csrf_token", value: "<csrf-token>", description: "Readable CSRF cookie that must match X-CSRF-Token." });
  }
  if (doc.path === "/api/auth/refresh" || doc.path === "/api/auth/logout") {
    cookies.push({ name: "refresh_token", value: "<refresh-cookie>", description: "Refresh session used to rotate or revoke authentication." });
  }
  return cookies;
};

const relatedPaths = (doc: ApiDoc): string[] => {
  if (doc.path === "/api/auth/csrf") return ["/api/auth/login", "/api/auth/register"];
  if (doc.path === "/api/auth/login") return ["/api/auth/me", "/api/auth/refresh", "/api/auth/logout"];
  if (doc.path === "/api/listings" || doc.path === "/api/listings/:id") return ["/api/applications"];
  if (doc.path.includes("applications")) return ["/api/listings/:id", "/api/student/applications"];
  if (doc.path.includes("submissions") || doc.path === "/ws") return ["/api/submissions", "/api/student/submissions", "/ws", "/api/admin/submissions"];
  if (doc.group === "Notifications") return ["/api/notifications", "/api/notifications/unread-count"];
  return [];
};

const fetchExample = (doc: ApiDoc) => {
  if (doc.method === "WS") return 'const socket = new WebSocket("wss://internstack-backend.onrender.com/ws");\\nsocket.onmessage = (event) => console.log(JSON.parse(event.data));';
  const body = doc.body ? ',\\n  body: JSON.stringify(' + doc.body.replaceAll("\\n", "\\n  ") + ')' : "";
  const headers = requestHeaders(doc).filter((header) => header.name !== "Accept").map((header) => '    "' + header.name + '": "' + header.value + '"').join(",\\n");
  return 'const response = await fetch("' + serverUrl + doc.path + '", {\\n  method: "' + doc.method + '",\\n  credentials: "include",\\n  headers: {\\n    "Accept": "application/json"' + (headers ? ",\\n" + headers : "") + '\\n  }' + body + '\\n});\\nconst data = await response.json();';
};

const curlExample = (doc: ApiDoc) => {
  if (doc.method === "WS") return 'websocat "wss://internstack-backend.onrender.com/ws" --header="Cookie: access_token=<session-cookie>"';
  const headers = requestHeaders(doc).map((header) => ' -H "' + header.name + ': ' + header.value + '"').join("");
  const body = doc.body ? " --data-raw \"" + JSON.stringify(JSON.parse(doc.body)).replaceAll("\\", "\\\\").replaceAll('"', '\\"') + "\"" : "";
  const cookies = requestCookies(doc).length ? ' --cookie "' + requestCookies(doc).map((cookie) => cookie.name + "=" + cookie.value).join("; ") + '"' : "";
  return 'curl.exe -X ' + doc.method + ' "' + serverUrl + doc.path + '"' + headers + cookies + body;
};

const defaultTechnical = (doc: ApiDoc) => {
  if (doc.path === "/health") return "This is a liveness check. It confirms that Express is handling requests and does not query MongoDB, Redis, the extraction worker, or the WebSocket server.";
  if (doc.path === "/ready") return "This is a readiness check backed by mongoose.connection.readyState. It returns 200 only when MongoDB is connected and 503 while the database is unavailable.";
  if (doc.path === "/api/listings") return "This returns published listings only. The controller supports page and limit pagination plus location, internshipType, workMode, category, and search filters.";
  if (doc.path === "/api/listings/:id") return "This loads one listing by MongoDB ID and populates the company name, logo, and website. A missing listing returns LISTING_NOT_FOUND.";
  if (doc.path.includes("/notifications")) return "Notifications are scoped to the authenticated user. Read operations return that user’s records; mutation operations update read state and require the CSRF cookie/header pair.";
  if (doc.path.includes("/applications")) return "Application access is scoped by role: students see their own applications, while administrators can filter and review applications. Status transitions are checked before writes.";
  if (doc.path.includes("/admin/")) return "This operation is protected by the admin router. The request is authenticated, authorized for admin or super_admin, validated where a body schema is defined, and recorded or followed by the relevant business operation.";
  if (doc.method === "WS") return "This is a stateful WebSocket connection. Authentication happens during the upgrade request, then each JSON message is validated and processed independently.";
  if (doc.method === "GET") return "This is a read operation. The server applies the authentication and role checks shown above, validates route parameters where required, and returns a JSON representation of the requested resource.";
  if (doc.method === "POST") return "The server validates the JSON body before the controller runs. A successful request creates or starts the requested operation; failures are returned using the documented HTTP status and error code.";
  if (doc.method === "PATCH" || doc.method === "PUT") return "The server validates the JSON body, checks the authenticated user can change this resource, applies the update, and returns the updated resource.";
  return "The server authenticates the request, validates the resource identifier, applies the requested state change, and returns a JSON result. The operation may fail when the resource is not eligible for this transition.";
};

const endpointCard = (doc: ApiDoc, index: number) => {
  const id = doc.path.replaceAll("/", "-").replaceAll(":", "");
  const search = escapeHtml((doc.group + " " + doc.method + " " + doc.path + " " + doc.summary + " " + doc.access + " " + doc.failures).toLowerCase());
  const body = doc.body ? '<section class="request-detail"><h4>Request body</h4>' + code(doc.body) + '</section>' : '<section class="request-detail"><h4>Request body</h4><p class="muted">No request body.</p></section>';
  const headers = '<section><h4>Headers</h4>' + table(requestHeaders(doc), "No additional headers.") + '</section>';
  const cookies = '<section><h4>Cookies</h4>' + table(requestCookies(doc), "No cookies required.") + '</section>';
  const pathParams = '<section><h4>Path parameters</h4>' + table(pathParameters(doc), "No path parameters.") + '</section>';
  const query = '<section><h4>Query parameters</h4>' + table(queryParameters(doc), "No query parameters.") + '</section>';
  const examples = '<section class="examples"><div class="example-heading"><h4>JavaScript / Fetch</h4><span>Run in a browser or Node.js</span></div>' + code(fetchExample(doc)) + '<div class="example-heading"><h4>cURL</h4><span>Run with <code>curl.exe</code> in PowerShell, Command Prompt, macOS, or Linux</span></div>' + code(curlExample(doc)) + '</section>';
  const related = relatedPaths(doc).filter((path, index, all) => all.indexOf(path) === index).map((path) => '<a href="#' + path.replaceAll("/", "-").replaceAll(":", "") + '">' + escapeHtml(path) + '</a>').join("");
  return '<article class="endpoint" id="' + id + '" data-search="' + search + '" data-group="' + slug(doc.group) + '">' +
    '<button class="endpoint-toggle" type="button" aria-expanded="false">' +
    '<span class="method method-' + doc.method.toLowerCase() + '">' + doc.method + '</span><code>' + escapeHtml(doc.path) + '</code><span class="access">' + escapeHtml(doc.access) + '</span><span class="chevron">' + icons.chevron + '</span></button>' +
    '<div class="endpoint-content" hidden><p class="summary">' + escapeHtml(doc.summary) + '</p><div class="contract-grid">' + headers + cookies + pathParams + query + '</div><div class="detail-grid">' +
    '<section class="access-detail"><h4>Access</h4><p>' + escapeHtml(doc.access) + '</p></section>' + body +
    '<section class="response-detail"><h4>Response · ' + statusFor(doc) + '</h4>' + code(responseExample(doc)) + '</section>' +
    '<section class="errors-detail"><h4>Errors</h4>' + errors(doc.failures) + '</section></div>' +
    '<div class="technical"><h4>How it works</h4><p>' + escapeHtml(doc.technical || defaultTechnical(doc)) + '</p></div>' + examples +
    (related ? '<div class="related"><h4>Related endpoints</h4>' + related + '</div>' : "") +
    (doc.notes ? '<p class="note"><strong>Note:</strong> ' + escapeHtml(doc.notes) + '</p>' : "") + '</div></article>';
};

const authGuide = '<section id="authentication-guide" class="guide"><div class="group-heading"><div><p class="eyebrow">START HERE</p><h2>Authentication and request setup</h2></div></div><p>Browser clients use httpOnly cookies for the access and refresh sessions. Mutating requests also use a CSRF cookie/header pair.</p><ol><li>Call <code>GET /api/auth/csrf</code> and keep the <code>csrf_token</code> cookie.</li><li>Send the returned token in <code>X-CSRF-Token</code> for every POST, PUT, PATCH, and DELETE request.</li><li>Send requests with <code>credentials: "include"</code> so authentication and CSRF cookies are included.</li><li>After login, the server sets <code>access_token</code> and <code>refresh_token</code> cookies; do not try to read the httpOnly values from browser JavaScript.</li></ol>' + code('const csrf = await fetch("/api/auth/csrf", { credentials: "include" });\\nconst { csrfToken } = await csrf.json();\\n\\nawait fetch("/api/student/profile", {\\n  method: "PUT",\\n  credentials: "include",\\n  headers: {\\n    "Content-Type": "application/json",\\n    "X-CSRF-Token": csrfToken\\n  },\\n  body: JSON.stringify({ institution: "Example University" })\\n});') + '</section>';

const submissionGuide = '<section id="submission-protocol" class="guide"><div class="group-heading"><div><p class="eyebrow">SUBMISSION WORKFLOW</p><h3>URL extraction protocol</h3></div></div><p>Use the HTTP endpoint to create a submission, then use the WebSocket transport when the client needs live extraction progress.</p><div class="protocol-steps"><div><strong>1</strong><span>POST a URL to <code>/api/submissions</code>.</span></div><div><strong>2</strong><span>Store the returned <code>submissionId</code>.</span></div><div><strong>3</strong><span>Connect to <code>wss://internstack-backend.onrender.com/ws</code> with the access cookie.</span></div><div><strong>4</strong><span>Send <code>subscribe_submission</code> and handle queued, processing, completed, and failed events.</span></div></div>' + code('{ "type": "subscribe_submission", "submissionId": "665f2e2a8f1a2b3c4d5e6f72" }') + '</section>';

export const docsHtml = () => {
  const navigation = '<a href="#overview" data-nav="overview">Overview</a><a href="#authentication-guide" data-nav="authentication-guide">Authentication & setup</a>' + groups.map((group) => '<a href="#' + slug(group) + '" data-nav="' + slug(group) + '">' + escapeHtml(group) + '</a>').join("");
  const sections = groups.map((group) => '<section class="api-group" id="' + slug(group) + '">' + (group === "Submissions" ? submissionGuide : "") + '<div class="group-heading"><div><p class="eyebrow">API GROUP</p><h2>' + escapeHtml(group) + '</h2></div><span>' + apiDocs.filter((doc) => doc.group === group).length + ' endpoints</span></div>' + apiDocs.filter((doc) => doc.group === group).map((doc, index) => endpointCard(doc, index)).join("") + '</section>').join("");
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="InternStack backend API documentation"><title>InternStack API Reference</title><link rel="stylesheet" href="/docs/styles.css"></head><body>' +
    '<header class="topbar"><button id="menu" class="menu" type="button" aria-label="Open documentation menu">' + icons.menu + '</button><a class="brand" href="/docs"><img class="brand-logo" src="/logoo.png" alt="InternStack"><span>API Reference<small>Backend documentation</small></span></a><div class="search-wrap"><label class="search"><span class="search-icon">' + icons.search + '</span><input id="search" type="search" placeholder="Search endpoints..." autocomplete="off" aria-controls="search-results" aria-expanded="false"></label><div id="search-results" class="search-results" role="listbox" hidden></div></div><button id="theme" class="theme" type="button" aria-label="Toggle theme">' + icons.sun + '</button></header>' +
    '<div id="drawer-backdrop" class="drawer-backdrop" hidden></div><div class="layout"><aside class="sidebar"><div class="drawer-brand"><img class="brand-logo" src="/logoo.png" alt="InternStack"><span>API Reference<small>Backend documentation</small></span><button id="drawer-close" class="drawer-close" type="button" aria-label="Close documentation menu">×</button></div><nav>' + navigation + '</nav></aside><main>' +
    '<section id="overview" class="hero"><p class="eyebrow">INTERNSTACK BACKEND</p><h1>API Reference</h1><p>HTTP endpoints for authentication, listings, applications, submissions, notifications, and administration.</p><div class="reference-meta"><div><span>Base URL</span><code id="base-url">Current server</code></div><div><span>Format</span><strong>JSON</strong></div><div><span>Version</span><strong>v1</strong></div></div></section>' +
    '<section class="callout"><strong>Before you start</strong><span>Send cookies with authenticated requests. Before a mutation, request <code>/api/auth/csrf</code> and send the returned token as <code>X-CSRF-Token</code>.</span></section>' + authGuide + sections +
    '<p id="empty" class="empty" hidden>No endpoints match your search.</p></main></div><script src="/docs/script.js" defer></script></body></html>';
};

export const docsCss = [
  ':root{color-scheme:light;--bg:#f7f8fa;--surface:#fff;--surface-2:#f1f4f5;--ink:#172033;--muted:#637083;--line:#dfe5e8;--accent:#176b70;--accent-soft:#e9f4f3;--code:#111827;--shadow:0 2px 8px rgba(16,24,40,.04)}',
  '[data-theme=dark]{color-scheme:dark;--bg:#0c151a;--surface:#132127;--surface-2:#192b32;--ink:#edf5f4;--muted:#a7b8bc;--line:#294149;--accent:#7dd1c7;--accent-soft:#183b3d;--code:#081014;--shadow:none}',
  '*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.6 Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}.topbar{height:68px;position:sticky;top:0;z-index:10;display:flex;align-items:center;gap:28px;padding:0 42px;background:color-mix(in srgb,var(--surface) 94%,transparent);border-bottom:1px solid var(--line);backdrop-filter:blur(12px)}',
  '.brand{display:flex;align-items:center;gap:11px;min-width:270px;color:var(--ink);font-weight:750;text-decoration:none}.brand-logo{width:36px;height:36px;object-fit:contain;border-radius:8px}.brand small{display:block;color:var(--muted);font-size:10px;font-weight:500}.search-wrap{position:relative;width:min(480px,100%)}.search{display:flex;align-items:center;gap:9px;padding:9px 13px;border:1px solid var(--line);border-radius:7px;background:var(--bg);color:var(--muted)}.search-icon svg,.theme svg,.menu svg,.chevron svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.search input{width:100%;border:0;outline:0;background:transparent;color:var(--ink);font:inherit}.theme{margin-left:auto;display:grid;place-items:center;width:36px;height:36px;border:1px solid var(--line);border-radius:7px;background:transparent;color:var(--ink);cursor:pointer}.layout{display:grid;grid-template-columns:205px minmax(0,900px);gap:42px;max-width:1160px;margin:0 auto;padding:34px 28px}.sidebar{position:sticky;top:100px;align-self:start;height:calc(100vh - 130px)}.sidebar nav{display:grid;gap:2px;border-left:1px solid var(--line);padding-left:11px}.sidebar a{color:var(--muted);padding:6px 10px;text-decoration:none;border-radius:5px}.sidebar a:hover,.sidebar a.active{color:var(--accent);background:var(--accent-soft);font-weight:650}.menu{display:none}.hero{padding:12px 0 27px;scroll-margin-top:90px}.eyebrow{margin:0 0 7px;color:var(--accent);font-size:10px;font-weight:800;letter-spacing:.11em}.hero h1{margin:0 0 10px;font-size:42px;line-height:1.05;letter-spacing:-.035em}.hero>p:not(.eyebrow){max-width:650px;color:var(--muted);font-size:15px}.reference-meta{display:flex;gap:32px;margin-top:24px;padding-top:16px;border-top:1px solid var(--line)}.reference-meta div{display:grid;gap:2px}.reference-meta span{font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.07em}.reference-meta code,.reference-meta strong{font-size:13px;color:var(--ink)}.callout{display:flex;gap:16px;padding:13px 15px;margin-bottom:43px;background:var(--accent-soft);border:1px solid color-mix(in srgb,var(--accent) 30%,var(--line));border-radius:7px}.callout strong{white-space:nowrap}.callout span{color:var(--muted)}.api-group{scroll-margin-top:90px;margin-bottom:48px}.group-heading{display:flex;align-items:end;justify-content:space-between;margin-bottom:11px}.group-heading h2{margin:0;font-size:23px;letter-spacing:-.025em}.group-heading>span{color:var(--muted);font-size:12px}.endpoint{overflow:hidden;margin:7px 0;background:var(--surface);border:1px solid var(--line);border-radius:7px}.endpoint-toggle{display:flex;align-items:center;gap:11px;width:100%;padding:13px 15px;border:0;background:transparent;color:var(--ink);font:inherit;text-align:left;cursor:pointer}.endpoint-toggle code{font-weight:650}.access{margin-left:auto;color:var(--muted);font-size:11px}.chevron{display:grid;place-items:center;color:var(--muted);transition:transform .2s}.endpoint-toggle[aria-expanded=true] .chevron{transform:rotate(180deg)}.method{min-width:53px;padding:3px 6px;border-radius:4px;text-align:center;font-size:10px;font-weight:800;letter-spacing:.05em}.method-get{background:#e7f5ed;color:#087443}.method-post{background:#e7efff;color:#315efb}.method-put{background:#f0eaff;color:#7136bf}.method-patch{background:#fff1da;color:#a65c00}.method-delete{background:#ffebeb;color:#c43131}.endpoint-content{padding:0 15px 17px;border-top:1px solid var(--line)}.summary{margin:13px 0;color:var(--muted)}.detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:15px}.detail-grid h4{margin:0 0 6px;color:var(--muted);font-size:10px;text-transform:uppercase;letter-spacing:.07em}.detail-grid p{margin:0;color:var(--muted)}pre{position:relative;overflow:auto;margin:0;padding:12px 45px 12px 12px;border-radius:5px;background:var(--code);color:#d9e2f2;font-size:11px;line-height:1.55}pre .copy{position:absolute;right:7px;top:7px;border:1px solid #4b5870;border-radius:4px;background:transparent;color:#c8d2e4;padding:3px 6px;font-size:10px;cursor:pointer}.note{margin:17px 0 0;padding:10px 12px;border-left:3px solid var(--accent);background:var(--accent-soft);color:var(--muted)}.search-results{position:absolute;top:calc(100% + 7px);left:0;right:0;z-index:20;overflow:hidden;background:var(--surface);border:1px solid var(--line);border-radius:7px;box-shadow:0 12px 35px rgba(16,24,40,.15)}.search-result{display:block;width:100%;padding:10px 12px;border:0;border-bottom:1px solid var(--line);background:transparent;color:var(--ink);text-align:left;cursor:pointer}.search-result:last-child{border-bottom:0}.search-result:hover,.search-result.selected{background:var(--accent-soft)}.search-result small{display:block;color:var(--muted);margin-top:2px}.search-result .result-method{color:var(--accent);font-size:10px;font-weight:800;margin-right:8px}.empty{padding:35px;color:var(--muted);text-align:center}@media(max-width:800px){.topbar{padding:0 18px;gap:12px}.brand{min-width:auto}.brand>span{display:none}.layout{display:block;padding:18px}.sidebar{position:static;height:auto;margin-bottom:24px}.menu{display:flex;align-items:center;gap:8px;width:100%;padding:10px;border:1px solid var(--line);border-radius:7px;background:var(--surface);color:var(--ink);font:inherit;text-align:left}.sidebar nav{display:none;margin-top:8px}.sidebar.open nav{display:grid}.hero h1{font-size:34px}.reference-meta{gap:18px;flex-wrap:wrap}.detail-grid{grid-template-columns:1fr}.access{display:none}.search-wrap{flex:1}.topbar .theme{display:grid}}',
  '.method-ws{background:#e9f4f3;color:#176b70}.technical{grid-column:1/-1;margin-top:18px;padding:12px 13px;border-left:3px solid var(--accent);background:var(--surface-2);border-radius:4px}.technical h4{margin-bottom:5px}.technical p{color:var(--muted)}',
  '.endpoint,.guide{scroll-margin-top:92px}.endpoint-content pre{white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word;padding-right:88px}.endpoint-content pre code{display:block;min-width:0;color:#d4d1d2}.endpoint-content pre .copy{z-index:2;min-width:52px;background:var(--code);box-shadow:0 0 0 4px var(--code)}.tok-keyword{color:#f3a6c1;font-weight:600}.tok-method{color:#f5d06f;font-weight:700}.tok-function{color:#c4a7ff}.tok-string,.tok-key{color:#83e3a5}',
  '.guide{scroll-margin-top:90px;margin:0 0 45px;padding:20px;background:var(--surface);border:1px solid var(--line);border-radius:7px}.guide h3{margin:0;font-size:20px}.guide p,.guide li{color:var(--muted)}.guide ol{padding-left:20px}.contract-grid{display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-bottom:17px}.contract-grid>section{min-width:0}.contract-table{width:100%;border-collapse:collapse;font-size:11px}.contract-table th,.contract-table td{padding:8px 7px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}.contract-table th{color:var(--muted);font-size:10px;text-transform:uppercase;letter-spacing:.05em}.contract-table td{color:var(--muted)}.contract-table td:first-child{color:var(--ink);white-space:nowrap}.examples{grid-column:1/-1;padding-top:4px}.examples h4{margin-top:14px}.related{grid-column:1/-1;border-top:1px solid var(--line);margin-top:16px;padding-top:13px}.related a{display:inline-block;margin:0 8px 6px 0;padding:4px 7px;border-radius:4px;background:var(--accent-soft);color:var(--accent);font:11px ui-monospace,SFMono-Regular,Consolas,monospace;text-decoration:none}.protocol-steps{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:18px 0}.protocol-steps div{display:flex;gap:8px;align-items:flex-start;padding:10px;background:var(--surface-2);border-radius:5px}.protocol-steps strong{display:grid;place-items:center;flex:none;width:22px;height:22px;border-radius:50%;background:var(--accent);color:#fff;font-size:11px}.protocol-steps span{color:var(--muted);font-size:12px}@media(max-width:800px){.contract-grid{grid-template-columns:1fr}.protocol-steps{grid-template-columns:1fr}.guide{padding:15px}}',
  '@media(max-width:800px){.topbar>.brand{display:none}}',
  '.example-heading{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-top:16px}.example-heading h4{margin:0}.example-heading span{color:var(--muted);font-size:11px}@media(max-width:800px){.example-heading{display:block}.example-heading span{display:block;margin-top:2px}}',
  '.code-block{overflow:hidden;border:1px solid color-mix(in srgb,var(--code) 70%,var(--line));border-radius:6px;background:var(--code)}.code-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:6px 8px;border-bottom:1px solid rgba(255,255,255,.08);background:color-mix(in srgb,var(--code) 88%,white)}.code-toolbar span{color:#9daaba;font-size:10px;letter-spacing:.04em;text-transform:uppercase}.code-toolbar .copy{border:1px solid #4b5870;border-radius:4px;background:transparent;color:#c8d2e4;padding:3px 7px;font-size:10px;cursor:pointer}.code-toolbar .copy:hover{border-color:#83e3a5;color:#83e3a5}.code-block pre{border-radius:0}.endpoint-content pre .copy{display:none}',
  '.error-list{display:grid;gap:7px}.error-row{display:grid;grid-template-columns:48px minmax(0,1fr);gap:10px;align-items:start;padding:9px 10px;border:1px solid var(--line);border-radius:5px;background:var(--surface-2)}.error-status{display:inline-grid;place-items:center;min-height:24px;border-radius:4px;font:700 11px ui-monospace,SFMono-Regular,Consolas,monospace}.error-status-4{background:#ffebeb;color:#c43131}.error-status-5{background:#fff1da;color:#a65c00}.error-status-1{background:#f0eaff;color:#7136bf}.error-status-2{background:#e7f5ed;color:#087443}.error-row strong{display:block;color:var(--ink);font-size:12px}.error-row p{margin:2px 0 0;color:var(--muted);font-size:12px;line-height:1.45}',
  '.endpoint-content{max-height:0;opacity:0;overflow:hidden;transition:max-height .42s cubic-bezier(.22,.61,.36,1),opacity .24s ease}.endpoint-content[hidden]{display:block}.endpoint-content.is-visible{opacity:1}.detail-grid{grid-template-areas:"access access" "request response" "errors errors"}.access-detail{grid-area:access}.request-detail{grid-area:request}.response-detail{grid-area:response}.errors-detail{grid-area:errors}.muted{color:var(--muted)}@media(max-width:800px){.detail-grid{grid-template-areas:"access" "request" "response" "errors"}}',
  '.drawer-brand{display:none}.drawer-backdrop{display:none}.drawer-close{display:none}@media(max-width:800px){body.drawer-open{overflow:hidden}.topbar{padding:0 15px;gap:12px}.topbar .menu{display:grid;place-items:center;flex:none;width:36px;height:36px;padding:0;border:1px solid var(--line);border-radius:7px;background:transparent;color:var(--ink)}.brand{min-width:0;flex:none}.brand-logo{width:34px;height:34px}.brand>span{display:none}.search-wrap{flex:1;min-width:0}.theme{flex:none}.drawer-backdrop{display:block;position:fixed;inset:0;z-index:15;background:rgba(5,15,19,.58)}.drawer-backdrop[hidden]{display:none}.sidebar{position:fixed;z-index:20;top:0;bottom:0;left:0;width:min(310px,86vw);height:100vh;margin:0;padding:0 18px;background:var(--surface);border-right:1px solid var(--line);box-shadow:16px 0 40px rgba(0,0,0,.18);transform:translateX(-105%);transition:transform .24s ease;overflow-y:auto}.sidebar.open{transform:translateX(0)}.drawer-brand{display:flex;align-items:center;gap:11px;height:68px;border-bottom:1px solid var(--line);font-weight:750}.drawer-brand small{display:block;color:var(--muted);font-size:10px;font-weight:500}.drawer-close{display:grid;place-items:center;width:30px;height:30px;margin-left:auto;border:0;border-radius:6px;background:var(--surface-2);color:var(--ink);font-size:22px;line-height:1;cursor:pointer}.sidebar nav{display:grid;gap:3px;margin-top:20px;border-left:0;padding:0}.sidebar a{padding:10px 12px}.layout{display:block;padding:18px}.hero h1{font-size:34px}.reference-meta{gap:18px;flex-wrap:wrap}.detail-grid{grid-template-columns:1fr}.access{display:none}}',
].join("");

export const docsJs = [
  "const root=document.documentElement;",
  "const search=document.querySelector('#search');",
  "const results=document.querySelector('#search-results');",
  "const empty=document.querySelector('#empty');",
  "const theme=document.querySelector('#theme');",
  "const menu=document.querySelector('#menu');",
  "const baseUrl=document.querySelector('#base-url');",
  "const cards=[...document.querySelectorAll('.endpoint')];",
  "const nav=[...document.querySelectorAll('[data-nav]')];",
  "baseUrl.textContent='https://internstack-backend.onrender.com';",
  "const fuzzy=(text,word)=>{let i=0;for(const char of text){if(char===word[i])i++;if(i===word.length)return true}return false};",
  "const score=(card,q)=>{const text=card.dataset.search;let points=0;q.split(/\\s+/).filter(Boolean).forEach(word=>{if(text.includes(word))points+=3;else if(fuzzy(text,word))points+=1});return points};",
  "const renderResults=()=>{const q=search.value.trim().toLowerCase();if(!q){results.hidden=true;search.setAttribute('aria-expanded','false');return}const ranked=cards.map(card=>({card,points:score(card,q)})).filter(x=>x.points>0).sort((a,b)=>b.points-a.points).slice(0,8);results.innerHTML=ranked.length?ranked.map((x,i)=>{const button=x.card.querySelector('.endpoint-toggle');const method=button.querySelector('.method').textContent;const path=button.querySelector('code').textContent;const summary=x.card.querySelector('.summary').textContent;return '<button class=\"search-result\" type=\"button\" data-target=\"'+x.card.id+'\" role=\"option\" data-index=\"'+i+'\"><span class=\"result-method\">'+method+'</span>'+path+'<small>'+summary+'</small></button>'}).join(''):'<div class=\"search-result\">No matching endpoints<small>Try a path, method, group, or error code.</small></div>';results.hidden=false;search.setAttribute('aria-expanded','true')};",
  "search.addEventListener('input',renderResults);",
  "search.addEventListener('keydown',event=>{const options=[...results.querySelectorAll('.search-result[data-target]')];const selected=options.findIndex(item=>item.classList.contains('selected'));if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();if(!options.length)return;const next=event.key==='ArrowDown'?Math.min(selected+1,options.length-1):Math.max(selected-1,0);options.forEach(item=>item.classList.remove('selected'));options[next].classList.add('selected')}if(event.key==='Enter'&&selected>=0){event.preventDefault();options[selected].click()}if(event.key==='Escape'){results.hidden=true;search.setAttribute('aria-expanded','false')}});",
  "results.addEventListener('click',event=>{const target=event.target.closest('[data-target]');if(!target)return;const card=document.getElementById(target.dataset.target);openCard(card.querySelector('.endpoint-toggle'),true);results.hidden=true;search.setAttribute('aria-expanded','false');search.blur()});",
  "document.addEventListener('click',event=>{if(!event.target.closest('.search-wrap')){results.hidden=true;search.setAttribute('aria-expanded','false')}});",
  "const setExpanded=(button,expanded,instant=false)=>{const content=button.nextElementSibling;button.setAttribute('aria-expanded',String(expanded));if(expanded){content.hidden=false;content.classList.add('is-visible');content.style.maxHeight=content.scrollHeight+'px';if(instant)content.style.transition='none';requestAnimationFrame(()=>content.style.transition='')}else{content.style.maxHeight=content.scrollHeight+'px';requestAnimationFrame(()=>{content.classList.remove('is-visible');content.style.maxHeight='0px'});content.addEventListener('transitionend',()=>{if(button.getAttribute('aria-expanded')==='false')content.hidden=true},{once:true})}};",
  "const placeCardForExpansion=card=>{const header=card.querySelector('.endpoint-toggle');const rect=header.getBoundingClientRect();const topOffset=92;const bottomSpace=96;if(rect.top<topOffset||rect.bottom>window.innerHeight-bottomSpace)window.scrollTo({top:Math.max(0,window.scrollY+rect.top-topOffset),behavior:'auto'})};",
  "const scrollToCard=card=>{const header=card.querySelector('.endpoint-toggle');const topOffset=92;const rect=header.getBoundingClientRect();window.scrollTo({top:Math.max(0,window.scrollY+rect.top-topOffset),behavior:'auto'})};",
  "const keepHeaderPosition=(card,top)=>{const header=card.querySelector('.endpoint-toggle');const started=performance.now();const frame=now=>{const delta=header.getBoundingClientRect().top-top;if(Math.abs(delta)>0.5)window.scrollBy({top:delta,behavior:'auto'});if(now-started<480)requestAnimationFrame(frame)};requestAnimationFrame(frame)};",
  "const openCard=(button,scrollAfterTransition=false)=>{const card=button.closest('.endpoint');if(button.getAttribute('aria-expanded')==='true'){if(scrollAfterTransition)scrollToCard(card);return}placeCardForExpansion(card);const anchorTop=button.getBoundingClientRect().top;document.querySelectorAll('.endpoint-toggle[aria-expanded=true]').forEach(other=>setExpanded(other,false));setExpanded(button,true);keepHeaderPosition(card,anchorTop);history.replaceState(null,'','#'+card.id);if(scrollAfterTransition)setTimeout(()=>scrollToCard(card),500)};",
  "document.querySelectorAll('.endpoint-toggle').forEach(button=>button.addEventListener('click',()=>{if(button.getAttribute('aria-expanded')==='true'){setExpanded(button,false);return}openCard(button)}));",
  "document.querySelectorAll('.copy').forEach(button=>button.addEventListener('click',async()=>{const codeBlock=button.closest('.code-block');await navigator.clipboard.writeText(codeBlock.querySelector('code').textContent);const old=button.textContent;button.textContent='Copied';setTimeout(()=>button.textContent=old,1200)}));",
  "const applyTheme=mode=>{root.dataset.theme=mode;theme.innerHTML=mode==='dark'?'"+icons.sun+"':'"+icons.moon+"';theme.setAttribute('aria-label',mode==='dark'?'Use light theme':'Use dark theme')};",
  "theme.addEventListener('click',()=>{const next=root.dataset.theme==='dark'?'light':'dark';localStorage.setItem('internstack-docs-theme',next);applyTheme(next)});",
  "applyTheme(localStorage.getItem('internstack-docs-theme')||((matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light'));",
  "const sidebar=document.querySelector('.sidebar');const backdrop=document.querySelector('#drawer-backdrop');const closeMenu=()=>{sidebar.classList.remove('open');backdrop.hidden=true;document.body.classList.remove('drawer-open')};",
  "menu.addEventListener('click',()=>{sidebar.classList.add('open');backdrop.hidden=false;document.body.classList.add('drawer-open')});",
  "document.querySelector('#drawer-close').addEventListener('click',closeMenu);backdrop.addEventListener('click',closeMenu);document.querySelectorAll('.sidebar a').forEach(link=>link.addEventListener('click',closeMenu));",
  "const observed=[document.querySelector('#overview'),...document.querySelectorAll('.api-group')];new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){nav.forEach(item=>item.classList.toggle('active',item.dataset.nav===entry.target.id))}}),{rootMargin:'-90px 0px -70% 0px'}).observe(observed[0]);observed.slice(1).forEach(section=>new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){nav.forEach(item=>item.classList.toggle('active',item.dataset.nav===entry.target.id))}}),{rootMargin:'-90px 0px -70% 0px'}).observe(section));",
  "const hash=location.hash.slice(1);if(hash){const card=document.getElementById(hash);if(card)openCard(card.querySelector('.endpoint-toggle'),true)}",
].join("");
