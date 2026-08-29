ONDA Dataspace: API analítica

Muestras de microplásticos y posterior transferencia a la cadena trófica


Contexto
La contaminación por plásticos en los ecosistemas marinos representa uno de los mayores retos ambientales de la actualidad. Los residuos plásticos, al degradarse, generan microplásticos (fragmentos menores de 5 mm) que pueden ser ingeridos por organismos marinos de distintos niveles tróficos, desde el plancton hasta peces y otros depredadores superiores. Esta acumulación puede propagarse a lo largo de la cadena alimentaria, llegando finalmente al consumo humano y generando potenciales riesgos para la salud, los ecosistemas y las economías dependientes del mar. 
Uno de los principales problemas para abordar esta crisis es la escasez de datos integrados y estandarizados que permitan comprender cómo se distribuyen los microplásticos en el medio marino y cómo se transfieren entre los distintos niveles de la cadena trófica. Actualmente existen múltiples iniciativas de monitorización y recolección de datos, pero suelen encontrarse fragmentadas, emplear metodologías heterogéneas o centrarse únicamente en una dimensión del problema. 
En este contexto, el proyecto ONDAs propone la creación de un espacio de datos orientado a la monitorización y análisis de la contaminación plástica en ecosistemas marinos, integrando información procedente de diferentes agentes y fuentes de observación. Este enfoque basado en la economía del dato permite transformar datos ambientales dispersos en conocimiento científico y herramientas analíticas capaces de explicar fenómenos complejos como la transferencia de microplásticos en la cadena trófica marina. 
Para explotar este espacio de datos se plantea el desarrollo de una API analítica, cuyo propósito será integrar y relacionar datos heterogéneos provenientes de sensores, muestreos científicos y actividades de monitorización ambiental. Esta API permitirá estructurar los datos, analizarlos y generar modelos que ayuden a comprender los procesos de contaminación plástica en los océanos.

Objetivo
El objetivo de esta iniciativa es diseñar e implementar una API capaz de integrar y procesar datos ambientales y biológicos procedentes de distintas fuentes, con el fin de analizar la contaminación plástica marina y su transferencia a lo largo de la cadena trófica, facilitando así la toma de decisiones basada en evidencia
De forma específica, esta API tendrá como finalidad:
Centralizar e integrar datos heterogéneos provenientes de sensores oceanográficos, muestreos científicos y actividades de monitorización de residuos plásticos.
Relacionar variables ambientales, biológicas y antrópicas para identificar patrones de acumulación y transferencia de microplásticos.
Facilitar el acceso a datos estructurados a investigadores, instituciones públicas y empresas interesadas en la monitorización del estado de los ecosistemas marinos.
Desarrollar capacidades analíticas y predictivas, que permitan comprender cómo factores ambientales, dinámicas oceánicas y actividades humanas influyen en la presencia de microplásticos en organismos marinos.
Generar conocimiento científico aplicable que contribuya a mejorar la seguridad alimentaria marina, optimizar estrategias de limpieza y orientar políticas públicas relacionadas con la contaminación plástica.
En última instancia, la API se concibe como una infraestructura digital de análisis de datos ambientales, capaz de convertir información dispersa en indicadores útiles para comprender el impacto del plástico en los ecosistemas y en la cadena alimentaria.

