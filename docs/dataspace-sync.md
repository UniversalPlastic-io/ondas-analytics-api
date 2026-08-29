# Data space sync + identity — operations

How to run the ONDAs API now that it serves Blue Resilience from Mongo.
Design rationale: [`superpowers/specs/2026-08-19-dataspace-sync-and-identity-design.md`](superpowers/specs/2026-08-19-dataspace-sync-and-identity-design.md).

---

## 1. Setup

```bash
cp .env.example .env      # set MONGODB_URI and PORTAL_JWT_SECRET
npm ci
npm run seed              # organizations + users (prints passwords once)
npm run backfill          # fills Mongo from the bucket
npm run start:dev
```

`npm run seed` is idempotent — it skips anything that already exists. It creates
the five data space participants (`universal_plastic`, `innoceana`,
`port_badalona`, `gijon_surf_hostel`, `bcss`), one `provider` user each, and one
`admin`. Passwords come from `config/portal-connectors.local.json` when that file
exists, otherwise they are generated and printed **once**.

`npm run backfill` runs the same scan the API exposes, as an admin:

```bash
npm run backfill                       # whole public/ prefix
npm run backfill -- --dry-run          # report the plan, write nothing
npm run backfill -- --force            # re-ingest even if unchanged
npm run backfill -- --prefix public/mediterraneo/
```

## 2. Telling the API about a new asset

There is no scheduler. After a participant uploads to S3, call the API.

```bash
# one asset, by key
curl -X POST https://ondas.universalplastic.io/api/v1/sync/assets \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"key":"public/mediterraneo/port_badalona/boya_biomasa_badalona.json"}'

# or by full object URL
-d '{"url":"https://universalplastic-sedia.s3.eu-central-1.amazonaws.com/public/…/file.json"}'

# reconcile a whole prefix
curl -X POST …/v1/sync/scan -d '{"prefix":"public/mediterraneo/","dryRun":true}'
```

Both return a run summary: per-asset `action`
(`created|updated|unchanged|missing|failed|skipped`), observation counts and
warnings. History lives at `GET /v1/sync/runs` and `GET /v1/sync/runs/:id`.

**Idempotent.** An object whose checksum has not changed reports `unchanged` and
writes nothing. Pass `"force": true` to re-ingest anyway (needed after a
normalizer change).

**Authorization.** `admin` syncs any key; `provider` only keys under its own
organization's provider folders. Anything else is `403`.

**Replacing an asset** deletes the previous observations only after the new ones
are written and the asset has been flipped to them, so a reader never sees a
half-replaced dataset. **Deleting an asset** from the bucket makes a scan mark it
`missing`; its observations are kept and the map marker carries a warning.

## 3. Reading

| Endpoint | Auth | Notes |
|---|---|---|
| `GET /v1/overview` | optional | `?period=`, `?campaign=`, `?scope=mine\|all` |
| `GET /v1/map/points` | optional | `?ocean=`, `?datasetType=`, `?provider=`, `?format=geojson`, `?scope=` |
| `POST /v1/reports/request` | none | unchanged contract |
| `POST /v1/analyses/run` | **required** | Bearer token |
| `GET /v1/campaigns\|cleanups\|organizations` | none | marketplace passthrough, untouched |

With a token, reads scope to the caller's organization by default; `?scope=all`
widens to the whole data space. Without a token, everything is visible. Admins
are never narrowed.

## 4. Identity

```bash
POST /v1/auth/login    {"username":"<email>","password":"…"}   # username also accepts a legacy connector name
GET  /v1/auth/me
POST /v1/admin/organizations   # admin only
POST /v1/admin/users           # admin only
PUT  /v1/admin/users/password  # admin only
```

Roles: `admin` (everything), `provider` (sync its own organization, read),
`viewer` (read).

An organization is a data space participant: its `slug`, every spelling of its
`dataProviderId` found in the files, the S3 provider folders it owns, and its
`s3.prefix` — the reference to its space in the data space.

## 5. Operational notes

- **S3 listing.** The runtime currently lacks `s3:ListBucket`, so `sync/scan`
  falls back to a bundled inventory of the 22 known files and says so in the run
  warnings. New files are still ingestable by key. Granting the permission makes
  scans self-updating and enables orphan detection.
- **Warnings are data.** Each asset stores the corrections and DCAT deviations
  found at ingest; they surface on map markers. A file with warnings is still
  served — read them rather than assuming the data is clean.
- **Re-ingest after changing a normalizer**, otherwise stored observations keep
  the old shape: `npm run backfill -- --force`.
