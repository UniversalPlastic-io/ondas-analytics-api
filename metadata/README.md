# Documentación de los archivos de metadatos

Cada conjunto de datos del proyecto tiene **un archivo JSON** en esta carpeta. El JSON describe el dataset (quién, dónde, cuándo, licencia, procedencia) y define **qué columnas** tiene el fichero de datos asociado y **cómo interpretarlas** (`fields` + `column_config`).

---

## Estructura general de un archivo

```text
Identificación y descripción del dataset
  → citation, contactos, extensión espacio-temporal, palabras clave
  → (opcional) sensores, muestreo, linaje
  → distribución (formato, licencia)
  → lista de variables lógicas (fields)
  → configuración por columna (column_config)
```

Las claves de **primer nivel** suelen repetirse entre datasets; el contenido de `**lineage`** y los **campos opcionales** (p. ej. sensores) depende del tipo de dato.

---

## Claves de primer nivel


| Clave                 | Tipo             | Descripción                                                                                        |
| --------------------- | ---------------- | -------------------------------------------------------------------------------------------------- |
| `fileIdentifier`      | string           | Identificador único del dataset (p. ej. para catálogo o API).                                      |
| `name`                | string           | Nombre corto o slug del dataset; a menudo alineado con `fileIdentifier`.                           |
| `language`            | string           | Idioma principal de los textos descriptivos (p. ej. `spa`).                                        |
| `characterSet`        | string           | Codificación de caracteres (p. ej. `utf8`).                                                        |
| `hierarchyLevel`      | string           | Nivel en jerarquía de metadatos; aquí suele ser `dataset`.                                         |
| `status`              | string           | Estado del dataset (p. ej. `completed`).                                                           |
| `dataUpdateFrequency` | string           | Frecuencia esperada de actualización (p. ej. `asNeeded`).                                          |
| `description`         | string           | Descripción libre del contenido, método y unidades generales.                                      |
| `purpose`             | string           | Objetivo del dataset en el proyecto.                                                               |
| `project`             | string           | Proyecto al que pertenece (p. ej. `ONDAs`).                                                        |
| `source`              | string           | Organización u origen de publicación del dato.                                                     |
| `citation`            | object           | Información para citar el dataset (ver abajo).                                                     |
| `resourceContact`     | object           | Contacto del recurso de datos (ver abajo).                                                         |
| `metadataContact`     | object           | Contacto del metadato (ver abajo).                                                                 |
| `EX_Extent`           | object           | Extensión geográfica y temporal (ver abajo).                                                       |
| `keywords`            | object           | Palabras clave temáticas y de lugar (ver abajo).                                                   |
| `topicCategory`       | string           | Categoría temática de alto nivel (p. ej. `environment`).                                           |
| `eov`                 | string | null    | Variable oceánica esencial (EOV) si aplica; puede ser `null`.                                      |
| `sampling_method`     | object | omitido | Método de muestreo (`label`, `uri`). Algunos datasets (p. ej. meteorología modelo) no lo incluyen. |
| `lineage`             | object           | Procedencia, método y control de calidad (estructura variable, ver abajo).                         |
| `distribution`        | object           | Formato de datos, acceso y licencia (ver abajo).                                                   |
| `fields`              | array            | Lista ordenada de **nombres lógicos de variables** (sin unidades en el nombre).                    |
| `column_config`       | object           | Mapa **fichero de datos → columnas → definición de campo** (ver abajo).                            |


### Opcionales (según dataset)


| Clave          | Tipo   | Descripción                                               |
| -------------- | ------ | --------------------------------------------------------- |
| `sensor_type`  | string | Tipo de sensor (p. ej. boya de microplásticos, ecosonda). |
| `sensor_model` | string | Modelo comercial del sensor.                              |


---

## Objetos anidados comunes

### `citation`


| Clave             | Tipo          | Descripción                                             |
| ----------------- | ------------- | ------------------------------------------------------- |
| `authors`         | array         | Lista de `{ individualName, organisation }`.            |
| `publicationDate` | string | null | Fecha de publicación en formato `YYYY-MM-DD`, o `null`. |
| `title`           | string        | Título del dataset para citación.                       |
| `identifier`      | string | null | Identificador persistente (DOI, etc.) si existe.        |


