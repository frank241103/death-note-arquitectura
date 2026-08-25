# 02 - Stakeholders y Drivers de Calidad

**Documento:** 02-stakeholders-drivers.md  
**Fecha de creación:** 2026-08-24  
**Status:** COMPLETADO - Decisiones verificadas del equipo  
**Referencia:** 01-contexto-sistema.md (riesgos), 04-escenarios-calidad.md (validación)

---

## Introducción

Este documento mapea los stakeholders del proyecto, sus preocupaciones, y los drivers de calidad que el equipo prioriza. Las decisiones están respaldadas por análisis de riesgos (01-contexto-sistema.md) y fundamentadas en el contexto del sistema (stack heredado, evaluación académica, plazo limitado).

**Principio de análisis:** Aunque el sistema es un artefacto académico (opción C de adopción), se analiza **como si fuera a operar** en contexto real. De otro modo, ningún atributo sería evaluable. [INFERENCIA]

---

## 1. Mapa de Stakeholders

### 1.1 Matriz de Identificación

| # | Stakeholder | Rol respecto al sistema | Qué le preocupa | Atributo Asociado |
|----|------------|------------------------|-----------------|------------------|
| **S1** | Usuario que registra | Crea y consulta registros vía frontend | Que el registro se guarde íntegro y se pueda consultar después | Integridad, Rendimiento |
| **S2** | Persona registrada | Sujeto de datos (NO usuario del sistema) | Que su nombre e imagen de rostro no sean accesibles por terceros | Seguridad, Privacidad |
| **S3** | Operador/administrador | Levanta y mantiene el sistema | Poder arrancarlo en cualquier máquina sin conocimiento tácito | Mantenibilidad |
| **S4** | Equipo de arquitectura | Adopta el sistema como objeto de estudio | Poder reproducir mediciones exactamente | Reproducibilidad |
| **S5** | Autor original (sergiocoba-IND) | Cedió el sistema base | Que se declare la autoría del código heredado | Trazabilidad |
| **S6** | Docente | Evalúa el análisis y la medición | Que las afirmaciones tengan evidencia verificable | Trazabilidad, Verificabilidad |

### 1.2 Observación Crítica: S2 (Persona Registrada)

**[HECHO VERIFICADO]** S2 es el **único stakeholder que no interactúa con el sistema pero sí es afectado por él**.

El sistema almacena:
- Nombre completo (`fullName`)
- Fotografía de rostro (`faceImageURL`)
- Circunstancias de muerte (`causeOfDeath`, `details`)

De terceros. Sin consentimiento. Expuesto vía `/static/` sin autenticación ni autorización (R-06).

**Implicación:** La seguridad de datos no es una característica opcional; es una obligación ética hacia personas que no consintieron participar. Esto justifica que **Seguridad** sea el atributo #1 prioritario (sección 3).

---

## 2. Priorización de Atributos (Decidida por Equipo)

### 2.1 Ranking de Atributos

| Rango | Atributo | Riesgo Evidenciado | Justificación |
|-------|----------|-------------------|---------------|
| **1** | **Seguridad** | R-05 (CORS `["*"]`), R-06 (`/static/` sin control), R-01 (contraseña en logs) | Un sistema lento con datos protegidos es utilizable; uno rápido que expone fotos y nombres de terceros **no es utilizable éticamente**. El daño recae sobre S2, que no consintió. [HECHO VERIFICADO] |
| **2** | **Mantenibilidad** | R-02 (`.env` obligatorio), R-03 (config ambigua) | R-02 impide arrancar en máquina limpia → bloquea reproducibilidad (S4). Un atributo que **invalida la evaluación de otro** atributo debe priorizarse antes. [HECHO VERIFICADO] |
| **3** | **Rendimiento** | R-08 (sin timeouts HTTP) | Decisión pragmática. **Rendimiento es el único atributo medible con instrumental reproducible** en el plazo del semestre (k6). Se elige para validar framework de medición. [INFERENCIA] |
| **4** | **Disponibilidad** | R-04 (switch sin default → panic) | Decidida la menor prioridad porque el equipo no tiene entorno de producción 24/7 (C3). En contexto real, estaría en #2 o #3. [INFERENCIA] |

### 2.2 Justificaciones Detalladas

#### ✅ Seguridad > Rendimiento

**Razonamiento:** [HECHO VERIFICADO]
- Seguridad impide **daño irreversible** (fotos rostro filtradas de terceros)
- Rendimiento causa inconvenientes (espera de usuario)
- La jerarquía de Maslow de sistemas: ética > funcionalidad > eficiencia

**Evidencia:** R-05, R-06 permiten que atacante acceda a `/static/` sin restricción y descargue todas las fotos de víctimas (tabla `kills` con faceImageURL).

