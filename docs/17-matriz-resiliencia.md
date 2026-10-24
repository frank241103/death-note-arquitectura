# 17 — Matriz de resiliencia

**Módulo:** 6 (control A3)
**Fecha:** 2026-10-23
**Depende de:** [`docs/16-matriz-fallos.md`](./16-matriz-fallos.md)

---

## 1. Regla de honestidad de este documento

El control A3 pide señalar *"las tácticas presentadas como probadas sin
evidencia suficiente"*. Para que eso no ocurra aquí, cada fila lleva un
**estado de validación** con solo tres valores posibles:

| Estado | Qué significa exactamente |
|---|---|
| ✅ **VALIDADA** | La táctica está implementada **y** existe una ejecución que lo demuestra (archivo de resultados, log o CI en verde) |
| 🔶 **PROPUESTA** | La táctica está elegida y su criterio de prueba está definido, pero **no está implementada**. No hay evidencia y no se presenta como si la hubiera |
| ⬜ **CANDIDATA** | Se enuncia como opción, sin que el equipo la haya seleccionado todavía |

**Hoy una sola fila está VALIDADA.** El resto son propuestas. Se declara así
a propósito: el enunciado acepta tácticas declaradas como propuesta, y no
acepta tácticas presentadas como probadas sin serlo.

---

## 2. Matriz

| ID | Fallo que mitiga | Objetivo verificable | Táctica seleccionada | Criterio de prueba | Estado |
|---|---|---|---|---|---|
| **T-01** | **F-01** — `http.Server` sin timeouts | Ninguna conexión permanece abierta más de 15 s sin enviar datos | *Limitar exposición*: fijar `ReadTimeout`, `WriteTimeout` e `IdleTimeout` en la construcción del servidor | Abrir una conexión que envíe cabeceras a 1 byte/s; el servidor debe cerrarla antes de 15 s | 🔶 **PROPUESTA** — `back/server/server.go` sin modificar. Es además la condición que añadió el mini-comité 1 |
| **T-02** | **F-02** — arranque imposible sin `.env` | El backend arranca en un clon limpio o falla con un mensaje que diga qué variable falta y cómo obtenerla | *Degradación controlada*: sustituir `logger.Fatal` por valores por defecto para SQLite y un mensaje accionable | `git clone` limpio + `go run main.go` sin `.env`: arranca, o imprime la variable faltante y el archivo de ejemplo | 🔶 **PROPUESTA** — existe `.env.example`, pero el código sigue abortando |
| **T-03** | **F-03** — `switch` sin `default` | Un motor de base no soportado produce un error nombrado, nunca un `nil pointer` | *Detección de excepción*: añadir caso `default` que devuelva un error con el valor recibido y la lista de valores válidos | Poner `"database": "mongodb"` en `config.json`: el proceso debe terminar con mensaje explícito y código de salida distinto de un pánico | 🔶 **PROPUESTA** |
| **T-04** | **F-04** — `/static/` sin control de acceso | Ninguna ruta sirve archivos sin pasar por una comprobación de autorización | *Autorizar actores*: interponer un middleware delante del `FileServer`, a través del puerto `AlmacenDeImagenes` del ADR-005 | `GET /static/<archivo>` sin credencial → `401`; con credencial válida → `200` | 🔶 **PROPUESTA** — el puerto está decidido en ADR-005; el adaptador no está escrito |
| **T-05** | **F-05** — 404 en clon limpio | El sistema recién clonado sirve `/static/` sin pasos manuales | *Reparación por reintroducción de estado*: crear `uploads/` al arrancar (ya hay `os.MkdirAll` en el handler; falta en el arranque) y versionar un `.gitkeep` | `git clone` limpio + arrancar + `GET /static/` → distinto de 404 por carpeta ausente | 🔶 **PROPUESTA** |
| **T-06** | **F-06** — CORS `["*"]` con credenciales | El servidor no acepta credenciales desde orígenes no declarados | *Limitar acceso*: lista explícita de orígenes, o `AllowCredentials: false` | Petición cruzada con credenciales desde un origen no listado → rechazada | 🔶 **PROPUESTA** |
| **T-07** | **F-07** — `GET /death` sin paginación | El tamaño de respuesta de `GET /death` no crece con el número de registros | *Limitar el tamaño del conjunto*: parámetros `limit` y `offset` en el repositorio, con tope por defecto | Repetir ESC-01 con la base sembrada: p95 < 500 ms y respuesta < 100 kB. El protocolo ya existe en `docs/experiment/02-protocolo.md` | 🔶 **PROPUESTA** — la línea base contra la que comparar ya está medida (4 corridas) |
| **T-08** | **F-09** — escritura de imagen bajo concurrencia | p95 de `POST /death` por debajo de 1000 ms con 10 VUs | *Escritura diferida* mediante worker en proceso | Repetir `seed-load.js` con la misma carga: p95 < 1000 ms y ninguna imagen perdida | ⬜ **CANDIDATA** — el ADR-007 decidió **no** adoptarla al volumen actual. Queda como opción si se cumple alguna condición de su sección 6 |
| **T-09** | **F-01 a F-09** (prevención, no mitigación) | El dominio no vuelve a acoplarse a infraestructura, que es lo que haría inviables T-04 y T-08 | *Restricción estructural verificada en CI*: fitness function FF-01 | El script falla la build si `back/api` o `back/models` importan terceros o infraestructura estándar. Tiene prueba negativa | ✅ **VALIDADA** — `scripts/fitness/ff-01-dominio-sin-infraestructura.sh`, integrada en `.github/workflows/ci.yml`. Contrato: `docs/15-fitness-function-01.md` |

