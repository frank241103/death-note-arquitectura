# ADR-001: Adopción de Sistema Base Externo (Opción C del Protocolo)

**Fecha:** 2026-08-24  
**Estado:** ✅ Aceptada

---

## Contexto

El equipo no desarrolló el sistema desde cero. Se adopta el proyecto existente "Death Note" (`https://github.com/IsergioG/PA-FINAL-PROJECT`, autor original sergiocoba-IND) conforme a la opción C del protocolo de la asignatura, que permite usar un sistema existente como objeto de estudio arquitectónico.

---

## Decisión

El equipo adopta formalmente el sistema base como artefacto a analizar, sin modificar el stack ni reescribir componentes. La adopción incluye:
- Conservación del stack original (Go backend, React frontend, GORM ORM)
- Declaración explícita de que el equipo NO es autor del código
- Mantenimiento del historial Git del autor original (commits 4ebec3b y b76332e)
- Preservación del remoto original como `upstream`

---

## Consecuencias

✅ **Permitidas:**
- Análisis arquitectónico sin restricción
- Medición de atributos de calidad
- Documentación de riesgos y decisiones

❌ **No permitidas:**
- Modificación del stack (Go+React es fijo)
- Reescritura significativa de componentes
- Cambio de patrón arquitectónico fundamental

📋 **Obligaciones:**
- Autorización docente pendiente de confirmar
- Trazabilidad Git de autoría original (conservada)
- Declaración explícita en README.md y dossier
