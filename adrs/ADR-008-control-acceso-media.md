# ADR-008 — Control de acceso al almacén de imágenes

* **Estado:** Aceptada — implementación pendiente
* **Fecha:** 2026-11-06
* **Módulo:** 6 · Fase IV (seguridad)
* **Documento asociado:** [`docs/20-seguridad.md`](../docs/20-seguridad.md)

---

## 1. Contexto basado en evidencia

El sistema expone imágenes de rostro sin ningún control de acceso.

**Hecho verificado en código.** `back/server/router.go:15`:

```go
router.PathPrefix("/static/").Handler(
    http.StripPrefix("/static/", http.FileServer(http.Dir("uploads/"))))
```

El manejador se registra **fuera** de cualquier middleware de autorización.
`http.FileServer` lee directo del sistema de archivos: no pasa por los
handlers, no consulta el repositorio, no tiene punto de intercepción.

**Hecho verificado por medición.** `GET /death` sin credencial devuelve el
registro completo —557 kB, 3302 filas (`run-2.json`)— y cada fila incluye la
ruta de su imagen. Un cliente no autenticado obtiene así el índice de todos los
archivos y, acto seguido, los archivos.

**Qué activo está en juego.** Una imagen de rostro asociada a un nombre y una
causa de muerte (AC-02 del inventario). Es el activo más sensible del sistema y
es el que menos protección tiene.

**Amenazas asociadas:** T-02 (descarga no autorizada), T-03 (enumeración del
directorio), T-04 (path traversal). T-02 está en el cuadrante
probabilidad alta / impacto alto de la matriz.

---

## 2. Alternativas consideradas

### Alternativa A — Dejar `http.FileServer` como está

**Qué implica:** aceptar T-02 y T-03 sin mitigación.

| | |
|---|---|
| Costo de adopción | 0 puntos de cambio |
| Reversibilidad | No aplica |
| Consecuencia | Ningún control es posible: el handler no tiene dónde interceptar |

**Por qué se descarta:** no es que sea insuficiente, es que **cierra la
puerta**. Mientras el servido de archivos no pase por código propio, ningún
control de acceso puede introducirse después sin cambiar la ruta.

### Alternativa B — Middleware delante de `http.FileServer`

**Qué implica:** envolver el handler existente en una función que valide antes
de delegar.

```go
router.PathPrefix("/static/").Handler(
    autorizar(http.StripPrefix("/static/", http.FileServer(http.Dir("uploads/")))))
```

| | |
|---|---|
| Costo de adopción | 2 PC (1 archivo nuevo, 1 línea modificada) |
| Reversibilidad | Alta: se quita el envoltorio |
| Ventaja | Es lo más barato que cierra T-02 y T-03 |
| Límite | El servido sigue acoplado al sistema de archivos local. No resuelve T-04 por sí mismo, y no habilita cambiar de almacén |

### Alternativa C — Adaptador propio tras el puerto `AlmacenDeImagenes` *(elegida)*

**Qué implica:** sustituir `http.FileServer` por un handler propio que recibe
el identificador del recurso, autoriza, y pide el contenido al puerto de
salida que el `ADR-005` ya definió.

| | |
|---|---|
| Costo de adopción | 5 PC (puerto + adaptador de disco + handler + ruta + test) |
| Reversibilidad | Media: volver a `FileServer` es una línea, pero se pierde el punto de control |
| Ventaja | Cierra T-02, T-03 **y T-04** (el nombre nunca se usa como ruta: se resuelve contra un identificador). Habilita cambiar el almacén a S3 o GCS sin tocar el dominio |
| Costo secundario | Latencia adicional por petición de archivo. **No medida** — ver §5 |

### Alternativa D — Servir las imágenes desde un servicio aparte

Descartada en `docs/18-comparacion-distribucion-costos.md`: 25 PC, baja
reversibilidad y ninguna condición de las que la justificarían se cumple hoy
(ADR-007 §6).

---

## 3. Decisión

**Se adopta la alternativa C**: el acceso a imágenes pasa por un adaptador
propio detrás del puerto `AlmacenDeImagenes` del `ADR-005`, con autorización
antes de entregar el contenido.

**Se acepta explícitamente RA-01**: el sistema sigue operando **sin
autenticación** mientras permanezca en local con datos ficticios. Este ADR
decide *dónde* irá el control, no lo activa.

> La distinción importa: C es la decisión que hace *posible* el control. Sin
> ella, cualquier control futuro exige rehacer la ruta.

---

## 4. Consecuencias

**Positivas**

- T-02, T-03 y T-04 pasan de "imposibles de mitigar" a "pendientes de
  implementar", que es un estado distinto.
- El dominio no se entera: la sustitución ocurre en la capa de adaptadores, y
  `FF-01` garantiza que siga siendo así.
- Habilita cambiar el almacén sin tocar reglas de negocio.

**Negativas**

- 5 puntos de cambio sobre un backend de 584 líneas: la proporción no es
  despreciable.
- Introduce latencia por petición de archivo, **sin medir** (§5).
- Mientras no se implemente, el repositorio contiene una decisión de seguridad
  que no protege nada todavía. Se declara así en `docs/20-seguridad.md` §6.

---

## 5. Supuestos y condiciones de revisión

| # | Supuesto | Condición que obliga a revisar |
|---|---|---|
| S-1 | El despliegue sigue siendo local, con datos ficticios | Cualquier exposición fuera de `localhost`, o datos reales. **Entonces RA-01 deja de ser aceptable y C-01 pasa a ser obligatorio** |
| S-2 | La latencia del adaptador es despreciable frente al p95 actual (1114,69 ms) | Que una medición posterior al protocolo de `docs/experiment/02-protocolo.md` muestre un aumento superior al 10 % |
| S-3 | `http.FileServer` sanea el path traversal, por lo que T-04 es de probabilidad baja | **Que la prueba PS-01 vector A-05 lo desmienta.** Entonces T-04 sube a probabilidad alta y la implementación pasa a ser urgente |
| S-4 | Las imágenes se identifican por un nombre generado por el servidor | Que se decida conservar el nombre enviado por el cliente: reabre T-09 |

> **S-3 está pendiente de una prueba que ya está escrita.** Ejecutar PS-01 es
> lo que convierte este supuesto en hecho o lo refuta.

---

## 6. Veredicto del mini-comité

> ⬜ **PENDIENTE.** Este ADR es posterior al mini-comité 1 (2026-10-09), que
> confirmó `ADR-005` y `ADR-006`. No ha sido sometido a comité.

---

## 7. Trazabilidad

| Referencia | Dónde |
|---|---|
| Amenazas T-02, T-03, T-04, T-09 | `docs/20-seguridad.md` §4 |
| Riesgo aceptado RA-01 | `docs/20-seguridad.md` §7 |
| Puerto `AlmacenDeImagenes` | `adrs/ADR-005-estilo-hexagonal.md` |
| Código en cuestión | `back/server/router.go:15` |
| Medición que expone el índice | `experimentos/medicion-escenario-01/resultados/run-2.json` |
| Prueba que valida S-3 | `experimentos/prueba-seguridad-01/` |
| Comparación que descarta D | `docs/18-comparacion-distribucion-costos.md` §4 |
| Restricción que protege la frontera | `docs/15-fitness-function-01.md` |
