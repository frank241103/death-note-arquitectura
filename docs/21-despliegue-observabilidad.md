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

### 1.3 Defectos detectados (revisión estática, 2026-11-06)

No fue posible ejecutar el compose: **Docker no está instalado en ninguna de
las máquinas disponibles** y son equipos corporativos donde el equipo no puede
instalarlo. En lugar de dar la topología por buena, se auditó **contra el
código fuente y la documentación de las herramientas**.

Cada defecto declara su grado de evidencia:

- ✅ **VERIFICADO** — se comprueba leyendo el código; no depende de ejecutar.
- 🔶 **DEDUCIDO** — se infiere del archivo; haría falta ejecutar para confirmarlo.

| ID | Defecto | Evidencia | Efecto esperado |
|---|---|---|---|
| **D-01** | El volumen de PostgreSQL monta `/var/lib/postgresql`, no `/var/lib/postgresql/data` | 🔶 **DEDUCIDO** — `docker-compose.yml`, servicio `postgres` | El directorio de datos queda *dentro* del punto de montaje, así que los datos probablemente persistan, pero no es la ruta documentada por la imagen oficial y puede provocar problemas de propiedad de archivos |
| **D-02** | Dos archivos `.env` distintos: `./back/.env` para el backend y `./.env` para postgres | ✅ **VERIFICADO** — `env_file` de cada servicio | Las credenciales deben mantenerse sincronizadas a mano en dos sitios. Relacionado con R-05 |
| **D-03** | `postgres` publica `5432` al host | ✅ **VERIFICADO** — `ports` | La base queda accesible fuera de la red `PA`. Amplía la superficie del límite de confianza 2 |
| **D-04** | **El nombre de la variable de entorno no coincide con el que el frontend lee** | ✅ **VERIFICADO** | Ver análisis abajo |
| **D-05** | El contenedor se llama `frontend-vue-app` | ✅ **VERIFICADO** — `container_name` | El frontend es React + Vite, no Vue. Cosmético, pero desorienta |
| **D-06** | `back/Dockerfile` ejecuta `COPY .env .env`, y `.env` está en `.gitignore` | ✅ **VERIFICADO** | **La construcción de la imagen falla** en cualquier clon limpio: el archivo no existe en el contexto de build |
| **D-07** | El volumen de imágenes se monta en `/app/uploads`, pero la aplicación lee `uploads/` desde `/build` | ✅ **VERIFICADO** | **Las imágenes no se guardan ni se sirven desde el volumen** |

---

#### D-04 — corrección de un análisis previo

> ⚠️ **Una versión anterior de este documento afirmaba que el defecto era que
> `FRONT_BACKEND=http://localhost:8000` apuntaba al propio contenedor del
> frontend. Esa afirmación era incorrecta y se retira.**
>
> El código del frontend se ejecuta en el **navegador del usuario**, no dentro
> del contenedor: `import.meta.env` lo resuelve Vite en tiempo de compilación
> y el `fetch` lo lanza el navegador. Desde el navegador, `localhost:8000`
> resuelve al puerto publicado por el host, que sí llega al backend. **Esa
> parte estaba bien.**

El defecto real es otro, y es más grave:

```
docker-compose.yml:   FRONT_BACKEND=http://localhost:8000
front/src/pages/kill-register/kill-register.tsx:5
front/src/pages/death-note-list/dn-list.tsx:5
                      const BACKEND = import.meta.env.VITE_FRONT_BACKEND;
```

**Vite solo expone al código las variables de entorno con prefijo `VITE_`.**
El compose define `FRONT_BACKEND`; el código lee `VITE_FRONT_BACKEND`. Son
nombres distintos, así que `BACKEND` queda `undefined` y **las dos páginas que
consumen la API apuntan a `undefined/death`**.

Se agrava con que **no existe ningún archivo `.env` en `front/`**, de modo que
tampoco hay otra vía por la que la variable pudiera llegar.

**Corrección:** renombrar la variable a `VITE_FRONT_BACKEND` en el compose.
1 punto de cambio.

---

#### D-06 — la imagen del backend no se puede construir

```dockerfile
COPY . .
COPY .env .env      # <- .env esta en .gitignore
```

`.gitignore` ignora `.env`, `*/.env` y `**/.env`. En un clon limpio el archivo
no existe, y `COPY` de un archivo ausente **aborta la construcción**.

Es el mismo fenómeno que el fallo **F-02** (el backend no arranca sin `.env`),
pero una capa más abajo: aquí ni siquiera se llega a construir la imagen.

