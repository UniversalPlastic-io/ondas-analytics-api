# Metadatos en DCAT (JSON-LD)

Este directorio contiene una **representación [DCAT 2](https://www.w3.org/TR/vocab-dcat-2/)** en **JSON-LD** de cada dataset definido en el directorio padre (`metadata/*.json`).

## Archivos

| JSON de origen | DCAT generado |
|----------------|----------------|
| `../Muestras de agua.json` | `muestras_de_agua_py_gcms.jsonld` |
| `../Muestras de peces.json` | `muestras_de_peces_py_gcms.jsonld` |
| `../boya_microplasticos.json` | `boya_microplasticos_seabot.jsonld` |
| `../boya_biomasa.json` | `boya_biomasa_slx+.jsonld` |
| `../recogidas de playa.json` | `recogidas_plastico_app_up_v700.jsonld` |
| `../meteorología.json` | `meteorología_cdse_vl.jsonld` |

## Regenerar

Tras editar los metadatos fuente:

```bash
cd metadata/DCAT && python3 generate_dcat.py
```

## Campos / columnas del dataset (`column_config` y `fields`)

El JSON fuente define **`fields`** (lista de nombres lógicos) y **`column_config`** (por fichero de datos: nombre de columna → `field_type`, `value_type`, `unit`, `dimension`, `scale`, códigos de polímero, etc.).

En el JSON-LD generado esto se expone así:

- El dataset tiene **`@type`** `dcat:Dataset` y **`schema:Dataset`** (schema.org).
- **`schema:variableMeasured`**: array de **`schema:PropertyValue`**, **una por cada columna** del primer fichero listado en `column_config` (el mismo que en `dcat:distribution`).
  - `schema:name`: nombre lógico de la columna (clave en `column_config`).
  - `schema:description`: resto de propiedades del objeto de columna, en texto `clave=valor` (los objetos anidados, p. ej. `scale`, van como JSON).
  - `schema:unitText` y `schema:alternateName` cuando aplican.

Así queda definido el **diccionario de variables** alineado con vuestro metadato interno, consumible por herramientas que entiendan schema.org sobre un `Dataset`.

## Mapeo principal

| Origen (JSON propio) | Propiedad DCAT / DCT |
|----------------------|----------------------|
| `fileIdentifier` | `dct:identifier` + `@id` (`urn:gaia:ondas:dataset:…`) |
| `citation.title` | `dct:title` (literal con `@language`: es) |
| `description` + `purpose` | `dct:description` |
| `citation.publicationDate` | `dct:issued` (si existe) |
| `keywords.theme` + `place` (+ `eov` si aplica) | `dcat:keyword` |
| `source` | `dct:publisher` (foaf:Organization) |
| `resourceContact` / autores | `dct:creator`, `dcat:contactPoint` (vcard) |
| `distribution.license` | `dct:license` (@id) |
| `useLimitations` + `distributionLiability` | `dct:rights` |
| `EX_Extent` bbox | `dct:spatial` → `dcat:bbox` (W, S, E, N) |
| `EX_Extent.temporalElement` | `dct:temporal` → `dcat:startDate` / `dcat:endDate` |
| `project` | `dct:relation` → `foaf:Project` |
| Primer fichero en `column_config` | `dcat:distribution` (título, formato, `dcat:mediaType`) |
| Archivo JSON origen | `rdfs:seeAlso` + `prov:wasDerivedFrom` |
| Origen CMEMS (`data_source_url`) | `prov:wasGeneratedBy` (opcional) |

`dcat:accrualPeriodicity` se fija a **irregular** (`http://purl.org/cld/freq/irregular`) cuando en origen aparece `asNeeded`.

## Notas

- Los **URN** (`urn:gaia:ondas:…`) son estables dentro del proyecto; para catálogo público conviene sustituirlos por **HTTP(S) persistentes** al publicar.
- Para **DCAT-AP** (Unión Europea) puede hacer falta ampliar con temáticas (`dcat:theme` URI), identificador de catálogo y distribución con URL de descarga (`dcat:downloadURL`) cuando exista `endpoint`.