Procedencia de los datos y su importancia
Para el desarrollo de la API analítica se dispone de diversas fuentes de datos que aportan información complementaria sobre la presencia, distribución y transferencia de los microplásticos en el medio marino, así como sobre los factores ambientales que condicionan su comportamiento. Estas fuentes se clasifican según su naturaleza y el tipo de información que aportan.
Boyas de microplásticos
Las muestras proceden de boyas equipadas con un sistema de filtración pasiva, en el que la corriente marina impulsa el paso del agua a través de un filtro que retiene las partículas presentes en la columna de agua. El filtro es recuperado periódicamente y procesado en laboratorio mediante estereomicroscopía, permitiendo la detección, cuantificación y clasificación morfológica de las partículas superiores a 25 µm. Para cada partícula se registran la forma (fibra, fragmento, maraña, film, foam o microbead), el tamaño y el color. La composición polimérica de al menos un 10 % de las partículas se determina mediante microespectroscopía infrarroja por transformada de Fourier (µFTIR). Los resultados se expresan en unidades de concentración referidas al volumen de agua filtrada (ítems/L).
Estos datos resultan fundamentales para los siguientes propósitos analíticos:
Caracterización de la contaminación: identificar y cuantificar los tipos de microplásticos presentes en la columna de agua en una localización y un momento determinados.
Análisis de dispersión: estudiar la dinámica de distribución y transporte de microplásticos en el medio marino a lo largo del tiempo.
Correlación ambiental: relacionar la presencia y concentración de microplásticos con variables meteorológicas, oceanográficas y biológicas.
Evaluación de la transferencia trófica: establecer vínculos entre la contaminación plástica en el agua y su potencial incorporación a la cadena trófica marina.
En el contexto de la API, constituyen la fuente de información primaria sobre el estado de contaminación plástica en la columna de agua.
Boyas de biomasa
Las boyas SatLink estiman en tiempo real la biomasa de peces presente en la columna de agua, proporcionando valores en toneladas distribuidos por rangos de profundidad, así como el total integrado de la columna. Los datos son transmitidos automáticamente vía satélite con una resolución temporal de hasta una hora, aunque para los análisis se pueden agregar a escala diaria o mensual según los requerimientos del estudio.
Estos datos resultan fundamentales para los siguientes propósitos analíticos:

