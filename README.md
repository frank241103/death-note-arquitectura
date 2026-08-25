# Death Note — Sistema Base para Arquitectura de Software (702302)

Repositorio de trabajo del equipo para la asignatura. Contiene el sistema base adoptado más el dossier arquitectónico completo (análisis de riesgos, stakeholders, atributos de calidad, escenarios de medición).

---

## 1. Equipo

| Integrante | Usuario GitHub | Responsabilidad |
|---|---|---|
| David Rodríguez | frank241103 | Adopción del sistema base y medición de línea base |
| [PENDIENTE] | [PENDIENTE] | [PENDIENTE] |
| [PENDIENTE] | [PENDIENTE] | [PENDIENTE] |

---

## 2. Sistema Base Adoptado

**Opción del protocolo:** C (proyecto externo)  
**Estado de autorización docente:** PENDIENTE DE CONFIRMAR

| Atributo | Valor |
|---|---|
| **Nombre** | Death Note (registro de kills) — aplicación basada en el anime |
| **Origen** | https://github.com/IsergioG/PA-FINAL-PROJECT |
| **Autor original** | sergiocoba-IND |
| **Commits heredados** | 4ebec3b, b76332e |
| **Repo de trabajo** | https://github.com/frank241103/death-note-arquitectura |

**Declaración importante:** El equipo **NO es autor** del sistema base. Lo adopta como objeto de estudio arquitectónico conforme a la opción C del protocolo.

**Trazabilidad Git:**
```bash
git log --format="%h %an %s" 4ebec3b..b76332e
# Muestra los commits del autor original conservados en el historial
```

El remoto original se conserva como `upstream` para referencia:
```bash
git remote -v
# origin    https://github.com/frank241103/death-note-arquitectura.git (fetch/push)
# upstream  https://github.com/IsergioG/PA-FINAL-PROJECT.git (fetch/push)
```

---

## 3. Tecnologías Verificadas

| Componente | Versión | Evidencia |
|---|---|---|
| **Backend - Lenguaje** | Go 1.24.3 | back/go.mod |
| **Backend - Router** | gorilla/mux | back/server/router.go:9 |
| **Backend - ORM** | GORM | back/repository/kill_repository.go:1 |
| **Backend - Persistencia** | SQLite (glebarez/sqlite) o PostgreSQL | back/server/server.go:76-95 (switch de motor) |
| **Frontend - Framework** | React + TypeScript | front/src/App.tsx, package.json |
| **Frontend - Build** | Vite | front/vite.config.ts |
| **Frontend - Node.js** | 24.18.0 | front/package.json |
| **Infraestructura - Orquestación** | Docker Compose | docker-compose.yml (declarado, NO verificado) |

**Nota:** La base de datos actual está configurada en `back/config/config.json` como SQLite (`test.db`). PostgreSQL es una opción alternativa en el código, pero no está en uso en esta medición.

---

## 4. Cómo Levantar el Sistema

**Verificado:** 2026-08-24, Commit 308490f, Windows 11 sin Docker

### Backend (Go)

```bash
cd back
go mod download
go build ./...
go run main.go
```

**Resultado esperado:** Servidor escuchando en `http://localhost:8000`

**Requisito importante:** El backend exige un archivo `.env` en el directorio `back/` aunque esté configurado para SQLite.

```bash
# Crear .env (ver .env.example en la raíz)
cp ../.env.example .env

# O manualmente, con las variables (sin valores sensibles en el repo):
# DB_HOST=localhost
# DB_USER=root
# DB_PASSWORD=root
# DB_NAME=test.db
# DB_PORT=5432
```

Si `.env` no existe, el arranque falla con `Fatal` en `godotenv.Load()` (véase riesgo R-02 en dossier/01-contexto-sistema.md).

### Frontend (React + Vite)

```bash
cd front
npm install
npm run dev
```

**Resultado esperado:** Servidor de desarrollo en `http://localhost:5173` (o puerto disponible siguiente)

---

## 5. API Expuesta

| Método | Ruta | Descripción | Status |
|---|---|---|---|
| POST | `/death` | Crear nuevo kill con imagen | ✅ Implementado |
| GET | `/death` | Listar todos los kills | ✅ Implementado |
| GET | `/death/{id}` | Obtener kill por ID | ✅ Implementado |
| PATCH | `/deathUpdate/{id}` | Actualizar kill (parcial) | ✅ Implementado |
| GET | `/static/{filename}` | Servir archivos de uploads | ✅ Implementado |

**Base URL:** `http://localhost:8000`

---

## 6. Dossier Arquitectónico