---

## 3. Costos secundarios de cada táctica

El control A3 pide señalar *"los costos secundarios que el documento menciona
sin fundamentar"*. Se declaran aquí, con el fundamento de cada uno o con la
declaración explícita de que no se midió.

| Táctica | Costo secundario | ¿Fundamentado? |
|---|---|---|
| T-01 | Una petición legítima muy lenta (red mala, archivo grande) puede cortarse | 🔶 No medido. El umbral de 15 s se propone, no se derivó de ninguna medición de la distribución real de duraciones |
| T-02 | Arrancar con valores por defecto puede ocultar una configuración mal puesta en un entorno real | ✅ Fundamentado: es el mismo mecanismo que produjo F-03 |
| T-03 | Ninguno apreciable: añade una rama a un `switch` | ✅ |
| T-04 | Introduce latencia por petición de archivo. El ADR-005 §7 lo anticipa y lo declara **no medido** | 🔶 Declarado como no medido en el propio ADR |
| T-05 | Ninguno apreciable | ✅ |
| T-06 | Rompe clientes que hoy funcionan desde orígenes arbitrarios | ✅ Fundamentado: es el efecto buscado |
| T-07 | El frontend debe paginar; hoy espera la lista completa (`front/src/pages/death-note-list/`) | ✅ Verificado por lectura del código del frontend |
| T-08 | Exige un estado "imagen pendiente" en la API y manejo de fallos de escritura diferida | ✅ Analizado en `ADR-007` §4 |
| T-09 | Alarga el CI y puede bloquear un PR legítimo si alguien decide cambiar el límite del dominio sin actualizar el ADR | ✅ Es el efecto buscado; el contrato FF-01 define cómo levantar la regla deliberadamente |

---

## 4. Lo que esta matriz NO afirma

- **No afirma que el sistema sea resiliente hoy.** Ocho de las nueve tácticas
  no están implementadas.
- **No afirma que las tácticas propuestas vayan a funcionar.** Cada una tiene
  un criterio de prueba precisamente porque está sin verificar.
- **No selecciona prioridad de implementación.** El orden lo decide el equipo
  contra la priorización de atributos del `ADR-004`
  (Seguridad > Mantenibilidad > Rendimiento > Disponibilidad), que sugiere
  empezar por T-04 y T-06.

---

## 5. Trazabilidad

| Referencia | Dónde |
|---|---|
| Fallos F-01 a F-10 | `docs/16-matriz-fallos.md` |
| Priorización de atributos | `adrs/ADR-004-priorizacion-atributos.md` |
| Puerto `AlmacenDeImagenes` (habilita T-04 y T-08) | `adrs/ADR-005-estilo-hexagonal.md` |
| Decisión sobre T-08 | `adrs/ADR-007-cqrs-eventos.md` §3, §6 |
| Contrato de FF-01 (T-09) | `docs/15-fitness-function-01.md` |
| Protocolo para verificar T-07 | `docs/experiment/02-protocolo.md` |
| Condición del mini-comité que origina T-01 | `docs/14-acta-mini-comite-1.md` §6 |