Distribución vertical de biomasa: conocer en qué rangos de profundidad se concentra la actividad biológica, lo que permite contextualizar la exposición de los organismos a los microplásticos presentes en la columna de agua.
Análisis de bioacumulación: relacionar la concentración de microplásticos con la biomasa de peces para identificar zonas o períodos con mayor riesgo de incorporación de plásticos a la cadena trófica.
Correlación espacio-temporal: cruzar la variabilidad temporal de la biomasa con otros datos del sistema, como los meteorológicos o los de microplásticos en agua, para detectar patrones de interacción.
En el contexto de la API, estos datos actúan como indicador de la actividad biológica marina y constituyen un elemento clave para estudiar la interfaz entre la contaminación plástica y la cadena trófica.
Variables meteorológicas y oceanográficas
Las variables meteorológicas y oceanográficas condicionan directamente la distribución, transporte, acumulación y degradación de los plásticos en el medio marino. Para el desarrollo de la API se dispone de datos procedentes del servicio Copernicus, complementados con variables meteorológicas de estación. Estas variables se organizan según su función analítica principal:
Variables asociadas al transporte y dispersión de plásticos
Corrientes marinas (componentes zonal y meridional: uo, vo)
Viento (componentes zonal y meridional: eastward_wind, northward_wind)
Altura significativa del oleaje (VHM0), dirección media del oleaje (VMDR) y período medio (VTM02)
Precipitación (aporte de plásticos desde tierra y arrastre superficial)
Variables asociadas a la acumulación de plásticos en playa
Dirección e intensidad del oleaje (determinan la energía de la costa)
Componentes del viento (condicionan el depósito de material flotante)
Precipitación (eventos de escorrentía y aporte terrestre)
Variables asociadas a la degradación de plásticos
Temperatura del agua (thetao) y del aire (aceleran la fragmentación)
Radiación solar e índice UV (fotodegradación)
Salinidad (so) (influye en la densidad y el comportamiento de flotabilidad)
Humedad y presión atmosférica (condiciones de exposición en playa)
En el contexto de la API, estas variables actuarán como factores explicativos dentro de los modelos analíticos, permitiendo contextualizar espacial y temporalmente los datos de contaminación plástica, y modelos predictivos que permiten crear medidas de prevención y de actuación frente a la contaminación plástica marina.
Muestras de tejido de pez (microplásticos por Py-GC/MS)
Las muestras consisten en tejido muscular dorsal (lomo) de diversas especies de peces marinos. Su análisis mediante pirólisis acoplada a cromatografía de gases y espectrometría de masas (Py-GC/MS) permite cuantificar con alta precisión la concentración de cada polímero plástico presente en el tejido, expresada en µg de polímero por gramo de muestra (µg/g). Los resultados se desglosan por tipo de polímero, obteniendo tanto la concentración absoluta de cada uno como su contribución porcentual al total de plástico detectado.
Estos datos resultan fundamentales para:
Evaluación de la transferencia trófica: al tratarse de tejido muscular, reflejan la acumulación real de plásticos en la fracción del organismo de mayor relevancia para el consumo humano.
Análisis de bioacumulación por especie: la variedad de especies muestreadas permite comparar perfiles de contaminación en función de la posición trófica, hábitos alimentarios y área de distribución de cada especie.
Correlación con el medio acuático: la proximidad geográfica con los puntos de muestreo de agua permite relacionar directamente la contaminación del agua con la detectada en los organismos, facilitando el estudio de la transferencia desde el medio hacia la biota.
Evaluación de riesgos para la seguridad alimentaria: la cuantificación por polímero en tejido comestible aporta datos directamente aplicables a la evaluación de la exposición humana.
En el contexto de la API, estas muestras constituyen la evidencia directa de la transferencia de microplásticos a la cadena trófica marina. Los datos de concentración polimérica por especie actuarán como variable de respuesta biológica, permitiendo construir modelos que relacionen la contaminación del medio acuático con su incorporación a los organismos y, en última instancia, evaluar el riesgo de exposición humana a través del consumo de pescado.
Muestras de agua (microplásticos por Py-GC/MS)
Las muestras de agua marina recogidas en puntos próximos a las estaciones de muestreo biológico son analizadas mediante Py-GC/MS, proporcionando la concentración de cada polímero plástico disuelto o particulado en el agua, expresada en µg/L. Al igual que en las muestras de pez, los resultados se desglosan por tipo de polímero y se expresan tanto en valor absoluto como en contribución porcentual al total detectado.
Estos datos resultan fundamentales para:
Caracterización química detallada del agua: a diferencia de la boya de filtración pasiva, que ofrece datos morfológicos y de composición parcial por µFTIR, el análisis por Py-GC/MS proporciona una cuantificación másica completa de todos los polímeros presentes, incluyendo partículas por debajo del límite visual.
Conocimiento del estado de contaminación del medio acuático: los datos de concentración polimérica permiten caracterizar directamente la carga y composición de plásticos presentes en la columna de agua, con independencia de su relación con la biota.
Validación cruzada entre fuentes: la proximidad geográfica con las boyas de microplásticos permite comparar y complementar ambas metodologías, aumentando la robustez del dato.
Base de referencia para modelos analíticos: los datos de concentración polimérica en agua constituyen la variable de exposición ambiental sobre la que se anclan los análisis de transferencia trófica.
En el contexto de la API, los datos de concentración polimérica en agua cumplen una doble función. Por un lado, constituyen una medida directa del nivel de contaminación plástica en el medio acuático, permitiendo caracterizar el estado de la masa de agua en términos de carga y composición polimérica. Por otro lado, actúan como variable de exposición ambiental de referencia para modelar la transferencia trófica, ya que su proximidad geográfica con los puntos de muestreo biológico los convierte en el nexo analítico entre el medio y la biota. Su integración con los datos de la boya de filtración pasiva permite además construir una imagen más completa y robusta de la contaminación plástica en la columna de agua.
Recogidas de residuos plástico en la costa
Los datos recogidos en costa proceden de la aplicación móvil Universal Plastic v7.0.0, plataforma de economía azul que genera un dataset de ciencia ciudadana georreferenciado. La app permite registrar limpiezas costeras capturando la cantidad de residuo recogido en kilogramos, la composición polimérica desglosada por tipo de plástico (PET, HDPE, PVC, LDPE, PP, PS y otros) mediante identificación por inteligencia artificial a partir de imágenes, así como información operativa del tramo muestreado: puntos de inicio y fin, distancia recorrida, duración de la recogida y número de participantes. El sistema implementa un protocolo de dMRV (digital Measurement, Reporting and Verification) que garantiza la medición, el reporte y la verificación automatizada y trazable de cada registro.

Estos datos resultan fundamentales para:

Cuantificación y distribución de la contaminación costera: identificar los tramos con mayor acumulación de residuos plásticos y su evolución temporal.
Caracterización polimérica de los residuos: conocer qué tipos de plástico predominan en cada zona costera, dato directamente comparable con los perfiles polimétricos obtenidos en agua y biota mediante Py-GC/MS.
Evaluación del potencial de generación de microplásticos: los macroplásticos costeros constituyen una fuente secundaria de microplásticos por fragmentación, por lo que su tipología y cantidad son relevantes para estimar la presión de contaminación sobre el medio marino adyacente.
Conexión entre contaminación terrestre y marina: permite relacionar la acumulación en la costa con los datos de microplásticos en agua y organismos, contribuyendo a trazar el ciclo completo de los plásticos en el entorno litoral.

