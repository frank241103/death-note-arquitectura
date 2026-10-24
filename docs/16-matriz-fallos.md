# 16 — Matriz de fallos

**Módulo:** 6 (control A2)
**Fecha:** 2026-10-23
**Commit del sistema analizado:** `6b657dd`

---

## 1. Qué es esta matriz y qué no es

Cada fila describe **un modo de fallo del sistema**: un componente real que,
ante un estímulo concreto, produce una consecuencia observable.

Dos reglas que gobiernan la tabla:

1. **Ninguna fila se inventa.** Toda fila sale de un escenario de calidad ya
   definido (`dossier/04-escenarios-calidad.md`), de un riesgo verificado
   contra código (`dossier/01-contexto-sistema.md`) o de una medición
   publicada.
2. **Cada fila declara su estado epistémico.** `OBSERVADO` significa que el
   fallo se reprodujo y hay captura, log o JSON que lo respalda.
   `HIPOTÉTICO` significa que el mecanismo se dedujo leyendo el código pero
   **no se ha provocado**.

Esta distinción es el control que pide A2. No se mezclan.

---

## 2. Matriz

| ID | Componente (existe en el C4) | Estímulo | Consecuencia observable | Referencia verificable | Estado |
|---|---|---|---|---|---|
| **F-01** | `server` — construcción del `http.Server` | Petición que abre conexión y envía cabeceras muy despacio (Slowloris) | La conexión queda abierta sin límite; se agotan conexiones disponibles | `back/server/server.go` — `&http.Server{Addr, Handler}` sin `ReadTimeout`, `WriteTimeout` ni `IdleTimeout`. Riesgo **R-08** | 🔶 **HIPOTÉTICO** — el mecanismo está verificado por lectura de código; no se ejecutó un ataque Slowloris |
| **F-02** | `server` — `initDB()` | Arranque sin archivo `.env` en el directorio | El proceso termina de inmediato: `godotenv.Load()` → `logger.Fatal(err)` | `back/server/server.go`, llamada a `Fatal` antes de evaluar el motor. Escenario **ESC-03**. Captura: `experimentos/verificacion-escenarios/esc-03-sin-env.png.png`. Riesgo **R-02** | ✅ **OBSERVADO** |
| **F-03** | `server` — `switch` de selección de motor | `config.json` declara un motor no contemplado (p. ej. `mongodb`) | `s.DB` queda nulo porque el `switch` no tiene caso `default`; pánico en `AutoMigrate` | `back/server/server.go`, `switch s.Config.Database` sin `default`. Escenario **ESC-04**. Captura: `esc-04-mongodb-panic.png.png`. Riesgo **R-04** | ✅ **OBSERVADO** |
| **F-04** | `File Server` (`http.FileServer` sobre `uploads/`) | `GET /static/<archivo>` sin ninguna credencial | El archivo se entrega. No hay middleware de autorización en esa ruta | `back/server/router.go:15` — `PathPrefix("/static/")` registrado fuera de cualquier control. Escenario **ESC-02**. Riesgo **R-06** | ✅ **OBSERVADO** |
| **F-05** | `File Server` — reproducibilidad | Clonar el repositorio limpio y pedir `GET /static/<archivo>` | **404**: la carpeta `back/uploads/` está en `.gitignore`, así que no existe en un clon nuevo y el `FileServer` no tiene nada que servir | Captura: `esc-02-static-404.png.png`. `.gitignore` línea `back/uploads/` | ✅ **OBSERVADO** — hallazgo de reproducibilidad, distinto de F-04 |
| **F-06** | `server` — configuración de CORS | Petición cruzada desde cualquier origen con credenciales | `AllowedOrigins: ["*"]` combinado con `AllowCredentials: true` | `back/server/server.go`, construcción del middleware `cors`. Riesgo **R-05** | 🔶 **HIPOTÉTICO** — la configuración está verificada; no se ejecutó una petición cruzada real |
| **F-07** | `repository` → `handleGetAllKills` | `GET /death` con la base sembrada (3302 registros) | Respuesta de **557 kB**; p95 de 1114,69 ms contra un umbral prerregistrado de 500 ms | `back/repository/kill_repository.go:22` — `k.db.Find(&kills)` sin límite. Escenario **ESC-01**. Corridas: `run-1.json` a `run-4.json` | ✅ **OBSERVADO** — medido en 2 máquinas, 4 corridas |
| **F-08** | `server` — `handleCreateKill` | `POST /death` con cuerpo `application/json` | `400`: *"formato inválido: request Content-Type isn't multipart/form-data"*. El mensaje de error del handler menciona además campos `firstName` y `lastName` que no existen en el DTO | Escenario **ESC-05**. Captura: `esc-05-rechazo-400.png.png`. Contrato en `docs/09-api-eventos-integracion.md` §2 | ✅ **OBSERVADO** |
| **F-09** | `server` — escritura de imagen en `POST /death` | 10 usuarios concurrentes creando registros | p95 de **1730,45 ms** contra un umbral prerregistrado de 1000 ms. Razón p95/mediana: **37,7×** | `back/server/kill_handlers.go:110-121`. Spike-01: `experimentos/spike-01-integracion/resultados/post-baseline.json` | ✅ **OBSERVADO** |
| **F-10** | `server` — traza de arranque | Arranque normal del backend | Imprime `HOST: host=%!s(MISSING) user=%!s(MISSING)…`: el `fmt.Println` tiene 4 verbos `%s` y cero argumentos | `back/server/server.go`. Riesgo **R-01**. Reproducible en cualquier arranque | ✅ **OBSERVADO** |

