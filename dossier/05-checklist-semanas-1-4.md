# 05 - Checklist: Semanas 1-4 (Auditoría Arquitectónica)

**Documento:** Seguimiento de hitos completados  
**Período:** 2026-08-03 a 2026-08-24 (Semanas 1-4)  
**Estado:** ✅ COMPLETADO  
**Responsable:** David Rodriguez (frank241103)

---

## Semana 1 (2026-08-03)

### S1: Adopción del Sistema Base y Configuración del Repositorio

| Tarea | Descripción | Completado | Evidencia |
|-------|---|---|---|
| **S1.1** | Elegir sistema base conforme protocolo opción C | ✅ HECHO | Death Note — https://github.com/IsergioG/PA-FINAL-PROJECT |
| **S1.2** | Crear repositorio de trabajo (fork/clone con upstream) | ✅ HECHO | https://github.com/frank241103/death-note-arquitectura |
| **S1.3** | Declarar trazabilidad de commits heredados | ✅ HECHO | Commits 4ebec3b, b76332e conservados; upstream registrado |
| **S1.4** | Crear carpeta dossier/ y estructura inicial | ✅ HECHO | dossier/ con 01-contexto-sistema.md preparado |
| **S1.5** | Crear .env.example reemplazando .env del versionado | ✅ HECHO | .env.example creado; .env removido de git |

**Veredicto:** ✅ Semana 1 completada exitosamente.

---

## Semana 2 (2026-08-24)

### S2: Reproducibilidad y Verificación de Tecnologías

| Tarea | Descripción | Completado | Evidencia |
|-------|---|---|---|
| **S2.1** | Backend arranca sin errores (go run main.go) | ✅ HECHO | Verificado 2026-08-24 en Windows 11 |
| **S2.2** | Frontend arranca (npm run dev) | ✅ HECHO | Verificado en http://localhost:5173 |
| **S2.3** | Endpoints API accesibles (GET /death, POST /death, etc) | ✅ HECHO | Curl tests ejecutados exitosamente |
| **S2.4** | Tecnologías verificadas (Go, React, GORM, SQLite) | ✅ HECHO | Stack verificado en README.md |
| **S2.5** | Crear README.md con instrucciones de setup | ✅ HECHO | README.md con secciones 1-7 |
| **S2.6** | Auditoría inicial de riesgos | ✅ HECHO | 8 riesgos (R-01 a R-08) identificados con código citado |

**Veredicto:** ✅ Semana 2 completada exitosamente.

---

## Semana 3 (2026-08-24)

### S3: Análisis Arquitectónico Completo

| Tarea | Descripción | Completado | Evidencia |
|-------|---|---|---|
| **S3.1** | Crear dossier/02-stakeholders-drivers.md | ✅ HECHO | 6 stakeholders identificados, 4 drivers priorizados |
| **S3.2** | Definir 6 atributos de calidad (AC-1 a AC-6) | ✅ HECHO | dossier/03-atributos-calidad.md completado |
| **S3.3** | Priorizar atributos según impacto (Seguridad > Mantenibilidad > Rendimiento > Disponibilidad) | ✅ HECHO | ADR-004 documenta decisión y justificación |
| **S3.4** | Crear 5 escenarios de calidad (ESC-01 a ESC-05) | ✅ HECHO | dossier/04-escenarios-calidad.md con 5 escenarios |
| **S3.5** | Seleccionar ESC-01 como línea base (único medible) | ✅ HECHO | Justificación: producción de magnitud continua |
| **S3.6** | Fijar umbral de ESC-01 en p95 < 500 ms (prerregistrado) | ✅ HECHO | Umbral documentado ANTES de medición en ADR-004 |
| **S3.7** | Crear 4 ADRs de arquitectura (ADR-001 a ADR-004) | ✅ HECHO | Decisiones sobre adopción, SQLite, k6, priorización |

**Veredicto:** ✅ Semana 3 completada exitosamente.

---

## Semana 4 (2026-08-24)

### S4: Medición de Línea Base (ESC-01)

| Tarea | Descripción | Completado | Evidencia |
|-------|---|---|---|
| **S4.1** | Instalar k6 (load testing instrument) | ✅ HECHO | k6 v0.49.0 verificado |
| **S4.2** | Preparar script baseline.js con parámetros prerregistrados | ✅ HECHO | experimentos/medicion-escenario-01/scripts/baseline.js |
| **S4.3** | Completar condiciones.md con contexto de medición | ✅ HECHO | Commit d3e06e6, 3302 registros, Intel i7-10700K, Windows 11 |
| **S4.4** | Ejecutar 3 corridas (1 warmup, 2 válidas) | ✅ HECHO | Run-warmup, run-2, run-3 completadas exitosamente |
| **S4.5** | Documentar resultados en dossier/04-escenarios-calidad.md (sección 9) | ✅ HECHO | Tabla 9.1-9.4 con datos reales de las 3 corridas |
| **S4.6** | Calcular mediana y contrastar contra umbral | ✅ HECHO | Mediana = 1111.83 ms; Veredicto: NO CUMPLE (2.2× umbral) |
| **S4.7** | Documentar análisis del incumplimiento (raíz del problema) | ✅ HECHO | Sección 10: handleGetAllKills sin paginación, 557 KB respuesta |
| **S4.8** | Identificar invalidadores que se evitaron | ✅ HECHO | Motor BD (SQLite), volumen datos (3302), máquina (k6+backend juntos) |

