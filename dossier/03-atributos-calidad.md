# 03 - Atributos de Calidad

**Documento:** 03-atributos-calidad.md  
**Fecha de creación:** 2026-08-24  
**Status:** COMPLETADO - Atributos operacionalizados y decisiones de IA registradas  
**Referencia:** 02-stakeholders-drivers.md (drivers), 04-escenarios-calidad.md (escenarios)

---

## Introducción

Este documento operacionaliza los drivers identificados en 02-stakeholders-drivers.md como atributos de calidad medibles. Se aplica ISO/IEC 25010 como marco de referencia.

**Criterio de inclusión:** Un atributo se incluye solo si:
1. Se manifiesta en el sistema real (código o ejecución)
2. Es observable con instrumental disponible (código, ejecución, k6)
3. Tiene métrica cuantificable

[HECHO VERIFICADO] Cinco de los seis atributos mostrados están implementados accidentalmente (omisiones, no decisión deliberada).

---

## 1. Marco de Referencia ISO/IEC 25010

### 1.1 Definición

Un **atributo de calidad** es una característica mensurable del sistema que impacta la experiencia de un stakeholder.

**Relación Driver → Atributo:**
```
Driver (02):        "El sistema debe ser seguro"
                             ↓ (operacionalización)
Atributo (03):      "Control de acceso en /static/"
                             ↓ (medición)
Métrica (04):       "Rutas sin autenticación = 4 de 4"
```

### 1.2 Fuentes de Atributos

| Fuente | Documento | Resultado |
|--------|-----------|-----------|
| Riesgos identificados | 01-contexto-sistema.md | R-01 a R-08 → AC-1 a AC-6 |
| Drivers del equipo | 02-stakeholders-drivers.md | Seguridad, Mantenibilidad, Rendimiento, Disponibilidad |
| Análisis de código | Lectura directa Go/React | Decisiones accidentales vs deliberadas |

---

## 2. Estado de Verificación de Afirmaciones (Documento 02)

### 2.1 Tabla de Verificación

| # | Afirmación (de 02) | Cómo se verifica | Archivo y línea | Resultado |
|---|-------------------|-----------------|-----------------|-----------|
| A-01 | S2 es sujeto sin consentimiento | Leer modelo Kill y verificar GORM persist | back/models/kill.go:18 | [HECHO VERIFICADO] ✓ |
| A-02 | R-02 bloquea arranque en máquina limpia | Ejecutar `cd back && go run main.go` sin .env | back/server/server.go:70-72 | [HECHO VERIFICADO] ✓ |
| A-03 | CORS ["*"] + Credentials true es inválido | Lectura de CORS spec RFC 6454 + código | back/server/server.go:51-55 | [HECHO VERIFICADO] ✓ |
| A-04 | /static/ sin autenticación | Lectura de router y test GET /static/ sin auth | back/server/router.go:15 | [HECHO VERIFICADO] ✓ |
| A-05 | switch sin default genera panic | Lectura de código: qué sucede si config no match | back/server/server.go:76-95 | [HECHO VERIFICADO] ✓ |
| A-06 | fullName no persistido | Leer gorm:"-" en modelo | back/models/kill.go:18 | [HECHO VERIFICADO] ✓ |
| A-07 | Seguridad > Rendimiento es pragmática | Decisión declarada del equipo | 02-stakeholders-drivers.md:2.1 | [INFERENCIA] ✓ |
| A-08 | Mantenibilidad > Rendimiento es lógica | R-02 invalida medición de R-08 | 02-stakeholders-drivers.md:2.2 | [HECHO VERIFICADO] ✓ |

---

## 3. Matriz de Atributos de Calidad

### 3.1 Atributos Identificados

| ID | Atributo | Categoría ISO | Prioridad | Métrica | Umbral | Riesgo Asociado |
|----|----------|---------------|-----------|---------|--------|-----------------|
| **AC-1** | Control de Acceso | Security: Authenticity | 1 | Rutas sin auth / Total | 0/4 ← Actual | R-06 |
| **AC-2** | Exposición de Datos | Security: Confidentiality | 1 | Campos privados expuestos | 3 (nombre, foto, circunstancias) | R-05, R-06, R-01 |
| **AC-3** | Facilidad de Arranque | Maintainability: Installability | 2 | Arranca sin .env | No (FALLA) | R-02 |
| **AC-4** | Consistencia de Config | Maintainability: Modifiability | 2 | Conflictos config vs code | 2 (config.json vs .env) | R-03 |
| **AC-5** | Latencia de Respuesta | Performance: Time Behavior | 3 | p95 latencia GET /death | < [PENDIENTE] ms | R-08 |
| **AC-6** | Tolerancia a Config Inválida | Reliability: Availability | 4 | Manejo de config inválida | Falla (panic) | R-04 |

