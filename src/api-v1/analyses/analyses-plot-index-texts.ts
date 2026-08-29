/**
 * Textos alineados con GET /v1/analyses/indices (analyses.controller.ts).
 * Usados en el PDF de plots (sustituyen el bloque JSON bajo cada gráfica).
 * Duplicado en frontend: `frontend/src/data/plotDescriptions.ts` — mantener ambos alineados.
 */
const PLOT_INDEX_DESCRIPTIONS: Record<string, string> = {
  '1_meanMicroplasticsConcentration':
    'Concentración media de microplásticos en agua (mp/L) en la zona y periodo analizados. Representa la magnitud típica de contaminación en columna de agua; sirve como referencia para comparar ubicaciones con el mismo rango temporal y definición de área, y como base aguas arriba de BCF, Exposure_Index y CSI.',

  '2_microplasticsOverTime':
    'Evolución temporal de mp/L en la ventana solicitada. Muestra tendencia y picos (estacionalidad o episodios). Interprétalo junto a la agregación elegida y úsalo para contextualizar variabilidad frente a indicadores básicos (media, desviación, coeficiente de variación).',

  '3_bcfDistribution':
    'Distribución del factor de bioconcentración (BCF): cociente concentración en biota / concentración en agua (unidades homogeneizadas). Valores altos sugieren mayor acumulación relativa en peces para una misma señal en agua; contrástalo con la magnitud de mp/L y con la similitud polimérica agua–pez.',

  '4_waterVsFishMicroplastics':
    'Diagrama agua vs biota: microplásticos en agua frente a microplásticos en tejido de pez. Si para rangos altos de mp/L aparecen mp/kg altos en pez, sugiere transferencia o acumulación; combínalo con BCF y con la correlación de composición por polímero.',

  '5_polymerCorrelation':
    'Matriz de correlación de Pearson entre series por tipo de polímero. Valores cercanos a 1 indican co-variación positiva; cercanos a 0, independencia. Describe la “mezcla”: si mp/L cambia pero la matriz es estable, cambia más la magnitud que la composición.',

  '6_exposureIndex':
    'Índice compuesto de exposición (Exposure_Index / IEO conceptual): combina microplásticos en agua, biomasa de peces y probabilidad de ingestión. Valores altos indican conjunción de alta contaminación, receptor biológico relevante y probabilidad de ingestión asumida; descompón la lectura en mp/L vs biomasa y cruz con BCF.',

  '7_plasticPressureComposition':
    'Desglose de la presión plástica tipo “load index”: contribución relativa de la señal en agua frente a la carga costera (kg por km de costa en la definición operativa). Ayuda a ver si domina la columna de agua o la presión desde costa; reconcílialo con IPC y mp/L.',

  '8_coastalPressureIndex':
    'Serie del índice de presión costera (IPC): carga costera modulada por condiciones meteo/oceanográficas, con referencia a media móvil de 7 días. Sirve para distinguir picos puntuales de tendencia; compáralo con Plastic_Pressure_Index y CSI para ver atribución costa vs agua.',

  '9_coastalSourceIndex':
    'Índice de fuente costera (CSI): relación entre microplásticos en agua y masa costera recolectada para orientar el origen (costa vs columna). CSI alto sugiere más mp en agua por unidad de residuo costero; CSI bajo lo contrario. Léelo junto a mp/L, kg_total e IPC.',

  '10_spatialDistributionOfImpact':
    'Intensidad de impacto o concentración agregada sobre coordenadas (lon/lat). Valores altos señalan zonas con mayor intensidad del indicador en el estudio; úsalo para contextualizar picos temporales y comparar áreas con la misma ventana temporal.',

  '11_basicContaminationSummary':
    'Resumen estadístico de contaminación básica: media de mp/L, desviación típica y coeficiente de variación. Describe magnitud y estabilidad temporal (episodios vs régimen estable); sirve de contexto para interpretar series y picos en mp/L.',

  '12_buoyVsWaterConcordance':
    'Concordancia cualitativa entre polímeros detectados en boya (µFTIR) y en muestras de agua (Py-GC/MS): porcentaje de solape. Concordancia alta sugiere coherencia de composición; baja puede indicar diferencias metodológicas o variabilidad espacio-temporal. Úsalo como control al interpretar la matriz de correlación de polímeros.',

  '13_waterVsFishPolymerSimilarity':
    'Similitud de la firma polimérica entre agua y tejido de pez (correlación de Pearson entre vectores de porcentajes por polímero). r alto sugiere transferencia con composición parecida; r más bajo sugiere selectividad o degradación diferencial. Combínalo con BCF para distinguir acumulación con o sin cambio fuerte de mezcla.',
};

export function plotIndexDescriptionForPdf(plotKey: string): string {
  return (
    PLOT_INDEX_DESCRIPTIONS[plotKey] ??
    'Gráfico generado a partir de dataFormattedForPlots. Para la definición del indicador y cómo relacionarlo con el resto, consulta la documentación de índices: GET /v1/analyses/indices.'
  );
}
