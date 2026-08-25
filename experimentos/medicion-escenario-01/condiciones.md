# Condiciones de Ejecución - ESC-01 Rendimiento

**Documento:** Parámetros y contexto de la medición de línea base  
**Escenario:** GET /death bajo carga sostenida (50 VUs, 60s)  
**Status:** PENDIENTE de completar antes de ejecutar

---

## 1. Identificación de la Ejecución

| Campo | Valor |
|-------|-------|
| **Fecha de ejecución** | [PENDIENTE] (YYYY-MM-DD) |
| **Hora de inicio** | [PENDIENTE] (HH:MM:SS UTC) |
| **Ejecutado por** | [PENDIENTE] (nombre/email) |
| **Commit medido** | [PENDIENTE] (git hash completo) |

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
| **Número inicial de registros** | [PENDIENTE] |
| **Método de siembra** | [PENDIENTE] (manual / script) |
| **Reproducible** | [ ] Sí [ ] No |

**Nota importante:** Al momento del análisis inicial (2026-08-24), la base de datos contenía **1 solo registro**. Medir con ese volumen no produce un resultado interpretable (caché perfecto, sin contención). Considerar siembra mínima de 10-50 registros para línea base significativa.

---

## 4. Máquina

| Componente | Especificación |
|-----------|---|
| **CPU** | [PENDIENTE] |
| **RAM** | [PENDIENTE] (GB) |
| **Sistema Operativo** | [PENDIENTE] |
| **Contención de recursos** | ⚠️ k6 y backend comparten máquina |

**Advertencia:** k6 corre en la misma máquina que el backend. Hay contención de recursos (CPU, memoria). Este es un escenario realista de desarrollo pero no aislado.

---

## 5. Instrumento

| Parámetro | Valor |
|-----------|-------|
| **Herramienta** | k6 (Grafana) |
| **Versión** | [PENDIENTE] (`k6 --version`) |
| **Script** | experimentos/medicion-escenario-01/scripts/baseline.js |

---

## 6. Parámetros de Carga

| Parámetro | Valor |
|-----------|-------|
| **Usuarios virtuales (VUs)** | 50 |
| **Duración** | 60 segundos |
| **Umbral p95 latencia** | < 500 ms (prerregistrado) |
| **Umbral tasa de error** | < 1% |

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

## 8. Checklist Pre-Medición

- [ ] Backend arranca: `go run main.go` sin errores
- [ ] BD existe: `back/test.db` presente o se crea en primer inicio
- [ ] Número de registros confirmado: `sqlite3 test.db "SELECT COUNT(*) FROM kills"`
- [ ] k6 instalado: `k6 --version`
- [ ] Script presente: `scripts/baseline.js`
- [ ] No hay otros procesos pesados corriendo

---

**Documento:** Esencial - completa antes de ejecutar  
**Referencia:** dossier/04-escenarios-calidad.md (Sección 6: Método de Medición)
