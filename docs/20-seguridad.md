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
| **T-01** | Lectura masiva no autorizada del registro completo | AC-01 | `GET /death` sin credencial devuelve todos los registros | **A** | **A** | ✅ **CONFIRMADA** por PS-01 A-01: HTTP 200, 629.721 bytes, 3602 registros |
| **T-02** | Descarga no autorizada de imágenes de rostro | AC-02 | `GET /static/<archivo>` sin credencial | **A** | **A** | ✅ Verificado en código: `router.go:15`, sin middleware. Riesgo R-06 |
| **T-03** | Enumeración del directorio de imágenes | AC-02 | `GET /static/` | **A** | **A** | ✅ **CONFIRMADA** por PS-01 A-04: HTTP 200 con listado navegable |
| **T-04** | Lectura de archivos fuera de `uploads/` (path traversal) | AC-03, AC-04 | `GET /static/../.env` | **MUY B** | **A** | ❌ **NO REPRODUCIBLE.** PS-01 A-05: los 4 intentos rechazados. `http.FileServer` sanea la ruta |
| **T-05** | Exfiltración cruzada con credenciales del usuario | AC-01 | CORS `AllowedOrigins:["*"]` junto a `AllowCredentials:true` | **B** | **A** | ✅ **CONFIRMADA en cabeceras** por PS-01 A-06. Explotabilidad acotada: ver nota al pie de §5 |
| ~~**T-06**~~ | ~~Exposición de la contraseña de base en los registros de arranque~~ | AC-03 | ~~`fmt.Println` con 4 verbos `%s` y 0 argumentos~~ | — | — | 🟢 **MITIGADA el 2026-11-06** por el control C-05: la traza se eliminó de `server.go`. Riesgo R-01 cerrado |
| **T-07** | Agotamiento de conexiones (denegación de servicio) | AC-05 | Conexiones lentas sostenidas; `http.Server` sin timeouts | **M** | **M** | 🔶 Deducido de código. Riesgo R-08, fallo F-01 |
| **T-08** | Saturación por respuesta desproporcionada | AC-05 | `GET /death` concurrente; sin paginación | **A** | **M** | ✅ Medido: p95 1114,69 ms contra umbral de 500 ms |
| **T-09** | Escritura arbitraria de archivos vía nombre de imagen | AC-02 | `POST /death` con un `filename` manipulado | **B** | **A** | 🔶 **No comprobado.** `kill_handlers.go:110-121` construye la ruta con el nombre recibido |

---

## 5. Matriz de probabilidad e impacto

Actualizada tras ejecutar PS-01 el 2026-11-06.

| | **Impacto Bajo** | **Impacto Medio** | **Impacto Alto** |
|---|---|---|---|
| **Prob. Alta** | — | T-08 | **T-01 · T-02 · T-03** |
| **Prob. Media** | — | T-07 | — |
| **Prob. Baja** | — | — | T-05 · T-09 |
| **Prob. muy baja** | — | — | T-04 |

**Cuadrante crítico (Alta/Alta): T-01, T-02 y T-03.** Las tres nacen del mismo
hecho: no existe el límite de confianza 1.

### Qué cambió con la medición

- **T-03 subió** de media a alta: PS-01 A-04 devolvió HTTP 200 con un listado
  navegable. No era una hipótesis, el servidor sí enumera el directorio.
- **T-04 bajó** de baja a muy baja: los cuatro intentos de path traversal
  fueron rechazados. `http.FileServer` sanea la ruta, como suponía S-3 del
  `ADR-008`. **Un supuesto que la prueba confirmó en lugar de refutar.**
- **T-05 bajó** de media a baja. La configuración peligrosa está confirmada en
  cabeceras, pero los navegadores rechazan por sí mismos la combinación
  `Access-Control-Allow-Origin: *` con `Access-Control-Allow-Credentials: true`,
  así que la vía del navegador no es explotable tal cual está. El riesgo real
  aparece si alguien "arregla" la configuración reflejando el origen de la
  petición: ahí la combinación sí funciona. Un cliente que no sea navegador
  ignora CORS por completo, de modo que T-01 sigue siendo el camino directo.

