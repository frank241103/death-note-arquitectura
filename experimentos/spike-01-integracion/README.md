# SPIKE-01 — Acoplamiento síncrono con el almacén de archivos

**Módulo:** 5 · **Estado:** ✅ ejecutado
**Fecha de ejecución:** 2026-10-08
**Commit medido:** `30a262d`
**Caja de tiempo:** 180 minutos · **Consumidos:** ~35 minutos

---

## 1. Hipótesis

> La escritura síncrona de la imagen dentro de `POST /death` domina la latencia
> de creación. Si es así, extraer esa escritura a un contrato asíncrono
> reduciría la latencia percibida de forma significativa.

**Criterio de éxito (prerregistrado antes de medir):** la hipótesis se considera
**validada** si el tiempo atribuible a la escritura de archivo representa **más
del 40 %** de la latencia p95 de `POST /death`.

Si representa menos, la hipótesis queda **refutada** y la decisión correcta es
mantener el contrato síncrono.

> Este criterio se fijó **antes** de ejecutar ninguna medición, siguiendo el
> mismo protocolo de prerregistro usado en el Módulo 2
> (`docs/experiment/01-preregistro.md`).

---

## 2. Alcance

**Qué entra:** medir `POST /death` con el escenario de inserción ya definido
(`seed-load.js`), y aislar el costo de la escritura de archivo por comparación
contra una operación equivalente que no escribe en disco.

**Qué NO entra:** implementar el asincronismo. Este spike decide *si vale la
pena*, no lo construye.

---

## 3. Procedimiento ejecutado

### Condiciones

| Parámetro | Valor |
|---|---|
| Máquina | HP ProBook 440 G9 · i7-1255U · 12 CPU lógicas · 31,6 GB RAM |
| SO | Windows 10.0.26200.9457 |
| Go | go1.24.3 windows/amd64 |
| k6 | v2.2.0 (go1.26.5, windows/amd64) |
| Motor de persistencia | SQLite (`test.db`), según `ADR-002` |
| Puerto del backend | `:8000` |
| Carga | 10 VUs · 300 iteraciones · `shared-iterations` · `sleep(1)` por iteración |
| Registros en base al iniciar | 3302 |
| Registros en base al terminar | 3602 |

k6 y el sistema bajo prueba comparten la misma máquina física, igual que en
todas las mediciones del semestre.

### Medición A — `POST /death` (escribe archivo)

```
k6 run scripts\seed-load.js --summary-export=..\spike-01-integracion\resultados\post-baseline.json
```

Duración de la corrida: 9,5 s · 300 iteraciones completas · 0 interrumpidas.

### Medición B — `PATCH /deathUpdate/{id}` (no escribe archivo)

```
k6 run scripts\patch-probe.js --summary-export=..\spike-01-integracion\resultados\patch-probe.json
```

Duración de la corrida: 32,9 s · 300 iteraciones completas · 0 interrumpidas.

`PATCH` se eligió como control porque recorre el mismo stack HTTP, el mismo
router, el mismo middleware de logging y la misma capa de persistencia, pero
**no toca el sistema de archivos**. La diferencia entre ambas latencias acota
el costo del camino de escritura.

El script de control (`scripts/patch-probe.js`) replica deliberadamente la
configuración de carga de `seed-load.js` — 10 VUs, 300 iteraciones, `sleep(1)`
— para que la comparación sea pareja.

---

## 4. Resultados

### Medición directa

| Métrica | `POST /death` | `PATCH /deathUpdate` | Diferencia | Proporción |
|---|---:|---:|---:|---:|
| **p95 (ms)** | **1730,45** | **505,87** | **1224,57** | **70,8 %** |
| Mediana (ms) | 45,95 | 21,57 | 24,38 | 53,1 % |
| Promedio (ms) | 299,25 | 69,59 | 229,66 | 76,7 % |
| Máximo (ms) | 4498,83 | 813,28 | 3685,55 | 81,9 % |
| Mínimo (ms) | 12,76 | 14,18 | −1,42 | — |
| Peticiones | 302 | 301 | — | — |
| Tasa de error | 0,00 % | 0,00 % | — | — |
| Checks superados | 1200/1200 | 600/600 | — | — |

**Proporción del costo atribuible al camino de escritura (p95): 70,8 %**

### Umbrales prerregistrados

| Umbral | `POST` | `PATCH` |
|---|---|---|
| `http_req_duration p(95) < 1000 ms` | ❌ **cruzado** (1732 ms) | ✅ (506 ms) |
| `http_req_failed rate < 0.01` | ✅ (0 %) | ✅ (0 %) |
| `checks rate > 0.99` | ✅ (100 %) | ✅ (100 %) |
| `count > 295` registros | ✅ (300) | ✅ (300) |

> `POST /death` **incumple su propio umbral de latencia** con 10 usuarios
> concurrentes. k6 terminó con código de error:
> `thresholds on metrics 'http_req_duration' have been crossed`.

