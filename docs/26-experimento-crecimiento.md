# 26 — Experimento de crecimiento EC-01

**Fase:** III · **Semana:** 11
**Fecha de ejecución:** 2026-11-06
**Commit medido:** `772378b`
**Escenario:** `GET /death` bajo carga creciente
**Salida cruda:** [`resultados/ec-01-barrido.json`](../experimentos/experimento-crecimiento/resultados/ec-01-barrido.json)

---

## 1. Por qué hacía falta

La línea base (ESC-01) midió **un** punto de carga: 50 VUs. Un punto no
distingue un sistema que degrada suavemente de uno que se desploma. Este
experimento mide **cuatro** para ver la forma de la curva.

---

## 2. Hipótesis y criterio, fijados antes de medir

> **H1.** La latencia p95 crece de forma **más que lineal** con el número de
> usuarios concurrentes.
>
> **H2.** Existe una rodilla: un punto a partir del cual añadir usuarios
> degrada la latencia de forma desproporcionada.

**Criterio de decisión prerregistrado** (escrito en el encabezado de
`scripts/barrido-carga.js` antes de la primera corrida):

| Razón `p95(50 VUs) / p95(5 VUs)` | Lectura |
|---|---|
| **> 10** | Crecimiento más que lineal → **H1 validada** |
| entre 5 y 10 | Crecimiento aproximadamente lineal |
| < 5 | El sistema absorbe la carga → **H1 refutada** |

El factor de carga entre 5 y 50 VUs es 10×; de ahí los cortes.

---

## 3. Condiciones

| Parámetro | Valor |
|---|---|
| Escalones | 5 → 10 → 25 → 50 VUs, **en serie** (`startTime` escalonado) |
| Duración por escalón | 30 s |
| Separación entre escalones | 10 s |
| Registros en base | 3602 |
| Tamaño de respuesta | 615,0 KB |
| Peticiones totales | 3245 |
| Tasa de error | **0,00 %** |
| Checks superados | 6488 / 6488 |

Los escalones corren en serie a propósito: si se solaparan, cada uno
contaminaría al siguiente.

---

## 4. Resultados

| VUs | p95 (ms) | Promedio (ms) | Razón p95 vs escalón anterior | Factor de carga | p95 por VU (ms) |
|---:|---:|---:|---:|---:|---:|
| **5** | **149,9** | 136,79 | — | — | 29,98 |
| **10** | **439,6** | 402,05 | ×2,93 | ×2,0 | 43,96 |
| **25** | **1150** | 1080 | ×2,62 | ×2,5 | 46,00 |
| **50** | **2320** | 2190 | ×2,02 | ×2,0 | 46,40 |

### Veredicto del criterio prerregistrado

```
p95(50 VUs) / p95(5 VUs) = 2320 / 149,9 = 15,48
```

**15,48 > 10 → H1 VALIDADA.** El crecimiento es más que lineal.

---

## 5. Lo que la curva dice de verdad

El criterio se cumple, pero quedarse en "más que lineal" sería impreciso. Dos
columnas de la tabla señalan algo más concreto.

### 5.1 La no-linealidad está al principio, no al final

| Transición | Carga | Latencia | Lectura |
|---|---|---|---|
| 5 → 10 VUs | ×2,0 | **×2,93** | Claramente más que lineal |
| 10 → 25 VUs | ×2,5 | ×2,62 | Apenas por encima de lineal |
| 25 → 50 VUs | ×2,0 | **×2,02** | Lineal |

Lo contrario de una rodilla clásica. El salto desproporcionado ocurre **entre
5 y 10 usuarios**; a partir de ahí el crecimiento es prácticamente lineal.

### 5.2 La latencia por VU se aplana

| VUs | p95 por VU |
|---:|---:|
| 5 | 29,98 ms |
| 10 | 43,96 ms |
| 25 | 46,00 ms |
| 50 | 46,40 ms |

De 10 VUs en adelante es **constante en ~46 ms**. Ese es el patrón de un
sistema **saturado**: la capacidad de servicio ya está al tope y cada usuario
adicional solo alarga la cola.

### 5.3 Comprobación con la ley de Little

Si el sistema está saturado, el rendimiento debe ser constante. Despejando
`rendimiento = VUs / latencia` sobre los promedios:

| VUs | Rendimiento calculado |
|---:|---:|
| 5 | 36,6 req/s |
| 10 | 24,9 req/s |
| 25 | 23,1 req/s |
| 50 | **22,8 req/s** |

**El rendimiento se estanca en ~23 req/s.** Tomando esa capacidad como fija, la
latencia predicha es `VUs / 23`:

| VUs | Predicho | Observado | Desviación |
|---:|---:|---:|---:|
| 5 | 217 ms | 137 ms | **−37 %** ❌ |
| 10 | 435 ms | 402 ms | −8 % |
| 25 | 1087 ms | 1080 ms | **−0,6 %** ✅ |
| 50 | 2174 ms | 2190 ms | **+0,7 %** ✅ |

Los tres escalones altos encajan **dentro del 1 %**. El de 5 VUs **no encaja**,
y eso es precisamente lo que confirma el diagnóstico: con 5 usuarios el sistema
**todavía no está saturado**, por eso responde más rápido de lo que predice un
modelo de cola.

---

## 6. Conclusión

> **H1 queda validada** según el criterio prerregistrado (15,48 > 10).
>
> **H2 queda matizada.** Sí existe un punto de inflexión, pero no es una
> rodilla de degradación acelerada: es un **punto de saturación entre 5 y 10
> usuarios concurrentes**. Pasado ese punto la latencia crece de forma
> **lineal** con el número de usuarios, porque el rendimiento está limitado a
> ~23 peticiones por segundo.

### Qué significa en la práctica

El sistema no se desploma: **se encola**. Con 50 usuarios no hay errores —la
tasa fue 0,00 %— solo espera. Añadir el usuario número 51 no rompe nada;
simplemente añade otros ~46 ms a la cola de todos.

Y lo más importante para la decisión: **subir la capacidad por encima de
23 req/s es lo único que mueve la curva.** Repartir carga, añadir réplicas o
reducir el trabajo por petición sirven; afinar nada más el servidor, no.

---

## 7. Qué NO prueba este experimento

`[EVIDENCIA FALTANTE]` Se declara para no atribuirle más alcance del que tiene:

- **No identifica la causa del tope de 23 req/s.** Los candidatos son la
  consulta sin paginación (GORM marca `SLOW SQL` en
  `kill_repository.go:22`) y la serialización de 615 KB de JSON por petición.
  Distinguirlos exige instrumentar el handler, que queda fuera del alcance.
- **No mide más allá de 50 VUs.** La linealidad observada entre 10 y 50 no se
  puede extrapolar: podría aparecer un segundo punto de quiebre por memoria o
  por conexiones.
- **Un solo barrido.** Los escalones no se repitieron, de modo que no hay
  intervalo de confianza. La variabilidad conocida de este escenario es alta
  (ver §8).
- **k6 y el sistema comparten máquina**, como en todas las mediciones del
  proyecto.

---

## 8. Relación con las demás mediciones

| Medición | VUs | p95 | Observación |
|---|---:|---:|---|
| ESC-01 agosto, run-2 | 50 | 1615,7 ms | 3302 registros |
| ESC-01 agosto, run-3 | 50 | 613,7 ms | mismo commit, misma máquina |
| **Re-medición run-5** | 50 | **1990 ms** | 3602 registros |
| **EC-01 escalón 50** | 50 | **2320 ms** | mismo día que run-5 |

Las dos mediciones de hoy a 50 VUs (1990 y 2320 ms) difieren un **17 %** entre
sí, y las dos de agosto difirieron un **163 %**. Esa dispersión es parte del
fenómeno: el sistema saturado tiene colas cuya longitud depende de detalles de
planificación del sistema operativo.

**Consecuencia metodológica:** cualquier comparación entre dos corridas
individuales de este escenario es poco fiable. Lo que sí es robusto es la
**forma de la curva**, porque los cuatro escalones se midieron en la misma
corrida, en la misma máquina y en el mismo minuto.

---

## 9. Qué invalidaría este experimento

- Ejecutar los escalones en paralelo en lugar de en serie.
- Cambiar el volumen de la base entre escalones.
- Medir sobre un motor de persistencia distinto.
- No registrar el commit.

---

## 10. Trazabilidad

| Referencia | Dónde |
|---|---|
| Script con el criterio prerregistrado | `experimentos/experimento-crecimiento/scripts/barrido-carga.js` |
| Salida cruda | `experimentos/experimento-crecimiento/resultados/ec-01-barrido.json` |
| Commit medido | `772378b` |
| Línea base de comparación | `experimentos/medicion-escenario-01/resultados/` |
| Fallo relacionado | F-07 (`docs/16-matriz-fallos.md`) |
| Táctica que atacaría el tope | T-07, paginación (`docs/17-matriz-resiliencia.md`) |
| Condición que reabre la replicación | `adrs/ADR-007-cqrs-eventos.md` §6, C-1 |
| Dependencia replicación → motor | `docs/18-comparacion-distribucion-costos.md` §4 |
