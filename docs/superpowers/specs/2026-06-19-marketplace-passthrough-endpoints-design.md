# Marketplace Passthrough Endpoints — Design

**Date:** 2026-06-19
**Endpoints:** `GET /v1/campaigns`, `GET /v1/cleanups`, `GET /v1/organizations`
**Module:** `src/api-v1/marketplace/` (new), wired into `api-v1.module.ts`

Expose the three arrays from the public Universal Plastic marketplace feed,
**verbatim**, for the dashboard. No remapping, no derived fields, raw upstream
ids passed through.

---

## 1. Decisions

| Decision | Choice |
|---|---|
| Source | `GET https://api.universalplastic.io/public/marketplace/home` (no auth) → `{ organizations[], campaigns[], wasteCollections[] }`. |
| Output | **Passthrough.** Each endpoint returns its upstream array as-is. |
| `/v1/campaigns` | returns `campaigns[]` |
| `/v1/cleanups` | returns `wasteCollections[]` |
| `/v1/organizations` | returns `organizations[]` |
| Filters | optional `?username=` on `/v1/campaigns` and `/v1/cleanups` — matches `user.username` (case-insensitive exact); omitted = all. `/v1/organizations` unfiltered. |
| Enums | `statusId`/`typeId`/`ecosystemId`/etc returned as raw integers (no public label table). |
| Auth | none (public). |
| Cache | upstream cached **30 min** — under the **1h** presigned-URL expiry on `imageUrl`, so served image links stay valid. |
| Upstream failure | `502 Bad Gateway` (`{ error: 'upstream_unavailable' }`). |

Out of scope: per-cleanup weight/composition (not in this feed — kg lives on
campaigns as `collected`/`upts`/`socialImpact`), filtering, pagination,
enum-label mapping.

---

## 2. Upstream shapes (observed, passed through verbatim)

`wasteCollections[]` item:
```
id, user{id,username,imageUrl,isBlue,isOrganizationVerified,isAmbassador},
typeId, statusId, join, public, financialMethodId, shareOceanDefenderRewards,
date, country, city, location{latitude,longitude}, ecosystemId, radius,
illustrationKey, campaign{id,name,user{…},bounty}, fundraising, imageUrl
```

`campaigns[]` item:
```
id, user{id,username,imageUrl,isBlue,isAmbassador,isOrganizationVerified},
statusId, name, bounty, bountyAvailable, country, city,
location{latitude,longitude}, radius, collected, upts, socialImpact,
numWasteCollections, isPublic, isVolunteer, isCollaborative, imageUrl,
shareCampaign{compo1}
```

`organizations[]` item:
```
id, name, username, imageUrl, hasSubscription, isBlue, isAmbassador,
isOrganizationVerified
```

(124 wasteCollections, 29 campaigns, 19 organizations at time of writing.)

---

## 3. Files

```
src/api-v1/marketplace/
├── marketplace-client.ts     fetchHome() → {organizations,campaigns,wasteCollections}; 30-min cache; non-fatal→throws
├── marketplace.service.ts    getCampaigns() / getCleanups() / getOrganizations() → upstream slices
├── marketplace.controller.ts GET /v1/campaigns, /v1/cleanups, /v1/organizations
└── marketplace.swagger.dto.ts loose DTOs (upstream objects) for Swagger
```

`api-v1.module.ts` registers `MarketplaceController` + `MarketplaceService`.

---

## 4. Behaviour

```
fetchHome():
  if cache fresh (<30min) → return cached
  GET marketplace/home
    ok   → cache + return { organizations, campaigns, wasteCollections }
    fail → throw → controller maps to 502 upstream_unavailable

getCampaigns()      → (await fetchHome()).campaigns      ?? []
getCleanups()       → (await fetchHome()).wasteCollections ?? []
getOrganizations()  → (await fetchHome()).organizations   ?? []
```

Each controller returns the array directly (HTTP 200, JSON array).

---

## 5. Testing

- Unit (`marketplace.service`, `fetchHome` fetch spied): each getter returns the
  right slice; missing key → `[]`; upstream non-ok → throws.
- e2e (supertest, `fetch` mocked): `GET /v1/campaigns`, `/v1/cleanups`,
  `/v1/organizations` each return a JSON array with the upstream fields intact.

---

## 6. Reuse / touch list

- **New:** `marketplace/` module.
- **Edit:** `api-v1.module.ts`.
- Independent of `reports`/`overview`/`map` (different data source). The
  recogidas-based §7 cleanups idea is dropped in favour of this feed.