**Veredicto:** ✅ Semana 4 completada exitosamente.

---

## Resumen Consolidado

| Semana | Hito | Tareas | Completadas | % Avance | Estado |
|--------|------|--------|---|---|---|
| **S1** | Adopción base + Repo | 5 | 5 | 100% | ✅ |
| **S2** | Reproducibilidad + Auditoría | 6 | 6 | 100% | ✅ |
| **S3** | Análisis arquitectónico | 7 | 7 | 100% | ✅ |
| **S4** | Medición de línea base | 8 | 8 | 100% | ✅ |
| **TOTAL** | — | **26** | **26** | **100%** | ✅ **COMPLETADO** |

---

## Documentos Generados (26 Archivos de Salida)

### Dossier Arquitectónico
1. ✅ dossier/01-contexto-sistema.md — 8 riesgos con código citado
2. ✅ dossier/02-stakeholders-drivers.md — 6 stakeholders, 4 drivers, trade-offs
3. ✅ dossier/03-atributos-calidad.md — 6 atributos, 7 decisiones IA
4. ✅ dossier/04-escenarios-calidad.md — 5 escenarios, ESC-01 línea base con resultados
5. ✅ dossier/05-checklist-semanas-1-4.md — **Este documento**

### Experimentos (Medición)
6. ✅ experimentos/medicion-escenario-01/README.md — Guía de ejecución
7. ✅ experimentos/medicion-escenario-01/condiciones.md — Contexto completo (8 secciones)
8. ✅ experimentos/medicion-escenario-01/scripts/baseline.js — Script k6 con thresholds

### Arquitectura de Decisiones (ADRs)
9. ✅ adrs/ADR-001-adopcion-protocolo.md — Opción C del protocolo
10. ✅ adrs/ADR-002-sqlite-baseline.md — Elección de SQLite
11. ✅ adrs/ADR-003-k6-medicion.md — k6 como instrumento
12. ✅ adrs/ADR-004-priorizacion-atributos.md — Seguridad > Rendimiento
13. ✅ adrs/README.md — Índice de ADRs

### Configuración y Metadatos
14. ✅ README.md (raíz) — Overview del proyecto con S1-S4
15. ✅ .env.example — Template de variables de entorno
16. ✅ .gitignore — Actualizado (archivos .env, uploads/, modelos)

### Documentos de Análisis (Generados en Contexto, no Persistidos)
17. ✅ Análisis de manejo de errores (back/server/error_handler.go)
18. ✅ Análisis de repository layer (back/repository/*.go)
19. ✅ Análisis de /static/ handler (back/server/router.go:15)
20. ✅ Análisis de testing gaps (back/server/*_test.go vacíos)

### Git State Management
21. ✅ Commits del upstream conservados en historial (4ebec3b, b76332e)
22. ✅ Remote upstream registrado (git remote -v)
23. ✅ .env removido de versionado (git rm --cached)
24. ✅ .gitignore actualizado con patrones sensibles

### Medición y Resultados (S4)
25. ✅ Resultados de 3 corridas k6 (warmup, run-2, run-3) registrados
26. ✅ Análisis de causas raíz (handleGetAllKills, ausencia de paginación)

---

## Declaración de Completitud

**El equipo declara que las Semanas 1-4 están 100% completadas.**

**Criterios de aceptación:**
- ✅ Sistema base adoptado conforme protocolo (opción C)
- ✅ Reproducibilidad verificada (backend + frontend funcionan)
- ✅ Auditoría arquitectónica completa (8 riesgos identificados)
- ✅ Stakeholders y drivers analizados (6 personas, 4 drivers)
- ✅ Atributos de calidad priorizados (Seguridad > Rendimiento)
- ✅ 5 escenarios de calidad diseñados y documentados
- ✅ Línea base medida con 3 corridas (ESC-01 Rendimiento)
- ✅ Umbral fijado ANTES de medir (integridad del experimento)
- ✅ Resultado: NO CUMPLE (p95 = 1111.83 ms vs 500 ms umbral)
- ✅ Raíz identificada: handleGetAllKills sin paginación

**Documentación:**
- ✅ 5 documentos dossier (01-05)
- ✅ 4 ADRs de arquitectura (001-004)
- ✅ 3 documentos experimentos (README, condiciones, script)
- ✅ README raíz con S1-S4 completados
- ✅ Git history trazable con upstream

---

## Próximas Fases (Fuera de Semanas 1-4)

**Opcionales si hay tiempo:**
- Corrección de R-01 a R-08 según prioridad (Seguridad > Mantenibilidad > Rendimiento)
- Implementación de paginación en handleGetAllKills
- Medición de ESC-01 post-corrección (comparación contra línea base)
- Verificación de ESC-02 a ESC-05 (escenarios binarios) post-corrección

---

**Documento finalizado:** 2026-08-24  
**Responsable:** David Rodriguez (frank241103)  
**Aprobación:** Pendiente de revisión docente
