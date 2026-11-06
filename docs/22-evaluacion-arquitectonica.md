# 22 — Evaluación arquitectónica y plan de evolución

**Fase:** IV · **Semana:** 15
**Fecha:** 2026-11-06 · **Commit:** `25817da`

---

## 1. Qué se evalúa y con qué criterio

Se evalúa si las decisiones tomadas resisten los **drivers** que el equipo
priorizó en `ADR-004`:

> Seguridad > Mantenibilidad > Rendimiento > Disponibilidad

El criterio de evaluación es la evidencia, no la intención: una decisión se
considera sostenida solo si existe una medición, una restricción ejecutable o
una verificación contra código que la respalde.

---

## 2. Evaluación por driver

### Seguridad — prioridad 1

| Qué se decidió | Evidencia | Veredicto |
|---|---|---|
| El acceso a medios pasará por un puerto con autorización (`ADR-008`) | Decisión documentada; implementación pendiente | 🔶 **Decidido, no vigente** |
| El dominio no alcanza `os`, `net`, `net/http` ni terceros (`FF-01`) | CI en verde, con prueba negativa | ✅ **Vigente y verificado** |
| Se opera sin autenticación (RA-01) | Riesgo aceptado, con condición de revisión | ✅ **Declarado explícitamente** |

**Lectura honesta:** el driver de mayor prioridad es el que menos controles
implementados tiene. Siete de ocho controles de `docs/20` §6 están propuestos.
Lo que sí existe es el **mapa completo**: inventario de activos, límites de
confianza, nueve amenazas clasificadas y una prueba ejecutable escrita.

La contradicción entre "seguridad es la prioridad 1" y "un control
implementado" **es real y se deja visible**. Su causa está en RA-01: mientras
el sistema sea local y con datos ficticios, el equipo decidió invertir en que
los controles sean *posibles* antes que en activarlos.

### Mantenibilidad — prioridad 2

| Qué se decidió | Evidencia | Veredicto |
|---|---|---|
| Arquitectura hexagonal (`ADR-005`) | Decisión documentada; puertos no escritos | 🔶 **Decidido, no implementado** |
| Matriz de dependencias entre módulos (`ADR-006`) | `FF-02` en CI, con prueba negativa | ✅ **Vigente y verificado** |
| El dominio permanece puro | `FF-01` en CI | ✅ **Vigente y verificado** |

**Lectura honesta:** es el driver mejor sostenido. Dos restricciones
ejecutables protegen sus límites de forma automática. La arquitectura
hexagonal sigue siendo una decisión en papel —no hay puertos ni adaptadores—
pero las fronteras que haría falta respetar **ya no pueden degradarse en
silencio**: el CI las vigila.

Punto débil declarado: la baja cohesión de `server/` (381 líneas, 65 % del
backend, mezclando arranque, configuración, CORS y routing) sigue intacta.

### Rendimiento — prioridad 3

| Qué se decidió | Evidencia | Veredicto |
|---|---|---|
| SQLite como línea base (`ADR-002`) | 4 corridas, 2 máquinas, SHA256 | ✅ **Medido** |
| Mantener el contrato síncrono (`ADR-007`) | Spike-01 con criterio prerregistrado | ✅ **Medido y decidido** |
| No adoptar CQRS (`ADR-007`) | Análisis de dominio, sin medición | ✅ **Argumentado** |

**Lectura honesta:** es el driver con mejor evidencia y, a la vez, el que peor
cumple sus propios umbrales.

| Escenario | Umbral prerregistrado | Medido | Resultado |
|---|---|---|---|
| ESC-01 `GET /death` | p95 < 500 ms | 1114,69 ms | ❌ Incumple |
| Spike `POST /death` | p95 < 1000 ms | 1730,45 ms | ❌ Incumple |

Ambos incumplimientos están medidos, publicados con sus JSON crudos y
explicados. **No se corrigieron**, y esa es una decisión consciente: `ADR-007`
documenta por qué el costo operativo del asincronismo no se justifica al
volumen actual, y la paginación quedó como táctica T-07 sin implementar.

### Disponibilidad — prioridad 4

| Qué se decidió | Evidencia | Veredicto |
|---|---|---|
| Despliegue monolítico único (`docs/18` D1) | Comparación con costos en PC | ✅ **Argumentado** |
| Sin réplicas | Condiciones C-1 a C-4 de `ADR-007` §6 | ✅ **Con condición de revisión** |
| Sin timeouts (R-08) | Pendiente | ❌ **Deuda, exigida por el comité** |

**Lectura honesta:** es el driver menos trabajado, coherente con ser el de
menor prioridad. El hallazgo más útil es de `docs/18` §4: **replicar obliga a
migrar de SQLite primero**, dependencia que no aparecía en ningún documento
anterior y que encarece una decisión que parecía barata.

---

## 3. Evaluación del proceso, no solo del producto

| Práctica | Evidencia | Valoración |
|---|---|---|
| Prerregistro de umbrales antes de medir | `docs/experiment/01-preregistro.md` | ✅ Sostenida en ESC-01 y en el spike |
| Declarar corridas descartadas | Corrida 1, en `02-protocolo.md` §9 | ✅ |
| Integridad de resultados | `SHA256SUMS.txt` | ✅ |
| Reproducción en segunda máquina | `contexto-maquina-2.json`, `run-4.json` | ✅ |
| Distinguir observado de hipotético | `docs/16` §2, `docs/20` §4 | ✅ |
| Restricciones ejecutables con prueba negativa | `FF-01`, `FF-02` | ✅ |
| Corregir evidencia contaminada dejando constancia | `spike-01/README.md` §9 | ✅ |
| Verificar contra código lo que afirma la IA | `docs/24-uso-ia.md` | ✅ |

