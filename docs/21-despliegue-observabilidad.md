# 21 — Despliegue, observabilidad y riesgos operativos

**Fase:** IV · **Semana:** 14
**Fecha:** 2026-11-06
**Commit analizado:** `25817da`

---

## 1. Vista de despliegue

### 1.1 Topología declarada en `docker-compose.yml`

```
            HOST (máquina del desarrollador)
  :3000 ─────────┐        :8000 ─────────┐      :5432 ─────────┐
                 │                       │                     │
  ┌──────────────▼────┐  ┌───────────────▼───┐  ┌──────────────▼────┐
  │ frontend          │  │ backend           │  │ postgres          │
  │ frontend-vue-app  │─►│ backend-go-app    │─►│ backend-go-db     │
  │ Vite :5173        │  │ Go :8000          │  │ postgres:bookworm │
  │ build ./front     │  │ build ./back      │  │ healthcheck ✓     │
  └───────────────────┘  └─────────┬─────────┘  └────────┬──────────┘
                                   │                     │
                         volumen bind             volumen nombrado
                      ./back/uploads              pg-data
                         :/app/uploads       :/var/lib/postgresql
  ───────────────────── red bridge "PA" ──────────────────────────────
```

| Servicio | Imagen / build | Puerto host → contenedor | Persistencia |
|---|---|---|---|
| `frontend` | build `./front` | 3000 → 5173 | — |
| `backend` | build `./back` | 8000 → 8000 | bind `./back/uploads` |
| `postgres` | `postgres:bookworm` | 5432 → 5432 | volumen `pg-data` |

`backend` arranca con `depends_on: postgres (service_healthy)`, de modo que
espera al *healthcheck* `pg_isready`.

### 1.2 Diferencia entre lo declarado y lo ejecutado

`[EVIDENCIA FALTANTE]` **Esta topología nunca se ha levantado.** El README lo
reconoce desde agosto: Docker Compose está declarado pero no verificado, y
PostgreSQL está disponible como alternativa pero no ejecutado.

**Todas las mediciones del proyecto** —las cuatro corridas de ESC-01, el
spike-01, PS-01— se hicieron contra el otro modo de ejecución:

| | **Modo medido** | **Modo declarado en compose** |
|---|---|---|
| Backend | `go run main.go` en el host | contenedor `backend-go-app` |
| Persistencia | SQLite, `back/test.db` | PostgreSQL en contenedor |
| Imágenes | `back/uploads/` local | bind mount |
| Frontend | `npm run dev` | contenedor Vite |

**Consecuencia para la evaluación:** ninguna cifra de este repositorio describe
el comportamiento del despliegue en contenedores. El `ADR-002` fija SQLite como
línea base precisamente por eso, y `docs/18` §4 documenta que pasar a réplicas
exige migrar primero el motor.

### 1.3 Defectos detectados en el compose (lectura de código, sin ejecutar)

| ID | Defecto | Dónde | Efecto esperado |
|---|---|---|---|
| **D-01** | El volumen de PostgreSQL monta `/var/lib/postgresql`, no `/var/lib/postgresql/data` | `docker-compose.yml`, servicio `postgres` | La ruta que PostgreSQL usa para los datos queda **dentro** del punto de montaje pero no es el punto de montaje: la persistencia real queda sin verificar. 🔶 No comprobado |
| **D-02** | Dos archivos `.env` distintos: `./back/.env` para el backend y `./.env` para postgres | `env_file` de cada servicio | Las credenciales deben mantenerse sincronizadas a mano en dos sitios. Se relaciona con R-05 |
| **D-03** | `postgres` publica `5432` al host | `ports` | La base queda accesible desde fuera de la red `PA`. Amplía la superficie del límite de confianza 2 (`docs/20` §3) |
| **D-04** | El frontend recibe `FRONT_BACKEND=http://localhost:8000` | `environment` | `localhost` dentro del contenedor es el propio contenedor, no el backend. En la red `PA` debería ser `http://backend:8000` |
| **D-05** | El contenedor se llama `frontend-vue-app` | `container_name` | El frontend es React + Vite, no Vue. Cosmético, pero desorienta a quien lo opere |

> Los cinco salen de leer el archivo. **Ninguno está verificado ejecutando**,
> por la razón de §1.2. Se reportan como hallazgos de revisión, no como fallos
> observados.

---

## 2. Plan de observabilidad

### 2.1 Qué hay hoy

