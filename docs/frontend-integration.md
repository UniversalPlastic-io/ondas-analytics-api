# Frontend integration — auth + asset registration

Contract reference for the Blue Resilience frontend after the move to a database-backed
API. Shareable version: published artifact (see the team channel).
Live contract: `https://ondas.universalplastic.io/api/docs`.

---

## 1. What changes for you

Nothing you already call breaks. The work is additive.

| Area | Status | What to do |
|---|---|---|
| `POST /v1/auth/login` | compatible | Same URL and fields. Send an **email** in `username`. |
| `GET /v1/overview`, `GET /v1/map/points` | compatible | Same shape. Optionally send the token to scope by organization. |
| `POST /v1/reports/request` | compatible | Nothing. |
| `POST /v1/analyses/run` | compatible | Still needs a bearer token; old and new tokens both work. |
| `GET /v1/campaigns` · `/cleanups` · `/organizations` | untouched | Still the marketplace feed. |
| Login response | **new field** | Now carries `user` with `role` and `organization`. |
| Sync + admin endpoints | **new** | Build the screens in §5 and §6. |

> Endpoints now serve only what has been synced into the database. A file sitting in S3
> that nobody registered is invisible to the API — which is what the §5 screen is for.

## 2. Authentication

### `POST /v1/auth/login` — public

`username` takes an email (the field name is kept for backwards compatibility).

```jsonc
// 200
{
  "access_token": "eyJhbGciOi…",
  "token_type": "Bearer",
  "expires_in": 28800,
  "username": "innoceana@participants.universalplastic.io",
  "user": {
    "email": "innoceana@participants.universalplastic.io",
    "name": "Innoceana",
    "role": "provider",                 // admin | provider | viewer
    "organization": { "id": "6a86…", "slug": "innoceana", "name": "Innoceana" }
  }
}
// 401
{ "message": "Invalid credentials", "error": "Unauthorized", "statusCode": 401 }
```

Send as `Authorization: Bearer <access_token>`. Lifetime 28800 s (8 h).
**No refresh endpoint** — on any `401`, clear the session and return to login.

### `GET /v1/auth/me` — bearer

```jsonc
{ "userId": "6a86…", "email": "…", "name": "Innoceana", "role": "provider",
  "organizationId": "6a86…", "organizationSlug": "innoceana", "legacy": false }
```

`legacy: true` means an old connector token — it works but may carry no organization;
treat that session as read-only.

## 3. Roles

| Capability | admin | provider | viewer |
|---|---|---|---|
| Read overview / map / reports / analyses | yes | yes | yes |
| Sync own organization's assets | yes | yes | no |
| Sync another organization's assets | yes | **403** | no |
| Sync history | all runs | own runs | no |
| Create organizations and users | yes | **403** | **403** |

The API enforces these; hiding a button is convenience, not security.

## 4. Organization scope

`GET /v1/overview` and `GET /v1/map/points` accept `?scope=mine|all`.

| Request | Sees |
|---|---|
| no token | whole data space |
| token, no `scope` | that user's organization *(default)* |
| token + `?scope=all` | whole data space |
| admin token | whole data space, always |

Current data: Innoceana's token → 9 cleanups / 2 sites; `?scope=all` → 18 / 5.
A "My organization / All participants" toggle maps onto this directly.

## 5. Registering assets

Nothing is scheduled. After a participant uploads to the data space, call the API.

### `POST /v1/sync/assets` — admin or provider

```jsonc
{ "key": "public/mediterraneo/port_badalona/boya_biomasa_badalona.json", "force": false }
// or { "url": "https://universalplastic-sedia.s3.eu-central-1.amazonaws.com/public/…" }
```

```jsonc
// 200
{
  "runId": "6a863d7a…", "kind": "asset", "status": "ok",
  "startedAt": "2026-08-19T23:34:18.836Z", "finishedAt": "2026-08-19T23:34:20.328Z",
  "totals": { "assets": 1, "created": 0, "updated": 1, "unchanged": 0,
              "missing": 0, "failed": 0, "observations": 3611, "warnings": 4 },
  "results": [ { "key": "public/…json", "action": "updated", "assetId": "6a86…",
                 "observations": 3611, "warnings": ["metadata.dateRange is inverted…"] } ],
  "warnings": []
}
```

