# 01 - Preregistro del Experimento

## Información general

**Escenario evaluado:** ESC-01 - Rendimiento: Latencia sostenida GET /death

**Atributo de calidad asociado:** AC-5 Latencia (Rendimiento)

**Herramienta utilizada:** k6 v2.2.0

**Fecha de medición:** 2026-08-24

**Commit evaluado:** d3e06e6


## 1. Hipótesis del experimento

La hipótesis evaluada consiste en determinar si el sistema puede responder solicitudes realizadas al endpoint GET /death manteniendo una latencia aceptable bajo condiciones de carga sostenida.

La condición esperada es que el percentil 95 de latencia (p95) sea inferior al umbral definido de 500 milisegundos.

La prueba busca comprobar objetivamente si el comportamiento real del sistema cumple con el atributo de rendimiento establecido.


## 2. Métrica seleccionada

La métrica seleccionada fue el percentil 95 de latencia (p95).

Esta métrica fue elegida porque permite evaluar el comportamiento de la mayoría de solicitudes realizadas al sistema y evita que valores promedio oculten problemas de rendimiento.

El p95 representa el tiempo máximo de respuesta aproximado del 95% de las solicitudes realizadas durante la prueba.


## 3. Umbral definido

El umbral establecido fue:

p95 < 500 ms

Adicionalmente se estableció como condición una tasa de error menor al 1%.

Este valor fue definido previamente como criterio de aceptación del escenario ESC-01.


## 4. Datos utilizados

La prueba utilizó una base de datos con:

- 3302 registros.
- Motor de base de datos SQLite.
- Endpoint evaluado GET /death.

Los datos fueron generados mediante el proceso de siembra definido en el experimento.


## 5. Condiciones de ejecución esperadas

Antes de ejecutar la prueba se esperaba determinar si el sistema cumplía o no con el requisito de rendimiento.

No se asumió previamente un resultado positivo o negativo, ya que la finalidad era obtener evidencia objetiva mediante medición.


## 6. Resultado que refutaría la hipótesis

La hipótesis sería rechazada si el resultado obtenido presentaba un p95 superior a 500 ms.

En ese caso se concluiría que el sistema no cumple con el requisito de rendimiento definido.


## 7. Resultado obtenido

La medición final obtuvo:

- Mediana p95: 1114.69 ms.
- Umbral requerido: 500 ms.

Resultado:

NO CUMPLE.

La causa identificada fue que el endpoint GET /death devuelve todos los registros sin paginación, generando una respuesta de aproximadamente 557 KB.
