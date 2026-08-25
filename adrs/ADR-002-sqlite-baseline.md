# ADR-002: Uso de SQLite para Medición de Línea Base

**Fecha:** 2026-08-24  
**Estado:** ✅ Aceptada

---

## Contexto

El sistema soporta dos motores de BD: SQLite (archivo local) o PostgreSQL (servidor). `back/config/config.json` permite elegir entre ambos mediante un switch.

El equipo no tiene acceso a:
- Servidor PostgreSQL dedicado
- Permisos de administrador en la máquina de trabajo
- Entorno de contenedores (Docker no disponible)

---

## Decisión

Para medir la línea base (ESC-01), el equipo usa **SQLite** (`back/test.db`, archivo local) en lugar de PostgreSQL.

**Declaración obligatoria en condiciones.md:** Motor = SQLite

---

## Consecuencias

✅ **Ventajas:**
- No requiere servidor externo ni Docker
- Portabilidad (BD es un archivo)
- Configuración mínima

❌ **Limitaciones:**
- Los resultados **NO son extrapolables a PostgreSQL**
- Diferente performance (sin latencia de red, pero menos optimizaciones de BD)
- Si en futuro se mide sobre PostgreSQL, requiere medición separada

📋 **Obligación:**
- Registrar explícitamente "motor = SQLite" en cada ejecución de medición
- Si resultado falla o es inesperado, NO extrapolar a otro motor sin nueva medición

---

## Referencias

- `back/config/config.json` — elección de motor
- `back/server/server.go:76-95` — switch que implementa ambas ramas
- `dossier/02-stakeholders-drivers.md` — restricción C4 (máquina sin permisos admin)