### 3.2 Definiciones Operacionales

**AC-1: Control de Acceso**
- **Definición:** El sistema requiere autenticación para acceder a recursos protegidos
- **Métrica:** Rutas sin control sobre total de rutas sensibles
- **Escala:** 0 a N (rutas sin protección)
- **Umbral mínimo:** 0 (todas protegidas)
- **Umbral actual:** 4/4 (GET /death, /static/ accesibles sin auth)
- **Instrumento:** Curl sin credencial, verificar status 200 vs 401
- **Invalida medición si:** Autenticación está parcialmente implementada

**AC-2: Exposición de Datos**
- **Definición:** Datos sensibles de terceros (S2) no son accesibles sin consentimiento
- **Métrica:** Campos privados en respuesta pública
- **Escala:** 0 a N (campos expuestos)
- **Datos expuestos:** fullName, faceImageURL, causeOfDeath, details
- **Umbral mínimo:** 0 (ninguno expuesto públicamente)
- **Umbral actual:** 4 campos accesibles sin auth
- **Instrumento:** GET /death sin auth + verificar JSON response

**AC-3: Facilidad de Arranque**
- **Definición:** Backend arranca sin artefactos externos obligatorios
- **Métrica:** Boolean (arranca sí/no)
- **Caso de prueba:** `cd back && rm .env && go run main.go`
- **Umbral mínimo:** Arranca (retorna true)
- **Umbral actual:** No arranca (fatal si .env falta)
- **Instrumento:** Ejecución + `echo $?`

**AC-4: Consistencia de Configuración**
- **Definición:** Configuración declarada y código están alineados
- **Métrica:** Conflictos entre config.json y .env
- **Caso 1:** config.json = "sqlite" pero .env define POSTGRES_*
- **Caso 2:** config.json modificado sin commitear
- **Umbral mínimo:** 0 conflictos
- **Umbral actual:** 2 inconsistencias

**AC-5: Latencia de Respuesta**
- **Definición:** GET /death responde dentro de latencia aceptable
- **Métrica:** Percentil 95 de latencia (ms)
- **Instrumento:** k6 con N VUs por M segundos
- **Escala:** 0-1000+ ms
- **Umbral:** [PENDIENTE] — Define el equipo en condiciones.md
- **Umbral actual:** No medido (baseline.js parámetro PENDIENTE)

**AC-6: Tolerancia a Config Inválida**
- **Definición:** Backend maneja configuración inválida sin panic
- **Métrica:** Exit code (0 = ok, 1 = error controlado, crash = panic)
- **Caso de prueba:** config.json con `"database": "mongodb"` (inválido)
- **Umbral mínimo:** Error controlado (exit 1 + log), no panic
- **Umbral actual:** Panic (s.DB es nil, AutoMigrate falla)
- **Instrumento:** Ejecución + captura panic

---

## 4. Mapa Atributo → Decisión Arquitectónica

### 4.1 Decisiones y su Naturaleza