Un único mecanismo: el logger de `back/logger/`, con tres funciones en uso.

| Función | Dónde se llama | Qué emite |
|---|---|---|
| `RequestLogger` | middleware global (`router.go`) | método, ruta y hora, **antes** de atender |
| `Info` | `kill_handlers.go:53,81,159,231` | código de estado, ruta y duración |
| `Error` | `server/error.go:32` | código, ruta y error |
| `Fatal` | `server.go` | el error y termina el proceso |

### 2.2 Limitaciones de lo que hay

| # | Limitación | Evidencia |
|---|---|---|
| **L-01** | Los registros llevan **códigos de color ANSI** incrustados (`\033[44m`, `\033[33m`…) | `logger/logger.go`. Un recolector de logs los ingiere como basura; no son parseables sin limpiarlos |
| **L-02** | El formato es texto libre, no estructurado | No hay JSON, no hay campos: no se puede filtrar ni agregar |
| **L-03** | No existe identificador de petición | Dos peticiones concurrentes producen líneas intercaladas imposibles de correlacionar. Y la concurrencia **es** el problema medido (razón p95/mediana de 37,7× en el spike) |
| **L-04** | `RequestLogger` registra **antes** de atender: no conoce el estado ni la duración | `logger.go`. El par entrada/salida solo se cierra si el handler llama a `Info`, cosa que hacen 4 de 4 handlers de éxito pero ninguna ruta de error intermedia |
| **L-05** | Todo va a `stdout`, sin destino configurable ni rotación | `log.New(log.Writer(), "", 0)` |
| **L-06** | No hay métricas ni trazas: ningún endpoint expone contadores ni histogramas | Búsqueda en el repositorio: cero coincidencias |

> **L-03 es la más grave para este sistema concreto.** El hallazgo principal de
> todo el semestre —que el problema es encolamiento bajo concurrencia, no costo
> fijo— se dedujo de mediciones externas con k6 porque los logs del sistema no
> permiten verlo desde dentro.

### 2.3 Qué debería observarse

Cada señal se deriva de un fallo o amenaza ya documentado, no de una lista
genérica.

| # | Señal | Tipo | Qué fallo vigila | Umbral propuesto |
|---|---|---|---|---|
| **O-01** | Latencia de `POST /death`, percentil 95 | Métrica | F-09 (escritura bajo concurrencia) | Alerta si p95 > 1000 ms sostenido 5 min |
| **O-02** | Latencia de `GET /death`, p95 | Métrica | F-07 / T-08 (sin paginación) | Alerta si p95 > 500 ms |
| **O-03** | Tamaño de respuesta de `GET /death` | Métrica | T-01 (exposición masiva) | Alerta si supera 100 kB |
| **O-04** | Conexiones abiertas y su antigüedad | Métrica | F-01 / T-07 (sin timeouts) | Alerta si alguna supera 15 s |
| **O-05** | Peticiones a `/static/` por origen | Métrica | T-02, T-03 (acceso a imágenes) | Alerta ante enumeración secuencial |
| **O-06** | Tasa de respuestas 4xx y 5xx | Métrica | F-08 (contrato inconsistente) | Alerta si 5xx > 1 % |
| **O-07** | Identificador de petición propagado | Traza | L-03 | — |
| **O-08** | Arranque: motor de base elegido y variables ausentes | Log estructurado | F-02, F-03 (R-02, R-04) | Alerta ante cualquier `Fatal` |
| **O-09** | Espacio libre en el volumen de `uploads/` | Métrica | AC-02, crecimiento sin límite | Alerta por debajo del 20 % |

### 2.4 Cambios mínimos que lo harían posible

| # | Cambio | PC | Qué desbloquea |
|---|---|---|---|
| **M-01** | Quitar los códigos ANSI del logger | 1 | L-01: los logs pasan a ser ingeribles |
| **M-02** | Emitir en JSON con campos fijos (`ts`, `nivel`, `metodo`, `ruta`, `estado`, `duracion_ms`) | 1 | L-02, O-06, O-08 |
| **M-03** | Generar un ID por petición en el middleware y propagarlo | 2 | L-03, O-07 |
| **M-04** | Mover el registro al **final** del middleware, envolviendo el `ResponseWriter` para capturar el estado | 1 | L-04: una línea por petición con su resultado real |
| **M-05** | Exponer `/metrics` con contadores e histogramas | 3 | O-01 a O-06, O-09 |

