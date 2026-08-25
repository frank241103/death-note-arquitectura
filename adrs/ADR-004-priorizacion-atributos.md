# ADR-004: Priorización de Atributos - Seguridad sobre Rendimiento

**Fecha:** 2026-08-24  
**Estado:** ✅ Aceptada

---

## Contexto

El sistema debe ser evaluado en múltiples atributos de calidad. Según ISO/IEC 25010 y el análisis del equipo (dossier/02-stakeholders-drivers.md), se identificaron cuatro (4) atributos prioritarios:

1. Seguridad (Prioridad 1)
2. Mantenibilidad (Prioridad 2)
3. Rendimiento (Prioridad 3)
4. Disponibilidad (Prioridad 4)

---

## Decisión

El equipo prioriza **Seguridad** sobre **Rendimiento** y **Mantenibilidad** sobre **Rendimiento**.

**Justificación (de dossier/02-stakeholders-drivers.md):**

### ✅ Seguridad > Rendimiento

**Razonamiento:** Un sistema lento con datos protegidos es utilizable; uno rápido que expone fotos y nombres de terceros **no es utilizable éticamente**. El daño recae sobre S2 (persona registrada), que no consintió ni participa en el sistema.

**Evidencia:** R-05 (CORS abierto), R-06 (/static/ sin control), R-01 (contraseña en logs) permiten acceso no autorizado a datos privados de terceros.

### ✅ Mantenibilidad > Rendimiento

**Razonamiento:** R-02 (godotenv.Load() Fatal) impide arrancar en máquina limpia → bloquea reproducibilidad (S4). Un atributo que **invalida la evaluación de otro atributo** debe priorizarse antes.

**Evidencia:** Sin poder arrancar el backend, no se puede medir rendimiento. La mantenibilidad es prerequisito.

### Rendimiento > Disponibilidad

**Razonamiento:** Decisión pragmática. Rendimiento es el único atributo medible con instrumental reproducible en el plazo del semestre (k6). Disponibilidad requiere entorno de producción 24/7.

---

## Consecuencias

✅ **Línea base medida:** ESC-01 (Rendimiento, Prioridad 3)
- Aunque Seguridad es prioritaria, se mide Rendimiento porque es lo medible

✅ **Escenarios binarios verificados:** ESC-02 a ESC-05
- ESC-02 (Seguridad): FALLA ✗
- ESC-03 (Mantenibilidad): FALLA ✗
- ESC-04 (Disponibilidad): FALLA ✗
- ESC-05 (Integridad): FALLA ✗

📋 **Obligaciones futuras:**
- Cada escenario se alinea con su prioridad
- Interpretación de resultados respeta el orden de prioridades

---

## Referencias

- `dossier/02-stakeholders-drivers.md` — Secciones 2.1 (Ranking), 2.2 (Justificaciones), 4 (Trade-offs)
- `dossier/03-atributos-calidad.md` — Matriz de atributos AC-1 a AC-6
- `dossier/04-escenarios-calidad.md` — ESC-01 a ESC-05
