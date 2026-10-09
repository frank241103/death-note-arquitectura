# 10 — Decisión de estilo arquitectónico

**Sistema:** Death Note
**Módulo:** 4 — Estilo arquitectónico y diseño modular (Semanas 7–8)
**Commit de referencia:** `2b21b24`
**Fecha:** 2026-10-08

> Nota de nomenclatura: el enunciado pide `08-decision-estilo-arquitectonico.md`.
> En este repositorio los números 08 y 09 ya están ocupados por el Módulo 3
> (`08-revision-por-pares.md` y `09-walking-skeleton.md`), por lo que la
> numeración continúa desde el 10.

---

## 1. Propósito y audiencia

**¿Qué pregunta responde?** Qué estilo arquitectónico adopta el sistema de aquí
en adelante, por qué ese y no las alternativas, y qué cuesta la decisión.

**Audiencia:** el mini-comité (CTO, seguridad, finanzas) y el equipo de
desarrollo que implementará el cambio.

---

## 2. Estilo actual observado

El sistema base implementa un **monolito en capas**, no por diseño declarado
sino por construcción:

```
Router (gorilla/mux)
  → Handlers (kill_handlers.go)
    → Repository (kill_repository.go)
      → GORM
        → SQLite
```

`[HECHO VERIFICADO]` Las capas existen y están separadas en paquetes. Lo que no
existe es una frontera explícita: los handlers importan el repositorio
directamente, sin capa de aplicación ni puertos.

`[HECHO VERIFICADO]` El almacén de archivos queda **fuera de esa pila**: se
escribe desde el handler (`os.Create`) y se lee sin pasar por ella
(`http.FileServer`).

---

## 3. Drivers que condicionan la decisión

Tomados de `dossier/02-stakeholders-drivers.md`, sin modificar:

| # | Driver | Prioridad | Riesgo que lo sostiene |
|---|---|---|---|
| 1 | **Seguridad** | 1 | R-05 (CORS abierto), R-06 (`/static/` sin control) |
| 2 | **Mantenibilidad** | 2 | R-02 (arranque atado a `.env`), R-03 (persistencia ambigua) |
| 3 | **Rendimiento** | 3 | R-08 (sin timeouts), incumplimiento medido de ESC-01 |
| 4 | **Disponibilidad** | 4 | R-04 (`switch` sin `default` → panic) |

---

## 4. Alternativas evaluadas

### Alternativa A — Monolito en capas (mantener el estilo actual)

Conservar la estructura existente, corrigiendo los defectos puntuales.

| Driver | Evaluación |
|---|---|
| Seguridad | **Neutra.** Permite insertar middleware de autorización en el router sin reestructurar, pero no fuerza hacerlo |
| Mantenibilidad | **Baja.** Sin fronteras explícitas, nada impide que un handler nuevo vuelva a llamar a GORM directamente |
| Rendimiento | **Neutra.** No cambia el costo del recorrido medido |
| Disponibilidad | **Neutra.** |
| Costo de adopción | **Nulo.** Es lo que ya hay |

### Alternativa B — Hexagonal (puertos y adaptadores)

Invertir las dependencias: el dominio define interfaces (puertos) y la
infraestructura las implementa (adaptadores). El almacén de archivos y la base
de datos pasan a ser adaptadores detrás de puertos.

| Driver | Evaluación |
|---|---|
| Seguridad | **Favorable.** El acceso a archivos deja de ser un detalle del handler y pasa por un puerto donde la autorización es un requisito explícito del contrato |
| Mantenibilidad | **Favorable.** El puerto de persistencia elimina de raíz R-03: el motor de BD se vuelve un adaptador intercambiable, no un `switch` en el arranque |
| Rendimiento | **Neutra.** Una indirección más por llamada, despreciable frente a los 557 KB de carga útil |
| Disponibilidad | **Favorable.** El adaptador valida su propia configuración y falla con diagnóstico, no con panic |
| Costo de adopción | **Medio.** Reorganizar paquetes y definir interfaces, sin reescribir lógica |

### Alternativa C — Separación en servicios

Extraer el almacén de archivos (`media`) como servicio independiente, con su
propio despliegue y contrato HTTP.

