# Blue Resilience — Overview Endpoint Design

**Date:** 2026-06-18
**Endpoint:** `GET /v1/overview`
**Module:** `src/api-v1/overview/` (new), wired into `src/api-v1/api-v1.module.ts`

Read-only dashboard aggregate for the Overview screen. Returns KPIs, kg
time-series, plastic composition, and top locations from the same real
`recogidas_playa` S3 data the reports module already aggregates. JSON only.

---

## 1. Decisions

| Decision | Choice |
|---|---|
| Shape | One consolidated `GET /v1/overview` (not the separate `/dashboard/*` of doc §15). |
| KPIs | All 11 from doc §3. |
| Params | `?period=month\|year\|all` (default `all`), `?campaign=all\|c1..c4` (default `all`). |
| Auth | None (public), like `/v1/reports/request`. |
| Empty data | Never 422 — zero KPIs + empty arrays when no records in the period. |
| Data source | Real `recogidas_playa` via the reports module's S3 fetch + aggregation. |

Out of scope: notifications (§12), entity profile (§2), map points (§11),
evidence list (§8) — separate endpoints if needed later.

---

## 2. Request

```
GET /v1/overview?period=all&campaign=all
```

| Param | Values | Default |
|---|---|---|
| `period` | `month` \| `year` \| `all` | `all` |
| `campaign` | `all` \| `c1`..`c4` | `all` |

`period` maps to `resolvePeriod({ preset }, type, now)` (reports module).

---

## 3. Response

```jsonc
{
  "period": { "start": "1970-01-01", "end": "2999-12-31", "label": "All time" },
  "scope": "All campaigns",
  "kpis": {
    "kg": 12540, "cleanups": 154, "volunteers": 327, "locations": 24,
    "km": 562, "hours": 428, "ondas": 154, "evidence": 1246,
    "verified": 100, "avgKg": 81.4, "index": 78
  },
  "series": [ { "label": "2025", "kg": 1820 } ],
  "plasticTypes": [ { "type": "PET", "pct": 32, "color": "#00003F" } ],
  "topLocations": [ { "name": "Barcelona", "kg": 342, "cleanups": 12 } ]
}
```

### KPI mapping (from `aggregateReportData`)

| KPI | Source |
|---|---|
| `kg` | kpis.kg |
| `cleanups` | kpis.cleanups |
| `volunteers` | kpis.volunteers |
| `locations` | kpis.locations |
| `km` | kpis.km |
| `hours` | round(kpis.durationHours) |
| `ondas` | kpis.cleanups (1 ONDA per cleanup) |
| `evidence` | kpis.evidenceCount |
| `verified` | 100 (all rows verified) |
| `avgKg` | kpis.avgKg |
| `index` | kpis.impactIndex |

### Series granularity by period

Built from `aggregateReportData(...).cleanups[]` (each row carries `date` + `kg`):

| period | bucket | label |
|---|---|---|
| `month` | day | `YYYY-MM-DD` |
| `year` | month | `Jan`..`Dec` |
| `all` | year | `YYYY` |

Sorted ascending by bucket key.

### topLocations

`aggregateReportData(...).sites` (already kg-desc), first 5, mapped to
`{ name, kg, cleanups }`.

---

## 4. Files

```
src/api-v1/overview/
├── overview.types.ts        OverviewResponse, OverviewKpis
├── overview.service.ts      resolve period+campaign → fetch+aggregate → project + rebucket series
├── overview.controller.ts   GET /v1/overview + swagger
└── overview.swagger.dto.ts  Swagger DTOs
```

`api-v1.module.ts` adds `OverviewController` + `OverviewService`.

---

## 5. Service flow

```
get(period='all', campaign='all'):
  1. resolvedPeriod = resolvePeriod({ preset: period }, periodType(period), now)
       periodType: 'all'|'year' → 'annual', 'month' → 'monthly'  (only affects nothing downstream; series rebucketed here)
  2. scope = resolveCampaignScope(campaign)
  3. try: files = fetchRecogidasFiles(scope.urls); data = aggregateReportData(files, resolvedPeriod, scope.campaignName, 'monthly')
     catch insufficient_data → return zeroed overview (kpis all 0, [] arrays)
  4. project kpis (table above)
  5. series = bucketSeries(data.cleanups, period)
  6. topLocations = data.sites.slice(0,5)
  7. return { period: resolvedPeriod, scope: scope.campaignName, kpis, series, plasticTypes: data.plasticTypes, topLocations }
```

`aggregateReportData` is called with `type:'monthly'` (its internal series is
ignored — overview builds its own via `bucketSeries`).

---

## 6. Testing

- Unit (`overview.service.ts`, S3 `fetchRecogidasFiles` spied): KPI projection
  (incl. ondas=cleanups, verified=100, hours rounded), series granularity per
  period (day/month/year buckets + labels), topLocations limit 5, zero-fallback
  on empty data.
- e2e (supertest): `GET /v1/overview?period=all` → `200` with the documented
  shape; `fetch` mocked.

---

## 7. Reuse / touch list

- **Reuse:** `resolvePeriod` (reports-period), `resolveCampaignScope`
  (reports-campaign-map), `fetchRecogidasFiles` + `aggregateReportData`
  (reports-data), `POLYMER_COLUMNS` palette (already in ReportData.plasticTypes).
- **New:** `overview/` module.
- **Edit:** `api-v1.module.ts`.
- No changes to `reports/`, `analyses/`, `auth/`.