> **Nota sobre la métrica usada.** El script `seed-load.js` define además una
> métrica personalizada `latencia_escritura_ms`, cuyo p95 es 1732,03 ms. Las
> tablas de este documento usan `http_req_duration` (1730,45 ms), que es la
> métrica estándar de k6 y la que aparece en `resultados/post-baseline.json`.
> La diferencia de 1,6 ms se debe a que la métrica personalizada se registra
> dentro del cuerpo de la iteración y abarca un instante más que la petición
> HTTP. Se declara para que el JSON crudo y este documento sean verificables
> uno contra otro.

### Hallazgo secundario — cola larga

| Operación | Mediana | p95 | Razón p95/mediana |
|---|---:|---:|---:|
| `POST /death` | 45,95 ms | 1730,45 ms | **37,7×** |
| `PATCH /deathUpdate` | 21,57 ms | 505,87 ms | 23,5× |

La mediana de `POST` (46 ms) es perfectamente aceptable. El problema está en la
cola: el 5 % más lento tarda 37 veces más que el caso típico, y el peor caso
llega a 4,5 segundos. Esto es la firma de **contención**, no de un costo fijo:
cuando varios VUs escriben en disco simultáneamente, se encolan.

Un promedio aislado (299 ms) habría ocultado esto por completo. Es la misma
lección del Módulo 2: medir percentiles, no promedios.

---

## 5. Veredicto

- ☑️ **Validada** — la escritura domina; justifica evaluar un contrato asíncrono
- ⬜ Ajustada — la escritura pesa, pero menos de lo previsto
- ⬜ Revertida — la escritura no domina; el contrato síncrono se mantiene

**Justificación:** el criterio prerregistrado exigía más del 40 %. La medición
arroja **70,8 %** sobre p95, y la conclusión se sostiene en las tres medidas
centrales (53,1 % sobre mediana, 76,7 % sobre promedio). El margen sobre el
umbral es suficientemente amplio como para que el resultado no dependa de la
métrica elegida.

### Qué se decide y qué NO se decide

**Se decide:** hay evidencia para abrir la discusión de un contrato asíncrono
para el guardado de imagen. El evento candidato `FaceImageStored` del documento
`11-api-eventos-integracion.md` deja de ser especulativo y pasa a tener un
número que lo respalda.

**No se decide:** que haya que implementarlo. Un sistema con esta carga real
(un usuario, uso académico) no justifica la complejidad operativa de una cola.
La decisión de `ADR-007` debe ponderar el beneficio medido contra ese costo, no
derivarse automáticamente de este resultado.

---

## 6. Limitaciones

- `[EVIDENCIA FALTANTE]` **La comparación es indirecta y el 70,8 % es una cota
  superior, no el costo puro de escritura.** `POST` y `PATCH` difieren en más
  que el acceso a disco: `POST` parsea `multipart/form-data`, hace `INSERT` en
  lugar de `UPDATE`, y transporta ~4 veces más datos (277 kB enviados contra
  68 kB). Parte del 70,8 % corresponde a esos factores. Una atribución exacta
  requeriría instrumentar el handler con trazas internas, lo que excede la caja
  de tiempo de este spike.
- `[HECHO VERIFICADO]` El mínimo de `POST` (12,76 ms) es **menor** que el de
  `PATCH` (14,18 ms). En ausencia de contención, escribir el archivo no cuesta
  prácticamente nada. Esto refuerza que el costo observado es de encolamiento
  bajo concurrencia, no de la operación en sí.
- El volumen de la base creció de 3302 a 3602 registros **durante** la medición
  A, y la medición B corrió sobre 3602. No son volúmenes idénticos. Dado que el
  `INSERT` de SQLite no depende del tamaño de la tabla de forma apreciable en
  este rango, se considera despreciable, pero queda declarado.
- El volumen de imagen es constante (PNG de 1×1, 70 bytes), deliberadamente,
  para aislar el tamaño de archivo como variable. **Con imágenes reales el
  efecto sería mayor, no menor.**
- k6 y el sistema comparten máquina física.

---

## 7. Qué invalidaría este spike

- Cambiar el volumen de la base entre corridas de forma significativa.
- Ejecutar sobre un motor de persistencia distinto (PostgreSQL en lugar de
  SQLite).
- Usar imágenes de tamaño variable entre corridas.
- No registrar el commit medido.

---

## 8. Trazabilidad

- **Commit medido:** `30a262d`
- **Rama:** `main`
- **Scripts:** `experimentos/medicion-escenario-01/scripts/seed-load.js` ·
  `experimentos/medicion-escenario-01/scripts/patch-probe.js`
- **Salidas crudas:** `resultados/post-baseline.json` ·
  `resultados/patch-probe.json`
- **ADR que lo referencia:** `adrs/ADR-007-integracion-sincrona.md`
- **Riesgo relacionado:** R-01 (consulta sin paginación) — distinto hallazgo,
  mismo patrón de cola larga bajo concurrencia.
- **Decisión de estilo que lo motiva:** `docs/10-decision-estilo-arquitectonico.md`
  — el puerto de salida `AlmacenDeImagenes` de la arquitectura hexagonal es
  precisamente la costura por donde este cambio sería posible sin tocar el
  dominio.