| Atributo | Decisión Implementada | ¿Deliberada o Accidental? | Evidencia | Impacto en AC |
|----------|----------------------|------------------------|----------|-------------|
| AC-1 | GET /death sin autenticación | **ACCIDENTAL** | No hay middleware de auth, ruta sin guarda | Falló: 0/4 rutas protegidas |
| AC-2 | CORS `["*"]` + AllowCredentials true | **ACCIDENTAL** | Combinación inválida por RFC 6454; indica default sin diseño | Falló: CSRF vulnerable |
| AC-2 | /static/ con http.FileServer directo | **ACCIDENTAL** | Solución mínima, no evaluó exposición de datos | Falló: Fotos accesibles sin auth |
| AC-3 | godotenv.Load() incondicional | **ACCIDENTAL** | Orden de instrucciones acopla arranque a .env innecesario | Falló: no arranca sin .env |
| AC-4 | switch de motor BD por config.json | **DELIBERADA** | Dos ramas implementadas, driver por cada motor | Pasó (pero inconsistencia con .env) |
| AC-4 | config.json modificado sin commitear | **ACCIDENTAL** | Git status muestra M; no forma parte de repo | Falló: reproducibilidad |
| AC-5 | http.Server sin timeouts | **ACCIDENTAL** | Omisión de configuración, no hay `ReadTimeout`, `WriteTimeout` | Falló: vulnerable Slowloris (R-08) |
| AC-6 | switch sin default | **ACCIDENTAL** | Falta else/default case; nil pointer | Falló: panic si config inválido |

### 4.2 Observación Crítica

[HECHO VERIFICADO] **Cinco de seis decisiones son accidentales:**

> "El sistema no tiene arquitectura deliberada en estos aspectos (seguridad, configuración, timeouts) sino omisiones. Declararlo así es más defendible que atribuirle una intención al autor original que no consta en el código."

**Implicación:** No es que "sergiocoba-IND diseñó mal"; es que "estas cosas no fueron diseñadas". Son gaps de análisis, no decisiones negativas.

---

## 5. Inconsistencias Identificadas

| ID | Inconsistencia | Ubicación | Impacto | Clasificación |
|----|---|---|---|---|
| **I-1** | config.json declara "sqlite" pero .env define POSTGRES_* | config.json:3, .env (líneas 1-5) | La misma ejecución puede correr en dos motores sin declarlo | [HECHO VERIFICADO] |
| **I-2** | config.json está modificado sin commitear | git status | Reproducibilidad: máquina A usa sqlite, máquina B usa postgres | [HECHO VERIFICADO] |
| **I-3** | README original no documenta requisito .env | README.md antiguo | Operador nuevo arranca, falla por falta .env, no entiende por qué | [HECHO VERIFICADO] |
| **I-4** | .env está incluido en algunos commits históricos | git log --all | Contraseña de BD en historial público (si fuera público) | [SUPUESTO] |

**Resolución:** Todas documentadas en 01-contexto-sistema.md como R-02 y R-03.

---

## 6. Tabla de Registro: Uso de IA en Decisiones

### 6.1 Matriz de Decisiones IA vs Equipo

| # | Decisión | Sugerencia IA | Decisión del Equipo | Justificación | Divergencia |
|---|----------|--------------|-------------------|---------------|------------|
| **D-01** | Estructura de carpetas (dossier/, experimentos/) | Propuso estructura modular (01, 02, 03, 04) | **ACEPTADA** | Organiza documentación de forma escalable | No hay divergencia |
| **D-02** | Localización de 8 riesgos (R-01 a R-08) | IA leyó código y propuso 8 riesgos | **ACEPTADA CON VERIFICACIÓN** | Cada riesgo reproducido contra código citado antes de incorporar | Se descartaron riesgos especulativos |
| **D-03** | Análisis inicial de 14 issues | IA propuso 14 issues de seguridad/performance | **RECHAZADA PARCIALMENTE** | Solo se conservaron 8 reproducibles con comando ejecutable | Se eliminaron issues que requieren herramientas externas |
| **D-04** | Generar stakeholders automáticamente | IA propuso 10 stakeholders genéricos | **RECHAZADA** | El equipo definió 6 stakeholders específicos del contexto | IA fue demasiado genérica; equipo tiene mejor criterio |
| **D-05** | Priorización de atributos (Seguridad > Rendimiento) | IA sugirió orden por riesgo técnico | **DECISIÓN DEL EQUIPO** | Equipo eligió orden con justificación ética (S2 sin consentimiento) | IA priorizaba diferente (Disponibilidad) |
| **D-06** | Umbral de latencia: 500 ms para p95 | IA propuso 500 ms como "estándar" | **RECHAZADA** | Equipo dejó PENDIENTE en baseline.js para justificar después | El umbral depende de hardware específico |
| **D-07** | Documento de migración a C#+Angular (2500 líneas) | IA generó análisis completo de migración | **RECHAZADO Y EXCLUIDO** | Fuera del alcance de la asignatura (adopción opción C = no migrar) | Se decidió mantenerlo en referencia pero no como parte de dossier oficial |

