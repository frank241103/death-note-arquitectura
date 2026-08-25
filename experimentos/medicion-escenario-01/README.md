# Medición Escenario 01: Baseline GET /death

**Escenario:** ESC-01 (Referencia a `dossier/04-escenarios-calidad.md`)  
**Objetivo:** Establecer línea base de performance para endpoint GET /death  
**Herramienta:** k6 (Grafana)  
**Status:** Listo para ejecutar, parámetros PENDIENTE de justificar por equipo  

---

## Descripción

Este escenario mide el comportamiento del endpoint `GET /death` bajo carga simulada.

### Lo que se mide

- **Endpoint:** `GET http://localhost:8000/death`
- **Validación:** 
  - Status HTTP = 200 OK
  - Response body no vacío (al menos 1 registro)
- **Métrica principal:** Latencia (ms)
- **Métrica secundaria:** Throughput (req/s)

### Lo que NO se mide aquí

- Integridad de datos (campos específicos en respuesta)
- Correctness de lógica de negocio
- Consumo de memoria/CPU del servidor
- Comportamiento bajo falla

---

## Estructura

```
medicion-escenario-01/
├── README.md (este archivo)
├── condiciones.md (parámetros y contexto de ejecución)
├── scripts/
│   └── baseline.js (script k6)
├── resultados/
│   └── [summary-YYYY-MM-DD.json generado por k6]
└── logs/
    └── [execution-YYYY-MM-DD.log, opcional]
```

---

## Requisitos Previos

### Software

- **k6:** v0.50.0 o compatible (PENDIENTE: especificar versión exacta en condiciones.md)
- **Backend:** Go 1.24.3 corriendo en localhost:8000
- **Node.js:** Para verificar estado del backend (opcional)

### Base de datos

- **Motor:** SQLite o PostgreSQL (PENDIENTE: especificar en condiciones.md)
- **Población:** Al momento de esta redacción, la BD tenía **1 solo registro** de prueba
- **Limpieza:** PENDIENTE - Definir script de limpieza pre-medición

---

## Ejecución

### 1. Preparar entorno

```bash
# Verificar backend está corriendo
curl -s http://localhost:8000/death | jq . | head -5

# Instalar k6 (si no está)
# macOS: brew install k6
# Linux: sudo apt-get install k6
# Windows: choco install k6
```

### 2. Ejecutar medición

```bash
cd experimentos/medicion-escenario-01

# Ejecución básica
k6 run scripts/baseline.js

# Con exportación de resultados
k6 run scripts/baseline.js --out json=resultados/summary-$(date +%Y-%m-%d).json
```

### 3. Interpretar resultados

El script genera:
- Salida en stdout (métricas en tiempo real)
- Archivo JSON en `resultados/summary-YYYY-MM-DD.json`
- Resumen de pases/fallos de validación

---

## Validaciones Incluidas

### Test 1: HTTP Status 200

```javascript
check(response, {
  'status is 200': (r) => r.status === 200,
});
```

**Falla si:** Status ≠ 200

### Test 2: Body No Vacío

```javascript
check(response, {
  'body is not empty': (r) => r.body.length > 0,
});
```

**Falla si:** Response vacío o nulo

---

## Parámetros Pendientes de Justificar

Los siguientes parámetros están marcados como `PENDIENTE` en `scripts/baseline.js`:

| Parámetro | Valor Actual | Justificación Requerida |
|-----------|-------------|----------------------|
| **vus** (virtual users) | PENDIENTE | ¿Por qué N usuarios simultáneos? |
| **duration** | PENDIENTE | ¿Por qué N segundos de duración? |
| **threshold** (latencia) | PENDIENTE | ¿Cuál es el umbral aceptable (ms)? |

Estos deben ser completados en `condiciones.md` basándose en `dossier/04-escenarios-calidad.md`.

---

## Interpretación de Resultados

### Métricas clave en el summary JSON

```json
{
  "metrics": {
    "http_reqs": {
      "value": 1000,      // Requests completados
      "type": "counter"
    },
    "http_req_duration": {
      "value": 45.2,      // Latencia promedio (ms)
      "type": "trend"
    },
    "checks": {
      "value": 100,       // Checks pasados (%)
      "type": "rate"
    }
  }
}
```

### Escenarios de resultado

| Resultado | Significado | Acción |
|-----------|-------------|--------|
| ✅ Todos los checks pasan, latencia < umbral | Baseline es bueno | Usar como referencia |
| ⚠️ Algunos checks fallan | Error en request | Revisar validaciones |
| 🔴 Latencia > umbral | Performance degradada | Investigar backend |
| 🔴 Conexión rechazada | Backend caído | Verificar arranque |

---

## Reproducibilidad

Para reproducir exactamente esta medición:

1. **Versión de código:** Commitear hash en `condiciones.md`
2. **Versión de BD:** Especificar en `condiciones.md`
3. **Versión de k6:** Ejecutar `k6 --version` y registrar
4. **Configuración:** Copiar `condiciones.md` en ejecuciones futuras

Ej:
```bash
git log -1 --oneline  # Guardar hash
k6 --version          # Guardar versión
```

---

## Logs y Debugging

### Aumentar verbosidad

```bash
k6 run -v scripts/baseline.js
```

### Ver headers y body en detalle

```bash
k6 run --http-debug=full scripts/baseline.js 2>&1 | tee logs/execution.log
```

---

## Referencias

- **k6 JSON output:** https://k6.io/docs/results-visualization/json/
- **k6 checks:** https://k6.io/docs/using-k6/checks/
- **k6 thresholds:** https://k6.io/docs/using-k6/thresholds/
- **Escenario ESC-01:** `dossier/04-escenarios-calidad.md` sección 2

---

**Última actualización:** 2026-08-24  
**Estado:** Listo para ejecución, parámetros PENDIENTE en condiciones.md
