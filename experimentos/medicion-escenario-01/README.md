# Medición Escenario 01: Baseline GET /death

**Escenario:** ESC-01 (Rendimiento — Latencia Sostenida)  
**Referencia:** [dossier/04-escenarios-calidad.md](../../dossier/04-escenarios-calidad.md)  
**Herramienta:** k6 v2.2.0  
**Status:** ✅ EJECUTADO (2026-08-24, commit d3e06e6)  
**Resultado:** ✗ NO CUMPLE (p95 = 1114.69 ms, umbral = 500 ms)

---

## Descripción Rápida

Mide latencia del endpoint `GET /death` bajo carga sostenida (50 usuarios virtuales, 60 segundos). Threshold prerregistrado: p95 < 500 ms.

**Resultado:** Mediana p95 = 1114.69 ms (2.23× sobre umbral).  
**Causa:** Endpoint trae 3302 registros sin paginación → respuesta de 557 KB.

---

## Cómo Reproducir Desde Cero (Windows)

### Opción 1: Reproducción Automática (Recomendado)

**Requisitos previos:**
- Go 1.24.3
- Node.js 24.18.0
- k6 v2.2.0
- curl.exe (incluido en Windows 10+)
- PowerShell (incluido en Windows 11)

**Pasos:**

```cmd
cd back
go run main.go
```

(Dejar corriendo en otra terminal)

```cmd
cd experimentos/medicion-escenario-01

REM Paso 1: Sembrar datos (3000 registros + 2 preexistentes + 300 anteriores = 3302)
scripts\sembrar-datos.cmd

REM Paso 2: Ejecutar medición (3 corridas k6)
scripts\run-baseline.cmd
```

**Salida esperada:**
- `resultados/run-1.json` — Warmup (descartada)
- `resultados/run-2.json` — Primera medición válida
- `resultados/run-3.json` — Segunda medición válida
- `resultados/resultado.json` — Consolidado de resultados
- `resultados/contexto.json` — Contexto de máquina
- `resultados/verificacion-semilla.json` — Verificación de datos

### Opción 2: Reproducción Manual

**Paso 1: Sembrar datos**

```cmd
cd experimentos/medicion-escenario-01

REM Generar imagen de prueba (seed.png)
powershell -Command "$png = [Convert]::FromBase64String('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='); [IO.File]::WriteAllBytes('seed.png', $png)"

REM Enviar 3000 registros (tarda ~5 minutos)
for /L %i in (1,1,3000) do @curl -s -X POST http://localhost:8000/death -F "fullName=Persona %i" -F "causeOfDeath=causa %i" -F "details=registro de carga %i" -F "photo=@seed.png" > nul

REM Verificar siembra
curl -s http://localhost:8000/death | powershell -Command "$input | ConvertFrom-Json | Measure-Object | Select-Object -ExpandProperty Count"
REM Esperado: 3302 (2 preexistentes + 300 anteriores + 3000 nuevos)
```

**Paso 2: Ejecutar medición**

```cmd
REM Corrida 1 (warmup, descartada)
k6 run scripts/baseline.js --out json=resultados/run-1.json

timeout /t 10

REM Corrida 2 (válida)
k6 run scripts/baseline.js --out json=resultados/run-2.json

timeout /t 10

REM Corrida 3 (válida)
k6 run scripts/baseline.js --out json=resultados/run-3.json
```

**Paso 3: Extraer métricas**

```cmd
REM Extraer p95 de cada corrida (requiere jq o PowerShell)
for %f in (run-*.json) do @powershell -Command "$json = Get-Content '%f' -Raw | ConvertFrom-Json; Write-Host '%f: p95 = ' ($json.metrics.http_req_duration.values.'p(95)') ' ms'"
```

---

## Estructura de Archivos

```
experimentos/medicion-escenario-01/
├── README.md (este archivo)
├── condiciones.md
│   └── Contexto completo de medición: máquina, BD, k6, parámetros
├── scripts/
│   ├── baseline.js
│   │   └── Script k6 con 50 VUs, 60s, p95<500ms threshold
│   ├── sembrar-datos.cmd
│   │   └── Script Windows para reproducir siembra (3000 POST)
│   └── run-baseline.cmd
│       └── Script Windows para ejecutar 3 corridas k6
└── resultados/
    ├── run-1.json (warmup, descartada)
    ├── run-2.json (válida, p95=1615.73ms)
    ├── run-3.json (válida, p95=613.66ms)
    ├── resultado.json (consolidado con veredicto)
    ├── contexto.json (máquina, k6 version)
    └── verificacion-semilla.json (3302 registros, 557 KB)
```

---

## Parámetros Fijos (Prerregistrados)

| Parámetro | Valor | Justificación |
|-----------|-------|---|
| **VUs** | 50 | Carga moderada, realista de desarrollo |
| **Duración** | 60 seg | Carga sostenida, suficiente para variabilidad |
| **p95 latencia** | < 500 ms | Contexto: navegación web, umbral generoso |
| **Error rate** | < 1% | Aceptación: 0 errores observados en todas corridas |
| **Sleep** | 1 seg | Simula usuario navegando entre peticiones |
| **BD** | SQLite (3302 reg) | Ambiente de desarrollo, base reproducible |