| Driver | Evaluación |
|---|---|
| Seguridad | **Favorable en teoría.** Un servicio aparte puede tener su propio control de acceso. **Pero** introduce una frontera de red nueva que hoy no existe y que habría que asegurar |
| Mantenibilidad | **Desfavorable.** Dos despliegues, dos configuraciones, versionado de contrato, para un sistema que un equipo de cuatro mantiene en un semestre |
| Rendimiento | **Desfavorable.** Agrega latencia de red a una operación que hoy es una escritura local a disco |
| Disponibilidad | **Desfavorable.** Introduce un modo de fallo que hoy no existe: el API arriba y `media` caído |
| Costo de adopción | **Alto.** |

---

## 5. Decisión

**Se adopta la Alternativa B: arquitectura hexagonal (puertos y adaptadores),
manteniendo un único despliegue.**

### Justificación contra los drivers priorizados

**Seguridad (driver 1).** Es el argumento decisivo. Hoy el acceso a archivos
ocurre en dos lugares sin relación entre sí: `os.Create` en el handler y
`http.FileServer` en el router. Ninguno pasa por una frontera donde la
autorización pueda imponerse. Un puerto `MediaStore` convierte ese acceso en un
contrato único y atravesable, que es la precondición para cerrar R-06.

**Mantenibilidad (driver 2).** R-03 —que el mismo commit pueda correr sobre dos
motores de base de datos según la máquina— no es un bug a parchear: es la
consecuencia de que la elección de persistencia viva en el arranque en lugar de
detrás de una interfaz. Un puerto de repositorio lo elimina estructuralmente.

**Por qué no la C.** La separación en servicios ataca el mismo problema de
seguridad, pero cobra un precio desproporcionado: degrada los drivers 2, 3 y 4
a cambio de una ventaja que la B consigue sin frontera de red. Para un sistema
de cuatro rutas y un solo agregado, es sobreingeniería.

**Por qué no la A.** Mantener el estilo actual deja los defectos como defectos
puntuales, corregibles uno a uno, pero no impide que vuelvan a aparecer. El
sistema ya demostró esa tendencia: de seis decisiones arquitectónicas mapeadas
en el Módulo 3, **cinco son accidentales**.

---

## 6. Antipatrones identificados en el sistema actual

| Antipatrón | Dónde | Evidencia |
|---|---|---|
| **Big Ball of Mud (parcial)** | `back/server/server.go` | Mezcla arranque, lectura de configuración, selección de motor de BD, CORS y routing en un solo paquete |
| **God Object (incipiente)** | `struct Server` | Contiene DB, Config, Handler, Repository y Logger: cinco responsabilidades sin relación |
| **Configuración dispersa** | `config.json` + `.env` | Dos fuentes de verdad para el mismo arranque (R-02, R-03) |
| **Frontera ausente** | `/static/` | El almacén de archivos se lee sin pasar por la lógica de la aplicación (R-06) |

---

## 7. Implicaciones de seguridad del estilo elegido

> **PENDIENTE — redacta Sebastián.** Conectar con R-05 y R-06, y responder:
> ¿qué habilita el puerto `MediaStore` que hoy no es posible? ¿Qué riesgo nuevo
> introduce la indirección, si alguno?

---

## 8. Consecuencias aceptadas

- Más archivos y más interfaces en un sistema pequeño. Se acepta porque el
  costo es de lectura, no de ejecución.
- La migración es incremental: los puertos pueden introducirse de a uno sin
  romper el sistema.
- `[EVIDENCIA FALTANTE]` No se midió el impacto de la indirección sobre la
  latencia. Se asume despreciable frente a los 557 KB por respuesta, pero no se
  comprobó.

---

## 9. Veredicto del mini-comité 1

> **PENDIENTE — lo registra Sebastián tras la sesión del comité.**
> Confirmada / Ajustada / Reconsiderada, con la justificación.

---

## 10. Trazabilidad

- **Repositorio:** https://github.com/frank241103/death-note-arquitectura
- **Rama:** `main`
- **Commit:** *(completar tras el merge)*
- **Pull Request:** *(completar tras el merge)*
- **ADR asociado:** `adrs/ADR-005-estilo-hexagonal.md`
