# Condiciones de Ejecución - ESC-01 Rendimiento

**Documento:** Parámetros y contexto de la medición de línea base  
**Escenario:** GET /death bajo carga sostenida (50 VUs, 60s)  
**Status:** ✅ EJECUTADO - 2026-08-24

---

## 1. Identificación de la Ejecución

| Campo | Valor |
|-------|-------|
| **Fecha de ejecución** | 2026-08-24 |
| **Hora de inicio** | 14:32:15 UTC (aproximada) |
| **Ejecutado por** | David Rodriguez (anlistitsense@gmail.com) |
| **Commit medido** | d3e06e6 (HEAD de rama main) |

---

## 2. Sistema Bajo Prueba

| Parámetro | Valor |
|-----------|-------|
| **Backend** | Go 1.24.3 |
| **Motor de BD** | SQLite (back/test.db) |
| **Arranque** | `cd back && go run main.go` (sin contenedor) |
| **Dirección** | http://localhost:8000 |
| **Endpoint medido** | GET /death |

---

## 3. Semilla de Datos

| Campo | Valor |
|-------|-------|
| **Número inicial de registros** | 3302 registros |
| **Método de siembra** | Carga desde data/seed.sql (script de inicialización) |
| **Reproducible** | [x] Sí [ ] No |

**Contexto:** La base de datos fue precargada con 3302 registros de tabla `kills`. Este volumen simula un sistema en uso moderado. Cada petición GET /death trae todos estos registros (557 KB), sin paginación.

---

## 4. Máquina

| Componente | Especificación |
|-----------|---|
| **Fabricante y modelo** | HP ProBook 440 14 inch G9 Notebook PC |
| **Procesador** | 12th Gen Intel(R) Core(TM) i7-1255U |
| **CPUs lógicas** | 12 |
| **Memoria física** | 31.6 GB |
| **Sistema Operativo** | Windows 11 |
| **Arquitectura** | AMD64 |
| **Contención de recursos** | ✅ **Confirmada: k6 y backend comparten máquina** |

**Contexto:** k6 corre en la misma máquina que el backend y SQLite. Hay contención de recursos (CPU, memoria, I/O disco). Este es un escenario realista de desarrollo local pero no aislado. El procesador (i7-1255U) es de la serie U diseñado para portátiles; bajo carga sostenida reduce frecuencia por gestión térmica, lo que explica parcialmente la variabilidad entre corridas.

**Método de captura:** Get-CimInstance Win32_Processor y Win32_ComputerSystem (PowerShell), ejecutado 2026-08-24.

---

## 5. Instrumento

| Parámetro | Valor |
|-----------|-------|
| **Herramienta** | k6 (Grafana Load Testing Platform) |
| **Versión** | v2.2.0 (commit/00a9a1b7f5, go1.26.5, windows/amd64) |
| **Script** | experimentos/medicion-escenario-01/scripts/baseline.js |

**Método de captura:** `k6 version`, ejecutado 2026-08-24.

---

## 6. Parámetros de Carga

| Parámetro | Valor |
|-----------|-------|
| **Usuarios virtuales (VUs)** | 50 |
| **Duración** | 60 segundos sostenidos |
| **Sleep entre peticiones por VU** | 1 segundo (sleep(1) en script) |
| **Throughput efectivo** | 22-36 requests/seg (variable según contención CPU) |
| **Umbral p95 latencia** | < 500 ms (prerregistrado en ADR-004) |
| **Umbral tasa de error** | < 1% |

**Nota sobre throughput:** Con 50 VUs, sleep(1) entre peticiones, y respuesta de 557 KB: throughput teórico máximo ≈ 50 req/s. Medido: 22-36 req/s (promedio run-2: 1350 req / 60s = 22.5; run-3: 2205 req / 60s = 36.75). Variación refleja contención de CPU.

---

## 7. Qué Invalidaría Esta Medición

Las siguientes condiciones **invalidan completamente** el resultado:

1. **Cambiar el motor de BD** entre corridas (SQLite → PostgreSQL o viceversa)
   - Impacto: resultados no comparables

2. **Modificar el volumen de datos** entre corridas (ej: 1 registro → 100 registros)
   - Impacto: caché behavior diverge

3. **No declarar que k6 y backend comparten máquina**
   - Impacto: resultado incluye contención; no es performance aislado

4. **No registrar el commit** exacto medido
   - Impacto: imposible reproducir exactamente

5. **Ejecutar sobre PostgreSQL remoto** sin declararlo explícitamente
   - Impacto: latencia de red entra en la medición

---

## 8. Checklist Pre-Medición ✅ Completado

- [x] Backend arranca: `go run main.go` sin errores (verificado 2026-08-24)
- [x] BD existe: `back/test.db` presente con 3302 registros (verificado)
- [x] Número de registros confirmado: 3302 (SELECT COUNT(*) FROM kills)
- [x] k6 instalado: v2.2.0 (k6 version ejecutado)
- [x] Script presente: `scripts/baseline.js` (verificado)
- [x] Máquina con CPU disponible (contención registrada pero aceptable)

---

**Documento:** Esencial - completa antes de ejecutar  
**Referencia:** dossier/04-escenarios-calidad.md (Sección 6: Método de Medición)
