# Crítica a la Propuesta Arquitectónica Generada por IA

## 1. Tabla de Sugerencias Evaluadas

| # | Qué propuso la IA | Veredicto | Por qué |
|---|---|---|---|
| 1 | Un servicio de autenticación externo en el diagrama C1 | **Falsa** | Lo dedujo por analogía con arquitecturas típicas. El código no tiene ninguna autenticación. Se eliminó del C1. |
| 2 | Una capa de servicios entre handlers y repositorio | **Falsa** | No existe. Los handlers llaman directo al repositorio. Verificable en `back/server/kill_handlers.go`. |
| 3 | "14 issues" en la auditoría inicial del código | **Parcialmente falsa** | Solo 8 eran reproducibles con un comando. Los otros 6 no se pudieron verificar. El dossier documenta solo los 8 (R-01 a R-08). |
| 4 | Datos de la máquina en `condiciones.md`: Intel i7-10700K, 32 GB DDR4, k6 v0.49.0 | **Inventada** | Nunca se midieron. Los valores reales se capturaron con `Get-CimInstance`: HP ProBook 440 G9, i7-1255U, 12 CPU lógicas, 31,6 GB, k6 v2.2.0. |
| 5 | Una mediana de 1111,83 ms en el baseline | **Inventada** | La mediana real es 1114,69 ms, calculada como (1615,73 + 613,66)/2 sobre los datos crudos. |
| 6 | Un documento de migración a C#/Angular de ~2500 líneas marcado "CONFIDENCIAL" | **Irrelevante** | Fuera del alcance de la asignatura. Venía de una pregunta de trabajo no relacionada. Se excluyó del repo. |

## 2. Supuestos Falsos de la IA

Durante el análisis del repositorio, identificamos que el plugin de IA incurrió en varios supuestos erróneos sobre el dominio y la base de código actual:

1. **Estructura Arquitectónica:** Asumió la presencia de una arquitectura en capas limpia con inversión de dependencias explícita, omitiendo que los handlers acopladores se comunican directamente con los repositorios y modelos de persistencia.
2. **Distribución Estadística de Métricas:** Asumió que el rendimiento del sistema podía modelarse a través de promedios simples, ignorando que el comportamiento de latencia bajo carga presenta colas pesadas (ej. en `spike-01` la mediana fue de 46 ms mientras que el percentil 95 alcanzó los 1730 ms).
3. **Firmas de Entorno de Pruebas:** Inventó especificaciones de hardware y versiones de herramientas de pruebas sintéticas sin verificar la información real del sistema operativo huésped.

## 3. Riesgos Omisos por la IA (Hallazgos Manuales)

El modelo de IA omitió vulnerabilidades y defectos críticos de configuración que requirieron verificación manual directa en el código fuente:

* **Exposición de Credenciales:** El archivo `.env` se encontraba versionado explícitamente en el repositorio Git.
* **Falta de Timeouts HTTP:** Instanciación de `http.Server` sin definición de timeouts de lectura/escritura (`ReadTimeout`/`WriteTimeout`), abriendo riesgos de agotamiento de recursos (R-08).
* **Inseguridad en CORS:** Configuración permisiva combinando `AllowedOrigins: ["*"]` con `AllowCredentials: true`.
* **Manejo de Errores en Persistencia:** El bloque `switch` para la selección del motor de base de datos carece de la cláusula `default`. Un valor no identificado provoca una puntero nulo (`s.DB`) al llamar a `AutoMigrate`.
* **Ausencia de Paginación:** La ruta `GET /death` realiza lecturas sin restricción ni paginación, representando un riesgo directo de desbordamiento de memoria (R-01).

## 4. Conclusión

La inteligencia artificial actúa como un catalizador eficiente en el diseño arquitectónico inicial para estructurar vocabulario, redactar plantillas formales y sugerir enfoques conceptuales. Sin embargo, carece de capacidad de verificación determinista sobre la ejecución del código real. Todo hallazgo e hipótesis generada por un modelo generativo requiere validación empírica en el repositorio, la suite de pruebas y el hardware de despliegue.