En el contexto de la API, estos datos actúan como indicador de la presión de contaminación plástica desde la costa, complementando las fuentes de datos marinos y permitiendo establecer vínculos entre el origen terrestre de los residuos y su posterior presencia en el medio marino. La trazabilidad garantizada por el sistema dMRV refuerza además la calidad y auditabilidad del dato dentro del sistema analítico.

Procesado y generación de indicadores
Las fuentes de datos del sistema no se limitan a su uso en bruto, sino que mediante operaciones de agregación, normalización y cruce entre datasets se generan variables derivadas e índices operativos que constituyen la base analítica de la API. Esta capa de procesado transforma los datos primarios en información interpretable y comparable, estructurada en las siguientes familias de indicadores:
 Indicadores básicos de contaminación: 
A partir de los datos de microplásticos en agua y tejido de pez se calculan métricas de concentración media por punto, zona geográfica y período temporal, así como índices de variabilidad (desviación estándar, coeficiente de variación) que permiten distinguir entre focos de contaminación crónica y episodios puntuales. Los resultados por polímero se agregan para obtener la carga total de microplásticos por muestra.
Concentración media de microplásticos: Se calcula como el promedio de la concentración total de microplásticos por punto de muestreo, expresado en microgramos por litro (µg/L) para las muestras de agua y en microgramos por gramo de tejido (µg/g) para las muestras de pez. Dado que los análisis por Py-GC/MS proporcionan resultados desglosados por polímero, la concentración total se obtiene sumando las concentraciones individuales de todos los polímeros detectados en cada muestra. Este indicador permite comparar el nivel de contaminación entre distintas localizaciones, constituyendo la métrica de referencia sobre la que se construyen los indicadores derivados del sistema.
Índice de variabilidad temporal (media mensual): Se calcula como la desviación estándar o el coeficiente de variación de la concentración de microplásticos en un punto de muestreo a lo largo del tiempo. Un coeficiente de variación elevado indica un punto con episodios puntuales de contaminación intensa, mientras que un valor bajo es característico de zonas con contaminación crónica y estable.
Nota: este índice requiere una serie temporal suficiente para ser estadísticamente representativo. Con los datos actuales no es posible calcularlo, pero está previsto su cómputo a medida que se acumulen nuevas campañas de muestreo.

Comparación de resultados de muestra de agua y boya de microplásticos. 
Índice de concordancia entre boya y muestra de agua
Este indicador evalúa la coherencia entre las dos fuentes de datos sobre microplásticos en agua: la boya de filtración pasiva, analizada por estereomicroscopía y µFTIR, y las muestras de agua puntuales, analizadas por Py-GC/MS. Al tratarse de metodologías con principios de medición distintos —una basada en conteo morfológico de partículas y la otra en cuantificación másica por polímero— la comparación no puede ser directa en términos de unidades, pero sí es posible abordarla en dos niveles complementarios:
Concordancia cualitativa: comparación de los polímeros detectados por ambas metodologías en una misma zona, evaluando si el repertorio polimérico identificado por µFTIR en la boya coincide con el perfil obtenido por Py-GC/MS en las muestras de agua. Se expresa como porcentaje de polímeros coincidentes sobre el total detectado.

2. Indicadores de transferencia a la biota
		
Factor de bioconcentración.
Indicador ampliamente utilizado en toxicología que cuantifica el grado de acumulación de microplásticos en el organismo respecto al medio en el que vive. Se calcula como el cociente entre la concentración de microplásticos en tejido de pez (µg/g) y la concentración en el agua circundante (µg/L), previa homogeneización de unidades.
BCF = concentración en tejido (µg/g) / concentración en agua (µg/L)
Interpretación:
BCF < 100 → baja acumulación
BCF entre 100 y 1000 → acumulación moderada
BCF > 1000 → alta bioacumulación

Índice de Similitud Polimérica (agua vs. peces)

Evalúa si el perfil polimérico de los microplásticos detectados en tejido de pez refleja la composición del agua circundante, lo que permitiría confirmar la transferencia trófica directa sin selección por tipo de polímero. Se calcula mediante la correlación de Pearson entre el porcentaje de cada polímero en agua y su porcentaje en tejido, ambos obtenidos por Py-GC/MS.

