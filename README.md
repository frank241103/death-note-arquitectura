# Death Note — Sistema Base para Arquitectura de Software (702302)

Repositorio de trabajo del equipo para la asignatura. Contiene el sistema base adoptado más el dossier arquitectónico completo: análisis de riesgos, stakeholders, atributos de calidad, escenarios de medición y modelado C4 trazado al código.

---

## 1. Equipo

| Integrante | Usuario GitHub | Responsabilidad | PR |
|---|---|---|---|
| David Rodríguez | frank241103 | Adopción del sistema base, modelo C4 y walking skeleton | #4, #6 |
| Dylam Jaime Guiza | Dylam0 | Preregistro, protocolo reproducible, matriz de evidencia y revisión por pares | #1, #7 |
| Jhoan Sebastián Reyes Pachón | sebasrrrp | Verificación empírica de escenarios ESC-02 a ESC-05 con capturas | #2 |
| John Andersson Galeano Mora | JOHNAN98 | Cuarta corrida en máquina independiente (AMD Ryzen 5), integridad SHA256 y anclas de trazabilidad | #3, #5 |

### Información académica
- **Materia:** Arquitectura de Software (702302)
- **Institución:** Universidad Jorge Tadeo Lozano
- **Período:** 2026-II

> En el historial de Git algunos integrantes aparecen con dos nombres (nombre personal en un equipo, usuario de GitHub en otro). Son cuatro personas.

---

## 2. Sistema Base Adoptado

**Opción del protocolo:** C (proyecto externo)
**Estado de autorización docente:** PENDIENTE DE CONFIRMAR

| Atributo | Valor |
|---|---|
| **Nombre** | Death Note — registro de kills |
| **Origen** | https://github.com/IsergioG/PA-FINAL-PROJECT |
| **Autor original** | sergiocoba-IND |
| **Commits heredados** | 4ebec3b, b76332e |
| **Repo de trabajo** | https://github.com/frank241103/death-note-arquitectura |

**Declaración:** el equipo **NO es autor** del sistema base. Lo adopta como objeto de estudio arquitectónico conforme a la opción C del protocolo.

**Trazabilidad verificable:**

```bash
git log --format="%h %an %s"
# Los dos commits más antiguos son de sergiocoba-IND

git remote -v
# upstream apunta al repositorio original
```

---

## 3. Tecnologías Verificadas

| Componente | Versión | Evidencia en el código |
|---|---|---|
| Backend — Lenguaje | Go 1.24.3 | `back/go.mod` |
| Backend — Router | gorilla/mux | `back/server/router.go` |
| Backend — ORM | GORM | `back/repository/kill_repository.go` |
| Backend — Persistencia | SQLite (glebarez) o PostgreSQL | `back/server/server.go`, función `initDB()` |
| Frontend — Framework | React + TypeScript | `front/src/`, `front/package.json` |
| Frontend — Build | Vite | `front/vite.config.ts` |
| Frontend — Node.js | 24.18.0 | `front/package.json` |
| Orquestación | Docker Compose | `docker-compose.yml` — declarado, **NO verificado** |

La configuración vigente es SQLite (`back/config/config.json`). PostgreSQL existe como rama alterna en el código pero no se ejecutó.

---

## 4. Cómo Levantar el Sistema

**Requisitos:** Go 1.24.3 y Node.js 24. Docker no es necesario.

### Paso 1 — Crear el archivo `.env`

El backend **exige** un `.env` en `back/` aunque esté configurado con SQLite. Es el riesgo R-02 del dossier y el escenario ESC-03, ambos documentados.

Crear `back/.env` con este contenido:

```
POSTGRES_HOST=localhost
POSTGRES_USER=root
POSTGRES_PASSWORD=root
POSTGRES_DB=PA_FINAL
FRONT_BACKEND=http://localhost:8000
```

Sin este archivo el arranque falla con `Fatal` en `godotenv.Load()`.