### `resourceContact` y `metadataContact`


| Clave              | Tipo          | Descripción                                                         |
| ------------------ | ------------- | ------------------------------------------------------------------- |
| `individualName`   | string        | Nombre de la persona de contacto.                                   |
| `organisationName` | string        | Organización.                                                       |
| `organisationROR`  | string | null | ID ROR de la organización, si aplica.                               |
| `email`            | string        | Correo.                                                             |
| `orcid`            | string | null | ORCID, si aplica.                                                   |
| `role`             | string        | Rol de contacto (p. ej. `principalInvestigator`, `pointOfContact`). |


### `EX_Extent`


| Clave                                        | Tipo   | Descripción                                                               |
| -------------------------------------------- | ------ | ------------------------------------------------------------------------- |
| `geographicElement.EX_GeographicBoundingBox` | object | Límites oeste/este/sur/norte en grados (EPSG:4326 cuando `crs` es WGS84). |
| `crs`                                        | string | Sistema de referencia (p. ej. `EPSG:4326`).                               |
| `location_name`                              | string | Opcional; nombre del lugar (p. ej. puerto, ciudad).                       |
| `marine_region`                              | string | Región marina (p. ej. `Mediterranean Sea`).                               |
| `country_code`                               | string | Código ISO del país (p. ej. `ES`).                                        |
| `temporalElement`                            | object | `start`, `end` (`YYYY-MM-DD` o `null`), `frequency` (o `null`).           |


### `keywords`


| Clave   | Tipo  | Descripción                                    |
| ------- | ----- | ---------------------------------------------- |
| `theme` | array | Lista de etiquetas temáticas (inglés o mixto). |
| `place` | array | Lugares o regiones geográficas.                |


### `sampling_method`


| Clave   | Tipo          | Descripción                              |
| ------- | ------------- | ---------------------------------------- |
| `label` | string        | Etiqueta legible del método.             |
| `uri`   | string | null | URI de definición del método, si existe. |


### `distribution`


| Clave                   | Tipo          | Descripción                                                                                          |
| ----------------------- | ------------- | ---------------------------------------------------------------------------------------------------- |
| `dataFormat`            | string        | Formato del fichero de datos (p. ej. `CSV`; debe ser coherente con la extensión en `column_config`). |
| `metadataFormat`        | string        | Formato del metadato (`JSON`).                                                                       |
| `accessLevel`           | string        | Nivel de acceso (p. ej. `public`).                                                                   |
| `embargo_until`         | string | null | Fin de embargo, si aplica.                                                                           |
| `endpoint`              | string | null | URL de descarga, si aplica.                                                                          |
| `license`               | object        | `id` (p. ej. `CC-BY-4.0`) y `url`.                                                                   |
| `useLimitations`        | string        | Condiciones de uso / cita.                                                                           |
| `distributionLiability` | string        | Descargo de responsabilidad.                                                                         |


### `lineage`

La estructura **no es idéntica** en todos los datasets. Suele incluir:

- `**sampling`**: método, equipo, a veces coordenadas puntuales.
- `**lab_processing**` (muestras de laboratorio): digestión, filtración, laboratorio, etc.
- `**analysis**`: instrumento, protocolo, o pasos (p. ej. microscopía + FTIR).
- `**quality_control**`: nivel de QC, validación, fechas.

En **meteorología**, `lineage.sampling` puede incluir:

- `coordinates`: array de dos números en orden `**[latitud, longitud]`** (WGS84).
- `coordinates_encoding`: `"lat_lon_array"` para dejar explícito el orden.

---

## `fields`

Array de **strings**: nombres lógicos de variables **sin unidades ni formatos en el nombre** (p. ej. `"Date"`, `"Polyethylene"`, `"Start point"`).

- Debe ser coherente con las **claves** del objeto interno de `column_config` para ese fichero (misma lista de conceptos).
- Incluye columnas índice (fechas, geometría) además de las magnitudes medidas.

---

## `column_config`

Objeto de primer nivel cuya **clave** es el **nombre del fichero de datos** (p. ej. `water_microplastic.csv`, `WasteCollected_UP.csv`).

Dentro, cada **clave** es el **nombre de columna lógico** (alineado con `fields`): sin `(μg/L)`, `(%)`, etc.; las unidades van en `unit`.

