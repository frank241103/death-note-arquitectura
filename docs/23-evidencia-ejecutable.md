# 23 — Evidencia ejecutable consolidada

**Fase:** IV · **Fecha:** 2026-11-06 · **Commit:** `25817da`

> Índice único de todo lo que en este repositorio **se puede volver a
> ejecutar**. Cada entrada dice qué comando la reproduce, dónde están sus
> salidas crudas y qué decisión sostiene.

---

## 1. Resumen

| Tipo | Cuántas | Estado |
|---|:-:|---|
| Mediciones de línea base | **5 corridas** | ✅ Ejecutadas y publicadas |
| Experimentos de crecimiento | 1 barrido (4 escalones) | ✅ Ejecutado · H1 validada |
| Spikes con criterio prerregistrado | 1 | ✅ Ejecutado, veredicto validado |
| Restricciones ejecutables (fitness functions) | 2 | ✅ Corriendo en CI, con prueba negativa |
| Pruebas de seguridad | 1 | ✅ **Ejecutada** — 3 de 6 vectores confirmaron exposición |
| Pruebas unitarias | 15 | ✅ En verde, ejecutándose en CI |
| Mediciones antes/después de una táctica | 1 (CS-01) | ✅ Ejecutada · costo por debajo del ruido |
| Verificaciones de escenario con captura | 4 | ✅ Registradas |

---

## 2. Medición de línea base — ESC-01

**Pregunta:** ¿cuánto tarda `GET /death` con la base sembrada?

| | |
|---|---|
| Umbral prerregistrado | p95 < 500 ms, fijado en `docs/experiment/01-preregistro.md` §3 |
| Resultado | **p95 = 1114,69 ms** → ❌ incumple |
| Commit medido | `d3e06e6` |
| Instrumento | k6 v2.2.0 |
| Corridas | 4 (la nº 1 descartada y declarada en `02-protocolo.md` §9) |
| Segunda máquina | `resultados/contexto-maquina-2.json`, `run-4.json` |
| Integridad | `resultados/SHA256SUMS.txt`, 7 entradas |
| Códigos de respuesta | `run-2.json` → `"status is 200"`, 1349 pass / 0 fail |

**Reproducir:**
```
cd back && go run main.go                      # terminal 1
cd experimentos/medicion-escenario-01           # terminal 2
k6 run scripts/baseline.js
```

**Sostiene:** `ADR-002` (SQLite como línea base), `ADR-003` (k6 como
instrumento), ESC-01 de `dossier/04`, fallo F-07.

---

## 3. Spike-01 — Acoplamiento síncrono con el almacén de archivos

**Hipótesis:** la escritura síncrona de la imagen domina la latencia de
`POST /death`.

**Criterio prerregistrado, fijado antes de medir:** se valida si el tiempo
atribuible a la escritura supera el **40 %** del p95.

| Métrica (`http_req_duration`) | `POST /death` | `PATCH /deathUpdate` | Proporción |
|---|---:|---:|---:|
| p95 | **1730,45 ms** | **505,87 ms** | **70,8 %** |
| Mediana | 45,95 ms | 21,57 ms | 53,1 % |
| Promedio | 299,25 ms | 69,59 ms | 76,7 % |
| Mínimo | 12,76 ms | 14,18 ms | — |

**Veredicto: VALIDADA** (70,8 % > 40 %).
**Commit medido:** `30a262d`.
**Salidas crudas:** `experimentos/spike-01-integracion/resultados/*.json`.

**Hallazgos secundarios:** `POST /death` cruzó su propio umbral de 1000 ms; la
razón p95/mediana es **37,7×**; y el **mínimo de `POST` es menor que el de
`PATCH`** — en ausencia de contención, escribir el archivo no cuesta
prácticamente nada. La lectura que la evidencia soporta es encolamiento bajo
concurrencia, no costo fijo.

**Limitación declarada:** el 70,8 % es una **cota superior**, no el costo puro
de escritura. `POST` también parsea `multipart/form-data`, hace `INSERT` en vez
de `UPDATE` y transporta unas 4 veces más datos.

**Reproducir:**
```
cd back && go run main.go
cd experimentos/medicion-escenario-01
k6 run scripts/seed-load.js   --summary-export=../spike-01-integracion/resultados/post-baseline.json
k6 run scripts/patch-probe.js --summary-export=../spike-01-integracion/resultados/patch-probe.json
```

**Sostiene:** `ADR-007`.

> **Corrección registrada.** Entre el 2026-10-09 y el 2026-10-23 este
> documento contuvo una tabla comparativa síncrona/asíncrona cuyas cifras no
> correspondían a ningún archivo de resultados. Se retiró y la constancia
> quedó en `spike-01-integracion/README.md` §9, en lugar de borrarla en
> silencio. Ver `docs/24-uso-ia.md` §4.

---

