# Data space sync + identity — design

**Date:** 2026-08-19
**Status:** implemented
**Scope:** turn the ONDAs analytics API from an S3-reading prototype into the full
Blue Resilience backend: a Mongo read model filled by an explicit sync from the
data space, and users/organizations tied to their participant identity.

---

## 1. Context

Before this change the API held no database. Every request to `/v1/overview`,
`/v1/map/points`, `/v1/reports/request` and `/v1/analyses/run` fetched dataset
JSON straight from the public S3 bucket `universalplastic-sedia`, parsed it, and
aggregated in memory behind a 6-hour cache. Two hardcoded manifests
(`S3_CATALOGUE`, `MAP_CATALOGUE`) were the inventory. Authentication was a JSON
file of plaintext connector credentials.

That works for a demo and fails as a backend: no filtering by date or geography
below the whole-file level, no per-participant identity, no way to tell the API
that a participant published something new, and a request cost proportional to
the size of every file it touched.

The marketplace passthrough (`/v1/campaigns`, `/v1/cleanups`,
`/v1/organizations`) is deliberately **not** part of this. Those come from our
own operational Mongo through `api.universalplastic.io`, are display-only, and
feed no analysis. They stay a proxy.

## 2. Decisions

| Question | Decision |
|---|---|
| S3 layout | Current live layout only: `public/{ocean}/{provider}/{file}.json`. The participant-spec layout (`datasets/…`) is accepted at the type level through aliases but no key parsing depends on it. |
| Sync trigger | Explicit per-asset notification **and** prefix scan. No scheduler. |
| Storage granularity | Normalized: an `assets` document per file, an `observations` document per row / reading / particle / nested day. |
| Cluster | Dedicated Atlas database `ondas_dataspace`. |
| Identity | `organizations` + `users` with bcrypt passwords and roles. No machine API keys — sync authenticates as a user. |
| Visibility | Whole data space is readable; a token scopes to its own organization by default, `?scope=all` widens. Writes are always own-organization. |
| Read cutover | Mongo is the only read source. S3 is touched during a sync and to upload generated reports. |
| Validation | Container rules block (422). DCAT and data-quality deviations become warnings stored on the asset. |
| Asset removal | Re-ingest replaces atomically; a scan marks a vanished object `missing` without deleting its observations. |

## 3. Architecture

```
participant publishes an asset to S3
        │  (manual, no scheduler)
        ▼
POST /v1/sync/assets {key}  ──►  IngestService
                                   GetObject over public HTTPS
                                   validateContainer      → 422 on failure
                                   applyCorrections       → warnings[]
                                   validateAgainstDcat    → warnings[]
                                   normalizeDataset       → CanonicalObservation[]
                                   publishGeneration
                                        │
                                        ▼
                              assets + observations  (Mongo)
                                        │
    GET /v1/overview · /v1/map/points · POST /v1/reports/request · /v1/analyses/run
```

### Modules

- `src/mongo/` — connection.
- `src/api-v1/dataspace/` — key resolution, S3 reader, validators, normalizers,
  ingest, sync endpoints, and the two repositories every read goes through.
- `src/api-v1/identity/` — organizations, users, guards, admin endpoints, scope.

The endpoint modules kept their controllers and response shapes; only their data
source changed. The old parsers did not disappear — they became the normalizers,
so the same field handling now runs once per sync instead of once per request.

### The generation swap

An earlier version wrapped each replace in a transaction: upsert the asset,
delete its observations, insert the new ones. That failed in practice. Inserting
~3,900 documents against the cluster takes long enough that a transactional
replace of the largest hourly buoy assets outlived the server's 60-second
`transactionLifetimeLimitSeconds`, and concurrent scans made it worse. Tuning
(fewer indexes, unordered inserts, lower concurrency) halved the time but did not
remove the ceiling, because transaction duration scales with asset size.

The design therefore does not use a long transaction:

1. reserve the asset row, to have an id;
2. insert the entire new generation of observations, stamped with a fresh
   `ingestId` — invisible, because the asset still points at the old generation;
