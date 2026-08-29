# Blue Resilience OS — API Data Reference

> Estado actual: prototipo con datos simulados en `window.BR` (`js/data.js`).
> Este documento mapea cada estructura de datos usada en la UI con las variables exactas, tipos y el endpoint API correspondiente cuando lo hay.

---

## 1. Objeto global `window.BR`

Todo el estado de datos vive en `window.BR`. Cuando se conecte el backend real, este objeto se sustituirá por llamadas a API + state management.

---

## 2. Entity — Perfil de organización

**Fuente:** `BR.entity`
**Endpoint sugerido:** `GET /me` o `GET /profile`

| Variable | Tipo | Ejemplo | Descripción |
|---|---|---|---|
| `name` | `string` | `'Océano Foods'` | Nombre de la entidad |
| `initials` | `string` | `'OF'` | Iniciales para avatar |
| `type` | `string` | `'Company'` | Tipo: Company / NGO / Institution / Campaign |
| `territory` | `string` | `'Costa Brava, Catalunya, Spain'` | Territorio principal |
| `description` | `string` | `'Ocean plastic recovery…'` | Descripción pública |
| `website` | `string` | `'oceanofoods.com'` | Web de la entidad |
| `contact` | `string` | `'impact@oceanofoods.com'` | Email de contacto |
| `publicProfile` | `boolean` | `true` | Perfil público activo |

---

## 3. KPIs — Indicadores de impacto

**Fuente:** `BR.kpis`
**Endpoint sugerido:** `GET /dashboard/kpis?period={month|year|all}`

Tres períodos: `month`, `year`, `all`.

| Variable | Tipo | Unidad | Descripción |
|---|---|---|---|
| `kg` | `number` | kg | Plástico retirado total |
| `cleanups` | `number` | unidades | Número de recogidas |
| `volunteers` | `number` | personas | Participantes / voluntarios |
| `locations` | `number` | unidades | Localizaciones monitorizadas |
| `km` | `number` | km | Kilómetros recorridos |
| `hours` | `number` | horas | Tiempo de recogida |
| `ondas` | `number` | unidades | ONDAs generadas |
| `evidence` | `number` | archivos | Evidencias registradas |
| `verified` | `number` | % | Porcentaje de recogidas verificadas |
| `avgKg` | `number` | kg | Media de kg por recogida |
| `index` | `number` | 0–100 | Environmental Impact Index |

### Valores actuales por período

| KPI | Este mes | Este año | Siempre |
|---|---|---|---|
| kg | 1,240 | 6,820 | 12,540 |
| cleanups | 14 | 89 | 154 |
| volunteers | 42 | 198 | 327 |
| locations | 7 | 18 | 24 |
| km | 48 | 310 | 562 |
| hours | 36 | 245 | 428 |
| ondas | 14 | 89 | 154 |
| evidence | 98 | 712 | 1,246 |
| verified | 100% | 94% | 92% |
| avgKg | 88.6 | 76.6 | 81.4 |
| index | 81 | 74 | 78 |

---

## 4. Series — Evolución temporal

**Fuente:** `BR.series`
**Endpoint sugerido:** `GET /dashboard/series?period={month|year|all}`

Array de puntos `{ label: string, kg: number }`.

| Período | Eje X | Ejemplo |
|---|---|---|
| `month` | Días del mes | `{label:'1', kg:62}` |
| `year` | Meses (Jan–Dec) | `{label:'Jan', kg:420}` |
| `all` | Años | `{label:'2020', kg:1820}` |

Usado en: **line chart** del Overview.

---

## 5. Plastic Types — Tipos de plástico

**Fuente:** `BR.plasticTypes`
**Endpoint sugerido:** `GET /dashboard/plastic-composition?period={month|year|all}`

Array de `{ type, pct, color }`.

| Variable | Tipo | Descripción |
|---|---|---|
| `type` | `string` | Código de polímero: PET, HDPE, LDPE, PP, PS, PVC, Others |
| `pct` | `number` | Porcentaje del total |
| `color` | `string` | Color hex para visualización |

| Tipo | % | Color |
|---|---|---|
| PET | 32 | `#00003F` |
| HDPE | 18 | `#39B3D8` |
| LDPE | 16 | `#BDEAF7` |
| PP | 14 | `#4055F6` |
| Others | 8 | `#B8BBC9` |
| PS | 7 | `#2F8AA9` |
| PVC | 5 | `#62C8E8` |

Usado en: **donut chart** del Overview.

---

