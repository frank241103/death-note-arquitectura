# 📈 Resultados - Medición Escenario 01

Carpeta de almacenamiento de resultados de mediciones.

## Formato de resultados

Archivos generados automáticamente por scripts:
- `baseline-YYYY-MM-DD.json` - Resultados en formato JSON
- `baseline-YYYY-MM-DD.csv` - Resultados en formato CSV (para Excel)

## Estructura JSON esperada

```json
{
  "timestamp": "2026-08-24T10:30:00Z",
  "scenario": "baseline",
  "system": {
    "backend": "Go 1.24.3",
    "frontend": "React 19 + Vite",
    "database": "SQLite"
  },
  "metrics": {
    "endpoints": [
      {
        "method": "GET",
        "path": "/death",
        "response_time_ms": 45.2,
        "status_code": 200,
        "throughput_req_s": 1000
      }
    ],
    "system": {
      "memory_mb": 120.5,
      "cpu_percent": 15.2
    }
  }
}
```

---

*Los resultados de esta carpeta se generan automáticamente al ejecutar `../scripts/run-tests.sh`*