**Total: 8 puntos de cambio.** Ninguno está implementado. La unidad PC está
definida en `docs/18-comparacion-distribucion-costos.md` §2.

> **M-01 a M-04 afectan a `logger` y `server`, ambos del módulo `platform`.**
> La restricción `FF-02` garantiza que el módulo `kill` no se vea arrastrado.

---

## 3. Plan de recuperación ante fallos

| Escenario | Detección | Recuperación | Estado |
|---|---|---|---|
| El proceso termina al arrancar sin `.env` (F-02) | `Fatal` en stdout | Restaurar `.env` desde `.env.example` | 🔶 Táctica T-02 de `docs/17`, no implementada |
| Pánico por motor de base no soportado (F-03) | Traza de pánico | Corregir `config.json` | 🔶 Táctica T-03, no implementada |
| `uploads/` ausente en un clon limpio (F-05) | 404 en `/static/` | Crear la carpeta al arrancar | 🔶 Táctica T-05, no implementada |
| Agotamiento de conexiones (F-01) | O-04, si existiera | Reiniciar el proceso | 🔶 Táctica T-01, no implementada |
| Pérdida del volumen de imágenes | — | **Ninguna: no hay copia de seguridad de `uploads/`** | ❌ Sin tratamiento |
| Pérdida de `test.db` | — | **Ninguna: no hay copia de seguridad** | ❌ Sin tratamiento |

> Las dos últimas filas son vacíos reales, no pendientes. Se dejan visibles.

---

## 4. Matriz de riesgos operativos

| ID | Riesgo operativo | P | I | Origen | Tratamiento |
|---|---|:-:|:-:|---|---|
| **RO-01** | El despliegue en contenedores no funciona a la primera porque nunca se probó | **A** | **M** | §1.2 | Aceptado. Se declara en el README |
| **RO-02** | D-04 impide que el frontend hable con el backend dentro de la red | **A** | **A** | §1.3 | Cambiar a `http://backend:8000`. 1 PC |
| **RO-03** | D-01 hace que los datos de PostgreSQL no persistan entre reinicios | **M** | **A** | §1.3 | Corregir a `/var/lib/postgresql/data`. 1 PC |
| **RO-04** | Pérdida de imágenes sin copia de seguridad | **M** | **A** | §3 | Sin tratamiento. Riesgo aceptado |
| **RO-05** | Una incidencia en producción no es diagnosticable con los logs actuales | **A** | **M** | L-01 a L-06 | M-01 a M-04. 5 PC |
| **RO-06** | Credenciales desincronizadas entre los dos `.env` | **M** | **M** | D-02 | Unificar en un `.env` con prefijos. 2 PC |
| **RO-07** | PostgreSQL accesible desde el host (D-03) | **M** | **A** | §1.3 | Quitar el mapeo de puerto salvo para depurar. 1 PC |
| **RO-08** | El CI no ejerce el despliegue: compila y verifica restricciones, pero no levanta nada | **A** | **B** | `ci.yml` | Aceptado para el alcance del curso |

---

## 5. Lo que este documento no afirma

- **No afirma que el despliegue funcione.** Afirma lo contrario: nunca se
  ejecutó (§1.2).
- **No afirma que los defectos D-01 a D-05 ocurran.** Se dedujeron leyendo el
  archivo. Levantar el compose es lo que los confirmaría o refutaría.
- **No propone adoptar ninguna herramienta concreta** de observabilidad. Lista
  qué señales hacen falta y qué cambios mínimos las habilitan; elegir el
  stack es una decisión que el equipo no ha tomado.

---

## 6. Trazabilidad

| Referencia | Dónde |
|---|---|
| Topología | `docker-compose.yml` |
| Logger | `back/logger/logger.go`, `back/server/error.go` |
| Fallos F-01 a F-10 | `docs/16-matriz-fallos.md` |
| Tácticas T-01 a T-09 | `docs/17-matriz-resiliencia.md` |
| Amenazas T-01 a T-09 y activos | `docs/20-seguridad.md` |
| Unidad de costo (PC) | `docs/18-comparacion-distribucion-costos.md` §2 |
| Dependencia replicación → motor | `docs/18-comparacion-distribucion-costos.md` §4 |
| Motor de línea base | `adrs/ADR-002-sqlite-baseline.md` |
| Restricción que protege `kill` | `docs/19-fitness-function-02.md` |