## 6. Campaigns — Campañas

**Fuente:** `BR.campaigns`
**Endpoint sugerido:** `GET /campaigns?status={active|completed|all}`

Array de objetos de campaña.

| Variable | Tipo | Descripción |
|---|---|---|
| `id` | `string` | ID único: `'c1'`, `'c2'`… |
| `name` | `string` | Nombre de la campaña |
| `status` | `string` | `'active'` \| `'completed'` |
| `startDate` | `string` | ISO date `'YYYY-MM-DD'` |
| `endDate` | `string` | ISO date `'YYYY-MM-DD'` |
| `kg` | `number` | kg recogidos |
| `cleanups` | `number` | Número de recogidas |
| `volunteers` | `number` | Participantes |
| `locations` | `number` | Localizaciones |
| `verifiedPct` | `number` | % verificado (0–100) |
| `description` | `string` | Descripción breve |
| `topLocation` | `string` | Localización con más impacto |

### Campañas actuales

| ID | Nombre | Status | kg | Recogidas |
|---|---|---|---|---|
| c1 | Costa Brava Spring Clean 2025 | active | 3,240 | 42 |
| c2 | Mediterranean Blue 2024 | completed | 4,820 | 68 |
| c3 | Barceloneta Urban Impact | completed | 2,180 | 28 |
| c4 | Corporate Wave Q1 2025 | completed | 1,840 | 16 |

---

## 7. Cleanups — Recogidas

**Fuente:** `BR.cleanups`
**Endpoint sugerido:** `GET /cleanups?campaign={id|all}&status={verified|pending|all}&search={string}`

Array de objetos de recogida.

| Variable | Tipo | Descripción |
|---|---|---|
| `id` | `string` | ID único: `'r1'`, `'r2'`… |
| `location` | `string` | Nombre de la localización |
| `city` | `string` | Ciudad / zona |
| `date` | `string` | ISO date `'YYYY-MM-DD'` |
| `kg` | `number` | kg recogidos |
| `volunteers` | `number` | Participantes |
| `campaign` | `string` | ID de campaña asociada |
| `status` | `string` | `'verified'` \| `'pending'` |
| `plasticTypes` | `string[]` | Tipos de plástico recogidos |
| `duration` | `string` | Duración: `'2h 30min'` |
| `km` | `number` | km recorridos |
| `evidence` | `number` | Número de archivos de evidencia |

### Filtros de UI activos

| Estado | Variable | Valores |
|---|---|---|
| Campaña | `state.cleanupCampaign` | `'all'` \| ID campaña |
| Estado | `state.cleanupStatus` | `'all'` \| `'verified'` \| `'pending'` |
| Búsqueda | `state.cleanupSearch` | string libre (filtra por `location`) |

---

## 8. Evidence — Evidencias

**Fuente:** `BR.evidence`
**Endpoint sugerido:** `GET /evidence?type={type|all}&campaign={id|all}&cleanup={id}`

Array de objetos de evidencia.

| Variable | Tipo | Descripción |
|---|---|---|
| `id` | `string` | ID único: `'e1'`, `'e2'`… |
| `type` | `string` | Tipo de evidencia (ver tabla abajo) |
| `location` | `string` | Nombre de la localización |
| `date` | `string` | ISO date |
| `cleanup` | `string` | ID de recogida asociada |
| `status` | `string` | `'verified'` \| `'pending'` |
| `campaign` | `string` | ID de campaña |

### Tipos de evidencia

| Tipo | Color UI |
|---|---|
| Before photo | `#42C3EE` |
| After photo | `#2F8AA9` |
| Waste photo | `#1C5264` |
| Weight photo | `#00003F` |
| Location evidence | `#C4ECFA` |
| AI classification | `#9BB5C0` |
| Verification proof | `#DEE0E0` |
| ONDA record | `#42C3EE` |

### Filtros de UI activos

| Estado | Variable | Valores |
|---|---|---|
| Tipo | `state.evidenceType` | `'all'` \| tipo de evidencia |
| Campaña | `state.evidenceCampaign` | `'all'` \| ID campaña |

---

## 9. Reports — Informes

**Fuente:** `BR.reports`
**Endpoints sugeridos:**
- `GET /reports` — historial
- `POST /reports/request` — solicitar
- `GET /reports/:id/download` — descargar

### Historial de reports