---

## 6. Controles arquitectónicos propuestos

| ID | Control | Amenazas que atiende | Dónde se implementa | Estado |
|---|---|---|---|---|
| **C-01** | Autenticación en el borde: middleware que valide un token antes de cualquier handler | T-01, T-02, T-03 | `platform` (`router.go`), antes de registrar rutas | 🔶 Propuesto |
| **C-02** | Autorización en el acceso a medios: middleware de token delante del almacén | T-02, T-03 | `back/server/media_auth.go` + `router.go` | ✅ **IMPLEMENTADO el 2026-11-06**, desactivado por defecto según RA-01. 6 pruebas unitarias. Costo medido en §10 — **ADR-008** |
| **C-03** | Paginación obligatoria con tope por defecto | T-01, T-08 | `repository/kill_repository.go:22` | 🔶 Propuesto — táctica T-07 de `docs/17` |
| **C-04** | Lista explícita de orígenes, o `AllowCredentials:false` | T-05 | `server.go`, construcción de CORS | 🔶 Propuesto — táctica T-06 de `docs/17` |
| **C-05** | Eliminar la traza de arranque que formatea credenciales | T-06 | `server.go`, `initDB()` | ✅ **IMPLEMENTADO el 2026-11-06.** Detonante: `go vet` hizo fallar `go test ./...` |
| **C-06** | `ReadTimeout`, `WriteTimeout` e `IdleTimeout` en `http.Server` | T-07 | `server.go` | 🔶 Propuesto — **condición exigida por el mini-comité 1** |
| **C-07** | Nombre de archivo generado por el servidor (UUID), ignorando el del cliente | T-09 | `kill_handlers.go` | 🔶 Propuesto |
| **C-08** | Restricción ejecutable que impide que el dominio alcance `os` y la red | T-02, T-09 (prevención) | `scripts/fitness/ff-01-...` | ✅ **Implementado y en CI** |

**De ocho controles, tres están implementados** (C-02, C-05 y C-08) y cinco
siguen propuestos con su punto de implementación identificado.

C-02 está implementado pero **desactivado por defecto**, porque activarlo
rompería el frontend y contradiría el riesgo aceptado RA-01. Queda tras el
interruptor `MEDIA_AUTH_ENABLED`, lo que permitió medir su costo (§10) sin
cambiar el comportamiento del sistema. No se presenta como vigente: se presenta
como **disponible y medido**.

---

## 7. Riesgos aceptados

Se declaran de forma explícita, con su justificación y su condición de
revisión.

| ID | Riesgo que se acepta | Por qué se acepta ahora | Qué lo haría inaceptable |
|---|---|---|---|
| **RA-01** | El sistema opera sin autenticación (T-01, T-02) | Es un proyecto académico, con datos ficticios, desplegado en local y sin exposición pública. Implementar C-01 implica un modelo de identidad que el alcance de la asignatura no contempla | Cualquier despliegue accesible desde una red que no sea `localhost`, o datos que dejen de ser ficticios |
| **RA-02** | ~~T-04 y T-09 sin comprobar~~ → **T-09 queda sin comprobar** | ✅ **Resuelto parcialmente el 2026-11-06.** PS-01 A-05 descartó T-04: los 4 intentos de path traversal fueron rechazados. **T-09 (escritura arbitraria vía nombre de archivo) no lo cubre PS-01**: exige enviar un `POST` con un `filename` manipulado, que es un vector de escritura y no de lectura | Que una prueba de escritura confirme T-09 |
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

### Resultados — ejecución del 2026-11-06

**Commit probado:** `f7895f4` · **Destino:** `http://localhost:8000`
**Salida completa:** [`resultados/ps-01-resultados.txt`](../experimentos/prueba-seguridad-01/resultados/ps-01-resultados.txt)

