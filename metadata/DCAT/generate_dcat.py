#!/usr/bin/env python3
"""Genera archivos JSON-LD (DCAT) a partir de los metadatos JSON del directorio padre."""

from __future__ import annotations

import json
import sys
from pathlib import Path

METADATA_DIR = Path(__file__).resolve().parent.parent
OUT_DIR = Path(__file__).resolve().parent

# DCAT 2 / Dublin Core — JSON-LD @context
CONTEXT = {
    "dcat": "http://www.w3.org/ns/dcat#",
    "dct": "http://purl.org/dc/terms/",
    "dcterms": "http://purl.org/dc/terms/",
    "foaf": "http://xmlns.com/foaf/0.1/",
    "vcard": "http://www.w3.org/2006/vcard/ns#",
    "rdfs": "http://www.w3.org/2000/01/rdf-schema#",
    "xsd": "http://www.w3.org/2001/XMLSchema#",
    "prov": "http://www.w3.org/ns/prov#",
    "locn": "http://www.w3.org/ns/locn#",
    # schema.org: diccionario de columnas (variableMeasured) junto a dcat:Dataset
    "schema": "https://schema.org/",
}

# IANA media types for dcat:mediaType
MEDIA_TYPES = {
    ".csv": "text/csv",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    # Los activos publicados en el espacio de datos son JSON; los .csv/.xlsx son
    # los ficheros de origen de laboratorio, previos a la publicación.
    ".json": "application/json",
}

ACCRUAL = "http://purl.org/cld/freq/irregular"


def first_distribution_filename(meta: dict) -> tuple[str, str]:
    """Returns (filename, media type or '')."""
    cc = meta.get("column_config") or {}
    if not cc:
        return "", ""
    fname = next(iter(cc.keys()))
    ext = Path(fname).suffix.lower()
    return fname, MEDIA_TYPES.get(ext, "application/octet-stream")


def build_variable_measured(column_config: dict) -> list[dict]:
    """Un schema:PropertyValue por columna (mismo contenido que column_config del primer fichero)."""
    if not column_config:
        return []
    first_file = next(iter(column_config.values()))
    if not isinstance(first_file, dict):
        return []
    out: list[dict] = []
    for col_name, spec in first_file.items():
        if not isinstance(spec, dict):
            continue
        parts: list[str] = []
        for k in sorted(spec.keys()):
            v = spec[k]
            if v is None:
                continue
            if isinstance(v, dict):
                parts.append(f"{k}={json.dumps(v, ensure_ascii=False)}")
            else:
                parts.append(f"{k}={v}")
        pv: dict = {
            "@type": "schema:PropertyValue",
            "schema:name": col_name,
        }
        desc = "; ".join(parts)
        if desc:
            pv["schema:description"] = desc
        unit = spec.get("unit")
        if unit:
            pv["schema:unitText"] = unit
        ft = spec.get("field_type")
        if ft and ft != col_name:
            pv["schema:alternateName"] = ft
        out.append(pv)
    return out


def bbox_literal(box: dict) -> str:
    """W S E N as comma-separated (common GeoDCAT style)."""
    w = box["westBoundLongitude"]
    e = box["eastBoundLongitude"]
    s = box["southBoundLatitude"]
    n = box["northBoundLatitude"]
    return f"{w}, {s}, {e}, {n}"