**Corrección:** eliminar esa línea —`COPY . .` ya copiaría el archivo si
existiera— y pasar la configuración por `env_file`, que es lo que el compose
ya hace. 1 punto de cambio.

---

#### D-07 — el volumen de imágenes apunta a una ruta que nadie usa

| Dónde | Qué dice |
|---|---|
| `docker-compose.yml` | `volumes: - ./back/uploads:/app/uploads` |
| `back/Dockerfile` | `WORKDIR /build` · `CMD ["/build/backend-avanzada.o"]` |
| `back/server/router.go:15` | `http.FileServer(http.Dir("uploads/"))` — ruta **relativa** |
| `back/server/kill_handlers.go:112` | `savePath := fmt.Sprintf("uploads/%s", fileName)` — relativa |

El proceso corre con directorio de trabajo `/build`, así que lee y escribe en
**`/build/uploads`**. El volumen está montado en **`/app/uploads`**, donde no
hay nada que lo lea.

**Consecuencia:** las imágenes subidas se escribirían dentro del contenedor y
**se perderían al recrearlo**; y las que hubiera en `./back/uploads` en el host
nunca se servirían. Es el fallo **F-05** reaparecido por otra vía.

**Corrección:** alinear las rutas — montar en `/build/uploads`, o fijar
`WORKDIR /app`. 1 punto de cambio.

---

#### Qué significa este bloque

Dos de los siete defectos (**D-06** y **D-07**) impedirían que el despliegue
funcionara: uno bloquea la construcción y el otro rompe el almacén de
imágenes. **Los tres defectos nuevos salieron de contrastar el compose contra
el código fuente**, que es un trabajo que no se había hecho: la revisión
anterior solo leyó el archivo de compose de forma aislada.

`[EVIDENCIA FALTANTE]` Ninguno está confirmado **ejecutando**. D-02 a D-07
se verifican leyendo código y por tanto no dependen de ello; D-01 sí lo
necesita. El coste total de corregir D-04, D-06 y D-07 es de **3 puntos de
cambio**, pero no se aplican a ciegas: cambiar un despliegue que no se puede
probar solo cambiaría unos defectos por otros.

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
| **RO-02** | D-04: el frontend no recibe la URL del backend porque el nombre de la variable no lleva el prefijo `VITE_` | **A** | **A** | §1.3 ✅ verificado | Renombrar a `VITE_FRONT_BACKEND`. 1 PC |
| **RO-03** | D-01: ruta de volumen de PostgreSQL no documentada | **B** | **M** | §1.3 🔶 deducido | Corregir a `/var/lib/postgresql/data`. 1 PC |
| **RO-09** | D-06: la imagen del backend **no se construye** en un clon limpio | **A** | **A** | §1.3 ✅ verificado | Eliminar `COPY .env .env`. 1 PC |
| **RO-10** | D-07: las imágenes se escriben fuera del volumen y se pierden al recrear el contenedor | **A** | **A** | §1.3 ✅ verificado | Alinear rutas. 1 PC |
| **RO-04** | Pérdida de imágenes sin copia de seguridad | **M** | **A** | §3 | Sin tratamiento. Riesgo aceptado |
| **RO-05** | Una incidencia en producción no es diagnosticable con los logs actuales | **A** | **M** | L-01 a L-06 | M-01 a M-04. 5 PC |
| **RO-06** | Credenciales desincronizadas entre los dos `.env` | **M** | **M** | D-02 | Unificar en un `.env` con prefijos. 2 PC |
| **RO-07** | PostgreSQL accesible desde el host (D-03) | **M** | **A** | §1.3 | Quitar el mapeo de puerto salvo para depurar. 1 PC |
| **RO-08** | El CI no ejerce el despliegue: compila y verifica restricciones, pero no levanta nada | **A** | **B** | `ci.yml` | Aceptado para el alcance del curso |

---

## 5. Lo que este documento no afirma

- **No afirma que el despliegue funcione.** Afirma lo contrario: nunca se
  ejecutó (§1.2).
- **Distingue lo verificado de lo deducido.** D-02 a D-07 se comprueban
  leyendo el código y no dependen de ejecutar; D-01 sí. Levantar el compose
  sigue siendo lo único que cerraría del todo este apartado.
- **Corrige un análisis propio anterior** (D-04): la primera versión de este
  documento razonó mal sobre dónde se ejecuta el código del frontend. La
  corrección queda registrada en lugar de reescribirse en silencio.
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