## 3.bis Re-medición final — ESC-01 sobre el commit actual

| | |
|---|---|
| Commit medido | `772378b` (la línea base de agosto fue `d3e06e6`) |
| Fecha | 2026-11-06 |
| Resultado | **p95 = 1990 ms** contra un umbral de 500 ms → ❌ incumple |
| Registros en base | 3602 (en agosto eran 3302) |
| Tasa de error | 0,00 % · 5156/5156 checks |
| Salida cruda | `medicion-escenario-01/resultados/run-5-remedicion-final.json` |

El umbral se sigue incumpliendo tres meses después. **No se ajustó.**

`[EVIDENCIA FALTANTE]` La comparación directa contra agosto es poco fiable:
las corridas válidas de entonces fueron 1615,7 ms y 613,7 ms sobre la misma
máquina y el mismo commit — un 163 % de diferencia entre sí. Una corrida única
no permite atribuir la variación al crecimiento de la base. Lo que sí sostiene
el dato es que **el incumplimiento persiste**, que es la afirmación que el
dossier hace.

---

## 3.ter Experimento de crecimiento EC-01

**Documento completo:** [`docs/26-experimento-crecimiento.md`](./26-experimento-crecimiento.md)

Barrido de carga en serie sobre `GET /death`, cuatro escalones de 30 s.

| VUs | p95 | Rendimiento (ley de Little) |
|---:|---:|---:|
| 5 | 149,9 ms | 36,6 req/s |
| 10 | 439,6 ms | 24,9 req/s |
| 25 | 1150 ms | 23,1 req/s |
| 50 | 2320 ms | 22,8 req/s |

**Criterio prerregistrado:** p95(50)/p95(5) > 10 → **15,48 → H1 validada.**

**Hallazgo principal:** el rendimiento se estanca en **~23 req/s**. El sistema
satura entre 5 y 10 usuarios; a partir de ahí la latencia crece **linealmente**
porque cada usuario solo añade cola. Verificado con la ley de Little: los
escalones de 25 y 50 VUs encajan con la predicción dentro del **1 %**.

Cero errores en 3245 peticiones: el sistema **no se rompe, se encola**.

**Reproducir:**
```
cd back && go run main.go
cd experimentos/experimento-crecimiento
k6 run scripts/barrido-carga.js --summary-export=resultados/ec-01-barrido.json
```

---

## 4. Restricciones ejecutables (fitness functions)

Ambas corren en `.github/workflows/ci.yml`, en cada `push` a `main`/`develop`
y en cada `pull_request` a `main`.

### FF-01 — El dominio no depende de infraestructura

| | |
|---|---|
| Decisión protegida | `ADR-005` (hexagonal) |
| Propiedad | `back/api` y `back/models` no dependen de terceros ni de `net/http`, `os`, `net`, `database/sql` |
| Estado medido | ✅ CUMPLE — cero dependencias externas |
| Prueba negativa | Inyecta `import _ "net/http"` en `models/`, verifica la detección y borra el archivo |
| Contrato | `docs/15-fitness-function-01.md` |

```
bash scripts/fitness/ff-01-dominio-sin-infraestructura.sh
bash scripts/fitness/ff-01-dominio-sin-infraestructura.sh --prueba-negativa
```

### FF-02 — La dirección de dependencias respeta la matriz

| | |
|---|---|
| Decisión protegida | `ADR-006` (límites de módulos) |
| Propiedad | Ningún paquete de `kill` (`api`, `models`, `repository`) depende de `platform` (`server`, `config`, `logger`) |
| Estado medido | ✅ CUMPLE |
| Prueba negativa | Inyecta `import _ "backend-avanzada/config"` en `repository/` |
| Contrato | `docs/19-fitness-function-02.md` |

```
bash scripts/fitness/ff-02-direccion-dependencias.sh
bash scripts/fitness/ff-02-direccion-dependencias.sh --prueba-negativa
```

**Por qué son dos y no una repetida:** protegen decisiones distintas
(`ADR-005` vs `ADR-006`), miran grafos distintos (dependencias externas vs
dirección interna) y pueden fallar por separado. Si `repository` importara
`config`, FF-01 seguiría verde y FF-02 fallaría.

---

## 4.bis Medición CS-01 — Costo de la capa de seguridad

**Análisis completo:** [`docs/20-seguridad.md`](./20-seguridad.md) §10

Es la **táctica T-04 medida antes y después**: el control C-02 se implementó,
se midió con él apagado y encendido, y se comparó.

| Métrica | Sin control | Con control | Variación |
|---|---:|---:|---:|
| p95 | 3,04 ms | 3,01 ms | −0,99 % |
| Mediana | 2,31 ms | 2,31 ms | 0,00 % |
| Rendimiento | 4065,8 req/s | 4049,5 req/s | −0,40 % |

**Veredicto:** el costo no se distingue del ruido. Cota superior defendible:
**< 0,04 ms sobre el p95**, con 246 039 peticiones medidas.