Interpretación:

r ≥ 0.8 → transferencia directa: el pez acumula microplásticos con la misma firma polimérica del agua
r entre 0.5 y 0.8 → transferencia parcial: algunos polímeros se acumulan preferentemente
r < 0.5 → posible selección por tipo de polímero o degradación diferencial


3. Indicadores de riesgo ecológico
Índice de exposición de organismos (IEO). Combina concentración de microplásticos, biomasa y probabilidad de ingestión para identificar zonas de mayor riesgo biológico
IEO = microplásticos × biomasa × probabilidad ingestión
IEO alto → mucho plástico, alta bioacumulación y poca biomasa → zona de alto riesgo
IEO bajo → poco plástico o mucha biomasa → menor presión por individuo


Índice de presión plástica en el ecosistema. Combina residuos en costa y microplásticos en agua Ejemplo:
Plastic Pressure Index = MP agua + residuos costa
Normalizado por área. Sirve para identificar hotspots de contaminación.
 PPI_lineal = (MP/L × 1000) + (kg_residuos/km)

< 100: Presión baja
100-500: Presión moderada
> 500: Hotspot potencial
Índice de Presión Costera (IPC)
Relaciona los kilogramos de residuos recogidos por kilómetro de costa con las condiciones ambientales de los 7 días previos a la recogida. El índice modela el transporte diario de residuos hacia la costa en función de tres variables: el viento hacia costa (componente perpendicular, donde valores negativos —viento mar adentro— no contribuyen al transporte), la corriente paralela a la costa (corrientes fuertes dispersan el material, reduciendo la acumulación) y el oleaje (valores altos favorecen la resuspensión y el transporte de residuos).
IPC = (kg/km) × factor_acumulación_7d
El factor de acumulación se obtiene como la media móvil de 7 días del transporte diario, calculado por punto de muestreo. Esto permite capturar el efecto acumulado de las condiciones meteorológicas y oceanográficas previas a cada recogida, reflejando que la cantidad de residuo encontrado en playa no depende solo del día de la recogida sino de la dinámica de los días anteriores.
Condiciones que incrementan el IPC:
Viento persistente hacia costa (onshore)
Corrientes paralelas débiles
Oleaje intenso
Condiciones que reducen el IPC:
Viento mar adentro (offshore)
Corrientes paralelas fuertes
Oleaje débil


	4. Indicadores de origen del plástico 
	
Índice de origen costero. CSI = MP agua costera / residuos en costa) permite discriminar si los microplásticos detectados en agua tienen origen predominantemente costero o proceden de fuentes marinas o atmosféricas distantes.
Interpretación: 
CSI = MP agua costera / residuos en costa
Si el CSI es alto → hay mucho microplástico en el agua pero pocos residuos en costa → el origen es probablemente marino o atmosférico (llega del mar, no de la costa).
Si el CSI es bajo → hay pocos microplásticos en agua pero muchos residuos en costa → la costa actúa como fuente de contaminación terrestre que aún no se ha fragmentado y dispersado al agua.
Si el CSI es intermedio → ambas fuentes contribuyen.
6. Indicadores espaciales
Hotspot de microplásticos.
A partir de los puntos fijos de muestreo se generan mapas de calor independientes para cada variable, permitiendo identificar zonas de alta concentración sin enmascarar la información al combinarlas en un único índice compuesto:
Mapa de concentración de microplásticos en agua: representa la distribución espacial de la concentración de microplásticos (µg/L) por punto de muestreo, identificando las zonas con mayor carga plástica en la columna de agua.
Mapa de concentración de microplásticos en peces: representa la distribución espacial de la concentración polimérica en tejido (µg/g) por punto de captura, permitiendo identificar las zonas donde la bioacumulación es más elevada.
La visualización simultánea de ambos mapas permite detectar zonas donde la alta concentración de microplásticos en agua coincide con alta concentración en peces, señalando los puntos de mayor riesgo de transferencia trófica en el sistema.

Ideas de visualización
Creo que esto podemos hacerlo cuando elijamos de la sección anterior que indicadores nos interesan.

Eejemplo
Conclusiones
Directrices para la API

