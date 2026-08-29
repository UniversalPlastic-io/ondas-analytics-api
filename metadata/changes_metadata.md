## Cambios realizados en los JSON de `metadata/`

### Estandarización de `column_config` (estructura y nombres)

- **Se eliminó `custom: true`** (ya no se usa).
- `**type` dejó de significar “tipo de dato”** y pasó a separarse en:
  - `**field_type`**: el “concepto/clase” del campo (ej. `Polyethylene`, `Start point`, `Date`).
  - `**value_type**`: el tipo de valor esperado para parseo/almacenamiento (ej. `float`, `int`, `geo_point`, `url`, `iso8601`).
- **Se normalizaron las claves de `column_config`** para que **no incluyan unidades ni formatos**:
  - Antes: `"Polyethylene (μg L⁻¹)"`, `"Date (YYYY-MM-DD)"`, `"Walking distance (km)"`, etc.
  - Ahora: `"Polyethylene"`, `"Date"`, `"Walking distance"`, etc.
  - Excepción intencional: `Poly(methyl methacrylate)` mantiene paréntesis porque **forma parte del nombre químico**, no es una unidad.

### Estandarización de códigos (`polymer_code`)

- En microplásticos se cambió:
  - `**polymer_code` → `code`** y se añadió `**code_system**`
- Queda así:
  - `**code_system`: `"polymer"**`
  - `**code**`: `PE`, `PP`, `PVC`, `PET`, `PVAc`, etc.
- Se aplicó también a los porcentajes de polímeros en `recogidas de playa.json` (PET/HDPE/PVC/LDPE/PP/PS y `OTHER` para “Others”).

### Fechas, horas y duraciones (unificación)

- Se pidió “ISO 8601” y se unificó así:
  - Los campos de fecha/hora pasan a `**value_type: "iso8601"**`
  - Se añadió `**encoding**` con el **patrón exacto**:
    - **Fechas**: `encoding: "YYYY-MM-DD"`
    - **Hora (solo hora)** en `boya_biomasa.json`: `encoding: "HH:MM:SS"`
- Las duraciones se estandarizaron a milisegundos:
  - `Cleanup duration` pasó a `**value_type: "int"`** y `**unit: "ms"**`
  - (ya no se expresa como `HH:MM:SS` en metadatos)

### Geo puntos (`geo_point`) claros y sin unidades

- En `recogidas de playa.json`, para `Start point` y `End point`:
  - Se eliminó `unit: "coordinates"` (no es una unidad)
  - Se especificó explícitamente:
    - `**crs`: `"EPSG:4326"**`
    - `encoding`**:** `"lat_lon_array"` (`[lat, lon]`)
    - `unit: null`

### `fields` alineado con lo que realmente existe

- `fields` ahora incluye también campos “de índice” cuando están en `column_config`:
  - Se añadió `**Date`** donde correspondía (microplásticos, recogidas de playa).
  - Se añadieron `**Date` y `Time**` en `boya_biomasa.json`.
- Además, al limpiar `column_config` (quitar unidades de las claves), se ajustó `fields` para que sus nombres coincidan con esas claves limpias.

### `dimension` y `scale` para campos numéricos

Se añadieron `**dimension**` y `**scale**` a los campos numéricos para describir mejor magnitud y restricciones:

- Microplásticos en agua (μg/L): `**dimension: "mass_per_volume"**`
- Microplásticos en boya (particles/L): `**dimension: "count_per_volume"**`
- Biomasa (Tonnes): `**dimension: "mass"**`
- Recogidas:
  - kg: `**mass**`
  - participantes: `**count**`
  - km: `**length**`
  - ms: `**time**`
  - %: `**fraction**`
- `scale` se añadió con forma general:
  - `type: "ratio"`
  - `precision`: típicamente `0.001` para floats y `1` para ints
  - `min: 0` (cuando aplica)