**Reproducir:**
```
# A: control apagado
cd back && go run main.go
k6 run scripts/costo-c02.js -e ARCHIVO=seed.png --summary-export=resultados/cs-01-sin-control.json

# B: control encendido
MEDIA_AUTH_ENABLED=true MEDIA_AUTH_TOKEN=token-de-prueba go run main.go
k6 run scripts/costo-c02.js -e ARCHIVO=seed.png -e TOKEN=token-de-prueba --summary-export=resultados/cs-01-con-control.json
```

(En Windows, `set MEDIA_AUTH_ENABLED=true` antes de `go run main.go`.)

---

## 5. Prueba de seguridad PS-01 — Intento de fuga de datos

**Estado:** ✅ **Ejecutada el 2026-11-06** sobre el commit `f7895f4`.

| Vector | Resultado |
|---|---|
| A-01 | 🔴 200 · 629.721 bytes · 3602 registros sin credencial |
| A-03 | ⚠️ 404 por `uploads/` ausente (F-05), no por control de acceso |
| A-04 | 🔴 200 con listado navegable del directorio |
| A-05 | ✅ Path traversal bloqueado en los 4 intentos |
| A-06 | 🔴 `Allow-Origin: *` junto a `Allow-Credentials: true` |

**3 de 6 vectores confirmaron exposición.** Salida cruda en
`experimentos/prueba-seguridad-01/resultados/ps-01-resultados.txt`.
Análisis en `docs/20-seguridad.md` §9.

Seis vectores: listado sin credencial, descubrimiento de rutas, descarga de
imagen, enumeración de directorio, path traversal y CORS con credenciales.

**Ejecutar:**
```
cd back && go run main.go
bash experimentos/prueba-seguridad-01/prueba-fuga-datos.sh
```

Salida en `experimentos/prueba-seguridad-01/resultados/ps-01-resultados.txt`.

**Qué resolvió:** confirmó T-01, T-03 y T-05; descartó T-04; y confirmó el
supuesto S-3 de `ADR-008`. **T-09 sigue sin comprobar**: es un vector de
escritura y PS-01 solo ejerce lectura.

---

## 6. Verificaciones de escenario con captura

| Escenario | Qué demuestra | Captura |
|---|---|---|
| ESC-02 | 404 en `/static/` desde un clon limpio (F-05) | `esc-02-static-404.png.png` |
| ESC-03 | El proceso termina al arrancar sin `.env` (F-02) | `esc-03-sin-env.png.png` |
| ESC-04 | Pánico con motor de base no soportado (F-03) | `esc-04-mongodb-panic.png.png` |
| ESC-05 | `POST /death` rechaza JSON con 400 (F-08) | `esc-05-rechazo-400.png.png` |

En `experimentos/verificacion-escenarios/`.

---

## 7. Lo que NO hay como evidencia ejecutable

Se declara para que nadie lo suponga:

| # | Qué falta | Por qué |
|---|---|---|
| ~~N-01~~ | ~~Experimento de crecimiento~~ | ✅ **Resuelto el 2026-11-06.** EC-01 midió 4 escalones (`docs/26`) |
| ~~N-02~~ | ~~Táctica medida antes/después~~ | ✅ **Resuelto el 2026-11-06.** CS-01 midió T-04 (control C-02) antes y después |
| ~~N-03~~ | ~~Costo de la capa de seguridad sobre el p95~~ | ✅ **Resuelto el 2026-11-06.** CS-01, `docs/20` §10 |
| ~~N-04~~ | ~~Pruebas unitarias~~ | ✅ **Resuelto el 2026-11-06.** 15 pruebas en `api`, `models` y `server`, ejecutándose en CI con `go test ./...` |
| **N-05** | Ejecución del despliegue en contenedores | Nunca se levantó (`docs/21` §1.2) |

> **N-01 y N-02 corresponden a la semana 11 del sílabo.** Se declaran como
> ausentes en lugar de presentar las mediciones existentes como si cubrieran
> ese entregable.

---

## 8. Cómo reproducir todo desde cero

```
git clone https://github.com/frank241103/death-note-arquitectura
cd death-note-arquitectura

cp back/.env.example back/.env          # sin esto el backend no arranca (F-02)
mkdir -p back/uploads                   # sin esto /static/ da 404 (F-05)

cd back && go run main.go               # terminal 1, escucha en :8000

# terminal 2
bash scripts/fitness/ff-01-dominio-sin-infraestructura.sh
bash scripts/fitness/ff-02-direccion-dependencias.sh
cd experimentos/medicion-escenario-01 && k6 run scripts/baseline.js
bash ../prueba-seguridad-01/prueba-fuga-datos.sh
```

Los dos primeros pasos **son obligatorios** y son, en sí mismos, los fallos
F-02 y F-05 documentados.