| Vector | Amenaza | Resultado medido | Veredicto |
|---|---|---|---|
| **A-01** | T-01 | HTTP **200** · **629.721 bytes** · **3602 registros** sin ninguna credencial | 🔴 **FUGA CONFIRMADA** |
| **A-02** | — | Ruta descubierta desde la propia respuesta: `/static/1785780123_Captura` | 🔴 El listado entrega el índice de archivos |
| **A-03** | T-02 | HTTP **404**, 19 bytes | ⚠️ **No concluyente** — ver nota |
| **A-04** | T-03 | HTTP **200** con listado navegable del directorio | 🔴 **FUGA CONFIRMADA** |
| **A-05** | T-04 | 4 intentos: `../.env` → 404 · `..%2f.env` → 301 · `../../back/.env` → 404 · `../test.db` → 404 | ✅ **Bloqueado** |
| **A-06** | T-05 | `Access-Control-Allow-Origin: *` **y** `Access-Control-Allow-Credentials: true` en la misma respuesta | 🔴 **Configuración peligrosa confirmada** |

**Vectores que confirmaron exposición: 3 de 6.**

#### Nota sobre A-03: por qué el 404 no absuelve

El 404 **no demuestra que exista control de acceso.** La ruta
`/static/1785780123_Captura` sale de un registro creado en otra máquina; el
archivo físico no está en este entorno porque `back/uploads/` es
`.gitignore`. Es el hallazgo de reproducibilidad **F-05**, no una defensa.

Lo prueba A-04 en la misma corrida: `GET /static/` devolvió **200 con listado
navegable**, de modo que el manejador sirve sin pedir credencial alguna.
Cualquier nombre que sí exista en el disco se entrega. **T-02 sigue vigente.**

#### Dos hallazgos nuevos

1. **El encadenamiento A-01 → A-02 → A-04 es un camino completo.** Una
   petición sin credencial devuelve el listado; el listado contiene las rutas
   de las imágenes; y el directorio además se puede enumerar. No hacen falta
   tres vulnerabilidades: una sola basta porque la primera entrega el índice.

2. **El volumen creció.** La medición de agosto registró 3302 registros y
   557 kB; PS-01 midió **3602 registros y 629.721 bytes**. La respuesta crece
   con la base, que es exactamente el comportamiento que la falta de
   paginación predice (F-07, táctica T-07).

---

## 10. Costo de la capa de seguridad sobre el p95

**Medición CS-01, ejecutada el 2026-11-06.**
**Control medido:** C-02 (autorización por token en `/static/`).
**Salidas crudas:** [`resultados/cs-01-sin-control.json`](../experimentos/costo-seguridad/resultados/cs-01-sin-control.json) · [`resultados/cs-01-con-control.json`](../experimentos/costo-seguridad/resultados/cs-01-con-control.json)

### Diseño de la comparación

El objetivo era aislar el costo de **validar**, no el de "tener o no un
manejador". Por eso **las dos corridas entregan el mismo archivo**:

| | Corrida A | Corrida B |
|---|---|---|
| `MEDIA_AUTH_ENABLED` | `false` | **`true`** |
| Token enviado | no | **sí, válido** |
| Respuesta | 200 | 200 |
| Trabajo en disco | idéntico | idéntico |

Si en la corrida B se hubiera omitido el token, el 401 no habría tocado el
disco y se estaría midiendo otra cosa.

**Verificación de que el control estaba realmente activo:** con el servidor de
la corrida B en marcha, una petición sin token a `GET /static/seed.png`
devolvió `{"status":401,"description":"Unauthorized","message":"token requerido"}`.

### Condiciones

| Parámetro | Valor |
|---|---|
| Carga | 10 VUs · 30 s · `constant-vus` |
| Recurso | `/static/seed.png`, 69 bytes entregados |
| Peticiones | 122 957 (A) y 123 082 (B) — **246 039 en total** |
| Tasa de error | 0,00 % en ambas |
| Checks | 245 912/245 912 y 246 162/246 162 |

### Resultados