### Paso 2 — Backend

```bash
cd back
go mod download
go build ./...
go run main.go
```

Resultado esperado:

```
Inicializando base de datos...
Aplicando migraciones...
Inicializando mux...
Escuchando en el puerto  :8000
```

Dejar esa terminal abierta. Verificar en otra:

```bash
curl http://localhost:8000/death
```

Tras un clon limpio devuelve `[]` — la base arranca vacía.

### Paso 3 — Sembrar datos

`back/test.db` y `back/uploads/` están excluidos del control de versiones, así que el sistema arranca sin registros. Para reproducir las condiciones de la medición:

```bash
cd experimentos/medicion-escenario-01/scripts
sembrar-datos.cmd
```

Inserta 3.000 registros vía `POST /death`. Tarda unos minutos.

Alternativa con k6, con condiciones de carga explícitas:

```bash
k6 run scripts/seed-load.js
```

### Paso 4 — Frontend

```bash
cd front
npm install
npm run dev
```

Disponible en `http://localhost:5173`

### Paso 5 — Reproducir la medición de línea base

Requiere k6 (descarga portable desde github.com/grafana/k6/releases, sin instalador).

```bash
cd experimentos/medicion-escenario-01
k6 run scripts/baseline.js
```

Dura 60 segundos. **El umbral de 500 ms sale en rojo: ese es el resultado esperado y documentado.**

---

## 5. API Expuesta

| Método | Ruta | Descripción | Formato de entrada |
|---|---|---|---|
| GET | `/death` | Listar todos los registros | — |
| POST | `/death` | Crear registro con imagen | `multipart/form-data` |
| GET | `/death/{id}` | Obtener por id | — |
| PATCH | `/deathUpdate/{id}` | Actualización parcial | `application/json` |
| GET | `/static/{archivo}` | Servir archivos de `uploads/` | — |

**Base URL:** `http://localhost:8000`

Nota arquitectónica: la creación exige `multipart/form-data` mientras la actualización usa JSON, pese a que el DTO declara etiquetas `json`. Inconsistencia documentada en `docs/07-c4-componentes.md`.

---

## 6. Índice del dossier

> **Nota para quien evalúe.** La numeración de este repositorio es secuencial
> por módulo y **no coincide** con el índice del sílabo, porque los Módulos 1
> y 2 se publicaron en `dossier/` antes de que se fijara esa estructura. La
> tabla de equivalencias de §6.1 traduce un índice al otro. Todo el contenido
> exigido existe; lo que cambia es la ruta.

### 6.1 Equivalencia con el índice del sílabo