**Esta es la mayor fortaleza del proyecto.** El producto tiene deudas
declaradas; el proceso de obtener y verificar evidencia se sostuvo.

---

## 4. Debilidades principales

| # | Debilidad | Por qué importa |
|---|---|---|
| **W-01** | El driver de prioridad 1 tiene 1 de 8 controles implementados | Hay distancia entre lo priorizado y lo construido |
| **W-02** | La arquitectura hexagonal no tiene un solo puerto escrito | `ADR-005` es una decisión sin materialización |
| **W-03** | El despliegue en contenedores nunca se ejecutó | Ninguna medición describe el modo declarado |
| **W-04** | Los logs no permiten diagnosticar el problema que el proyecto mejor conoce | El encolamiento se vio con k6, no desde dentro |
| **W-05** | Dos de seis celdas de la matriz de `ADR-006` no se verifican | `media` no existe como paquete |
| **W-06** | El ID del riesgo de paginación es inconsistente entre documentos propios | `docs/16` §4 |

---

## 5. Plan de evolución

Orden derivado de `ADR-004` y del costo medido, no de preferencia.

### Horizonte 1 — Cierre de deuda declarada (≈ 11 PC)

| # | Acción | PC | Cierra |
|---|---|---:|---|
| 1 | Timeouts en `http.Server` | 1 | R-08, F-01, T-07. **Exigido por el comité** |
| 2 | Eliminar la traza que formatea credenciales | 1 | T-06, R-01 |
| 3 | Caso `default` en la selección de motor | 1 | F-03, R-04 |
| 4 | Crear `uploads/` al arrancar + `.gitkeep` | 1 | F-05 |
| 5 | Paginación con tope por defecto | 2 | T-01, T-08, ESC-01 |
| 6 | Lista explícita de orígenes CORS | 1 | T-05, R-05 |
| 7 | Ejecutar PS-01 y registrar resultados | 0 | RA-02, supuesto S-3 de `ADR-008` |
| 8 | Unificar el ID del riesgo de paginación | 0 | W-06 |
| 9 | Logger sin ANSI, en JSON, con ID de petición | 4 | W-04, RO-05 |

> Las acciones 1 a 6 tocan solo `platform`. `FF-02` garantiza que `kill` no se
> contamine en el proceso.

### Horizonte 2 — Materializar las decisiones (≈ 21 PC)

| # | Acción | PC | Materializa |
|---|---|---:|---|
| 10 | Extraer el puerto `AlmacenDeImagenes` y su adaptador de disco | 5 | `ADR-005`, `ADR-008` |
| 11 | Autorización delante del acceso a medios | 2 | C-02, T-02, T-03 |
| 12 | Extraer `media` como paquete propio | 4 | Cierra W-05: `FF-02` pasa a verificar 6/6 celdas |
| 13 | Puerto de persistencia para `kill` | 5 | `ADR-005` completo |
| 14 | Levantar el compose y corregir D-01 a D-05 | 5 | W-03 |

### Horizonte 3 — Condicionado, no planificado

Estas acciones **no se programan**: se activan si se cumple una condición ya
escrita.

| Acción | Condición que la dispara | Dónde está escrita |
|---|---|---|
| Escritura diferida de imagen | C-1 a C-4 | `ADR-007` §6 |
| Migrar a PostgreSQL y replicar | Concurrencia sostenida ≥ 10 usuarios | `docs/18` §4 |
| Autenticación completa (C-01) | Exposición fuera de `localhost`, o datos reales | `docs/20` RA-01, `ADR-008` S-1 |

---

## 6. Veredicto de la evaluación

**El proyecto sostiene lo que afirma, y afirma menos de lo que un lector
desprevenido supondría.**

- Lo medido está medido, con umbrales fijados antes y JSON publicados.
- Lo decidido y no construido está marcado como tal, documento por documento.
- Lo que no se sabe está declarado como `[EVIDENCIA FALTANTE]`.
- Dos decisiones están protegidas por restricciones que corren en CI.

**La debilidad central es la distancia entre decisión y materialización**, con
W-02 como caso más visible: la arquitectura elegida no tiene puertos escritos.
El Horizonte 2 existe para cerrarla, y su costo está cuantificado en PC
verificables.

---

## 7. Trazabilidad

| Referencia | Dónde |
|---|---|
| Priorización de drivers | `adrs/ADR-004-priorizacion-atributos.md` |
| Mediciones de rendimiento | `experimentos/medicion-escenario-01/`, `experimentos/spike-01-integracion/` |
| Amenazas, controles y riesgos aceptados | `docs/20-seguridad.md` |
| Fallos y tácticas | `docs/16-matriz-fallos.md`, `docs/17-matriz-resiliencia.md` |
| Costos en PC | `docs/18-comparacion-distribucion-costos.md` §2 |
| Restricciones ejecutables | `docs/15-fitness-function-01.md`, `docs/19-fitness-function-02.md` |
| Despliegue y observabilidad | `docs/21-despliegue-observabilidad.md` |
| Consolidación de evidencia | `docs/23-evidencia-ejecutable.md` |
