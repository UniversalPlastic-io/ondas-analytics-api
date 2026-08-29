/**
 * Reference points used only to decide which ocean folder generated output
 * (report PDFs, analysis archives) is uploaded into.
 *
 * This is NOT the dataset inventory any more — reads come from the `assets`
 * collection, filled by POST /v1/sync/scan. Nothing here is fetched at request
 * time; see src/api-v1/dataspace/.
 */
const BASE = 'https://universalplastic-sedia.s3.eu-central-1.amazonaws.com/public';

export type CatalogType = 'boya_biomasa' | 'recogidas_playa' | 'boya_microplasticos' | 'environmental_boya';

export type CatalogEntry = {
  type: CatalogType;
  lat: number;
  lon: number;
  url: string;
};

export const S3_CATALOGUE: CatalogEntry[] = [
  // boya_biomasa_slx+ — fish biomass buoy (rows, hourly)
  { type: 'boya_biomasa', lat: 41.43425,    lon:  2.24334,   url: `${BASE}/mediterraneo/port_badalona/boya_biomasa_badalona.json` },
  { type: 'boya_biomasa', lat: 36.39646,    lon: -6.20818,   url: `${BASE}/atlantico/universal_plastic/boya_biomasa_cadiz.json` },
  { type: 'boya_biomasa', lat: 43.5683,     lon: -5.6789,    url: `${BASE}/catambrico/universal_plastic/boya_biomasa_gijon.json` }, // corrected lon sign (raw file: +5.6789)

  // recogidas_playa — coastal plastic cleanup (rows, per-event)
  { type: 'recogidas_playa', lat: 41.6701792, lon:  2.7895005,  url: `${BASE}/mediterraneo/innoceana/recogidas_playas_barcelona.json` },
  { type: 'recogidas_playa', lat: 41.4377479, lon:  2.2442404,  url: `${BASE}/mediterraneo/universal_plastic/recogidas_playas_badalona.json` },
  { type: 'recogidas_playa', lat: 41.676,     lon:  2.795,      url: `${BASE}/mediterraneo/universal_plastic/recogidas_playas_blanes.json` },
  { type: 'recogidas_playa', lat: 28.1876084, lon: -16.6595858, url: `${BASE}/atlantico/innoceana/recogidas_playa_tenerife.json` },    // corrected from (31.483, -11.926)
  { type: 'recogidas_playa', lat: 43.5721291, lon: -5.7212135,  url: `${BASE}/catambrico/gijon_surf_hostel/recogidas_playas_gijon.json` }, // corrected from (31.483, -11.926)

  // boya_microplasticos_seabot — microplastics buoy µFTIR (Badalona only)
  { type: 'boya_microplasticos', lat: 41.434212, lon: 2.243317, url: `${BASE}/mediterraneo/port_badalona/boya_microplasticos_badalona.json` },

  // environmental_boya — met-ocean buoy, columnar hourly
  { type: 'environmental_boya', lat: 41.434212, lon:  2.243317, url: `${BASE}/mediterraneo/universal_plastic/environmental_badalona.json` },
  { type: 'environmental_boya', lat: 36.53,     lon: -6.29,     url: `${BASE}/atlantico/universal_plastic/environmental_cadiz.json` },
  { type: 'environmental_boya', lat: 43.575,    lon: -5.65,     url: `${BASE}/catambrico/universal_plastic/environmental_gijon.json` },
];