| Métrica | Sin control | Con control | Diferencia | Variación |
|---|---:|---:|---:|---:|
| **p95** | **3,04 ms** | **3,01 ms** | **−0,03 ms** | **−0,99 %** |
| p90 | 2,84 ms | 2,83 ms | −0,01 ms | −0,35 % |
| Promedio | 2,36 ms | 2,36 ms | 0,00 ms | 0,00 % |
| Mediana | 2,31 ms | 2,31 ms | 0,00 ms | 0,00 % |
| Rendimiento | 4065,8 req/s | 4049,5 req/s | −16,3 req/s | −0,40 % |

### Veredicto

> **El costo de C-02 sobre el p95 no es distinguible del ruido de medición.**

La mediana y el promedio son idénticos hasta la centésima de milisegundo. El
p95 **bajó** 0,03 ms, lo que no puede ser un efecto del control: solo puede ser
variación entre corridas. La única señal con dirección consistente es el
rendimiento, un 0,40 % menor, que sigue siendo del orden del ruido.

Lo defendible es una **cota superior**:

> Con 246 039 peticiones medidas, el costo de la validación de token sobre el
> p95 es **inferior a 0,04 ms**, es decir, por debajo del **1,3 %**. No se
> puede afirmar un valor positivo porque la medición no lo resuelve.

### Qué dice esto sobre el ADR-005

El `ADR-005` §7 anticipaba el riesgo así:

> *"Introduce una ligera complejidad operativa y un potencial cuello de botella
> en latencia **si** el adaptador de almacenamiento implementa validaciones
> síncronas complejas o consultas adicionales a la base de datos por cada
> solicitud de archivo."*

La preocupación era **condicional**, y la condición no se cumple en C-02: la
validación es una comparación de tiempo constante en memoria, sin consultas ni
E/S. **La medición confirma que una validación simple no cuesta nada medible**,
y deja el caso complejo —el que el ADR realmente temía— **sin verificar**.

`[EVIDENCIA FALTANTE]` Si C-02 evolucionara a consultar la base para decidir si
un usuario puede ver una imagen concreta, esta medición **no aplicaría** y
habría que repetirla.

### Limitaciones declaradas

- **El archivo mide 69 bytes.** Al ser tan pequeño, el trabajo de E/S es
  mínimo y el peso relativo del middleware es el **mayor posible**. Con
  imágenes reales el costo relativo sería aún menor. El resultado es, por
  tanto, una cota superior también en ese sentido.
- **Una corrida por condición.** No hay intervalo de confianza. Dicho esto,
  cada corrida acumuló más de 122 000 peticiones, de modo que el percentil
  está bien poblado.
- **No se midió el camino de rechazo.** El costo de responder 401 a un cliente
  sin token no se midió, porque ese camino no toca el disco y no es comparable.
- k6 y el sistema comparten máquina.

### Hallazgo colateral: dónde NO está el cuello de botella

Esta medición da un punto de comparación que el proyecto no tenía:

| Operación | Rendimiento | p95 |
|---|---:|---:|
| `GET /static/seed.png` | **4065,8 req/s** | **3,04 ms** |
| `GET /death` (EC-01, 50 VUs) | 22,8 req/s | 2320 ms |
| **Razón** | **×178** | **×763** |

El mismo servidor, el mismo proceso, el mismo stack HTTP y el mismo middleware
de logging atienden **178 veces más peticiones** cuando no tiene que consultar
la base ni serializar 615 KB de JSON.

**Eso descarta como causa del tope de 23 req/s**: el servidor HTTP, el router,
el middleware de logging y el sistema de archivos. Lo que queda es la consulta
sin paginación y la serialización de la respuesta — que es exactamente lo que
`docs/26-experimento-crecimiento.md` §7 señalaba como candidatos sin poder
distinguirlos. Esta medición no los distingue entre sí, pero **elimina al
resto**.

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
| Medición del costo (CS-01) | `experimentos/costo-seguridad/` |
| Experimento de crecimiento comparado | `docs/26-experimento-crecimiento.md` |
| Condición del mini-comité que exige C-06 | `docs/14-acta-mini-comite-1.md` §6 |