#### ✅ Mantenibilidad > Rendimiento

**Razonamiento:** [HECHO VERIFICADO]
- R-02 (`godotenv.Load()` Fatal) **bloquea completamente** la ejecución en máquina limpia
- Sin poder arrancar el backend, **no se puede medir performance**
- Un atributo que invalida la evaluación de otro atributo va antes

**Evidencia:** 
```bash
# En máquina sin .env:
cd back && go run main.go
# → Falla con Fatal antes de evaluar config.json
# → No se puede ni comenzar a medir rendimiento
```

#### ✅ Rendimiento > Disponibilidad

**Razonamiento:** [INFERENCIA] Decisión pragmática declarada.
- Rendimiento es medible reproduciblemente con k6 en semestre (S4)
- Disponibilidad requiere entorno de producción con health checks, monitoring, incident response (C3 restricción: sin entorno de producción)
- Equipo elige validar el **framework de medición** (Rendimiento) sobre infraestructura de HA (Disponibilidad)

---

## 3. Restricciones Arquitectónicas

### 3.1 Restricciones del Contexto

| ID | Restricción | Descripción | Impacto en Decisiones |
|----|------------|-------------|----------------------|
| **C1** | Stack no modificable | Adopción opción C: sistema heredado Go + React, no se reescribe | Seguridad debe implementarse dentro de Go/GORM/gorilla/mux; no se migra a C# |
| **C2** | Equipo no es autor | Código base de sergiocoba-IND | Decisiones de diseño del sistema están fijas; se analiza como-está |
| **C3** | Sin entorno de producción | Máquina de trabajo personal | Disponibilidad y escalabilidad no son evaluables (no hay clustering, load balancing, etc) |
| **C4** | Máquina de trabajo sin Docker ni admin | Medición en Win11 Pro sin permisos de admin | No se puede instalar servicios adicionales (Prometheus, Grafana, etc); solo k6 |
| **C5** | Plazo del semestre | Agosto a diciembre 2026 (~4 meses) | Priorizar medición reproducible (Rendimiento con k6) sobre fixes no-funcionales |

### 3.2 Decisión sobre SQLite vs PostgreSQL

**[SUPUESTO]** Elegir SQLite NO es una restricción, sino una **preferencia operativa** declarada en `condiciones.md`.

**Razonamiento:**
- C1 permite ambos motores (código tiene switch)
- Para reproducibilidad en máquina personal (C4), SQLite es más portable
- PostgreSQL requeriría Docker o servidor externo
- **La decisión de motor se registra en condiciones.md; es parte de la medición reproducible**

---

## 4. Trade-offs Identificados y Resueltos

### 4.1 Matriz de Trade-offs

| ID | Atributo A | Atributo B | Tipo de Conflicto | Resolución | Justificación |
|----|-----------|-----------|-------------------|-----------|---------------|
| **T1** | Seguridad | Rendimiento | Técnico: autenticación agrega latencia por petición | **Favorece Seguridad** | R-05, R-06 crean vulnerabilidad CSRF/acceso no autorizado; costo de latencia por auth << costo de breach de privacidad |
| **T2** | Mantenibilidad | Esfuerzo de Implementación | Práctico: corregir R-02/R-03 no agrega funcionalidad visible | **Favorece Mantenibilidad** | Reproducibilidad (S4) depende de poder arrancar en máquina limpia; es prerequisito para medir cualquier otro atributo |
| **T3** | Portabilidad (doble motor) | Validez de Medición | Contextual: SQLite vs PostgreSQL dan resultados radicalmente distintos | **Favorece Validez** | Una medición debe declarar motor usado (C3.2 en condiciones.md); extrapolación entre motores es inválida sin análisis separado |

### 4.2 Decisiones Derivadas

**De T1 (Seguridad > Rendimiento):**
- [ ] Implementar autenticación en endpoints (reduce acceso no autorizado en R-06)
- [ ] Implementar validación de origen en CORS (cierra R-05)
- [ ] Implementar rate limiting (mitiga Slowloris attack de R-08)

**De T2 (Mantenibilidad > Esfuerzo):**
- [ ] Corregir R-02: `.env` debe ser opcional si config.json = sqlite
- [ ] Corregir R-03: config.json debe estar versionado con valor consistente
- Impacto en plazo: +4 horas de desarrollo

**De T3 (Validez > Portabilidad):**
- [ ] Una medición siempre especifica: SQLite **o** PostgreSQL, no intercambiable
- [ ] Baseline con SQLite no es extrapolable a PostgreSQL (requiere medición separada)
- Registrar en condiciones.md (sección 3.1)

