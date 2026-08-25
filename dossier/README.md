# 📑 Dossier - Documentación de Arquitectura

Carpeta de documentación técnica del proyecto Death Note - Estudio de Arquitectura.

## Archivos

### 1. 01-contexto-sistema.md
Documentación de 8 riesgos técnicos identificados y verificados mediante lectura de código.

**Contiene:**
- Ocho riesgos con ubicación exacta y fragmento de código
- R-01: Sprintf sin argumentos
- R-02: godotenv.Load() Fatal antes de evaluar BD
- R-03: config.json modificado, .env con vars PostgreSQL
- R-04: Switch sin default case
- R-05: CORS AllowedOrigins ["*"] + AllowCredentials true
- R-06: /static/ sin autenticación
- R-07: fullName no persistido en BD
- R-08: http.Server sin timeouts
- Clasificación de verificación para cada riesgo
- Tabla resumen de hallazgos

**Generado:** 2026-08-24
**Status:** Riesgos verificados, secciones de alcance/restricciones/clasificación en PENDIENTE
**Tamaño:** ~400 líneas

### 2. 02-stakeholders-drivers.md
Mapa de stakeholders y drivers de calidad ISO/IEC 25010.

**Contiene:**
- Matriz de identificación de stakeholders
- Matriz de drivers ISO/IEC 25010
- Priorización de drivers
- Restricciones arquitectónicas
- Matriz de trade-offs entre drivers

**Estructura:** Tablas vacías + PENDIENTE para completar por equipo
**Generado:** 2026-08-24
**Status:** Esquema listo, contenido PENDIENTE

### 3. 03-atributos-calidad.md
Atributos de calidad operacionalizables derivados de drivers.

**Contiene:**
- Marco de referencia
- Estado de verificación de afirmaciones
- Matriz de atributos ISO/IEC 25010
- Priorización de atributos
- Mapa atributo → decisión arquitectónica
- Tabla de registro de uso de IA (sugerencia / decisión / justificación)
- Matriz de cobertura driver × atributo

**Estructura:** Tablas de decisión + PENDIENTE para completar por equipo
**Generado:** 2026-08-24
**Status:** Esquema listo, contenido PENDIENTE
**Especial:** Tabla de decisiones IA (sección 6)

### 4. 04-escenarios-calidad.md
Escenarios de calidad para verificar atributos.

**Contiene:**
- Plantilla estándar de escenario (fuente-estímulo-artefacto-ambiente-respuesta-medida)
- ESC-01 detallado sobre GET /death con campos vacíos
- Método de medición (pasos operativos + herramientas)
- Sección "qué invalida esta medición" (checklist)
- Tabla de resultados (vacía, lista para llenar)
- Contraste contra umbral (decisión arquitectónica)
- Reproducibilidad (pasos exactos para repetir)
- Matriz de escenarios × atributos

**Estructura:** ESC-01 con todas las secciones, PENDIENTE rellenar valores
**Generado:** 2026-08-24
**Status:** Esquema completo, datos de ejecución PENDIENTE
**Ubicación de datos:** experiments/medicion-escenario-01/

### 5. AUDITORIA_ARQUITECTURA_COMPLETA.txt
Análisis exhaustivo de la arquitectura actual (Go + React + PostgreSQL/SQLite).

**Contiene:**
- Estado actual del proyecto (backend, frontend, BD)
- Arquitectura general
- Diagram E-R de base de datos
- Capas y componentes
- Manejo de errores
- Repository pattern
- Handler /static/ para uploads
- Testing (0% cobertura)
- Endpoints API
- Validaciones (falta de)
- Configuración y credenciales
- Docker y deployment
- Issues críticos (severidad: crítica/alta/media)
- Matriz README vs código
- Plan de acción con 14 recomendaciones inmediatas

**Generado:** 2026-08-03
**Tamaño:** ~1,800 líneas

### 2. ANALISIS_MIGRACION_CSharp_Angular.txt
Análisis de viabilidad para migración a C#/.NET 8 + Angular 20 + SQL Server.

**Contiene:**
- Comparativa arquitectónica (Go vs C#)
- Comparativa frontend (React vs Angular 20)
- Comparativa BD (PostgreSQL vs SQL Server)
- Análisis de capas y patrones
- Estimación de esfuerzo (140 horas, ~3.5 semanas)
- Arquitectura propuesta Clean Architecture
- Ventajas de migración
- Desventajas y costos
- Recomendaciones finales
- Hoja de ruta detallada (semana a semana)
- 4 escenarios posibles (completo, frontend, backend, incremental)

**Generado:** 2026-08-03
**Tamaño:** ~2,500 líneas

### 3. [PENDIENTE] Diagrama E-R
Modelo entidad-relación mejorado de la base de datos.

### 4. [PENDIENTE] Documento de decisiones
Decisiones arquitectónicas y justificación de cada una.

---

## Cómo usar este dossier

1. **Para entender el estado actual:** Lee `AUDITORIA_ARQUITECTURA_COMPLETA.txt`
2. **Para considerar migración:** Lee `ANALISIS_MIGRACION_CSharp_Angular.txt`
3. **Para ver diagrama de BD:** Abre diagrama E-R
4. **Para decisiones técnicas:** Consulta documento de decisiones

Todos los documentos son auto-contenidos; no requieren código fuente para ser entendidos.