| Variable | Tipo | Descripción |
|---|---|---|
| `id` | `string` | ID único |
| `name` | `string` | Nombre del informe |
| `type` | `string` | Tipo de informe |
| `period` | `string` | Período analizado |
| `generatedAt` | `string` | ISO date de generación |
| `status` | `string` | `'ready'` \| `'generating'` \| `'failed'` |
| `format` | `string` | `'PDF'` \| `'XLSX'` |
| `size` | `string` | Tamaño del archivo |

### Report Configurator — estado `state.reportConfig`

| Variable | Valores | Descripción |
|---|---|---|
| `type` | `monthly` \| `annual` \| `campaign` \| `location` \| `evidence` \| `custom` | Tipo de informe |
| `period` | `month` \| `year` \| `2024` \| `all` | Período |
| `campaign` | `all` \| ID campaña | Campaña a incluir |
| `detail` | `summary` \| `standard` \| `detailed` | Nivel de detalle |
| `language` | `en` \| `es` \| `fr` | Idioma |
| `format` | `pdf` \| `xlsx` | Formato de salida |

### Estado de generación `state.reportState`

| Valor | Descripción |
|---|---|
| `'idle'` | Sin solicitud activa |
| `'generating'` | Esperando respuesta del API |
| `'done'` | Report generado y disponible |

---

## 10. Top Locations — Ranking de localizaciones

**Fuente:** `BR.topLocations`
**Endpoint sugerido:** `GET /locations/top?period={month|year|all}&limit=5`

| Variable | Tipo | Descripción |
|---|---|---|
| `name` | `string` | Nombre de la localización |
| `kg` | `number` | kg recogidos total |
| `cleanups` | `number` | Número de recogidas |

| # | Localización | kg | Recogidas |
|---|---|---|---|
| 1 | Playa de la Barceloneta | 342 | 12 |
| 2 | Cala Sant Francesc | 210 | 8 |
| 3 | Puerto de Badalona | 184 | 6 |
| 4 | Platja del Prat | 162 | 5 |
| 5 | Castelldefels | 148 | 4 |

---

## 11. Map Points — Puntos del mapa

**Fuente:** `BR.mapPoints`
**Endpoint sugerido:** `GET /map/points?campaign={id|all}&status={verified|pending|all}&period={month|year|all}`

| Variable | Tipo | Descripción |
|---|---|---|
| `id` | `number` | ID único |
| `name` | `string` | Nombre de la localización |
| `lat` | `number` | Latitud decimal |
| `lng` | `number` | Longitud decimal |
| `x` | `number` | Posición relativa X (0–100) para mapa estático |
| `y` | `number` | Posición relativa Y (0–100) para mapa estático |
| `kg` | `number` | kg recogidos |
| `cleanups` | `number` | Número de recogidas |
| `size` | `string` | `'sm'` \| `'md'` \| `'lg'` — tamaño visual del marcador |

### Radios de marcador por tamaño

| Size | Radio mini map | Radio full map |
|---|---|---|
| `sm` | 5px | 8px |
| `md` | 8px | 12px |
| `lg` | 11px | 16px |

### Filtros de UI activos para el mapa

| Estado | Variable | Valores |
|---|---|---|
| Campaña | `state.mapCampaign` | `'all'` \| ID campaña |
| Estado | `state.mapStatus` | `'all'` \| `'verified'` \| `'pending'` |
| Período | `state.mapPeriod` | `'all'` \| `'year'` \| `'month'` |

El filtro por período calcula un `dateFrom`:
- `month` → primer día del mes actual
- `year` → 1 de enero del año actual
- `all` → sin filtro

---

## 12. Notifications — Notificaciones

**Fuente:** `BR.notifications`
**Endpoint sugerido:** `GET /notifications`

| Variable | Tipo | Descripción |
|---|---|---|
| `text` | `string` | Texto de la notificación |
| `time` | `string` | Tiempo relativo: `'2h ago'`, `'1d ago'`… |

---

## 13. API real — Ondas endpoint

Única llamada real implementada, en `requestReport()` (`js/app.js:1003` del portal Blue Resilience):

```
POST https://ondas.universalplastic.io/api/v1/analyses/run
```

### Request body

```json
{
  "location": { "lat": 40.4168, "lon": -3.7038 },
  "area": { "type": "radius_km", "value": 25 },
  "analyses": ["all"],
  "dateRange": { "start": "2025-01-01", "end": "2025-12-31" },
  "aggregation": { "mode": "raw" },
  "options": {
    "dataFormattedForPlots": true,
    "savePlotsWebp": true,
    "includeWarnings": true,
    "cache": { "mode": "bypass" }
  }
}
```

