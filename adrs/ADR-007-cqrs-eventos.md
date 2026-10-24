# ADR-007 — CQRS, consistencia eventual e integración con el almacén de archivos

* **Estado:** Aceptada
* **Fecha:** 2026-10-09 · **Revisada:** 2026-10-23
* **Autores:** Sebastián Reyes (versión inicial), equipo de arquitectura (revisión)
* **Módulo:** 5

> **Nota de revisión (2026-10-23).** La versión del 2026-10-09 no citaba
> ninguna cifra del spike, pese a que la rúbrica lo exige, y contenía dos
> errores de hecho: una ruta `POST /kill` que no existe y un mecanismo de
> notificaciones que el sistema no tiene. Esta versión los corrige. El sentido
> de la decisión no cambió.

---

## 1. Contexto y problema

Dos preguntas distintas se evalúan aquí, y conviene no mezclarlas:

1. **¿Aplica CQRS y consistencia eventual al sistema?**
2. **¿Debe el guardado de la imagen salir del camino síncrono de `POST /death`?**

La segunda se midió con el spike-01. La primera no requiere medición: se
responde analizando el modelo de dominio.

### Lo que hace hoy el sistema

Cuatro rutas, declaradas en `back/server/router.go`:

```
GET   /death                 → lista completa, sin paginación (ver nota)
POST  /death                 → crea registro + escribe la imagen en disco
GET   /death/{id}            → un registro
PATCH /deathUpdate/{id}      → actualiza causa y detalles
```

El guardado de imagen ocurre dentro del handler de creación, en
`back/server/kill_handlers.go` líneas 110–121 (`os.MkdirAll`, `os.Create`,
`io.Copy`), antes de persistir en base. Todo dentro de la misma petición HTTP.

---

## 2. Evidencia: spike-01

**Documento completo:** [`experimentos/spike-01-integracion/README.md`](../experimentos/spike-01-integracion/README.md)
**Salidas crudas:** `resultados/post-baseline.json`, `resultados/patch-probe.json`
**Commit medido:** `30a262d`
**Criterio prerregistrado (fijado antes de medir):** la hipótesis se valida si
el tiempo atribuible a la escritura supera el **40 %** del p95 de `POST /death`.

| Métrica (`http_req_duration`) | `POST /death` (escribe archivo) | `PATCH /deathUpdate` (no escribe) | Diferencia | Proporción |
|---|---:|---:|---:|---:|
| **p95** | **1730,45 ms** | **505,87 ms** | 1224,57 ms | **70,8 %** |
| Mediana | 45,95 ms | 21,57 ms | 24,38 ms | 53,1 % |
| Promedio | 299,25 ms | 69,59 ms | 229,66 ms | 76,7 % |
| Mínimo | 12,76 ms | 14,18 ms | −1,42 ms | — |
| Tasa de error | 0,00 % | 0,00 % | — | — |

**Resultado: 70,8 % > 40 % → hipótesis validada.**

**Hallazgos secundarios registrados:**

- `POST /death` **incumplió su propio umbral** de 1000 ms. k6 terminó con
  `thresholds on metrics 'http_req_duration' have been crossed`.
- Razón p95/mediana en `POST`: **37,7×** (46 ms típico contra 1730 ms en la
  cola). En `PATCH` es 23,5×.
- El **mínimo** de `POST` (12,76 ms) es *menor* que el de `PATCH` (14,18 ms).

### Limitación que acota el uso de este dato

`[EVIDENCIA FALTANTE]` **El 70,8 % es una cota superior, no el costo puro de
escribir el archivo.** `POST` y `PATCH` difieren en más que el acceso a disco:
`POST` parsea `multipart/form-data`, hace `INSERT` en lugar de `UPDATE`, y
transporta unas 4 veces más datos (277 kB enviados contra 68 kB). Una
atribución exacta requeriría instrumentar el handler, lo que quedó fuera de la
caja de tiempo del spike.

Combinada con el dato del mínimo, la lectura que la evidencia soporta es que
**el costo observado es de encolamiento bajo concurrencia, no un costo fijo
por operación.**

---

## 3. Decisión

**(a) Se descarta CQRS y la consistencia eventual.**

**(b) Se mantiene el contrato de `POST /death` síncrono**, y se registra el
resultado del spike como la evidencia que justificaría revisarlo si cambian
las condiciones de la sección 6.

---

## 4. Justificación

### Sobre CQRS (a)

| Criterio | Situación del sistema | ¿Favorece CQRS? |
|---|---|---|
| Número de agregados | Uno solo (`Kill`) | No |
| Modelos de lectura distintos del de escritura | No existen; `GET /death` devuelve la misma forma que se persiste | No |
| Carga de escritura concurrente en uso real | Uso académico, un usuario | No |
| Necesidad de escalar lectura y escritura por separado | No observada | No |

Introducir consistencia eventual además crearía un riesgo de dominio: un
registro recién creado podría no aparecer de inmediato en la consulta, y el
sistema no tiene ningún mecanismo que distinga "aún no visible" de "no existe".