**Referencia:** [dossier/04-escenarios-calidad.md sección 1.2](../../dossier/04-escenarios-calidad.md#12-justificación-del-umbral-500-ms)

---

## Resultados Observados

### Ejecución: 2026-08-24, Commit d3e06e6

| Métrica | Run-1 (Warmup) | Run-2 (Válida) | Run-3 (Válida) | **Mediana** |
|---------|---|---|---|---|
| **p95 latencia (ms)** | 1578.71 | 1615.73 | 613.66 | **1114.69** |
| **Error rate (%)** | 0 | 0 | 0 | **0** |
| **Dentro umbral (500 ms)** | ✗ | ✗ | ✗ | ✗ |

**Veredicto:** ✗ **NO CUMPLE** (p95 2.23× sobre umbral)

### Causa Raíz Identificada

**Problema:** Endpoint `GET /death` en [back/server/kill_handlers.go:35](../../back/server/kill_handlers.go#L35) **trae TODOS los registros sin paginación**.

```go
// Implementación actual (sin paginación)
func (s *KillsService) GetAllKills() ([]models.Kill, error) {
    var kills []models.Kill
    result := s.DB.Find(&kills)  // ← Trae todos los 3302 registros
    return kills, result.Error
}

// Resultado:
// - Respuesta: 557 KB por petición
// - Transferencia en run-3: 2205 req × 557 KB ≈ 1.3 GB
// - Latencia crece linealmente con volumen de datos
```

**Solución propuesta:** Implementar paginación (ej: `SELECT * FROM kills LIMIT 50 OFFSET ?`). Proyección: p95 bajaría a <200 ms.

### Variabilidad Observada (Factor 2.6×)

| Métrica | Run-2 | Run-3 | Ratio |
|---------|-------|-------|-------|
| **p95 latencia** | 1615.73 ms | 613.66 ms | 2.6× |
| **Requests/sec** | 22.5 | 36.75 | 1.6× |

**Causa potencial:** Procesador i7-1255U (serie U, bajo consumo) reduce frecuencia bajo carga sostenida por gestión térmica.

**Limitación:** NO verificada. Faltó medir CPU frequency y temperatura durante las corridas. [EVIDENCIA FALTANTE]

---

## Validaciones Incluidas

El script `baseline.js` incluye 4 checks:

1. **Status HTTP = 200** — Verifica endpoint responda
2. **Body no vacío** — Verifica al menos 1 registro
3. **JSON válido** — Verifica estructura de respuesta
4. **Array con elementos** — Verifica array.length ≥ 1

**Resultado:** 100% checks pasados en todas corridas (0% error rate).

---

## Cómo Interpretar Resultados

### Veredicto: NO CUMPLE

**¿Qué significa?**
- Mediana observada (1114.69 ms) > Umbral prerregistrado (500 ms)
- Sistema es **2.23 veces más lento** que lo esperado

**¿Es problema de calibración?**
- NO. Umbral fue fijado **ANTES** de medir
- Fue elegido como "generoso" (típica navegación web es 100-300 ms)
- Si falla en condiciones más favorables posibles (SQLite local), fallaría en cualquiera

**¿Qué debe hacer?**
- Implementar paginación en GET /death
- Medir nuevamente post-corrección para validar mejora
- Comparar contra esta línea base

---

## Reproducibilidad Garantizada

**Todos estos datos están disponibles para reproducción:**

| Dato | Ubicación | Propósito |
|------|-----------|----------|
| **Código exacto** | commit d3e06e6 | Reproducir implementación exacta |
| **Contexto máquina** | [contexto.json](resultados/contexto.json) | i7-1255U, Windows 11, 31.6 GB RAM |
| **Semilla datos** | [verificacion-semilla.json](resultados/verificacion-semilla.json) | 3302 registros, 557 KB por respuesta |
| **k6 configuración** | [baseline.js](scripts/baseline.js) | 50 VUs, 60s, sleep(1) |
| **Parámetros máquina** | [condiciones.md](condiciones.md) | Todas secciones 1-8 |
| **Resultados brutos** | [run-1/2/3.json](resultados/) | JSON completo de k6 |

**Para reproducir:**

```bash
git checkout d3e06e6
cd back && go run main.go &
cd ../experimentos/medicion-escenario-01
scripts\sembrar-datos.cmd
scripts\run-baseline.cmd
```

---

## Referencias y Enlaces

| Documento | Propósito |
|-----------|----------|
| [dossier/04-escenarios-calidad.md](../../dossier/04-escenarios-calidad.md) | Definición formal de ESC-01 |
| [dossier/06-guion-exposicion.md](../../dossier/06-guion-exposicion.md) | Cómo explicar este resultado |
| [README.md raíz](../../README.md) | Visión general del proyecto |
| [condiciones.md](condiciones.md) | Contexto completo de ejecución |
| [resultado.json](resultados/resultado.json) | Consolidado de resultados |

---

**Última actualización:** 2026-08-24  
**Responsable:** David Rodriguez (frank241103)  
**Estado:** ✅ COMPLETADO Y DOCUMENTADO
