# 18 — Comparación de distribución y costos

**Módulo:** 6 (control A4)
**Fecha:** 2026-10-23
**Commit del sistema analizado:** `6b657dd`

---

## 1. Alcance: dos comparaciones distintas

El documento `docs/10-decision-estilo-arquitectonico.md` ya comparó tres
alternativas de **estilo interno** (capas / hexagonal / extraer `media`). Esa
comparación se mantiene y no se repite aquí.

Lo que falta, y es lo que este documento aporta, son dos cosas:

1. **Costos con unidad declarada y método de medición**, que en el documento
   10 eran categorías cualitativas ("Nulo / Medio / Alto").
2. Una comparación de **distribución y despliegue**, que es una dimensión
   distinta del estilo interno.

---

## 2. Unidad de costo y método

Un costo sin unidad no se puede auditar. Se declara la unidad así:

> **Unidad: puntos de cambio (PC).**
> 1 PC = un archivo Go creado o modificado, **o** una llamada existente que
> hay que reescribir, **o** un servicio nuevo en el despliegue.

**Cómo se midió el estado actual** (comandos reproducibles sobre `back/`):

| Medida | Comando | Valor |
|---|---|---|
| Archivos Go | `find back -name "*.go" \| wc -l` | **11** |
| Líneas Go | `cat back/*/*.go back/*.go \| wc -l` | **584** |
| Líneas en `server/` | `cat back/server/*.go \| wc -l` | **381** (65 % del total) |
| Llamadas handler → repositorio | `grep -rn "KillRepository\." back/server/ \| wc -l` | **5** |
| Puntos de escritura en disco | `grep -rn "os\.MkdirAll\|os\.Create\|io\.Copy" back/server/` | **4** (`kill_handlers.go:110,112,115,121`) |
| Punto de servido de archivos | `back/server/router.go:15` | **1** |
| Lecturas de entorno | `grep -c "os.Getenv" back/server/server.go` | **3** |

### Supuestos declarados

| # | Supuesto | Si no se cumple |
|---|---|---|
| S-1 | **No se añade funcionalidad nueva.** El costo cubre solo reorganizar lo que existe | Los PC crecen de forma no estimada aquí |
| S-2 | **Horizonte: hasta que `go build ./...` pase y el CI quede en verde.** No incluye pruebas unitarias nuevas, que el proyecto hoy no tiene | Añadir pruebas duplicaría aproximadamente los PC |
| S-3 | El equipo son 4 personas con nivel desigual de Go | — |
| S-4 | Las cifras de latencia provienen de ESC-01 (4 corridas) y del spike-01 (1 corrida por operación), **no** de un entorno de producción | Cualquier extrapolación a producción es inválida |
| S-5 | **No se estiman horas.** El equipo no tiene histórico de velocidad, así que una cifra en horas sería inventada. Se cuentan PC, que sí son verificables | — |

> `[EVIDENCIA FALTANTE]` La conversión de PC a horas **no se hace**. Un PC no
> cuesta lo mismo si es crear una interfaz de 5 líneas que reescribir
> `initDB()`. Se declara en lugar de fabricar un número.

---

## 3. Comparación A — Estilo interno (costos ahora cuantificados)

Mismas tres alternativas del documento 10, mismas dimensiones, ahora con PC.

| Dimensión | **A. Capas actual** | **B. Hexagonal** *(elegida, ADR-005)* | **C. `media` como servicio aparte** |
|---|---|---|---|
| Archivos Go nuevos | 0 | 4 (2 puertos + 2 adaptadores) | 6 (4 de B + `main.go` y cliente HTTP) |
| Archivos Go a modificar | 0 | 3 (`kill_handlers.go`, `server.go`, `router.go`) | 4 (los 3 de B + `go.mod` del servicio nuevo) |
| Llamadas a reescribir | 0 | 5 (handler→repositorio) + 4 (escritura en disco) = **9** | 9 + 1 (`FileServer` pasa a ser una llamada de red) = **10** |
| Servicios nuevos en el despliegue | 0 | 0 | 1 |
| **Total PC** | **0** | **16** | **21** |
| Rendimiento | Medido: p95 1114,69 ms en ESC-01 (`run-1..4.json`) | **No medido.** `[EVIDENCIA FALTANTE]` — se asume despreciable (ADR-005 §8) | **No medido.** Añade un salto de red que hoy no existe |
| Seguridad | F-04 y F-06 sin mitigación posible sin tocar handlers | Habilita T-04 (middleware en el puerto) | Habilita T-04 y aísla el almacén |
| Reversibilidad | — | **Alta.** Incremental: cada puerto se introduce por separado y el sistema sigue compilando entre pasos | **Baja.** Volver atrás exige reunificar dos despliegues y eliminar el contrato de red |
| Horizonte de la estimación | — | S-2 | S-2 |

