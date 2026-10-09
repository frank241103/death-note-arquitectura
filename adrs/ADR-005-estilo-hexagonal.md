# ADR-005 — Adopción de arquitectura hexagonal (puertos y adaptadores)

**Estado:** Aceptada — pendiente de veredicto del mini-comité 1
**Fecha:** 2026-10-08
**Módulo:** 4
**Decide:** equipo de arquitectura (4 integrantes)

---

## Contexto

El sistema base, adoptado bajo la opción C del protocolo, implementa un
monolito en capas por construcción y no por diseño declarado. El Módulo 3
estableció que **cinco de seis decisiones arquitectónicas mapeadas son
accidentales**: omisiones, no elecciones.

Los dos drivers de mayor prioridad del equipo —seguridad y mantenibilidad—
están comprometidos por defectos que no son puntuales sino estructurales:

- El acceso al almacén de archivos ocurre en dos puntos sin frontera común
  (R-06), lo que hace imposible imponer autorización sin reestructurar.
- La elección del motor de persistencia vive en el arranque en lugar de detrás
  de una interfaz (R-03), de modo que un mismo commit puede ejecutarse sobre
  dos motores distintos según la máquina.

---

## Decisión

Adoptar **arquitectura hexagonal (puertos y adaptadores)** manteniendo un
único despliegue.

Concretamente:

1. El dominio (`Kill`) define interfaces para lo que necesita del exterior:
   `KillRepository` y `MediaStore`.
2. La infraestructura implementa esas interfaces como adaptadores:
   `SQLiteKillRepository`, `LocalFileMediaStore`.
3. Los handlers dependen de las interfaces, no de las implementaciones.
4. La selección del adaptador ocurre en un único punto de composición en el
   arranque.

---

## Alternativas consideradas y descartadas

**Mantener el monolito en capas actual.** Descartada porque permite corregir
los defectos uno a uno pero no impide que reaparezcan: no hay frontera que un
desarrollador nuevo no pueda cruzar sin notarlo.

**Separar el almacén de archivos como servicio independiente.** Descartada
porque degrada tres de los cuatro drivers (mantenibilidad, rendimiento y
disponibilidad) a cambio de una ventaja de seguridad que la hexagonal consigue
sin introducir una frontera de red. Para un sistema de cuatro rutas y un solo
agregado, es sobreingeniería.

Análisis completo en `docs/10-decision-estilo-arquitectonico.md`.

---

## Consecuencias

**Positivas**

- El acceso a archivos pasa a tener un único punto atravesable, precondición
  para cerrar R-06.
- R-03 se elimina estructuralmente: el motor de persistencia deja de ser un
  `switch` en el arranque.
- La migración es incremental; los puertos se introducen de a uno.

**Negativas**

- Más archivos e interfaces en un sistema pequeño.
- Una indirección adicional por llamada.

**No verificadas**

- `[EVIDENCIA FALTANTE]` No se midió el impacto de la indirección sobre la
  latencia. Se asume despreciable frente a los 557 KB por respuesta del
  endpoint de listado, pero no se comprobó.

---

## Veredicto del mini-comité 1

> **PENDIENTE.** Confirmada / Ajustada / Reconsiderada.

---

## Referencias

- `docs/10-decision-estilo-arquitectonico.md`
- `dossier/02-stakeholders-drivers.md` — drivers priorizados
- `dossier/01-contexto-sistema.md` — riesgos R-02, R-03, R-05, R-06