| # del sílabo | Documento esperado | Archivo en este repositorio | Estado |
|:-:|---|---|---|
| 01 | Contexto | [`dossier/01-contexto-sistema.md`](dossier/01-contexto-sistema.md) | ✅ |
| 02 | Stakeholders | [`dossier/02-stakeholders-drivers.md`](dossier/02-stakeholders-drivers.md) | ✅ |
| 03 | Atributos | [`dossier/03-atributos-calidad.md`](dossier/03-atributos-calidad.md) | ✅ |
| 04 | Escenarios | [`dossier/04-escenarios-calidad.md`](dossier/04-escenarios-calidad.md) | ✅ |
| 05 | C4 contexto | [`docs/05-c4-contexto.md`](docs/05-c4-contexto.md) | ✅ |
| 06 | C4 contenedores | [`docs/06-c4-contenedores.md`](docs/06-c4-contenedores.md) | ✅ |
| 07 | C4 componentes | [`docs/07-c4-componentes.md`](docs/07-c4-componentes.md) | ✅ |
| 08 | Estilo arquitectónico | [`docs/10-decision-estilo-arquitectonico.md`](docs/10-decision-estilo-arquitectonico.md) | ✅ |
| 09 | Integración: APIs y eventos | [`docs/09-api-eventos-integracion.md`](docs/09-api-eventos-integracion.md) | ✅ |
| 10 | Seguridad | [`docs/20-seguridad.md`](docs/20-seguridad.md) | ✅ |
| 11 | Resiliencia y rendimiento | [`docs/17-matriz-resiliencia.md`](docs/17-matriz-resiliencia.md) + [`docs/16-matriz-fallos.md`](docs/16-matriz-fallos.md) | ✅ |
| 12 | Despliegue y observabilidad | [`docs/21-despliegue-observabilidad.md`](docs/21-despliegue-observabilidad.md) | ✅ |
| 13 | Riesgos y trade-offs | [`docs/18-comparacion-distribucion-costos.md`](docs/18-comparacion-distribucion-costos.md) + [`docs/16`](docs/16-matriz-fallos.md) | ✅ |
| 14 | Evaluación arquitectónica | [`docs/22-evaluacion-arquitectonica.md`](docs/22-evaluacion-arquitectonica.md) | ✅ |
| 15 | Evidencia ejecutable | [`docs/23-evidencia-ejecutable.md`](docs/23-evidencia-ejecutable.md) | ✅ |
| 16 | Uso de IA | [`docs/24-uso-ia.md`](docs/24-uso-ia.md) + [`docs/13`](docs/13-critica-propuesta-ia.md) | ✅ |
| 17 | Presentación final | [`docs/25-presentacion-final.md`](docs/25-presentacion-final.md) | ✅ |

> ⚠️ **Dos archivos comparten el prefijo `09`**: `09-walking-skeleton.md`
> (Módulo 3) y `09-api-eventos-integracion.md` (Módulo 5). El del índice del
> sílabo es el segundo. La colisión se deja declarada en lugar de renumerar,
> porque renumerar rompería las referencias cruzadas de una veintena de
> documentos. El número `11` quedó sin usar por la misma razón.

### 6.2 Módulos 1 y 2 — fundamentos y medición

| Documento | Contenido |
|---|---|
| [01-contexto-sistema.md](dossier/01-contexto-sistema.md) | 8 riesgos verificados con código citado |
| [02-stakeholders-drivers.md](dossier/02-stakeholders-drivers.md) | 6 stakeholders, 4 drivers priorizados, trade-offs |
| [03-atributos-calidad.md](dossier/03-atributos-calidad.md) | Atributos operacionalizables |
| [04-escenarios-calidad.md](dossier/04-escenarios-calidad.md) | ESC-01 a ESC-05 y resultados de la línea base |
| [05-checklist-semanas-1-4.md](dossier/05-checklist-semanas-1-4.md) | Cumplimiento por semana |
| [06-guion-exposicion.md](dossier/06-guion-exposicion.md) | Guion de defensa del corte 1 |
| [docs/experiment/](docs/experiment/) | Preregistro, protocolo reproducible y matriz de evidencia |

### 6.3 Módulo 3 — modelado C4 y trazabilidad

| Documento | Contenido |
|---|---|
| [05-c4-contexto.md](docs/05-c4-contexto.md) | Nivel 1 — actores y límites del sistema |
| [06-c4-contenedores.md](docs/06-c4-contenedores.md) | Nivel 2 — cuatro contenedores y su comunicación |
| [07-c4-componentes.md](docs/07-c4-componentes.md) | Nivel 3 + **matriz de trazado T-01 a T-18** |
| [08-revision-por-pares.md](docs/08-revision-por-pares.md) | Revisión del repositorio de otro equipo |
| [09-walking-skeleton.md](docs/09-walking-skeleton.md) | Walking Skeleton Trace — once saltos verificados |

La matriz de trazado registra 18 elementos: 12 verificados, 4 corregidos y
**4 eliminados** por no poder señalarse en el código.

### 6.4 Módulos 4 y 5 — decisiones, dominio e integración