def build_dataset(meta: dict, source_relpath: str) -> dict:
    cit = meta.get("citation") or {}
    title = cit.get("title") or meta.get("name") or meta["fileIdentifier"]
    desc = (meta.get("description") or "").strip()
    purpose = (meta.get("purpose") or "").strip()
    if purpose:
        desc = f"{desc}\n\nObjetivo: {purpose}"

    issued = cit.get("publicationDate")
    ex = meta.get("EX_Extent") or {}
    geo = (
        (ex.get("geographicElement") or {}).get("EX_GeographicBoundingBox") or {}
    )
    temp = (ex.get("temporalElement") or {})
    dist = meta.get("distribution") or {}
    lic = dist.get("license") or {}
    kw_theme = (meta.get("keywords") or {}).get("theme") or []
    kw_place = (meta.get("keywords") or {}).get("place") or []
    keywords = [*(kw_theme or []), *(kw_place or [])]
    eov_kw = meta.get("eov")
    if eov_kw and eov_kw not in keywords:
        keywords = [*keywords, eov_kw]

    resource = meta.get("resourceContact") or {}
    meta_c = meta.get("metadataContact") or {}

    dataset_id = f"urn:gaia:ondas:dataset:{meta['fileIdentifier']}"
    source_uri = f"urn:gaia:ondas:metadata:{source_relpath.replace(' ', '%20')}"
    lang = "es" if (meta.get("language") or "").lower().startswith("spa") else "en"

    node: dict = {
        "@context": CONTEXT,
        "@id": dataset_id,
        "@type": ["dcat:Dataset", "schema:Dataset"],
        "dct:identifier": meta["fileIdentifier"],
        "dct:title": {"@language": lang, "@value": title},
        "dct:description": {"@language": lang, "@value": desc},
        "dct:language": lang,
        "dcat:keyword": keywords,
        "dct:publisher": {
            "@type": "foaf:Organization",
            "foaf:name": meta.get("source") or "PLASTIC BLUE ECONOMY S.L",
        },
        "dct:creator": {
            "@type": "foaf:Organization",
            "foaf:name": (cit.get("authors") or [{}])[0].get("organisation")
            or resource.get("organisationName")
            or "Universal Plastic",
        },
        "dcat:contactPoint": {
            "@type": "vcard:Kind",
            "vcard:fn": meta_c.get("individualName") or resource.get("individualName"),
            "vcard:hasEmail": f"mailto:{meta_c.get('email') or resource.get('email')}",
            "vcard:organization-name": meta_c.get("organisationName")
            or resource.get("organisationName"),
        },
        "dct:license": {"@id": lic.get("url") or "https://creativecommons.org/licenses/by/4.0/"},
        "dct:rights": " ".join(
            filter(
                None,
                [
                    dist.get("useLimitations"),
                    dist.get("distributionLiability"),
                ],
            )
        ),
        "dcat:accrualPeriodicity": {"@id": ACCRUAL},
        "rdfs:seeAlso": {"@id": source_uri},
        "prov:wasDerivedFrom": {"@id": source_uri},
    }

    if issued:
        node["dct:issued"] = issued

    if geo:
        spatial_label = (ex.get("marine_region") or "").strip()
        if ex.get("location_name"):
            spatial_label = (
                f"{spatial_label} — {ex['location_name']}".strip()
                if spatial_label
                else str(ex["location_name"])
            )
        node["dct:spatial"] = {
            "@type": "dct:Location",
            "dcat:bbox": bbox_literal(geo),
            "rdfs:label": spatial_label or None,
            "rdfs:comment": f"CRS {ex.get('crs', 'EPSG:4326')}; país {ex.get('country_code', '')}.",
        }
        if not node["dct:spatial"]["rdfs:label"]:
            del node["dct:spatial"]["rdfs:label"]

    if temp.get("start") and temp.get("end"):
        node["dct:temporal"] = {
            "@type": "dct:PeriodOfTime",
            "dcat:startDate": temp["start"],
            "dcat:endDate": temp["end"],
        }

    proj = meta.get("project")
    if proj:
        node["dct:relation"] = {
            "@type": "foaf:Project",
            "foaf:name": proj,
        }

    fname, media = first_distribution_filename(meta)
    if fname:
        ext = Path(fname).suffix.lower()
        fmt_label = ext.lstrip(".").upper() if ext else (dist.get("dataFormat") or "")
        node["dcat:distribution"] = {
            "@type": "dcat:Distribution",
            "dct:title": fname,
            "dct:format": fmt_label,
            "dcat:mediaType": {"@id": f"https://www.iana.org/assignments/media-types/{media}"},
            "dct:accessRights": "https://publications.europa.eu/resource/authority/access-right/PUBLIC"
            if (dist.get("accessLevel") == "public")
            else None,
        }
        # prune None accessRights
        d = node["dcat:distribution"]
        if d.get("dct:accessRights") is None:
            del d["dct:accessRights"]

    lineage = meta.get("lineage") or {}
    samp = lineage.get("sampling") or {}
    if samp.get("data_source_url"):
        node["prov:wasGeneratedBy"] = {
            "@type": "prov:Activity",
            "prov:used": {"@id": samp["data_source_url"]},
        }

    vm = build_variable_measured(meta.get("column_config") or {})
    if vm:
        node["schema:variableMeasured"] = vm

    return node


# Metadato de origen → esquema de tipo de dataset publicado en este directorio.
# Los .jsonld versionados son *esquemas* (urn:gaia:ondas:schema:...), que es lo que
# valida el API y lo que referencian los ficheros del bucket en `dcatSchemaRef`.
# `build_dataset` produce en cambio un documento de *instancia*
# (urn:gaia:ondas:dataset:...), que solo se escribe con --datasets.
SCHEMA_FILES = {
    "Muestras de agua.json": "muestras_de_agua_py_gcms.jsonld",
    "Muestras de peces.json": "muestras_de_peces_py_gcms.jsonld",
    "boya_microplasticos.json": "boya_microplasticos_seabot.jsonld",
    "boya_biomasa.json": "boya_biomasa_slx+.jsonld",
    "recogidas de playa.json": "recogidas_plastico_app_up_v700.jsonld",
    "meteorología.json": "meteorología_cdse_vl.jsonld",
}


def sync_schema_variables(meta: dict, schema_path: Path) -> bool:
    """Rewrites `schema:variableMeasured` of an existing schema, leaving the rest."""
    if not schema_path.exists():
        print(f"  (falta {schema_path.name}, se omite)")
        return False
    variables = build_variable_measured(meta.get("column_config") or {})
    if not variables:
        print(f"  ({schema_path.name}: el origen no declara column_config)")
        return False
    with schema_path.open(encoding="utf-8") as f:
        schema = json.load(f)
    before = [v.get("schema:name") for v in schema.get("schema:variableMeasured", [])]
    after = [v.get("schema:name") for v in variables]
    schema["schema:variableMeasured"] = variables
    with schema_path.open("w", encoding="utf-8") as f:
        json.dump(schema, f, ensure_ascii=False, indent=2)
        f.write("\n")
    changed = before != after
    print(f"  {schema_path.name}: {len(variables)} variables{' (sin cambios)' if not changed else ''}")
    return changed


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    write_datasets = "--datasets" in sys.argv

    for path in sorted(METADATA_DIR.glob("*.json")):
        if path.parent.name == "DCAT":
            continue
        with path.open(encoding="utf-8") as f:
            meta = json.load(f)

        schema_name = SCHEMA_FILES.get(path.name)
        if schema_name:
            print(f"{path.name}")
            sync_schema_variables(meta, OUT_DIR / schema_name)
        else:
            print(f"{path.name}: sin esquema asociado en SCHEMA_FILES")

        if write_datasets:
            out_path = OUT_DIR / (path.stem + ".dataset.jsonld")
            with out_path.open("w", encoding="utf-8") as f:
                json.dump(build_dataset(meta, path.name), f, ensure_ascii=False, indent=2)
            print(f"  instancia → {out_path.name}")


if __name__ == "__main__":
    main()
