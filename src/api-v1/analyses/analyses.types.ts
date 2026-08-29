export type AnalysisId =
  | 'basic_contamination'
  | 'trophic_transfer'
  | 'eco_risk'
  | 'plastic_origin';

export type AggregationMode = 'raw' | 'monthly';

export type CacheMode = 'reuse' | 'recompute' | 'bypass';

export type AnalysesRunRequest = {
  location: { lat: number; lon: number };
  area: { type: 'radius_km'; value: number };
  analyses: Array<AnalysisId | 'all' | string>;
  dateRange?: { start: string; end: string };
  aggregation?: { mode: AggregationMode };
  options?: {
    /** When true, the response includes `dataFormattedForPlots`, shaped for the ONDA indicator charts. */
    dataFormattedForPlots?: boolean;
    /**
     * When true, renders each indicator plot to a local `.webp` file and returns absolute paths in `plotWebpPaths`.
     * Implies formatted plot data (same as `dataFormattedForPlots: true`). Cache reuse is skipped so paths always match a fresh export.
     */
    savePlotsWebp?: boolean;
    includeWarnings?: boolean;
    cache?: {
      mode?: CacheMode;
      ttlSeconds?: number;
    };
  };
};

/** Payload for the ten ONDA indicator plot types, for a single location. */
export type DataFormattedForPlots = {
  locationId: string;
  coordinates: { lat: number; lon: number };
  plots: {
    '1_meanMicroplasticsConcentration': {
      title: string;
      coordinates: { lat: number; lon: number };
      locations: string[];
      valuesMpPerL: number[];
    };
    '2_microplasticsOverTime': {
      title: string;
      coordinates: { lat: number; lon: number };
      dates: string[];
      mpPerL: number[];
    };
    '3_bcfDistribution': {
      title: string;
      coordinates: { lat: number; lon: number };
      bcfValues: number[];
    };
    '4_waterVsFishMicroplastics': {
      title: string;
      coordinates: { lat: number; lon: number };
      mpPerL_water: number[];
      mpPerKg_fish: number[];
    };
    '5_polymerCorrelation': {
      title: string;
      coordinates: { lat: number; lon: number };
      polymerLabels: string[];
      correlationMatrix: number[][];
    };
    '6_exposureIndex': {
      title: string;
      coordinates: { lat: number; lon: number };
      mpPerL: number[];
      biomass: number[];
      exposureIndex: number[];
      probIngestion: number;
    };
    '7_plasticPressureComposition': {
      title: string;
      coordinates: { lat: number; lon: number };
      location: string;
      waterMpPerL: number;
      coastKgPerKm: number;
    };
    '8_coastalPressureIndex': {
      title: string;
      coordinates: { lat: number; lon: number };
      dates: string[];
      ipcDaily: number[];
      ipc7DayAverage: Array<number | null>;
    };
    '9_coastalSourceIndex': {
      title: string;
      coordinates: { lat: number; lon: number };
      kgTotal: number[];
      mpPerL: number[];
      csi: number[];
    };
    '10_spatialDistributionOfImpact': {
      title: string;
      coordinates: { lat: number; lon: number };
      lon: number[];
      lat: number[];
      impactValues: number[];
    };
    '11_basicContaminationSummary': {
      title: string;
      coordinates: { lat: number; lon: number };
      /** Mean of mp_per_L across the selected window (same series as plot 2). */
      meanMpPerL: number;
      /** Standard deviation of mp_per_L across the selected window. */
      stdMpPerL: number;
      /** Coefficient of variation (std / mean). */
      cvMpPerL: number;
    };
    '12_buoyVsWaterConcordance': {
      title: string;
      coordinates: { lat: number; lon: number };
      /** List of polymer labels detected by the buoy/µFTIR workflow (qualitative). */
      buoyPolymers: string[];
      /** List of polymer labels detected by water Py-GC/MS workflow (qualitative). */
      waterPolymers: string[];
      /** Intersection over union (Jaccard) as percent [0..100]. */
      overlapPercent: number;
    };
    '13_waterVsFishPolymerSimilarity': {
      title: string;
      coordinates: { lat: number; lon: number };
      polymerLabels: string[];
      waterPercent: number[];
      fishPercent: number[];
      pearson_r: number;
      p_value: number;
    };
  };
};

export type AnalysesRunResponse = {
  requestId: string;
  input: {
    location: { lat: number; lon: number };
    area: { type: 'radius_km'; value: number };
  };
  executedAnalyses: AnalysisId[];
  meta: {
    aggregation: { mode: AggregationMode };
    dateRangeApplied: { start: string; end: string };
    datasetsUsed: Record<string, number>;
    cache?: {
      mode: CacheMode;
      hit: boolean;
      cacheKey: string;
      cachedAt?: string;
      expiresAt?: string;
    };
  };
  results: Record<string, unknown>;
  /** Present when `options.dataFormattedForPlots` or `options.savePlotsWebp` was true on the request. */
  dataFormattedForPlots?: DataFormattedForPlots;
  /**
   * Paths/URIs to generated `.webp` images (one per plot key in `dataFormattedForPlots.plots`).
   * In local runs these may be absolute filesystem paths; in deployed/demo environments these can be S3 URIs (e.g. `s3://bucket/...`).
   * Present when `options.savePlotsWebp` was true.
   */
  plotWebpPaths?: Record<string, string>;
  /** Absolute path to `report.pdf` (all plots, one page each). Present when `options.savePlotsWebp` was true. */
  plotPdfPath?: string;
  /**
   * URL/URI to the generated PDF report. In deployed/demo environments this can be an S3 URI (e.g. `s3://bucket/...`).
   */
  plotPdfUrl?: string;
  /**
   * S3 URLs for the analysis archive uploaded to the data bucket.
   * Present when `options.savePlotsWebp` was true and the upload succeeded.
   */
  analysisArchive?: {
    pdfUrl: string;
    jsonUrl: string;
    s3Prefix: string;
  };
  warnings?: string[];
};