| Documento | Contenido | Estado | Enlace |
|---|---|---|---|
| 01-contexto-sistema.md | 8 riesgos verificados con código citado | ✅ Completado | [dossier/01-contexto-sistema.md](dossier/01-contexto-sistema.md) |
| 02-stakeholders-drivers.md | 6 stakeholders, 4 drivers priorizados, trade-offs | ✅ Completado | [dossier/02-stakeholders-drivers.md](dossier/02-stakeholders-drivers.md) |
| 03-atributos-calidad.md | 6 atributos operacionalizables, decisiones IA registradas | ✅ Completado | [dossier/03-atributos-calidad.md](dossier/03-atributos-calidad.md) |
| 04-escenarios-calidad.md | 5 escenarios (ESC-01 a ESC-05), línea base | ✅ Completado | [dossier/04-escenarios-calidad.md](dossier/04-escenarios-calidad.md) |
| Medición de línea base | ESC-01 (Rendimiento k6) — 3 corridas, mediana p95 = 1111.83 ms | ✅ Completado | [dossier/04-escenarios-calidad.md#9-tabla-de-resultados-ejecutado-2026-08-24](dossier/04-escenarios-calidad.md#9-tabla-de-resultados-ejecutado-2026-08-24) |

---

## 6.1 Resultado de la Medición de Línea Base (S4)

**Escenario:** ESC-01 — Rendimiento de GET /death bajo carga  
**Fecha de ejecución:** 2026-08-24  
**Commit medido:** d3e06e6  

### Resumen de Resultados

| Corrida | Requests | p95 latencia (ms) | p99 latencia (ms) | Error rate | Nota |
|---------|----------|---|---|---|---|
| **Warmup (descartada)** | 1559 | 1570 | 2047 | 0% | Calentamiento |
| **Run-2 (válida)** | 1350 | 1610 | 2134 | 0% | — |
| **Run-3 (válida)** | 2205 | 613.65 | 1289 | 0% | Menos carga CPU |
| **Mediana (run-2, run-3)** | — | **1111.83** | — | **0%** | **Resultado final** |

### Veredicto: ✗ **NO CUMPLE**

- **Umbral prerregistrado:** p95 < 500 ms (ADR-004)
- **Mediana observada:** 1111.83 ms
- **Brecha:** +611.83 ms (2.2× sobre umbral)
- **Tasa de error:** 0% (cumple perfectamente)

### Observaciones Clave

1. **Incumplimiento estructural:** Ninguna corrida cumplió el umbral. El problema no es variabilidad aleatoria sino un fallo de diseño.

2. **Causa identificada:** `handleGetAllKills()` en [back/server/kill_handlers.go:35](back/server/kill_handlers.go#L35) trae todos los 3302 registros sin paginación. Respuesta de 557 KB.

3. **Variabilidad de 2.6× entre corridas:** Causada por contención de CPU (k6, backend, SQLite comparten máquina). Run-3 más rápida (613.65 ms) que run-2 (1610 ms).

4. **Error rate perfecto (0%):** Sistema es lento, no inestable. Sin timeouts ni fallos de conexión.

### Documentación Asociada

- [dossier/04-escenarios-calidad.md — Sección 9](dossier/04-escenarios-calidad.md#9-tabla-de-resultados-ejecutado-2026-08-24) — Tabla de resultados detallada
- [dossier/04-escenarios-calidad.md — Sección 10](dossier/04-escenarios-calidad.md#10-contraste-contra-umbral) — Análisis y raíz del problema
- [experimentos/medicion-escenario-01/condiciones.md](experimentos/medicion-escenario-01/condiciones.md) — Contexto completo de ejecución

---

## 7. Estado por Semana

| Semana | Fecha | Hito | Estado |
|---|---|---|---|
| S1 | 2026-08-03 | Sistema base adoptado, repositorio de trabajo creado | ✅ Completada |
| S2 | 2026-08-24 | Sistema arrancando, reproducibilidad verificada | ✅ Completada |
| S3 | 2026-08-24 | Atributos priorizados, dossier completado (4 documentos) | ✅ Completada |
| S4 | 2026-08-24 | Medición de línea base (ESC-01): 3 corridas, veredicto NO CUMPLE | ✅ Completada |

---

## 8. Declaración de Uso de IA

El equipo usó asistencia de IA (Claude, Anthropic) para:
- ✅ Organización estructural del dossier y experimentos
- ✅ Lectura automatizada del código heredado
- ✅ Auditoría de completitud y consistencia

**El equipo es responsable de:**
- ✅ Decisiones arquitectónicas (qué se incluye, qué no)
- ✅ Priorización de atributos (Seguridad > Rendimiento > Mantenibilidad > Disponibilidad)
- ✅ Umbrales de medición (p95 < 500ms)
- ✅ Interpretación de resultados

**Registro detallado:** Véase [dossier/03-atributos-calidad.md — Sección 6](dossier/03-atributos-calidad.md#6-tabla-de-registro-uso-de-ia-en-decisiones) para matriz de decisiones IA vs equipo.

---

## Licencia

Sistema base heredado del repositorio original. Véase https://github.com/IsergioG/PA-FINAL-PROJECT
