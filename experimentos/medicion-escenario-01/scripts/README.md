# 📊 Scripts - Medición Escenario 01

Scripts para ejecutar mediciones de línea base (baseline) del sistema.

## Archivos

- `setup.sh` - Preparar entorno, limpiar datos previos, inicializar BD
- `run-tests.sh` - Ejecutar suite de pruebas de performance
- `cleanup.sh` - Limpiar recursos después de pruebas

## Ejecución

```bash
# Preparar
bash setup.sh

# Ejecutar pruebas
bash run-tests.sh

# Limpiar (opcional)
bash cleanup.sh
```

Los resultados se guardan automáticamente en `../resultados/`.