### Campos del body

| Campo | Tipo | Descripción |
|---|---|---|
| `location.lat` | `number` | Latitud del punto central |
| `location.lon` | `number` | Longitud del punto central |
| `area.type` | `string` | `'radius_km'` |
| `area.value` | `number` | Radio en km |
| `analyses` | `string[]` | `['all']` o análisis específicos |
| `dateRange.start` | `string` | ISO date inicio |
| `dateRange.end` | `string` | ISO date fin |
| `aggregation.mode` | `string` | `'raw'` |
| `options.dataFormattedForPlots` | `boolean` | Datos formateados para gráficas |
| `options.savePlotsWebp` | `boolean` | Guardar gráficas como WebP |
| `options.includeWarnings` | `boolean` | Incluir advertencias |
| `options.cache.mode` | `string` | `'bypass'` \| `'use'` |

### Response — campos que usa la UI

| Campo | Tipo | Descripción |
|---|---|---|
| `requestId` | `string` | ID de la solicitud |
| `executedAnalyses` | `string[]` | Análisis ejecutados |
| `meta.datasetsUsed` | `object` | Datasets usados por análisis |
| `results.basic_contamination.byLocationAndDate` | `array` | Datos de contaminación por punto |
| `results.basic_contamination.byLocationAndDate[].mp_per_L` | `number` | Microplásticos por litro |

La UI también llama a `findPdfUrl(response)` para detectar cualquier URL `.pdf` en la respuesta y habilitiar descarga directa.

---

## 14. Estado de UI — `state`

Objeto de estado local en `js/app.js:2` del portal Blue Resilience. No va al API; controla la navegación y filtros.

| Variable | Valores | Descripción |
|---|---|---|
| `section` | `overview` \| `campaigns` \| `cleanups` \| `map` \| `evidence` \| `reports` \| `profile` | Sección activa |
| `period` | `month` \| `year` \| `all` | Selector temporal global |
| `cleanupCampaign` | `'all'` \| ID | Filtro campaña en Cleanups |
| `cleanupStatus` | `'all'` \| `'verified'` \| `'pending'` | Filtro estado en Cleanups |
| `cleanupSearch` | `string` | Búsqueda por localización en Cleanups |
| `campaignStatus` | `'all'` \| `'active'` \| `'completed'` | Filtro estado en Campaigns |
| `evidenceType` | `'all'` \| tipo | Filtro tipo en Evidence |
| `evidenceCampaign` | `'all'` \| ID | Filtro campaña en Evidence |
| `selectedCampaignId` | `null` \| ID | Campaña seleccionada para detalle |
| `reportState` | `'idle'` \| `'generating'` \| `'done'` | Estado del generador de reports |
| `reportConfig` | object | Configuración del report (ver §9) |
| `reportApiResult` | `null` \| object | Respuesta del API de análisis |
| `reportApiError` | `null` \| string | Mensaje de error del API |
| `reports_prepend` | `boolean` | Añade report recién generado al historial |
| `mapCampaign` | `'all'` \| ID | Filtro campaña en Map |
| `mapStatus` | `'all'` \| `'verified'` \| `'pending'` | Filtro estado en Map |
| `mapPeriod` | `'all'` \| `'year'` \| `'month'` | Filtro período en Map |

---

## 15. Endpoints API sugeridos — resumen

| Método | Endpoint | Sección |
|---|---|---|
| `GET` | `/me` | Profile |
| `GET` | `/dashboard/kpis?period=` | Overview |
| `GET` | `/dashboard/series?period=` | Overview chart |
| `GET` | `/dashboard/plastic-composition` | Overview donut |
| `GET` | `/campaigns?status=` | Campaigns |
| `GET` | `/campaigns/:id` | Campaign detail |
| `GET` | `/cleanups?campaign=&status=&search=` | Cleanups |
| `GET` | `/cleanups/:id` | Cleanup drawer |
| `GET` | `/evidence?type=&campaign=&cleanup=` | Evidence |
| `GET` | `/locations/top?period=&limit=5` | Overview / Map |
| `GET` | `/map/points?campaign=&status=&period=` | Map |
| `GET` | `/notifications` | Notification panel |
| `GET` | `/reports` | Reports history |
| `POST` | `/reports/request` | Report configurator |
| `GET` | `/reports/:id/download` | Download |
| `POST` | `ondas.universalplastic.io/api/v1/analyses/run` | Análisis ambiental |

---

## 16. Funciones helper en `BR`