> **Nota — ausencia de paginación.** `handleGetAllKills` llama a
> `FindAll()` (`back/repository/kill_repository.go:22`) sin límite ni
> desplazamiento; la respuesta medida fue de 557 kB. Es un problema real de
> lectura, pero su solución es paginar la consulta, no separar el modelo:
> CQRS no aporta nada que la paginación no resuelva más barato.
>
> `[INCONSISTENCIA DOCUMENTAL]` El identificador de este riesgo no es
> consistente dentro del propio repositorio:
> `dossier/01-contexto-sistema.md` lo numera **R-01 = contraseña en logs** y
> **R-07 = fullName no persistido**, mientras que
> `dossier/04-escenarios-calidad.md:514` atribuye la paginación a **R-07** y
> `docs/09-api-eventos-integracion.md:30` a **R-01**. El hallazgo técnico
> está verificado contra código; el identificador debe unificarse. Ver
> `docs/16-matriz-fallos.md`, fila F-07.

### Sobre el contrato síncrono (b)

El spike validó que la escritura domina la cola de latencia. Eso **abre** la
discusión, no la cierra. Contra implementarlo ahora:

1. El p95 degradado aparece con **10 usuarios concurrentes**. El sistema en
   uso real tiene uno.
2. La mediana (46 ms) es perfectamente aceptable. El problema es la cola.
3. Un contrato asíncrono obliga a introducir una cola, un worker, manejo de
   fallos de escritura diferida y un estado "imagen pendiente" en la API, que
   hoy no existe. El costo operativo supera el beneficio medido **a este
   volumen**.
4. La evidencia disponible es una cota superior (sección 2), no una
   atribución limpia.

**Lo que sí queda hecho ahora:** el puerto de salida `AlmacenDeImagenes`
definido en `ADR-005` deja la costura lista. Cambiar la implementación de
síncrona a asíncrona después no requiere tocar el dominio.

---

## 5. Consecuencias

**Se acepta:**

- Bajo concurrencia, `POST /death` seguirá incumpliendo el umbral de 1000 ms.
  Está medido y documentado; no será una sorpresa.
- No hay separación de modelos de lectura y escritura.

**Se gana:**

- Consistencia fuerte: lo que se escribe se lee de inmediato.
- Un sistema que un equipo de cuatro personas puede sostener.
- La decisión es reversible sin reescribir el dominio (ver ADR-005).

**Deuda registrada:**

- Paginación de `GET /death`, sin resolver (identificador de riesgo por unificar, ver sección 4).
- **R-08** — timeouts del `http.Server`, sin resolver. Es además la condición
  que añadió el mini-comité 1 (`docs/14-acta-mini-comite-1.md` §6).

---

## 6. Condiciones que obligarían a revisar este ADR

Se revisa si ocurre **cualquiera** de estas:

| # | Condición | Cómo se detecta |
|---|---|---|
| C-1 | Concurrencia real sostenida ≥ 10 usuarios | Métrica de uso |
| C-2 | Tamaño medio de imagen > 1 MB | El spike usó un PNG de 70 bytes; con imágenes reales el efecto es **mayor**, no menor |
| C-3 | Aparece un segundo consumidor del almacén de imágenes | Revisión del C4 |
| C-4 | Se instrumenta el handler y el costo puro de escritura supera el 40 % | Nuevo spike |

---

## 7. Alternativas consideradas

| # | Alternativa | Por qué se descartó |
|---|---|---|
| 1 | CQRS completo con base de lectura separada | Sin modelos de lectura distintos ni carga que lo justifique |
| 2 | Cola de mensajes externa (RabbitMQ, NATS) para la escritura de imagen | Introduce una dependencia de infraestructura nueva para un beneficio medido solo bajo carga sintética |
| 3 | Escritura diferida en proceso (worker con canal de Go) | Más barata que la 2, pero aun así exige un estado "imagen pendiente" en la API. Queda como opción preferida **si** se cumple alguna condición de la sección 6 |
| 4 | Dejarlo síncrono *(elegida)* | El costo operativo del asincronismo no se justifica al volumen actual |

> La alternativa 3 **no está implementada**. Ninguna rama ni commit del
> repositorio contiene una variante asíncrona.

---

## 8. Trazabilidad

| Referencia | Dónde |
|---|---|
| Spike que aporta la evidencia | `experimentos/spike-01-integracion/README.md` |
| Salidas crudas | `experimentos/spike-01-integracion/resultados/*.json` |
| Commit medido | `30a262d` |
| Puerto que habilita la reversibilidad | `adrs/ADR-005-estilo-hexagonal.md` |
| Contrato de API y catálogo de eventos | `docs/09-api-eventos-integracion.md` |
| Rutas reales | `back/server/router.go` |
| Punto de escritura en disco | `back/server/kill_handlers.go:110-121` |
| Riesgos citados | R-08 (timeouts) · ausencia de paginación (ID por unificar) |
