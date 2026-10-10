# ADR-007: Evaluación de CQRS y Consistencia Eventual

* **Estatus:** Aceptada
* **Fecha:** 2026-10-09
* **Autores:** Sebastián Reyes

## Contexto y Problema

Se evalúa la necesidad de implementar una arquitectura CQRS (Command Query Responsibility Segregation) y modelos de consistencia eventual tras la ejecución del Spike 1.
## Decisión

Se decide **descartar CQRS completo** y mantener un modelo de persistencia unificado con eventos asíncronos puntuales.

## Evaluación de Aplicabilidad Real

1. **Sobreingeniería:** El volumen de lecturas (`GET /death`) y escrituras (`POST /kill`) actual no justifica la separación de bases de datos de lectura/escritura.
2. **Consistencia Eventual:** Introducir consistencia eventual en la Death Note genera riesgos de dominio donde un registro de muerte no sea visible inmediatamente en las consultas de auditoría.
3. **Conclusión:** La consistencia fuerte actual con eventos asíncronos para tareas secundarias (notificaciones) es la solución óptima.