| Documento | Contenido |
|---|---|
| [10-decision-estilo-arquitectonico.md](docs/10-decision-estilo-arquitectonico.md) | Tres alternativas contra 4 drivers · decisión: hexagonal · antipatrones · seguridad del estilo |
| [12-mapa-modular.md](docs/12-mapa-modular.md) | Módulos `kill` / `media` / `platform` y matriz de dependencias permitidas |
| [09-api-eventos-integracion.md](docs/09-api-eventos-integracion.md) | Subdominios, contrato de las 4 rutas y catálogo de eventos candidatos |
| [13-critica-propuesta-ia.md](docs/13-critica-propuesta-ia.md) | Crítica a las sugerencias de la IA, con veredicto por sugerencia |
| [14-acta-mini-comite-1.md](docs/14-acta-mini-comite-1.md) | Acta del mini-comité: rol, 5 preguntas y veredicto |

### 6.5 Módulo 6 — evidencia, seguridad, operación y cierre

| Documento | Contenido |
|---|---|
| [15-fitness-function-01.md](docs/15-fitness-function-01.md) | Contrato de FF-01 — protege `ADR-005` |
| [16-matriz-fallos.md](docs/16-matriz-fallos.md) | 10 fallos: 8 observados, 2 hipotéticos |
| [17-matriz-resiliencia.md](docs/17-matriz-resiliencia.md) | 9 tácticas: 1 validada, 8 propuestas |
| [18-comparacion-distribucion-costos.md](docs/18-comparacion-distribucion-costos.md) | Costos en puntos de cambio medidos + comparación de distribución |
| [19-fitness-function-02.md](docs/19-fitness-function-02.md) | Contrato de FF-02 — protege `ADR-006` |
| [20-seguridad.md](docs/20-seguridad.md) | Activos, límites de confianza, 9 amenazas, 8 controles, 3 riesgos aceptados |
| [21-despliegue-observabilidad.md](docs/21-despliegue-observabilidad.md) | Vista de despliegue, plan de observabilidad, 8 riesgos operativos |
| [22-evaluacion-arquitectonica.md](docs/22-evaluacion-arquitectonica.md) | Evaluación por driver y plan de evolución en 3 horizontes |
| [23-evidencia-ejecutable.md](docs/23-evidencia-ejecutable.md) | Índice de todo lo reproducible, con sus comandos |
| [24-uso-ia.md](docs/24-uso-ia.md) | Declaración completa en los 8 puntos del sílabo |
| [25-presentacion-final.md](docs/25-presentacion-final.md) | Brief ejecutivo de una página + guion de defensa |

### 6.6 Registros de decisión arquitectónica

**8 ADR**, por encima del mínimo de 5 que exige el sílabo.

| ADR | Decisión | Veredicto del comité |
|---|---|---|
| [ADR-001](adrs/ADR-001-adopcion-opcion-c.md) | Adopción del sistema base (opción C) | — |
| [ADR-002](adrs/ADR-002-sqlite-baseline.md) | SQLite como línea base de medición | — |
| [ADR-003](adrs/ADR-003-k6-medicion.md) | k6 como instrumento de medición | — |
| [ADR-004](adrs/ADR-004-priorizacion-atributos.md) | Seguridad > Mantenibilidad > Rendimiento > Disponibilidad | — |
| [ADR-005](adrs/ADR-005-estilo-hexagonal.md) | Arquitectura hexagonal | ✅ Confirmada |
| [ADR-006](adrs/ADR-006-limites-modulos.md) | Límites de módulos y dependencias permitidas | ✅ Confirmada |
| [ADR-007](adrs/ADR-007-cqrs-eventos.md) | Sin CQRS; integración síncrona | — |
| [ADR-008](adrs/ADR-008-control-acceso-media.md) | Control de acceso al almacén de imágenes | Pendiente |

### 6.7 Evidencia ejecutable