---

## 3. Trazado al C4

Cada componente nombrado arriba existe en el modelo C4 ya publicado. Ninguna
fila introduce un componente que no esté dibujado.

| Componente de la matriz | Dónde aparece en el C4 |
|---|---|
| `server` (router, arranque, CORS, handlers) | `docs/07-c4-componentes.md` |
| `File Server` | `docs/06-c4-contenedores.md` — contenedor propio |
| `repository` | `docs/07-c4-componentes.md` |
| Base de datos SQLite | `docs/06-c4-contenedores.md` |

---

## 4. Inconsistencia documental detectada

`[INCONSISTENCIA DOCUMENTAL]` El identificador del riesgo de paginación (F-07)
no es consistente dentro del repositorio:

| Documento | Qué dice |
|---|---|
| `dossier/01-contexto-sistema.md` tabla de riesgos | R-01 = contraseña en logs · R-07 = `fullName` no persistido |
| `dossier/04-escenarios-calidad.md:514` | *"Este hallazgo valida R-07 (falta de paginación…)"* |
| `docs/09-api-eventos-integracion.md:30` | *"…sin restricción ni paginación… (R-01)"* |

El **hallazgo técnico está verificado** y medido: no está en duda. Lo que hay
que unificar es a qué identificador R-0x corresponde. Mientras no se decida,
esta matriz lo referencia por su ID propio, **F-07**, y por archivo y línea.

**Pendiente de decisión del equipo.** No se resuelve aquí porque implica
renumerar riesgos citados en seis documentos.

---

## 5. Qué falta para que esta matriz esté completa

| # | Pendiente | Para pasar de HIPOTÉTICO a OBSERVADO |
|---|---|---|
| M-1 | F-01 (Slowloris) | Ejecutar un cliente que abra conexiones lentas y registrar el agotamiento |
| M-2 | F-06 (CORS) | Hacer una petición cruzada con credenciales desde otro origen y capturar las cabeceras de respuesta |

Ambos son ejecutables en menos de 30 minutos. Se declaran aquí en lugar de
presentarlos como observados.

---

## 6. Trazabilidad

| Fuente | Qué aporta |
|---|---|
| `dossier/04-escenarios-calidad.md` | ESC-01 a ESC-05 en formato Fuente–Estímulo–Artefacto–Entorno–Respuesta–Medida |
| `dossier/01-contexto-sistema.md` | Riesgos R-01 a R-08 con código citado |
| `experimentos/verificacion-escenarios/` | 4 capturas de los escenarios binarios |
| `experimentos/medicion-escenario-01/resultados/` | 4 corridas de ESC-01 + integridad SHA256 |
| `experimentos/spike-01-integracion/resultados/` | Medición de F-09 |
| `docs/06-c4-contenedores.md`, `docs/07-c4-componentes.md` | Componentes que las filas referencian |
