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

## 6. Dossier Arquitectónico (Módulos 1 y 2)

| Documento | Contenido |
|---|---|
| [01-contexto-sistema.md](dossier/01-contexto-sistema.md) | 8 riesgos verificados con código citado |
| [02-stakeholders-drivers.md](dossier/02-stakeholders-drivers.md) | 6 stakeholders, 4 drivers priorizados, trade-offs |
| [03-atributos-calidad.md](dossier/03-atributos-calidad.md) | Atributos operacionalizables y registro de uso de IA |
| [04-escenarios-calidad.md](dossier/04-escenarios-calidad.md) | ESC-01 a ESC-05 y resultados de la línea base |
| [05-checklist-semanas-1-4.md](dossier/05-checklist-semanas-1-4.md) | Cumplimiento por semana |
| [06-guion-exposicion.md](dossier/06-guion-exposicion.md) | Guion de defensa repartido |
| [adrs/](adrs/) | 4 registros de decisión arquitectónica |

## 6.1 Modelado C4 y trazabilidad (Módulo 3)

| Documento | Contenido |
|---|---|
| [05-c4-contexto.md](docs/05-c4-contexto.md) | Nivel 1 — actores y límites del sistema |
| [06-c4-contenedores.md](docs/06-c4-contenedores.md) | Nivel 2 — cuatro contenedores y su comunicación |
| [07-c4-componentes.md](docs/07-c4-componentes.md) | Nivel 3 + **matriz de trazado T-01 a T-18** |
| [08-revision-por-pares.md](docs/08-revision-por-pares.md) | Revisión del repositorio de otro equipo |
| [09-walking-skeleton.md](docs/09-walking-skeleton.md) | Walking Skeleton Trace — once saltos verificados |
| [docs/experiment/](docs/experiment/) | Preregistro, protocolo reproducible y matriz de evidencia |

La matriz de trazado registra 18 elementos: 12 verificados, 4 corregidos y **4 eliminados** por no poder señalarse en el código.

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
| M1 · S1–S2 | Adopción del sistema base y línea base operativa | Completado |
| M2 · S3–S4 | Atributos de calidad y medición de línea base | Completado |
| M3 · S5–S6 | Modelado C4 validado contra el código y walking skeleton | Completado |

---

## 9. Declaración de Uso de IA

Asistencia utilizada para: organización estructural del dossier, lectura del código heredado y auditoría de completitud.

Decisiones del equipo, no de la IA: priorización de atributos (seguridad sobre rendimiento), umbrales de medición, selección del escenario de línea base e interpretación de resultados.

Cuatro sugerencias de la IA fueron **rechazadas** por no tener respaldo en el código. El registro completo está en [dossier/03-atributos-calidad.md](dossier/03-atributos-calidad.md) y en la sección 7 de [docs/07-c4-componentes.md](docs/07-c4-componentes.md).

---

## 10. Limitaciones Declaradas

- Docker Compose está declarado pero **no verificado**: no fue posible instalarlo en los equipos disponibles.
- La rama de PostgreSQL existe en el código pero **no se ejecutó**. Los resultados sobre SQLite no son extrapolables.
- El frontend reporta 21 vulnerabilidades en `npm audit` (14 altas). Identificadas, fuera del alcance de este corte.
- El workflow de CI presenta una regresión en la compilación del frontend.

---

## Licencia

Sistema base heredado de https://github.com/IsergioG/PA-FINAL-PROJECT