| Función | Descripción |
|---|---|
| `BR.fmt(n)` | Formatea número: `≥1000` → `'1.2k'` |
| `BR.fmtFull(n)` | Formatea con separadores: `12,540` |
| `BR.date(iso)` | ISO → `'29 May 2025'` |
| `BR.campaignById(id)` | Busca campaña por ID |
| `BR.cleanupById(id)` | Busca recogida por ID |

## 17  Report Endpoint Spec

> Especificación del endpoint `POST /reports/request` basada en los parámetros del Report Configurator de la UI.

---

## Endpoint

```
POST /reports/request
Content-Type: application/json
Authorization: Bearer {token}
```

---

## Request body

```json
{
  "type": "monthly",
  "period": {
    "preset": "month",
    "start": "2025-05-01",
    "end": "2025-05-31"
  },
  "scope": {
    "campaign": "all",
    "entity": "auto"
  },
  "detail": "standard",
  "language": "en",
  "format": "pdf",
  "include": {
    "kpis": true,
    "map": true,
    "charts": true,
    "cleanupsList": true,
    "evidence": true,
    "plasticTypes": true,
    "ondas": false,
    "impactIndex": true
  }
}
```

---

## Parámetros

### `type` — Tipo de informe

| Valor | Label en UI | Descripción |
|---|---|---|
| `monthly` | Monthly cleanup report | Informe mensual de recogidas |
| `annual` | Annual cleanup report | Informe anual de recogidas |
| `campaign` | Campaign report | Informe de una campaña específica |
| `location` | Location report | Informe por localización |
| `evidence` | Evidence report | Informe de evidencias |
| `custom` | Custom period report | Período personalizado |

**Requerido.** Default: `monthly`.

---

### `period` — Período analizado

El selector de UI expone presets. El backend debería aceptar tanto preset como fechas explícitas.

#### Opción A — preset (preferida para MVP)

| Valor `preset` | Label en UI | Rango implícito |
|---|---|---|
| `month` | This month (May 2025) | Primer y último día del mes actual |
| `year` | This year (2025) | `2025-01-01` → `2025-12-31` |
| `2024` | Full year 2024 | `2024-01-01` → `2024-12-31` |
| `all` | All time | Sin límite — todos los datos del perfil |

```json
"period": { "preset": "month" }
```

#### Opción B — rango explícito (necesario para `type: "custom"`)

```json
"period": {
  "start": "2025-03-01",
  "end": "2025-05-31"
}
```

**Regla:** si `type === 'custom'`, `start` y `end` son requeridos. En el resto de casos, `preset` es suficiente.

---

### `scope` — Alcance del informe

#### `scope.campaign`

| Valor | Descripción |
|---|---|
| `"all"` | Todas las campañas del perfil |
| `"c1"` | ID de campaña específica |
| `"c2"` | … |

Cuando `type === 'campaign'`, se recomienda que `scope.campaign` sea requerido y no pueda ser `"all"`.

#### `scope.entity`

| Valor | Descripción |
|---|---|
| `"auto"` | Usa la entidad del usuario autenticado (recomendado) |
| `"{entityId}"` | ID explícito si el usuario puede ver múltiples entidades |

Para MVP: `"auto"` siempre. El backend lo resuelve desde el token.

---

### `detail` — Nivel de detalle

| Valor | Label en UI | Descripción |
|---|---|---|
| `summary` | Summary | Solo KPIs y métricas clave. Informe breve. |
| `standard` | Standard | KPIs + gráficas + listas. Default. |
| `detailed` | Detailed | Todo lo anterior + análisis extendido + evidencias completas. |

**Requerido.** Default: `standard`.

---

### `language` — Idioma del informe

| Valor | Label en UI |
|---|---|
| `en` | English |
| `es` | Español |
| `fr` | Français |

**Requerido.** Default: `en`.

---

### `format` — Formato de salida

| Valor | Label en UI | Descripción |
|---|---|---|
| `pdf` | PDF | PDF descargable. La UI busca URL `.pdf` en la respuesta. |
| `xlsx` | Excel (XLSX) | Hoja de cálculo. |

**Requerido.** Default: `pdf`.

---

### `include` — Secciones a incluir

Objeto de booleanos. Controla qué bloques genera el backend en el documento.

