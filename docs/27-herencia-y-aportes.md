# 27 — Sistema heredado y aportes del equipo

**Fecha:** 2026-11-06
**Motivo:** el profesor autorizó adoptar un proyecto anterior (opción C) **y
pidió identificar explícitamente qué partes son heredadas.** Este documento
responde a eso.

> La pregunta que debe poder responderse con este documento es:
> **¿cómo se demuestra que la evaluación arquitectónica es trabajo de este
> semestre y no una característica heredada del proyecto antiguo?**

---

## 1. La frontera es un commit, no una afirmación

El historial de Git marca el corte sin ambigüedad:

| Commit | Fecha | Autor | Qué es |
|---|---|---|---|
| `b76332e` | 2025-05-19 | `sergiocoba-IND` | `FINAL_PROJECT` — el sistema completo |
| `4ebec3b` | 2025-05-19 | `sergiocoba-IND` | `UPDATE_README` — **último commit heredado** |
| `308490f` | 2026-08-24 | David Rodríguez | **primer commit del equipo** |

**Todo lo anterior a `4ebec3b` inclusive es heredado. Todo desde `308490f` es
de este semestre.** Hay quince meses de diferencia entre ambos.

Cualquiera puede reconstruir el estado heredado con un solo comando:

```
git show 4ebec3b --stat
git ls-tree -r --name-only 4ebec3b
git diff 4ebec3b HEAD --stat
```

---

## 2. El sistema heredado

| Medida | Valor |
|---|---|
| Archivos versionados en `4ebec3b` | **54** |
| Autor | `sergiocoba-IND` (reconocido en `ADR-001`) |
| Origen | `github.com/IsergioG/PA-FINAL-PROJECT` |

**Qué contenía:** el backend Go completo (`api`, `config`, `logger`, `models`,
`repository`, `server`, `main.go`), el frontend React + Vite, los dos
Dockerfile y el `docker-compose.yml`.

**Qué NO contenía:** ni un solo documento de arquitectura, ni medición, ni
experimento, ni prueba automatizada, ni workflow de integración continua.

---

## 3. Lo que aportó el equipo

| Medida | Valor |
|---|---|
| Archivos versionados hoy | **143** |
| Archivos nuevos del equipo | **89** |
| Archivos heredados modificados | **11** |
| Archivos heredados intactos | **43** |

### 3.1 Los 11 archivos heredados que se modificaron, y por qué

| Archivo | Qué cambió | Trazable a |
|---|---|---|
| `.env` | **Eliminado del control de versiones** y sustituido por `.env.example` | commit `d3e06e6` · riesgo R-03 |
| `back/.gitignore` | Añadidos `.env`, `uploads/`, `*.db` | `d3e06e6` |
| `back/config/config.json` | Motor fijado a SQLite como línea base | `ADR-002` |
| `back/go.mod` · `go.sum` | Driver SQLite cambiado de `gorm.io/driver/sqlite` a `glebarez/sqlite` (Go puro, sin CGO) para poder construir sin cadena C | `ADR-002` |
| `back/server/server.go` | **Control C-05**: eliminada la traza que formateaba credenciales | riesgo R-01 · `docs/16` §7 |
| `back/server/router.go` | **Control C-02**: autorización delante del almacén de imágenes | `ADR-008` |
| `front/src/pages/dn-list.tsx` | Corregido error de TypeScript que rompía el CI | — |
| `front/src/pages/kill-register.tsx` | Íd. | — |
| `docker-compose.yml` | Ajustes de configuración | `docs/21` |
| `README.md` | Reescrito por completo | — |

**El código de negocio heredado sigue prácticamente intacto.** `server.go` pasó
de 99 a 110 líneas; los handlers, el repositorio, los modelos y los DTO **no se
tocaron**. Eso es deliberado: el objeto de la asignatura era *evaluar* una
arquitectura existente, no reescribirla.

### 3.2 Lo que es íntegramente de este semestre

| Categoría | Qué | Archivos |
|---|---|---|
| **Dossier arquitectónico** | Contexto, stakeholders, atributos, escenarios | `dossier/01` a `04` |
| **Modelado C4** | Tres niveles + matriz de trazado T-01 a T-18 | `docs/05` a `07` |
| **Decisiones** | 8 ADR, dos confirmados por mini-comité | `adrs/` |
| **Análisis** | Estilo, mapa modular, fallos, resiliencia, costos, seguridad, despliegue, evaluación | `docs/09` a `26` |
| **Experimentos** | Línea base (5 corridas), spike-01, crecimiento, prueba de fuga, costo de seguridad | `experimentos/` |
| **Restricciones ejecutables** | FF-01 y FF-02, con prueba negativa | `scripts/fitness/` |
| **Pruebas automatizadas** | 15 pruebas unitarias | `back/*/\*_test.go` |
| **Integración continua** | Workflow con build, pruebas y fitness functions | `.github/workflows/` |

---

## 4. Cómo se demuestra que la evaluación es de este semestre

Tres pruebas independientes, todas verificables sin creernos nada:

**1. Fecha.** El último commit heredado es del 19 de mayo de 2025. Todo el
dossier, los experimentos y las restricciones tienen commits entre agosto y
noviembre de 2026.

**2. Autoría.** `git shortlog -sn` separa los dos commits de `sergiocoba-IND`
de los más de noventa del equipo.

**3. Naturaleza.** El sistema heredado **no contenía ningún artefacto de
evaluación**. No hay un solo documento de arquitectura, medición ni prueba en
`4ebec3b`. Todo lo que este dossier presenta como evidencia se creó después.

> Dicho al revés: si se elimina todo lo que el equipo aportó, queda una
> aplicación que funciona y **cero** evidencia sobre su arquitectura. Esa
> evidencia es exactamente el trabajo del semestre.

---

## 5. Qué de los hallazgos es heredado y qué es nuestro

Conviene separarlo, porque son cosas distintas:

| | |
|---|---|
| **Los defectos son heredados** | R-01 a R-08 existían en `4ebec3b`. No los introdujimos |
| **Encontrarlos es nuestro** | Cada uno está verificado contra código, con archivo y línea |
| **Medirlos es nuestro** | Los umbrales, el prerregistro, las corridas y los JSON crudos |
| **Decidir qué hacer es nuestro** | Los 8 ADR, con alternativas, costos y consecuencias |
| **Corregir dos es nuestro** | C-05 (traza de credenciales) y C-02 (acceso a medios) |
| **Lo que sigue sin corregir es una decisión nuestra**, no un descuido | Declarado en `docs/22` §5 con su costo |

---

## 6. Autorización docente

El profesor **autorizó** el uso de un proyecto anterior como sistema base, y
pidió que se identificaran explícitamente las partes heredadas. Este documento
cumple ese segundo requisito.

`[SUPUESTO]` La autorización fue **verbal**, dada en clase. No existe
documento formal, y no se fabrica uno: se deja constancia de que fue verbal.
Si el profesor prefiere dejarla por escrito, basta con registrarlo aquí.

---

## 7. Trazabilidad

| Referencia | Dónde |
|---|---|
| Decisión de adopción | `adrs/ADR-001-adopcion-opcion-c.md` |
| Repositorio original | `github.com/IsergioG/PA-FINAL-PROJECT` |
| Último commit heredado | `4ebec3b` (2025-05-19) |
| Primer commit del equipo | `308490f` (2026-08-24) |
| Riesgos heredados | `dossier/01-contexto-sistema.md` |
| Controles aplicados por el equipo | `docs/20-seguridad.md` §6 |
| Deuda declarada | `docs/22-evaluacion-arquitectonica.md` §5 |
