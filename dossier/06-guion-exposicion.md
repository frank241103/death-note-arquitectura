# 06 - Guión de Exposición (3 personas × 5 minutos)

**Duración total:** 15 minutos (3 bloques de 5 min)  
**Formato:** Presentación oral de auditoría arquitectónica  
**Audiencia:** Docente + evaluadores  
**Fecha:** 2026-08-24 (referencia)

---

## PERSONA 1: Sistema Base, Adopción y Contexto (5 minutos)

### Introducción (30 segundos)

"Buenos días. Somos el equipo de la sección 702302 de Arquitectura de Software. Presentamos un análisis arquitectónico completo del sistema Death Note, un registro de kills basado en el anime. El sistema fue adoptado según el protocolo opción C: es un proyecto externo que analizamos como objeto de estudio."

### Qué es Death Note (1 minuto)

- Aplicación fullstack: Go backend + React frontend
- Funcionalidad: Crear registros de "kills" con foto de rostro, nombre completo, causa de muerte y detalles
- Usuario: Una persona (editor) que registra kills; segunda persona (víctima, S2) cuyos datos se exponen sin consentimiento
- Almacenamiento: SQLite local o PostgreSQL (configurable)

**Evidencia:** [back/main.go](../back/main.go), [front/src/App.tsx](../front/src/App.tsx)

### Protocolo de Adopción Opción C (1 minuto 30 segundos)

- **Declaración:** El equipo NO es autor del sistema base
- **Origen:** https://github.com/IsergioG/PA-FINAL-PROJECT (autor: sergiocoba-IND)
- **Trazabilidad:** Commits heredados 4ebec3b, b76332e conservados en nuestro historial
- **Remoto upstream:** git remote -v registra ambos: origin (nuestro trabajo) y upstream (autor original)
- **Responsabilidad:** Análisis arquitectónico, medición de línea base, documentación de hallazgos

