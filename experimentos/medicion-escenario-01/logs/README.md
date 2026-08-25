# 📝 Logs - Medición Escenario 01

Carpeta de almacenamiento de logs de ejecución de pruebas.

## Archivos de logs

Generados automáticamente por scripts:
- `baseline-YYYY-MM-DD.log` - Log completo de ejecución
- `errors-YYYY-MM-DD.log` - Errores ocurridos durante pruebas

## Formato de logs

```
[2026-08-24 10:30:00] [INFO] Iniciando medición de línea base
[2026-08-24 10:30:01] [INFO] Limpiando datos previos...
[2026-08-24 10:30:02] [INFO] Iniciando servidor backend
[2026-08-24 10:30:05] [INFO] Ejecutando test: GET /death
[2026-08-24 10:30:05] [INFO] Status: 200, Response time: 45.2ms
[2026-08-24 10:30:10] [INFO] Pruebas completadas. Resultados guardados.
```

---

*Los logs de esta carpeta se generan automáticamente al ejecutar `../scripts/run-tests.sh`*
