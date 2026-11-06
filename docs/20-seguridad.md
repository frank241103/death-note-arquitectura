# 20 — Seguridad: modelado de amenazas, controles y riesgos aceptados

**Fase:** IV · **Semana:** 13
**Fecha:** 2026-11-06
**Commit analizado:** `25817da`
**ADR asociado:** [`adrs/ADR-008-control-acceso-media.md`](../adrs/ADR-008-control-acceso-media.md)
**Prueba ejecutable:** [`experimentos/prueba-seguridad-01/`](../experimentos/prueba-seguridad-01/)

---

## 1. Alcance y límite de este documento

Se modelan las amenazas del **backend Go y su almacén de archivos**, que es lo
que el equipo controla y puede medir.

**Fuera de alcance, declarado:** la seguridad del navegador y del frontend
React, la del host donde se despliega, y la cadena de suministro de
dependencias npm — salvo por el dato que se registra en §8, que se reporta sin
tratarlo.

Este documento **no sustituye** la tabla de riesgos técnicos de
`dossier/01-contexto-sistema.md`: la toma como entrada y la convierte en
amenazas con clasificación y tratamiento.

---

## 2. Inventario de activos

| ID | Activo | Dónde vive | Por qué importa |
|---|---|---|---|
| **AC-01** | Registros de muerte (nombre, causa, detalles) | Tabla `kills` en `test.db` (SQLite) | Es el dato de negocio. En la ficción contiene información sobre personas identificadas |
| **AC-02** | Imágenes de rostro | `back/uploads/` en el sistema de archivos | Dato biométrico por naturaleza: una cara asociada a un nombre |
| **AC-03** | Credenciales de base de datos | Variables `POSTGRES_*` en `.env` | Dan acceso directo a AC-01 |
| **AC-04** | Archivo de base de datos completo | `back/test.db` | Copiarlo equivale a copiar AC-01 entero |
| **AC-05** | Disponibilidad del servicio | Proceso `http.Server` | Sin él no hay sistema |

> **Observación sobre AC-02.** Una imagen de rostro unida a un nombre y una
> causa de muerte es el activo más sensible del sistema, y es precisamente el
> que hoy se sirve sin ningún control (ver T-02).

---

## 3. Límites de confianza

```
  ┌─ Internet (NO CONFIABLE) ──────────────────────────────┐
  │   Cualquier cliente HTTP: navegador, curl, k6, bot     │
  └────────────────────────────┬───────────────────────────┘
                               │  ← LÍMITE 1: no hay autenticación en ningún punto
  ┌────────────────────────────▼───────────────────────────┐
  │  Backend Go  :8000                                     │
  │   router ─► handlers ─► repository                     │
  │          └► http.FileServer  (/static/)                │
  └──────┬──────────────────────────────┬──────────────────┘
         │ ← LÍMITE 2                   │ ← LÍMITE 3
  ┌──────▼────────┐             ┌───────▼──────────────────┐
  │ SQLite test.db│             │ Sistema de archivos      │
  │   (AC-01)     │             │ back/uploads/  (AC-02)   │
  └───────────────┘             └──────────────────────────┘
```

| Límite | Qué debería separar | Qué lo controla hoy |
|---|---|---|
| **1** — Internet ↔ aplicación | Peticiones legítimas de las que no lo son | **Nada.** No hay autenticación ni autorización en ninguna ruta |
| **2** — Aplicación ↔ base | Acceso a AC-01 solo a través de reglas de dominio | El repositorio, pero sin control de autorización |
| **3** — Aplicación ↔ archivos | Acceso a AC-02 solo tras una comprobación | **Nada.** `http.FileServer` lee directo del disco |

**El límite 1 es el que no existe.** Todo lo demás se deriva de eso.

---

## 4. Amenazas identificadas

Clasificación: **P** = probabilidad, **I** = impacto, ambos Alto / Medio / Bajo.
La columna *Evidencia* distingue lo verificado de lo deducido.