### Definición de cada columna (objeto valor)


| Clave         | Tipo          | Descripción                                                                                                                                                                                                               |
| ------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `field_type`  | string        | Concepto semántico del campo (igual que el nombre lógico salvo casos especiales).                                                                                                                                         |
| `value_type`  | string        | Tipo de valor para parseo/validación (ver tabla siguiente).                                                                                                                                                               |
| `encoding`    | string        | Para `iso8601`: patrón del string (`YYYY-MM-DD`, `HH:MM:SS`). Para `geo_point`: convención del array (p. ej. `lat_lon_array` → `[lat, lon]` en EPSG:4326).                                                                |
| `unit`        | string | null | Unidad física o convención; `null` si no aplica (fechas, conteos sin unidad, URL).                                                                                                                                        |
| `dimension`   | string        | Magnitud física o categoría (p. ej. `mass_per_volume`, `mass`, `fraction`, `angle`, `temperature`, `index`, `time`, `length`, `count`, `power`, `pressure`, `salinity`, `velocity`, `mass_per_mass`, `count_per_volume`). |
| `scale`       | object        | Restricciones y precisión (ver abajo).                                                                                                                                                                                    |
| `code_system` | string        | Opcional; sistema de códigos (p. ej. `polymer`).                                                                                                                                                                          |
| `code`        | string        | Opcional; código dentro de `code_system` (p. ej. `PE`, `PET`).                                                                                                                                                            |
| `crs`         | string        | Solo para `geo_point`: CRS (p. ej. `EPSG:4326`).                                                                                                                                                                          |


### `value_type` usados en el proyecto


| Valor       | Uso típico                                                  |
| ----------- | ----------------------------------------------------------- |
| `iso8601`   | Fecha u hora como texto ISO; combinar con `encoding`.       |
| `float`     | Número decimal.                                             |
| `int`       | Entero (p. ej. duración en unidad indicada, participantes). |
| `geo_point` | Punto geográfico; con `crs` y `encoding: "lat_lon_array"`.  |
| `url`       | Cadena URL.                                                 |


### `scale`


| Clave       | Tipo   | Descripción                                                                                                |
| ----------- | ------ | ---------------------------------------------------------------------------------------------------------- |
| `type`      | string | `ratio` (acotado, con cero mínimo habitual), `interval` (p. ej. temperatura), `circular` (ángulos 0–360°). |
| `precision` | number | Resolución o paso representativo (según convención del equipo).                                            |
| `min`       | number | Opcional; cota inferior.                                                                                   |
| `max`       | number | Opcional; cota superior (p. ej. porcentajes 0–100).                                                        |


---

## Convención geográfica

- `**geo_point` en columnas**: el valor es un array `**[latitud, longitud]`** en grados decimales, con `**crs`: `EPSG:4326**` y `**encoding`: `"lat_lon_array"**`.
- `**EX_GeographicBoundingBox**`: sigue el estándar con `westBoundLongitude`, `eastBoundLongitude`, `southBoundLatitude`, `northBoundLatitude` (no es un único array).

---

## Archivos en esta carpeta (referencia)


| Archivo                    | Contenido resumido                                                         |
| -------------------------- | -------------------------------------------------------------------------- |
| `Muestras de agua.json`    | Microplásticos en agua superficial (μg/L), laboratorio Py-GC/MS.           |
| `Muestras de peces.json`   | Microplásticos en tejido de peces (μg/g).                                  |
| `boya_microplasticos.json` | Microplásticos desde boya Seabot (partículas/L).                           |
| `boya_biomasa.json`        | Biomasa acústica por estratos de profundidad.                              |
| `recogidas de playa.json`  | Ciencia ciudadana playas (masa, distancia, composición %, geometría).      |
| `meteorología.json`        | Contexto CMEMS / variables atmosféricas y oceanográficas en punto de boya. |


### Versión DCAT (catálogo / interoperabilidad)

Para cada JSON anterior existe una serialización **JSON-LD (DCAT 2)** en la carpeta `[DCAT/](./DCAT/README.md)`: mismos datasets con `dcat:Dataset`, `dct:title`, `dct:spatial`, `dcat:distribution`, etc. Regeneración: `python3 metadata/DCAT/generate_dcat.py`.