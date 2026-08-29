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
    dataFormattedForPlots?: boolean;
    savePlotsWebp?: boolean;
    includeWarnings?: boolean;
    cache?: { mode?: CacheMode; ttlSeconds?: number };
  };
};

export type DataFormattedForPlots = {
  locationId: string;
  coordinates: { lat: number; lon: number };
  plots: Record<
    string,
    {
      title: string;
      coordinates: { lat: number; lon: number };
      [k: string]: unknown;
    }
  >;
};

export type AnalysesRunResponse = {
  requestId: string;
  input: { location: { lat: number; lon: number }; area: { type: 'radius_km'; value: number } };
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
  dataFormattedForPlots?: DataFormattedForPlots;
  plotWebpPaths?: Record<string, string>;
  plotPdfPath?: string;
  plotPdfUrl?: string;
  warnings?: string[];
};

