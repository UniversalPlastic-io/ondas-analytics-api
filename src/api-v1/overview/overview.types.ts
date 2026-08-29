import { PlasticType, ResolvedPeriod, SeriesPoint } from '../reports/reports.types';
import { BiomassSection, EnvironmentSection, MicroplasticsSection } from './overview-sources';

export type OverviewPeriod = 'month' | 'year' | 'all';
export type OverviewSource = 'recogidas_playa' | 'boya_biomasa' | 'boya_microplasticos' | 'environmental_boya';

export interface OverviewKpis {
  kg: number;
  cleanups: number;
  volunteers: number;
  locations: number;
  km: number;
  hours: number;
  ondas: number;
  evidence: number;
  verified: number;
  avgKg: number;
  index: number;
}

export interface OverviewTopLocation {
  name: string;
  kg: number;
  cleanups: number;
}

export interface OverviewResponse {
  period: ResolvedPeriod;
  scope: string;
  sourcesIncluded: OverviewSource[];
  kpis: OverviewKpis;
  series: SeriesPoint[];
  plasticTypes: PlasticType[];
  topLocations: OverviewTopLocation[];
  // Optional sections — present only when the nearest dataset resolves.
  biomass?: BiomassSection;
  microplastics?: MicroplasticsSection;
  environment?: EnvironmentSection;
}
