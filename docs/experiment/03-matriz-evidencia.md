# 03 - Matriz de Evidencia Experimental


## Objetivo

Relacionar las afirmaciones realizadas en el dossier con la evidencia disponible dentro del repositorio.


| ID | Afirmación evaluada | Evidencia | Estado |
|---|---|---|---|
| A-01 | El sistema no cumple el umbral de rendimiento | resultado.json con mediana p95 1114.69 ms | VERDE |
| A-02 | El umbral definido es p95 menor a 500 ms | condiciones.md sección parámetros de carga | VERDE |
| A-03 | La medición corresponde al escenario ESC-01 | 04-escenarios-calidad.md | VERDE |
| A-04 | El endpoint evaluado es GET /death | README y condiciones del experimento | VERDE |
| A-05 | La prueba utiliza k6 como instrumento | condiciones.md sección instrumento | VERDE |
| A-06 | La prueba fue ejecutada con 50 usuarios virtuales | condiciones.md parámetros de carga | VERDE |
| A-07 | La duración de la prueba fue 60 segundos | condiciones.md parámetros de carga | VERDE |
| A-08 | La base de datos utilizada fue SQLite | condiciones.md sistema bajo prueba | VERDE |
| A-09 | La prueba utilizó 3302 registros | resultado.json contexto medición | VERDE |
| A-10 | La primera corrida fue descartada | resultado.json corrida 1 | VERDE |
| A-11 | La corrida 2 fue válida | resultado.json corrida 2 | VERDE |
| A-12 | La corrida 3 fue válida | resultado.json corrida 3 | VERDE |
| A-13 | El endpoint presenta problemas por falta de paginación | resultado.json justificación final | VERDE |
| A-14 | Existe exposición de archivos estáticos sin autenticación | 04-escenarios-calidad.md ESC-02 | VERDE |
| A-15 | El sistema falla cuando falta .env | 04-escenarios-calidad.md ESC-03 | VERDE |
| A-16 | Una configuración inválida provoca fallo del sistema | 04-escenarios-calidad.md ESC-04 | VERDE |
| A-17 | Existe información faltante sobre frecuencia CPU durante medición | resultado.json evidencia faltante | AMARILLO |


## Clasificación

VERDE:

Existe evidencia verificable mediante archivo, comando o captura.


AMARILLO:

Existe la afirmación pero falta información adicional para comprobarla completamente.


ROJO:

No existe evidencia suficiente.