| Qué | Dónde | Estado |
|---|---|---|
| Línea base ESC-01 — 4 corridas, 2 máquinas | [`experimentos/medicion-escenario-01/`](experimentos/medicion-escenario-01/) | ✅ Ejecutada |
| Spike-01 — acoplamiento síncrono con el almacén | [`experimentos/spike-01-integracion/`](experimentos/spike-01-integracion/) | ✅ Ejecutado · **validado** |
| FF-01 — el dominio no depende de infraestructura | [`scripts/fitness/ff-01-...`](scripts/fitness/) | ✅ **En CI**, con prueba negativa |
| FF-02 — dirección de dependencias entre módulos | [`scripts/fitness/ff-02-...`](scripts/fitness/) | ✅ **En CI**, con prueba negativa |
| PS-01 — intento deliberado de fuga de datos | [`experimentos/prueba-seguridad-01/`](experimentos/prueba-seguridad-01/) | ⬜ Escrita, **pendiente de ejecutar** |
| Verificación de escenarios ESC-02 a ESC-05 | [`experimentos/verificacion-escenarios/`](experimentos/verificacion-escenarios/) | ✅ 4 capturas |

Índice completo con comandos de reproducción: [`docs/23-evidencia-ejecutable.md`](docs/23-evidencia-ejecutable.md).

---

## 7. Resultado de la Medición de Línea Base

**Escenario:** ESC-01 — latencia de `GET /death` bajo carga
**Umbral prerregistrado:** p95 < 500 ms, definido **antes** de medir
**Semilla:** 3.302 registros · 557 KB por respuesta

| Corrida | Máquina | Peticiones | p95 (ms) | Errores |
|---|---|---|---|---|
| run-1 (descartada) | Intel i7-1255U | 1559 | 1578,71 | 0% |
| run-2 | Intel i7-1255U | 1350 | 1615,73 | 0% |
| run-3 | Intel i7-1255U | 2205 | 613,66 | 0% |
| run-4 | AMD Ryzen 5 3400G | 1690 | 640,72 | 0% |
| **Mediana válida** | — | — | **1114,69** | **0%** |

### Veredicto: NO CUMPLE — 2,23× sobre el umbral

**Observaciones:**

1. Ninguna de las cuatro corridas bajó del umbral. El incumplimiento es estructural, no de calibración.
2. **Causa raíz:** `handleGetAllKills` recupera los 3.302 registros sin paginar. GORM marca la consulta como `SLOW SQL` en cada petición, señalando `back/repository/kill_repository.go:22`.
3. Tasa de error 0% en las cuatro corridas: el sistema no falla, es lento.
4. Se reprodujo en dos arquitecturas distintas (Intel portátil y AMD escritorio).
5. `[EVIDENCIA FALTANTE]` La variabilidad entre corridas se atribuye a gestión térmica del procesador, pero no se midió frecuencia ni temperatura. Es hipótesis, no causa demostrada.

**No se ajustó el umbral después de conocer el resultado.**

Evidencia: [experimentos/medicion-escenario-01/resultados/](experimentos/medicion-escenario-01/resultados/) — corridas en JSON, contexto de máquina, verificación de semilla y `SHA256SUMS.txt`.

---

## 8. Estado por Módulo

| Módulo | Hito | Estado |
|---|---|---|
| M1 · S1–S2 | Adopción del sistema base y línea base operativa | ✅ Completado |
| M2 · S3–S4 | Atributos de calidad y medición de línea base | ✅ Completado |
| M3 · S5–S6 | Modelado C4 validado contra el código y walking skeleton | ✅ Completado |
| M4 · S7–S8 | Estilo arquitectónico, límites de módulos, mini-comité 1 | ✅ Completado |
| M5 · S9–S10 | Dominio, API, eventos y spike-01 con veredicto | ✅ Completado |
| M6 · S11–S16 | Fallos, resiliencia, costos, seguridad, operación y 2 fitness functions | ✅ Completado · con pendientes declarados |