| ID | Amenaza | Activo | Vector | P | I | Evidencia |
|---|---|---|---|:-:|:-:|---|
| **T-01** | Lectura masiva no autorizada del registro completo | AC-01 | `GET /death` sin credencial devuelve todos los registros | **A** | **A** | ✅ Medido: 557 kB, 3302 registros (`run-2.json`) |
| **T-02** | Descarga no autorizada de imágenes de rostro | AC-02 | `GET /static/<archivo>` sin credencial | **A** | **A** | ✅ Verificado en código: `router.go:15`, sin middleware. Riesgo R-06 |
| **T-03** | Enumeración del directorio de imágenes | AC-02 | `GET /static/` | **M** | **A** | 🔶 A confirmar con PS-01 vector A-04 |
| **T-04** | Lectura de archivos fuera de `uploads/` (path traversal) | AC-03, AC-04 | `GET /static/../.env` | **B** | **A** | 🔶 A confirmar con PS-01 vector A-05. `http.FileServer` normalmente sanea, pero no se había comprobado |
| **T-05** | Exfiltración cruzada con credenciales del usuario | AC-01 | CORS `AllowedOrigins:["*"]` junto a `AllowCredentials:true` | **M** | **A** | ✅ Verificado en código: `server.go`. Riesgo R-05 |
| **T-06** | Exposición de la contraseña de base en los registros de arranque | AC-03 | `fmt.Println` con 4 verbos `%s` y 0 argumentos | **B** | **A** | ✅ Observado: imprime `%!s(MISSING)`. **Hoy no filtra**, pero cualquiera que "arregle" la línea pasándole los argumentos convierte el error en fuga. Riesgo R-01 |
| **T-07** | Agotamiento de conexiones (denegación de servicio) | AC-05 | Conexiones lentas sostenidas; `http.Server` sin timeouts | **M** | **M** | 🔶 Deducido de código. Riesgo R-08, fallo F-01 |
| **T-08** | Saturación por respuesta desproporcionada | AC-05 | `GET /death` concurrente; sin paginación | **A** | **M** | ✅ Medido: p95 1114,69 ms contra umbral de 500 ms |
| **T-09** | Escritura arbitraria de archivos vía nombre de imagen | AC-02 | `POST /death` con un `filename` manipulado | **B** | **A** | 🔶 **No comprobado.** `kill_handlers.go:110-121` construye la ruta con el nombre recibido |

---

## 5. Matriz de probabilidad e impacto

| | **Impacto Bajo** | **Impacto Medio** | **Impacto Alto** |
|---|---|---|---|
| **Prob. Alta** | — | T-08 | **T-01 · T-02** |
| **Prob. Media** | — | T-07 | **T-03 · T-05** |
| **Prob. Baja** | — | — | T-04 · T-06 · T-09 |

**Cuadrante crítico (Alta/Alta): T-01 y T-02.** Las dos nacen del mismo hecho:
no existe el límite de confianza 1.

---

## 6. Controles arquitectónicos propuestos

| ID | Control | Amenazas que atiende | Dónde se implementa | Estado |
|---|---|---|---|---|
| **C-01** | Autenticación en el borde: middleware que valide un token antes de cualquier handler | T-01, T-02, T-03 | `platform` (`router.go`), antes de registrar rutas | 🔶 Propuesto |
| **C-02** | Autorización en el acceso a medios, interponiendo el puerto `AlmacenDeImagenes` del ADR-005 entre la ruta y el disco | T-02, T-03, T-04 | Adaptador nuevo que sustituye a `http.FileServer` | 🔶 Propuesto — **ADR-008** |
| **C-03** | Paginación obligatoria con tope por defecto | T-01, T-08 | `repository/kill_repository.go:22` | 🔶 Propuesto — táctica T-07 de `docs/17` |
| **C-04** | Lista explícita de orígenes, o `AllowCredentials:false` | T-05 | `server.go`, construcción de CORS | 🔶 Propuesto — táctica T-06 de `docs/17` |
| **C-05** | Eliminar la traza de arranque que formatea credenciales | T-06 | `server.go` | 🔶 Propuesto. Coste: una línea |
| **C-06** | `ReadTimeout`, `WriteTimeout` e `IdleTimeout` en `http.Server` | T-07 | `server.go` | 🔶 Propuesto — **condición exigida por el mini-comité 1** |
| **C-07** | Nombre de archivo generado por el servidor (UUID), ignorando el del cliente | T-09 | `kill_handlers.go` | 🔶 Propuesto |
| **C-08** | Restricción ejecutable que impide que el dominio alcance `os` y la red | T-02, T-09 (prevención) | `scripts/fitness/ff-01-...` | ✅ **Implementado y en CI** |

**De ocho controles, uno está implementado.** Los otros siete están propuestos
con su punto de implementación identificado. No se presenta ninguno como
vigente.

---

## 7. Riesgos aceptados

Se declaran de forma explícita, con su justificación y su condición de
revisión.