3. flip `assets.currentIngestId` in **one document update** — this is the atomic
   moment, and its cost is constant regardless of dataset size;
4. delete every other generation for that asset.

Readers resolve their scope to assets first and match observations by the
current `ingestId`s. A failure before step 3 leaves readers on the previous
generation; the abandoned documents are invisible and are removed by step 4 of
the next successful ingest.

This is why `observations` carries only two indexes — `{ingestId, date}` for
reads and `{assetId, ingestId}` for cleanup. Index maintenance is the dominant
cost of an ingest; a `2dsphere` on observations was removed because geographic
selection happens on `assets` and observations are then read by generation.

## 4. Data model

- **`organizations`** — `slug`, `dataProviderIds[]` (every spelling found in live
  files: `universal_plastic`, `universalplastic`, ``universal`plastic``),
  `providerFolders[]`, profile fields, `s3.prefix`.
- **`users`** — `email`, bcrypt `passwordHash` (never selected by default),
  `role: admin|provider|viewer`, `organizationId`, `legacyUsername`.
- **`assets`** — one per S3 file: identity, corrected `location`, `format`,
  `units`, `recordCount`, derived `dateRange`, per-category `summary`,
  `warnings[]`, `status`, `etag`/`checksum`, `currentIngestId`.
- **`observations`** — `assetId`, `ingestId`, denormalized labels, normalized
  `date`/`time`/`ts`, `eventDate`, optional `location`, and `values` keyed by
  canonical field names.
- **`sync_runs`** — audit trail of every sync with per-asset results.

Canonical field names live in `normalize/field-maps.ts`, so no raw column
spelling (`"Plastic waste collected"`, `"Biomass depth -5.00_-8 m"`) escapes the
normalizer.

## 5. Data quality

The bucket's known defects are corrected at ingest and recorded as warnings
rather than silently repaired or allowed to break a request:

- Tenerife and Gijón cleanup coordinates (`31.483,-11.926`) are replaced.
- Gijón biomass longitude sign is flipped.
- Coordinates more than 150 km from their station fall back to the station.
- `metadata.dateRange` is ignored in favour of the range derived from records,
  with a warning when they disagree or the metadata range is inverted.
- `DD-MM-YYYY` dates are converted; non-padded components are padded.
- Dates that do not exist on the calendar (`2025-17-08` in the Gijón cleanup
  file) are dropped with the offending value named in the warning, because
  guessing the intended day would invent data.

Two documented facts turned out to be stale and the code follows the bucket, not
the doc: `recogidas_playa_tenerife.json` holds 7 records (not 8), and
`boya_microplasticos_badalona.json` holds 217 particles across five dates (not
105 on one).

## 6. Security notes

- Passwords are bcrypt cost 12 and the hash is `select: false`.
- The plaintext connector file remains a login fallback for accounts not yet in
  Mongo, so a deployment that has not run the seed keeps working. It logs a
  warning on every use and is disabled with
  `DISABLE_LEGACY_CONNECTOR_LOGIN=true`.
- Legacy `portal_connector` tokens still authenticate and are upgraded by
  `legacyUsername` lookup; unknown ones authenticate as an org-less viewer.
- A `provider` may only sync keys under its own organization's provider folders;
  `admin` may sync anything.

## 7. Known limits

- The runtime has no `s3:ListBucket` permission on this bucket, so
  `POST /v1/sync/scan` falls back to the inventory bundled in `s3-reader.ts` and
  says so in the run warnings. Files added to the bucket outside that list are
  invisible to a scan until the credential is granted or they are synced by key.
- Because listing is unavailable, orphan detection (marking `missing`) only runs
  when a real listing succeeds — a bundled inventory cannot prove absence.
- `ndjson` assets are rejected; no live file uses that format yet.
- `/v1/analyses/run` keeps its synthetic components (`mp_per_L`, water and fish
  samples) because no such dataset exists in the bucket. Everything that was
  S3-calibrated now reads Mongo.