### Pendientes declarados, no ocultos

| Qué falta | Dónde está escrito |
|---|---|
| PS-01 está escrita pero no ejecutada | [`docs/20`](docs/20-seguridad.md) §9 |
| De 8 controles de seguridad, 1 implementado | [`docs/20`](docs/20-seguridad.md) §6 |
| De 9 tácticas de resiliencia, 1 validada | [`docs/17`](docs/17-matriz-resiliencia.md) §1 |
| Experimento de crecimiento y táctica medida antes/después | [`docs/23`](docs/23-evidencia-ejecutable.md) §7, N-01 y N-02 |
| El despliegue en contenedores nunca se ejecutó | [`docs/21`](docs/21-despliegue-observabilidad.md) §1.2 |
| Timeouts del `http.Server` — condición del mini-comité | [`ADR-005`](adrs/ADR-005-estilo-hexagonal.md), [`docs/22`](docs/22-evaluacion-arquitectonica.md) §5 |
| El ID del riesgo de paginación es inconsistente entre documentos propios | [`docs/16`](docs/16-matriz-fallos.md) §4 |
| La arquitectura hexagonal no tiene puertos escritos | [`docs/22`](docs/22-evaluacion-arquitectonica.md) §4, W-02 |

---

## 9. Declaración de Uso de IA

**Declaración completa en los ocho puntos que exige el sílabo:**
[`docs/24-uso-ia.md`](docs/24-uso-ia.md).

Resumen: la IA se usó para **redactar, estructurar, explicar y generar
scripts**. No se usó para **decidir** ni para **producir evidencia**.

Siete recomendaciones fueron rechazadas por no tener respaldo en el código o
en los datos, entre ellas tres cifras inventadas. Una de ellas —una tabla
comparativa síncrona/asíncrona cuyos números no existían en ningún archivo de
resultados— llegó a versionarse y estuvo dos semanas en el repositorio; se
retiró dejando constancia en
[`experimentos/spike-01-integracion/README.md`](experimentos/spike-01-integracion/README.md) §9
en lugar de borrarla en silencio.

---

## 10. Limitaciones Declaradas

- **Docker Compose está declarado pero nunca se ejecutó.** Todas las
  mediciones se hicieron con `go run main.go` + SQLite, no en contenedores.
  Leyendo el archivo se detectaron 5 defectos, reportados como hallazgos de
  revisión y no como fallos observados:
  [`docs/21`](docs/21-despliegue-observabilidad.md) §1.3.
- **La rama de PostgreSQL existe en el código pero no se ejecutó.** Los
  resultados sobre SQLite no son extrapolables. Además, replicar el sistema
  exigiría migrar el motor primero: [`docs/18`](docs/18-comparacion-distribucion-costos.md) §4.
- **El frontend reporta 21 vulnerabilidades en `npm audit` (14 altas).** Dato
  de agosto, pendiente de contraste contra el estado actual. Declarado como
  riesgo aceptado RA-03 en [`docs/20`](docs/20-seguridad.md) §7 y §8.
- **La variabilidad térmica entre corridas es hipótesis, no causa demostrada:**
  no se midió frecuencia ni temperatura.
- **La autorización docente para adoptar el sistema base (opción C) sigue
  pendiente de confirmar.** El autor original está reconocido en
  [`ADR-001`](adrs/ADR-001-adopcion-opcion-c.md).

> **Regresión del CI — resuelta el 2026-10-23.** El workflow fallaba en la
> compilación del frontend. La causa no era `npm ci` como se creyó
> inicialmente, sino dos errores de TypeScript (`navigate` y `useEffect`
> declarados y no usados). Corregidos; el CI está en verde y además ejecuta
> las dos fitness functions con sus pruebas negativas.

---

## Licencia

Sistema base heredado de https://github.com/IsergioG/PA-FINAL-PROJECT