| HTTP | `action` | Show |
|---|---|---|
| `200` | `created` | "Registered — 3,611 records." |
| `200` | `updated` | "Updated — 3,611 records replaced." |
| `200` | `unchanged` | "Already up to date." Offer *Force re-sync*. |
| `404` | — | "No such file in the data space." |
| `422` | — | Not a usable asset. Show `message`; it names the failed rule. |
| `403` | — | "That file belongs to another organization." |
| `400` | — | Neither `key` nor `url` sent. |

**Warnings are not errors.** A successful sync often returns `warnings` (corrected
coordinates, inverted date ranges, columns outside the published schema). The asset is
ingested and served — show them as advisory. 20 of 22 assets currently carry one.

### `POST /v1/sync/scan` — admin or provider

```jsonc
{ "prefix": "public/mediterraneo/",  // default: your organization's space
  "dryRun": true,                    // report the plan, write nothing
  "force": false }
```

Always `200`; it is a batch, so per-asset failures appear in `results` and `status`
becomes `partial`. Run with `dryRun: true` first and show the plan for confirmation.

### `GET /v1/sync/runs?limit=20` · `GET /v1/sync/runs/:id`

History newest first. Providers see their own runs, admins all. The detail route adds
per-asset `results`.

## 6. Organizations and users — admin only

### `POST /v1/admin/organizations`

```jsonc
{ "slug": "nueva_entidad", "name": "Nueva Entidad", "type": "NGO",
  "territory": "Costa Brava, Spain", "contact": "impact@nuevaentidad.org",
  "providerFolders": ["nueva_entidad"],     // S3 folders it may sync
  "dataProviderIds": ["nueva_entidad"],     // spellings used inside its files
  "s3": { "prefix": "public/mediterraneo/nueva_entidad/" } }
```

`providerFolders` is the permission boundary — it decides which keys this organization's
users may sync. `GET` lists, `PUT` updates by `slug`.

### `POST /v1/admin/users`

```jsonc
{ "email": "impact@nuevaentidad.org", "password": "at-least-ten-characters",
  "name": "Nueva Entidad", "role": "provider", "organizationSlug": "nueva_entidad" }
```

Under ten characters → `400`. Duplicate email → `409`. `GET /v1/admin/users` lists;
`PUT /v1/admin/users/password` sets a new one.

> Only bcrypt hashes are stored — never build a "show password" affordance, and there is
> no self-service reset yet: an admin sets it.

## 7. Errors

| Code | Means | Handling |
|---|---|---|
| `400` | Malformed request | Field-level message; fix and resubmit. |
| `401` | Missing/invalid/expired token | Clear session, redirect to login. Not retryable. |
| `403` | Role or organization forbids it | Do not retry; message names the required role. |
| `404` | No such object, run or organization | For a sync: the key is not in the bucket. |
| `409` | Already exists | Duplicate org slug or user email. |
| `422` | Understood but unusable | Invalid asset, or `insufficient_data` for a report period. |
| `503` | Upstream unavailable | Marketplace feed only. Retry later. |

## 8. Screens to build

**Sign in.** Email + password; store the token and keep `user.role` /
`user.organization.slug` in session state to drive navigation. Restore on boot with
`GET /v1/auth/me`; drop the session on any `401`.

**Register an asset** (admin & provider): one field for the S3 key or object URL, a
*Force re-sync* checkbox, and a result panel rendering `results[0]` — action, observation
count, warnings. Secondary *Sync everything* → `scan` with `dryRun: true`, show the plan,
confirm, repeat without it.

A full scan takes minutes and one large asset tens of seconds; both are synchronous, so
use a progress state and no short client timeout.

**Sync history.** Table over `GET /v1/sync/runs` (when, who, kind, status, totals); row
click opens the per-asset detail.