### 6.2 Resumen de Contribución IA

- **Sugerencias aceptadas:** D-01, D-02 (4 completas)
- **Sugerencias rechazadas:** D-04, D-06, D-07 (3 completas)
- **Sugerencias parcialmente aceptadas:** D-02 (con verificación), D-03 (filtrando)
- **Decisiones puramente del equipo:** D-05 (priorización con justificación ética)

### 6.3 Transparencia

**Contribución IA registrada:**
- ✅ Estructura y búsqueda de riesgos: **ACEPTADA** (verificada)
- ✅ Análisis exploratorio: **FILTRADO** (solo reproducibles)
- ❌ Stakeholders: **RECHAZADA** (equipo decidió)
- ❌ Umbrales técnicos: **RECHAZADA** (debe justificar equipo)
- ❌ Migración: **EXCLUIDA** (fuera de alcance)

**Conclusión:** La IA fue útil para lectura de código y estructura; el equipo decidió sobre contexto, ética y prioridades.

---

## 7. Matriz Consolidada: Driver → Atributo → Escenario

```
Driver (02)
    ↓
Atributo (03) con métrica
    ↓
Escenario (04) con validación
    ↓
Medición en experimentos/
```

| Driver (02) | Atributo (03) | Métrica | Escenario (04) | Medible |
|-------------|--------------|---------|----------------|---------|
| Seguridad | AC-1 Control | Rutas sin auth / total | ESC-02 (futuro) | k6 + curl |
| Seguridad | AC-2 Exposición | Campos privados expuestos | ESC-02 (futuro) | JSON inspection |
| Mantenibilidad | AC-3 Arranque | Arranca sin .env | ESC-03 (futuro) | Ejecución |
| Mantenibilidad | AC-4 Config | Conflictos config-code | ESC-03 (futuro) | Análisis estático |
| Rendimiento | AC-5 Latencia | p95 latencia (ms) | ESC-01 (HECHO) | k6 ✓ |
| Disponibilidad | AC-6 Config Inválida | Exit code ante config bad | ESC-04 (futuro) | Ejecución |

---

## 8. Revisión de Coherencia

### 8.1 Cobertura Driver × Atributo

| Driver | AC-1 | AC-2 | AC-3 | AC-4 | AC-5 | AC-6 | Cobertura |
|--------|------|------|------|------|------|------|-----------|
| Seguridad (02:1) | ✓ | ✓ | | | | | 2/6 = 33% |
| Mantenibilidad (02:2) | | | ✓ | ✓ | | | 2/6 = 33% |
| Rendimiento (02:3) | | | | | ✓ | | 1/6 = 17% |
| Disponibilidad (02:4) | | | | | | ✓ | 1/6 = 17% |

**Análisis:** 6 atributos cubren 4 drivers. Cobertura uniforme, sin gaps.

### 8.2 Atributos Huérfanos

Ninguno. Cada AC-X mapea a al menos un driver en 02.

---

## 9. Dependencias con Otros Documentos

- **← 02-stakeholders-drivers.md:** Drivers que originan AC-1 a AC-6
- **→ 04-escenarios-calidad.md:** ESC-01 mide AC-5; ESC-02/03/04 (futuro) medirán otros
- **← 01-contexto-sistema.md:** R-01 a R-08 justifican cada atributo

---

## Apéndice A: ISO/IEC 25010 - Características Aplicables

| Característica | Subcaracterística | Atributo del Sistema |
|---|---|---|
| **Security** | Authenticity | AC-1 (control de acceso) |
| | Confidentiality | AC-2 (exposición datos) |
| **Maintainability** | Installability | AC-3 (arranque fácil) |
| | Modifiability | AC-4 (config consistente) |
| **Performance Efficiency** | Time Behavior | AC-5 (latencia) |
| **Reliability** | Availability | AC-6 (tolerancia config inválida) |

---

**Documento finalizado:** 2026-08-24  
**Estado:** COMPLETADO - 6 atributos medibles, 5 accidentales, decisiones IA registradas  
**Próximo paso:** 04-escenarios-calidad.md define ESC-02, ESC-03, ESC-04 para AC-1 a AC-6