### Clasificación de cada afirmación

| Afirmación | Clase |
|---|---|
| 11 archivos, 584 líneas, 5 llamadas, 4 escrituras | **MEDIDA** (comandos de §2) |
| p95 de 1114,69 ms en ESC-01 | **MEDIDA** (`run-2.json`, `run-3.json`) |
| p95 de 1730,45 ms en `POST /death` | **MEDIDA** (`post-baseline.json`) |
| Totales de PC (16 y 21) | **ESTIMADA** a partir de las medidas, bajo S-1 y S-2 |
| "La indirección no afecta la latencia" | **PENDIENTE** — nunca se midió |
| Reversibilidad alta de B / baja de C | **DOCUMENTADA** en ADR-005 §8 |
| Equivalencia PC → horas | **PENDIENTE** — ver S-5 |

---

## 4. Comparación B — Distribución y despliegue

Esta dimensión no se había comparado. El despliegue actual está en
`docker-compose.yml`: tres servicios (`backend`, `frontend`, `postgres`) en
una red bridge, con `./back/uploads` montado como volumen del backend.

| Dimensión | **D1. Monolito único** *(actual)* | **D2. Monolito replicado** | **D3. `media` como servicio aparte** |
|---|---|---|---|
| Servicios en ejecución | 3 | 3 + N réplicas del backend | 4 |
| Cambios en `docker-compose.yml` | 0 | `deploy.replicas` + un proxy delante | Servicio nuevo + red + volumen movido |
| **PC de despliegue** | **0** | **2** | **4** |
| **PC de código** | **0** | **3** — `uploads/` deja de poder ser un volumen local y hay que mover el almacén | **21** (ver §3-C) |
| **Total PC** | **0** | **5** | **25** |
| Qué resolvería del problema medido | Nada | La cola de F-09 (1730 ms p95 con 10 VUs) se reparte entre réplicas | Aísla la escritura, pero cada petición cruza la red |
| **Bloqueante conocido** | — | 🔴 **SQLite.** `ADR-002` fija SQLite como línea base. Un archivo SQLite no se comparte entre réplicas. D2 **exige migrar a PostgreSQL primero** — el `docker-compose.yml` ya lo contempla pero el código elige el motor por `config.json` y hoy corre en SQLite | 🔴 Hereda el mismo bloqueante para los datos, aunque no para las imágenes |
| Reversibilidad | — | **Alta.** Quitar réplicas es un cambio de una línea | **Baja.** Igual que C en §3 |
| Horizonte | — | S-2 | S-2 |

### Por qué D1 sigue siendo la opción vigente

No es una decisión nueva: es la consecuencia de lo ya decidido. Las
condiciones que abrirían D2 o D3 están escritas en `ADR-007` §6 (C-1 a C-4).
Ninguna se cumple hoy: el sistema tiene un usuario real, no diez concurrentes.

> **Lo que sí cambia** respecto al documento 10: ahora está escrito que D2
> depende de migrar el motor de persistencia, y eso **no** aparecía en ningún
> documento previo. Es la dependencia que haría que una decisión de
> "simplemente añadir réplicas" costara mucho más de lo que aparenta.

---

## 5. Consecuencias y reversibilidad — resumen

| Opción | Consecuencia principal si se adopta | ¿Se puede deshacer? | Qué costaría deshacerlo |
|---|---|---|---|
| B (hexagonal) | Más archivos e interfaces en un sistema de 584 líneas | Sí | Los mismos 16 PC en sentido inverso |
| C / D3 (`media` aparte) | Una frontera de red nueva que asegurar y operar | Difícil | 21–25 PC + reunificar despliegues |
| D2 (réplicas) | Obliga a migrar de SQLite a PostgreSQL | Sí para las réplicas, no para la migración | 2 PC para quitar réplicas; la migración de motor no se revierte |

---

## 6. Trazabilidad

| Afirmación | Fuente verificable |
|---|---|
| Conteos de archivos, líneas y llamadas | Comandos de §2, reproducibles sobre el commit `6b657dd` |
| p95 de ESC-01 | `experimentos/medicion-escenario-01/resultados/run-1..4.json` + `SHA256SUMS.txt` |
| p95 de `POST /death` y `PATCH` | `experimentos/spike-01-integracion/resultados/*.json` |
| Alternativas de estilo | `docs/10-decision-estilo-arquitectonico.md` §4 |
| Decisión de estilo y reversibilidad | `adrs/ADR-005-estilo-hexagonal.md` |
| SQLite como línea base | `adrs/ADR-002-sqlite-baseline.md` |
| Condiciones de revisión | `adrs/ADR-007-cqrs-eventos.md` §6 |
| Despliegue actual | `docker-compose.yml` |
| Fallos citados (F-04, F-06, F-09) | `docs/16-matriz-fallos.md` |