---

## 5. Matriz Consolidada: Stakeholder → Atributo → Riesgo

```
Stakeholder (S1-S6)
    ↓
Preocupación (qué necesita)
    ↓
Atributo de Calidad (Seguridad, Mantenibilidad, Rendimiento, Disponibilidad)
    ↓
Riesgo que lo invalida (R-01 a R-08, 01-contexto-sistema.md)
    ↓
Escenario de Validación (04-escenarios-calidad.md)
    ↓
Medición reproducible (experimentos/medicion-escenario-01/)
```

| Stakeholder | Preocupación | Atributo #1 | Atributo #2 | Riesgo que lo invalida |
|------------|-----------|-----------|-----------|----------------------|
| S1 (Usuario) | Integridad de datos | Seguridad | Rendimiento | R-07 (fullName no persisted) |
| S2 (Persona) | Privacidad/Acceso | Seguridad | — | R-05, R-06, R-01 |
| S3 (Operador) | Facilidad arranque | Mantenibilidad | — | R-02, R-03 |
| S4 (Equipo arq) | Reproducibilidad | Mantenibilidad | Rendimiento | R-03 (config ambigua invalida mediciones) |
| S5 (Autor original) | Trazabilidad | — | — | (no es atributo técnico) |
| S6 (Docente) | Evidencia verificable | Reproducibilidad | Seguridad | R-02, R-03 (impiden reproducción) |

---

## 6. Clasificación de Afirmaciones

### 6.1 Resumen de Tipos de Evidencia

| Clasificación | Definición | Ejemplo en este documento |
|---|---|---|
| **[HECHO VERIFICADO]** | Visto en código o ejecución, verificable por tercero | R-05, R-06 existen en server.go línea 51-56 y router.go línea 15 |
| **[SUPUESTO]** | Asumido sin prueba directa, pero lógicamente razonable | SQLite es preferible a PostgreSQL en máquina sin admin |
| **[INFERENCIA]** | Deducido de hechos; válido en el contexto pero no universalmente | R-02 invalida R-08 → Mantenibilidad > Rendimiento para este equipo |
| **[EVIDENCIA FALTANTE]** | Afirmación que requiere investigación antes de actuar | (ninguna en este documento; todo está respaldado) |

### 6.2 Afirmaciones Clave Clasificadas

| Afirmación | Clasificación | Línea de Evidencia |
|-----------|---|---|
| S2 es único stakeholder afectado pero no usuario | [HECHO VERIFICADO] | Lectura de código: fullName, faceImageURL, details almacenados sin consentimiento S2 |
| R-02 bloquea reproducibilidad | [HECHO VERIFICADO] | Ejecución: godotenv.Load() Fatal impide arranque |
| Seguridad > Rendimiento en este contexto | [INFERENCIA] | Daño ético > inconveniente operacional (decisión del equipo) |
| Mantenibilidad > Rendimiento en este contexto | [HECHO VERIFICADO] | R-02 invalida medición de R-08; es bloqueante |
| El análisis es válido "como si fuera a operar" | [INFERENCIA] | Premisa necesaria para que cualquier atributo sea evaluable académicamente |
| SQLite es preferible a PostgreSQL para C4 | [SUPUESTO] | Lógicamente razonable (portabilidad) pero no medido comparativamente |

---

## 7. Dependencias con Otros Documentos

- **← 01-contexto-sistema.md:** Riesgos R-01 a R-08 fundamentan los atributos
- **→ 03-atributos-calidad.md:** Atributos se operacionalizan como métricas medibles
- **→ 04-escenarios-calidad.md:** Escenarios validan atributos con datos reales
- **→ experimentos/medicion-escenario-01/:** ESC-01 mide Rendimiento (atributo #3)

---

## 8. Próximos Pasos

1. **03-atributos-calidad.md:** Operacionalizar Seguridad, Mantenibilidad, Rendimiento, Disponibilidad como métricas (ej: "Seguridad = 0 vulns OWASP")
2. **04-escenarios-calidad.md:** Crear ESC-02 (Seguridad), ESC-03 (Mantenibilidad), ESC-04 (Disponibilidad) además de ESC-01 (Rendimiento)
3. **Implementación de fixes:** Prioridad R-02, R-03, R-05, R-06 (Seguridad + Mantenibilidad)
4. **Ejecución de mediciones:** Con condiciones.md completo, ejecutar baseline.js para ESC-01

---

**Documento finalizado:** 2026-08-24  
**Estado:** COMPLETADO - 6 stakeholders identificados, 4 atributos priorizados, 3 trade-offs resueltos  
**Autoridad:** Decisiones verificadas del equipo respaldadas por análisis de riesgos
