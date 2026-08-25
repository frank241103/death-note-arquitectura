# ADR-003: k6 como Instrumento de Medición

**Fecha:** 2026-08-24  
**Estado:** ✅ Aceptada

---

## Contexto

La asignatura permite usar herramientas de carga para medir atributos de rendimiento. Las opciones comunmente disponibles son:
- k6 (portable, no requiere admin, instalación simple)
- JMeter (más pesado, interfaz gráfica)
- Locust (basado en Python)

---

## Decisión

El equipo usa **k6** como instrumento de medición de línea base (ESC-01).

**Configuración:**
- Script: `experimentos/medicion-escenario-01/scripts/baseline.js`
- Parámetros: 50 VUs, 60 segundos, p95 < 500 ms
- Salida: JSON con métricas en `experimentos/medicion-escenario-01/resultados/`

---

## Consecuencias

✅ **Ventajas:**
- Portable (no requiere admin)
- Formato de script estándar (JavaScript)
- Salida JSON estructurada
- Comunidad activa, documentación clara

📋 **Obligaciones:**
- Registrar versión de k6 en condiciones.md
- Ejecutar mínimo 3 corridas (1 descartada por calentamiento, 2 válidas)
- Documentar comandos exactos de ejecución
- Reportar la mediana de p95 entre corridas válidas

---

## Referencias

- `experimentos/medicion-escenario-01/README.md` — guía de ejecución
- `dossier/04-escenarios-calidad.md` — Método de medición ESC-01