| Campo | Label en UI | Default |
|---|---|---|
| `kpis` | KPIs & metrics | `true` |
| `map` | Location map | `true` |
| `charts` | Charts & trends | `true` |
| `cleanupsList` | Cleanups list | `true` |
| `evidence` | Evidence | `true` |
| `plasticTypes` | Plastic types | `true` |
| `ondas` | ONDAs generated | `false` |
| `impactIndex` | Impact Index | `true` |

**Opcional.** Si el backend no recibe `include`, usa los defaults de arriba.

---

## Validaciones recomendadas

| Condición | Error sugerido |
|---|---|
| `type === 'campaign'` y `scope.campaign === 'all'` | `400 campaign_required` |
| `type === 'custom'` y falta `period.start` o `period.end` | `400 date_range_required` |
| `period.start > period.end` | `400 invalid_date_range` |
| Perfil sin datos en el período | `422 insufficient_data` |
| Token inválido o expirado | `401 unauthorized` |

---

## Response — éxito

```json
{
  "requestId": "rep_abc123",
  "status": "generating",
  "estimatedSeconds": 15,
  "pollUrl": "/reports/rep_abc123/status"
}
```

O si el backend genera síncronamente (timeout corto):

```json
{
  "requestId": "rep_abc123",
  "status": "ready",
  "name": "Monthly cleanup report — May 2025",
  "type": "monthly",
  "period": "May 2025",
  "generatedAt": "2025-06-18T10:32:00Z",
  "format": "pdf",
  "size": "2.4 MB",
  "downloadUrl": "https://cdn.example.com/reports/rep_abc123.pdf"
}
```

### Campos de respuesta que consume la UI

| Campo | Descripción |
|---|---|
| `requestId` | ID del informe. Se usa para polling y descarga. |
| `status` | `generating` \| `ready` \| `failed` |
| `downloadUrl` | URL directa al PDF/XLSX. La UI hace `window.open(url)`. |
| `name` | Nombre que aparece en el historial. |
| `type` | Tipo de informe (para label en historial). |
| `period` | Período legible para mostrar en UI. |
| `generatedAt` | ISO datetime para mostrar en historial. |
| `size` | Tamaño del archivo para mostrar en historial. |

---

## Response — error

```json
{
  "error": "insufficient_data",
  "message": "Not enough data to generate report for the selected period."
}
```

La UI muestra `error.message` directamente en la pantalla de error con un botón "Try again".

---

## Flujo completo UI → API

```
Usuario configura tipo, período, campaña, detalle, idioma, formato, secciones
↓
Click "Request report"
↓
state.reportState = 'generating'  →  UI muestra spinner + progress bar
↓
POST /reports/request  con body completo
↓
  Si 200/201: state.reportState = 'done', state.reports_prepend = true
              UI muestra card de resultado con botón Download
  Si error:   state.reportApiError = message, state.reportState = 'idle'
              UI muestra pantalla de error con "Try again"
↓
Usuario clica Download
↓
window.open(downloadUrl, '_blank')
```

---

## Polling (si generación es asíncrona)

Si el backend responde `status: 'generating'`, la UI debería hacer polling a:

```
GET /reports/{requestId}/status
```

Response:
```json
{ "status": "generating" | "ready" | "failed", "downloadUrl": "..." }
```

**Nota:** el prototipo actual no implementa polling. La llamada es síncrona y espera a que el API responda. Si la generación tarda más de ~30s, se recomienda implementar polling o webhooks.

---

## Historial — `GET /reports`

El historial usa el mismo modelo de datos. El endpoint devuelve un array:

```json
[
  {
    "id": "rep1",
    "name": "Monthly Impact Report — May 2025",
    "type": "Monthly cleanup report",
    "period": "May 2025",
    "generatedAt": "2025-06-01",
    "status": "ready",
    "format": "PDF",
    "size": "2.4 MB",
    "downloadUrl": "https://..."
  }
]
```

---

## Referencia rápida — estado `reportConfig` en la UI

```js
// js/app.js — state inicial
reportConfig: {
  type:     'monthly',   // string enum
  period:   'month',     // string enum o fecha custom
  campaign: 'all',       // 'all' | campaignId
  detail:   'standard',  // 'summary' | 'standard' | 'detailed'
  language: 'en',        // 'en' | 'es' | 'fr'
  format:   'pdf'        // 'pdf' | 'xlsx'
}

// Los checkboxes de `include` NO están en state.reportConfig todavía.
// Están hardcodeados en el HTML con valores default.
// Hay que conectarlos a state antes de enviar al API.
```

> **Pendiente de implementar en frontend:** leer los checkboxes de `include` y añadirlos al body del `POST /reports/request`.

