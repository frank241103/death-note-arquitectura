# 🧪 Experimentos - Mediciones y Análisis

Carpeta para experimentos de medición, performance testing, y análisis arquitectónico.

## Estructura

```
experimentos/
├── medicion-escenario-01/
│   ├── scripts/          ← Scripts de medición
│   ├── resultados/       ← Resultados en CSV/JSON
│   └── logs/             ← Logs de ejecución
├── medicion-escenario-02/ (futuro)
└── README.md (este archivo)
```

## Escenarios de medición

### Escenario 01: Línea base (Baseline)
Medición de rendimiento del sistema actual (Go + React + SQLite/PostgreSQL).

**Métricas a capturar:**
- Response time de endpoints (ms)
- Memory usage (MB)
- CPU usage (%)
- Throughput (req/s)
- Error rate (%)

**Procedimiento:**
1. Ejecutar `scripts/setup.sh` para preparar entorno
2. Ejecutar `scripts/run-tests.sh` para ejecutar pruebas
3. Resultados guardados en `resultados/baseline-YYYY-MM-DD.json`
4. Logs en `logs/baseline-YYYY-MM-DD.log`

---

Escenarios adicionales pendientes.