| ID | Riesgo que se acepta | Por qué se acepta ahora | Qué lo haría inaceptable |
|---|---|---|---|
| **RA-01** | El sistema opera sin autenticación (T-01, T-02) | Es un proyecto académico, con datos ficticios, desplegado en local y sin exposición pública. Implementar C-01 implica un modelo de identidad que el alcance de la asignatura no contempla | Cualquier despliegue accesible desde una red que no sea `localhost`, o datos que dejen de ser ficticios |
| **RA-02** | T-04 y T-09 quedan sin comprobación hasta ejecutar PS-01 | La prueba existe y está escrita; falta su ejecución registrada | Que PS-01 confirme alguno de los dos: dejarían de ser riesgos aceptados y pasarían a ser defectos a corregir |
| **RA-03** | Las vulnerabilidades de dependencias npm del frontend no se tratan | Fuera del alcance declarado en §1; el backend es el sistema modelado | Que una de ellas resulte explotable desde el backend |

> **RA-01 es la decisión de seguridad más importante del proyecto y se toma a
> conciencia, no por omisión.** Está registrada en `ADR-008`.

---

## 8. Dato reportado sin tratar

`npm audit` sobre el frontend reporta **21 vulnerabilidades, 14 de ellas
altas**, según consta en el README desde agosto. Este documento **no las
trata** (RA-03) y **no las reinterpreta**: se reportan como dato pendiente de
contraste contra el estado actual de `front/package-lock.json`.

---

## 9. Evidencia ejecutable: prueba PS-01

El sílabo exige una prueba que intente deliberadamente provocar una fuga de
datos. Está en
[`experimentos/prueba-seguridad-01/prueba-fuga-datos.sh`](../experimentos/prueba-seguridad-01/prueba-fuga-datos.sh)
y ejercita seis vectores:

| Vector | Amenaza que intenta confirmar |
|---|---|
| A-01 | T-01 — listado completo sin credencial |
| A-02 | Descubrimiento de rutas de imagen desde la propia respuesta |
| A-03 | T-02 — descarga de imagen sin credencial |
| A-04 | T-03 — enumeración del directorio |
| A-05 | T-04 — path traversal hacia `.env` y `test.db` |
| A-06 | T-05 — CORS con credenciales desde origen arbitrario |

### Cómo ejecutarla

```
# Terminal 1
cd back && go run main.go

# Terminal 2
bash experimentos/prueba-seguridad-01/prueba-fuga-datos.sh
```

Los resultados quedan en
`experimentos/prueba-seguridad-01/resultados/ps-01-resultados.txt`.

### Resultados

> ⬜ **PENDIENTE DE EJECUCIÓN.** La prueba está escrita y versionada; sus
> resultados no se han registrado todavía. Esta sección se completa con la
> salida real del script, no con una previsión. Las filas marcadas 🔶 en §4
> dependen de ella.

---

## 10. Costo de la capa de seguridad sobre el p95

El arco del curso pide registrar el efecto de la seguridad sobre la latencia.

> `[EVIDENCIA FALTANTE]` **No se puede medir todavía, porque ningún control de
> los propuestos está implementado.** Medir "antes y después" exige que exista
> un después.

Lo que sí está acotado es **dónde** aparecería ese costo. El `ADR-005` §7 ya lo
anticipa para C-02: interponer un adaptador delante del almacén de imágenes
introduce latencia por petición de archivo, y el propio ADR lo declara como no
medido.

**Procedimiento acordado para medirlo cuando C-02 exista**, usando el protocolo
ya validado de `docs/experiment/02-protocolo.md`:

1. Línea base: ya está medida (`run-1..4.json`, p95 1114,69 ms).
2. Implementar C-02.
3. Repetir el mismo escenario, mismo commit documentado, misma semilla.
4. Reportar la diferencia de p95 como el costo de la capa.

---

## 11. Trazabilidad

| Referencia | Dónde |
|---|---|
| Riesgos técnicos de origen (R-01 a R-08) | `dossier/01-contexto-sistema.md` |
| Fallos F-01 a F-10 | `docs/16-matriz-fallos.md` |
| Tácticas T-01 a T-09 | `docs/17-matriz-resiliencia.md` |
| Puerto que habilita C-02 | `adrs/ADR-005-estilo-hexagonal.md` §7 |
| Decisión de seguridad | `adrs/ADR-008-control-acceso-media.md` |
| Restricción ejecutable C-08 | `docs/15-fitness-function-01.md` |
| Prueba de fuga | `experimentos/prueba-seguridad-01/` |
| Protocolo para medir el costo | `docs/experiment/02-protocolo.md` |
| Condición del mini-comité que exige C-06 | `docs/14-acta-mini-comite-1.md` §6 |
