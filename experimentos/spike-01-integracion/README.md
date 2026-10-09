# SPIKE-01 — Acoplamiento síncrono con el almacén de archivos

**Módulo:** 5 · **Estado:** ⬜ no ejecutado
**Rama de ejecución:** `spike-01-integracion`
**Caja de tiempo:** 180 minutos máximo

---

## 1. Hipótesis

> La escritura síncrona de la imagen dentro de `POST /death` domina la latencia
> de creación. Si es así, extraer esa escritura a un contrato asíncrono
> reduciría la latencia percibida de forma significativa.

**Criterio de éxito (prerregistrado):** la hipótesis se considera **validada**
si el tiempo atribuible a la escritura de archivo representa **más del 40 %**
de la latencia p95 de `POST /death`.

Si representa menos, la hipótesis queda **refutada** y la decisión correcta es
mantener el contrato síncrono.

---

## 2. Alcance

**Qué entra:** medir `POST /death` con el escenario de inserción ya definido
(`seed-load.js`), y aislar el costo de la escritura de archivo.

**Qué NO entra:** implementar el asincronismo. Este spike decide *si vale la
pena*, no lo construye.

---

## 3. Procedimiento

### Paso 1 — Línea base de escritura

Con el backend corriendo y la base sembrada:

```
cd experimentos/medicion-escenario-01
k6 run scripts/seed-load.js --summary-export=../spike-01-integracion/resultados/post-baseline.json
```

Registrar: p95, mediana y promedio de `http_req_duration`.

### Paso 2 — Aislar el costo de la escritura

El handler escribe la imagen entre la validación y el guardado en base. Para
estimar su peso sin modificar el código, se compara contra la latencia de una
operación que NO escribe archivo: `PATCH /deathUpdate/{id}`.

```
k6 run scripts/patch-probe.js --summary-export=../spike-01-integracion/resultados/patch-probe.json
```

> Si no existe `patch-probe.js`, medir manualmente con curl en bucle y
> registrar el método usado. Lo importante es declarar cómo se obtuvo el dato.

### Paso 3 — Evidencia complementaria

La consola del backend imprime la duración de cada petición. Capturar un
fragmento de log durante la corrida de `POST` y guardarlo en `logs/`.

---

## 4. Resultados

**PENDIENTE — completar tras ejecutar.**

| Métrica | POST /death | PATCH /deathUpdate | Diferencia |
|---|---|---|---|
| p95 (ms) | | | |
| Mediana (ms) | | | |
| Peticiones | | | |
| Tasa de error | | | |

**Proporción estimada del costo de escritura:** ___ %

---

## 5. Veredicto

**PENDIENTE.** Marcar una:

- ⬜ **Validada** — la escritura domina; justifica evaluar un contrato asíncrono
- ⬜ **Ajustada** — la escritura pesa, pero menos de lo previsto
- ⬜ **Revertida** — la escritura no domina; el contrato síncrono se mantiene

---

## 6. Limitaciones

- `[EVIDENCIA FALTANTE]` La comparación POST vs PATCH es indirecta: las dos
  operaciones difieren en más que la escritura de archivo. Una medición directa
  requeriría instrumentar el handler, lo que queda fuera de la caja de tiempo.
- k6 y el sistema comparten máquina física, como en todas las mediciones del
  semestre.
- El volumen de imagen es constante (PNG de 1×1), deliberadamente, para aislar
  el tamaño de archivo como variable.

---

## 7. Qué invalidaría este spike

- Cambiar el volumen de la base entre corridas.
- Ejecutar sobre un motor de persistencia distinto.
- No registrar el commit medido.

---

## 8. Trazabilidad

- **Commit medido:** *(completar)*
- **Rama:** `spike-01-integracion`
- **ADR que lo referencia:** `adrs/ADR-007-integracion-sincrona.md`


experimentos: spike-01 integracion