**Evidencia:** [README.md sección 2](../README.md#2-sistema-base-adoptado), [adrs/ADR-001](./adrs/ADR-001-adopcion-protocolo.md)

### Tecnologías Verificadas (1 minuto 30 segundos)

**Backend:**
- Go 1.24.3, gorilla/mux router, GORM ORM
- SQLite (glebarez/sqlite) — motor actual para medición
- Ejecutable: `cd back && go run main.go`

**Frontend:**
- React 19 + TypeScript, Vite bundler, Node.js 24.18.0
- Ejecutable: `cd front && npm run dev`

**Infraestructura:**
- Docker Compose declarado (no verificado en esta medición)
- Stack completo en Windows 11 sin contenedores

**Evidencia:** [back/go.mod](../back/go.mod), [front/package.json](../front/package.json), [README.md sección 3](../README.md#3-tecnologías-verificadas)

### Restricciones del Equipo (1 minuto)

- Sin permisos de administrador en máquina
- Sin acceso a servidor PostgreSQL dedicado
- Sin Docker disponible
- Plazo de semestre: medición acotada a lo instrumental (k6)
- Máquina compartida: k6, backend, SQLite comparten recursos

**Impacto:** Decisiones documentadas en [adrs/ADR-002 (SQLite)](./adrs/ADR-002-sqlite-baseline.md), [adrs/ADR-003 (k6)](./adrs/ADR-003-k6-medicion.md)

---

## PERSONA 2: Stakeholders, Priorización y Riesgos (5 minutos)

### Stakeholders Identificados (1 minuto)

**6 personas clasificadas por rol:**

| Stakeholder | Descripción | Interés |
|---|---|---|
| **S1** | Editor (autor del sistema) | Registrar kills, mantener datos privados |
| **S2** | Víctima registrada | EXPUESTA — nombre + foto accesible a terceros |
| **S3** | Usuario eventual | Navegar listado de kills |
| **S4** | Equipo: reproducibilidad | Medir baseline, evaluar sistema |
| **S5** | Docente evaluador | Verificar completitud de análisis |
| **S6** | Tercero no registrado | Acceso a /static/ sin autenticación |

**Tensión clave:** Datos de S2 violados por defecto de diseño. Necesidad de seguridad es URGENTE.

**Evidencia:** [dossier/02-stakeholders-drivers.md sección 1](./02-stakeholders-drivers.md#1-mapa-de-stakeholders)

### Por Qué Seguridad es Prioridad 1 (1 minuto 30 segundos)

**Argumento:**

"Un sistema lento pero seguro es utilizable. Un sistema rápido que expone fotos y nombres de terceros no es utilizable éticamente."

**Evidencia de violación:**
1. R-05: CORS habilitado en `["*"]` — terceros pueden pedir datos desde cualquier origen
2. R-06: `/static/` sin autenticación — archivos de uploads accesibles a todos
3. R-01: Contraseña de BD en logs — terceros pueden extraer credenciales

**Impacto:** S2 (víctima) viola derecho a privacidad. No consintió participar.

**Datos medibles:** 8 riesgos identificados, 3 categorizados como Seguridad (AC-1)

**Evidencia:** [dossier/01-contexto-sistema.md](./01-contexto-sistema.md) (R-01, R-05, R-06), [adrs/ADR-004 sección justificación](./adrs/ADR-004-priorizacion-atributos.md#%EF%B8%8F-seguridad--rendimiento)

### Ranking de Atributos (1 minuto)

**Decisión documentada:** Seguridad > Mantenibilidad > Rendimiento > Disponibilidad

1. **AC-1 Seguridad (Prioridad 1):** Control acceso, protección datos privados
2. **AC-3 Mantenibilidad (Prioridad 2):** Reproducibilidad, arranque en máquina limpia (R-02 bloquea)
3. **AC-5 Rendimiento (Prioridad 3):** Latencia bajo carga (medible con k6)
4. **AC-6 Disponibilidad (Prioridad 4):** Tolerancia a fallos (entorno de producción 24/7, no applicable aquí)

**Trade-off declarado:** Rendimiento es MENOS prioritario que Seguridad, pero es lo MEDIBLE en plazo del semestre. Medimos rendimiento (ESC-01) con conciencia de su menor prioridad.

**Evidencia:** [adrs/ADR-004-priorizacion-atributos.md](./adrs/ADR-004-priorizacion-atributos.md) (decisión con justificación completa)

### 8 Riesgos con Evidencia (1 minuto 30 segundos)

**Muestra (3 de 8):**

| Riesgo | Descripción | Evidencia |
|---|---|---|
| **R-01** | Contraseña BD en logs stderr | [back/server/server.go:74](../back/server/server.go#L74) — fmt.Sprintf sin args |
| **R-05** | CORS abierto a cualquier origen | [back/server/server.go:51-56](../back/server/server.go#L51-L56) — ["*"] |
| **R-06** | /static/ sin autenticación | [back/server/router.go:15](../back/server/router.go#L15) — http.FileServer sin middlewares |

**Otros:** R-02 (godotenv.Load() Fatal), R-03 (motor BD no declarado), R-04 (testing vacío), R-07 (sin paginación), R-08 (http.Server sin timeouts)

**Impacto:** Riesgos estructurales, no calibración. Requieren cambios de diseño.

**Evidencia:** [dossier/01-contexto-sistema.md](./01-contexto-sistema.md) (8 riesgos con línea exacta de código)

---

## PERSONA 3: Escenarios, Medición y Resultados (5 minutos)

### 5 Escenarios de Calidad (ESC-01 a ESC-05) (1 minuto)

**Definidos para cada atributo prioritario:**

| ESC | Atributo | Estímulo | Resultado Esperado | Resultado Real | Medible |
|---|---|---|---|---|---|
| **ESC-01** | AC-5 Rendimiento | 50 VUs, 60s GET /death | p95 < 500 ms | p95 = 1114.69 ms | ✅ **SÍ — LÍNEA BASE** |
| **ESC-02** | AC-1 Seguridad | GET /static/ anónimo | 401 Unauthorized | 200 OK + archivo | ❌ Binario (verificado: FALLA) |
| **ESC-03** | AC-3 Mantenibilidad | Nuevo dev clona, `go run main.go` | Arranca | Fatal (godotenv.Load) | ❌ Binario (verificado: FALLA) |
| **ESC-04** | AC-6 Disponibilidad | Config inválida (mongodb) | Error controlado | Panic (s.DB nil) | ❌ Binario (verificado: FALLA) |
| **ESC-05** | Integridad | POST sin fullName | 400 Bad Request | 201 Created | ❌ Binario (verificado: FALLA) |

**Decisión:** ESC-01 es el único medible (magnitud continua). ESC-02-05 verificables por código, resultado conocido.

**Evidencia:** [dossier/04-escenarios-calidad.md](./04-escenarios-calidad.md)

### Por Qué Medimos ESC-01 (No ESC-02-05) (1 minuto)

**Criterio de línea base:**

"Una línea base es una medida que permite comparación en el tiempo."

- **ESC-02-05:** Binarios. Verificamos por inspección de código. Resultado ya conocido (FALLA). No hay comparación futura (o falla o pasa).
- **ESC-01:** Produce magnitud continua (p95 varía entre ejecuciones). Permite tracking: ¿Mejora después de paginación? ¿Empeora bajo más carga?

**Justificación adicional:** Es lo medible CON INSTRUMENTAL disponible (k6) en plazo del semestre. Seguridad es prioritaria pero no instrumentable en 2 semanas.

**Evidencia:** [dossier/04-escenarios-calidad.md sección 1.3](./04-escenarios-calidad.md#13-línea-base-por-qué-esc-01-y-no-esc-02-a-esc-05), [adrs/ADR-003](./adrs/ADR-003-k6-medicion.md)

### Umbral Prerregistrado (1 minuto)

**Umbral:** p95 < 500 ms (fijado ANTES de ejecutar medición)

**Justificación (3 razones):**

1. **Contexto de uso:** GET /death alimenta listado de navegación. Usuarios esperan respuesta rápida al hacer clic. 100-300 ms es típico para navegación; 500 ms es generoso.

2. **Condiciones más favorables posibles:** SQLite local, sin latencia de red, máquina de desarrollo. Si falla acá, es estructural.

3. **Preserva integridad del experimento:** Umbral NO será ajustado después de medir. Si falla, declaramos problema de diseño, no que "el umbral era muy estricto".

**Archivos:** [dossier/04-escenarios-calidad.md sección 1.2](./04-escenarios-calidad.md#12-justificación-del-umbral-500-ms), [adrs/ADR-004](./adrs/ADR-004-priorizacion-atributos.md)

### Ejecución: 3 Corridas, 1 Warmup + 2 Válidas (1 minuto)

**Metodología:**

1. **Setup:** Backend en localhost:8000, SQLite con 3302 registros, k6 v2.2.0 en misma máquina
2. **Corrida 1 (Warmup, descartada):** Calibración del sistema
3. **Corrida 2 y 3 (Válidas):** Medición real
4. **Métrica:** Percentil 95 de latencia en ms

**Máquina:** HP ProBook 440, Intel i7-1255U (12 CPUs lógicas), 31.6 GB RAM, Windows 11

| Corrida | Requests | p95 latencia | p99 latencia | Error rate |
|---------|----------|---|---|---|
| Warmup | 1559 | 1578.71 ms | 2047 ms | 0% |
| Run-2 | 1350 | 1615.73 ms | 2134 ms | 0% |
| Run-3 | 2205 | 613.66 ms | 1289 ms | 0% |
| **Mediana (run-2, run-3)** | — | **1114.69 ms** | — | **0%** |

**Evidencia:** [dossier/04-escenarios-calidad.md sección 9](./04-escenarios-calidad.md#9-tabla-de-resultados-ejecutado-2026-08-24), [experimentos/medicion-escenario-01/resultados/](../experimentos/medicion-escenario-01/resultados/)

### Veredicto: NO CUMPLE (1 minuto)

**Resultado:**
```
Mediana p95 = 1114.69 ms
Umbral = 500 ms
Brecha = +614.69 ms (2.23× sobre umbral)
Veredicto: ✗ NO CUMPLE
```

**Causa raíz identificada:** 

La función `handleGetAllKills()` en [back/server/kill_handlers.go:35](../back/server/kill_handlers.go#L35) trae **todos los 3302 registros en UNA petición**. 

- Respuesta: 557 KB (sin paginación)
- En run-3: transferencia total = 2205 req × 557 KB ≈ 1.3 GB
- Costo lineal con volumen de datos

**Solución:** Implementar paginación (ej: límite 50 registros/página) para reducir tamaño de respuesta. Proyección: p95 bajaría a <200 ms.

**Variabilidad observada (factor 2.6× entre runs):**

- Run-2: p95 = 1615.73 ms (carga CPU alta)
- Run-3: p95 = 613.66 ms (carga CPU baja)
- **[EVIDENCIA FALTANTE]** Procesador i7-1255U (serie U, bajo consumo) reduce frecuencia bajo carga sostenida por gestión térmica. Explica parcialmente variabilidad, pero NO fue verificada con mediciones de CPU frequency.

**Error rate:** 0% en todas corridas. Sistema es lento, NO inestable.

**Evidencia:** [dossier/04-escenarios-calidad.md sección 10](./04-escenarios-calidad.md#10-contraste-contra-umbral), [README.md sección 6.1](../README.md#61-resultado-de-la-medición-de-línea-base-s4)

---

## Preguntas Probables del Docente (+ Ubicación de Respuesta)

### Preguntas sobre Adopción y Contexto

**P1:** "¿Cómo justifican que usan un proyecto externo (opción C) en lugar de crear código propio?"

**Respuesta en:** [README.md sección 2](../README.md#2-sistema-base-adoptado), [adrs/ADR-001-adopcion-protocolo.md](./adrs/ADR-001-adopcion-protocolo.md)

---

**P2:** "¿Qué diferencia hay entre su repositorio y el del autor original?"

**Respuesta en:** [README.md sección 2 — Trazabilidad Git](../README.md#2-sistema-base-adoptado) (remoto upstream registrado), [git remote -v] mostrará ambos orígenes

---

### Preguntas sobre Stakeholders y Priorización

**P3:** "¿Por qué Seguridad es prioridad 1? ¿No es un sistema de juego?"

**Respuesta en:** [adrs/ADR-004 sección justificación](./adrs/ADR-004-priorizacion-atributos.md#%EF%B8%8F-seguridad--rendimiento) — argumento de daño a S2 (víctima), derechos de privacidad

---

**P4:** "¿Quién es S2 y por qué está involucrado sin consentimiento?"

**Respuesta en:** [dossier/02-stakeholders-drivers.md sección 1](./02-stakeholders-drivers.md#1-mapa-de-stakeholders), tabla de S2 con descripción "Persona registrada"

---

### Preguntas sobre Riesgos

**P5:** "¿R-06 (/static/ sin auth) es realmente un riesgo o es por diseño?"

**Respuesta en:** [dossier/01-contexto-sistema.md — R-06](./01-contexto-sistema.md) (evidencia de código: router.go:15), impacto: fotos de rostro + nombres públicos

---

**P6:** "Dicen 8 riesgos. ¿Verificaron todos o solo algunos?"

**Respuesta en:** [dossier/01-contexto-sistema.md sección Riesgos](./01-contexto-sistema.md) lista 8 riesgos con evidencia de código (archivo:línea) para CADA UNO

---

### Preguntas sobre Escenarios y Medición

**P7:** "¿Por qué miden Rendimiento (ESC-01) si Seguridad es prioridad 1?"

**Respuesta en:** [dossier/04-escenarios-calidad.md sección 1.3](./04-escenarios-calidad.md#13-línea-base-por-qué-esc-01-y-no-esc-02-a-esc-05), [adrs/ADR-004](./adrs/ADR-004-priorizacion-atributos.md) — tensión deliberada: rendimiento es prioritario 3 pero es lo medible en plazo

---

**P8:** "¿Cómo eligieron el umbral de 500 ms? ¿Es arbitrario?"

**Respuesta en:** [dossier/04-escenarios-calidad.md sección 1.2](./04-escenarios-calidad.md#12-justificación-del-umbral-500-ms) — 3 razones documentadas ANTES de ejecutar medición

---

### Preguntas sobre Resultados y Causa Raíz

**P9:** "¿Por qué falla ESC-01? ¿Es culpa del umbral que fijaron?"

**Respuesta en:** [dossier/04-escenarios-calidad.md sección 10.2](./04-escenarios-calidad.md#102-declaración-importante) — umbral NO fue ajustado; problema es `handleGetAllKills` sin paginación (causa raíz identificada)

---

**P10:** "¿Reproducible? ¿Puedo ejecutar la medición en mi máquina?"

**Respuesta en:** [dossier/04-escenarios-calidad.md sección 11](./04-escenarios-calidad.md#11-reproducibilidad) — pasos exactos para reproducir, versiones específicas de Go y k6, commit exacto medido (d3e06e6)

---

## Resumen del Guión

| Persona | Tema | Duración | Archivos Clave |
|---------|------|----------|---|
| **1** | Sistema, adopción, contexto | 5 min | README.md, ADR-001, go.mod, package.json |
| **2** | Stakeholders, priorización, riesgos | 5 min | dossier/02, dossier/01, ADR-004 |
| **3** | Escenarios, medición, resultados | 5 min | dossier/04, experimentos/medicion-escenario-01/, README.md 6.1 |
| **Preguntas** | 10 dudas comunes + ubicación | Referencia | Todos los archivos arriba |

---

**Documento finalizado:** 2026-08-24  
**Uso:** Guión de exposición oral (15 minutos total)  
**Notas:** Cada persona debe practicar para mantener tiempos. Interrupción docente durante exposición es normal.
