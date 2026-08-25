@echo off
REM =============================================================================
REM Script: run-baseline.cmd
REM Propósito: Ejecutar medición de línea base ESC-01 (3 corridas k6)
REM =============================================================================
REM
REM Requisitos:
REM   - Backend corriendo en http://localhost:8000
REM   - BD sembrada con 3302 registros (ejecutar: scripts\sembrar-datos.cmd)
REM   - k6 v2.2.0 instalado (k6 --version)
REM   - Directorio resultados/ existente
REM
REM Procedimiento:
REM   - Corrida 1 (descartada): Calentamiento, valida que backend responda
REM   - Corrida 2 (válida): Primera medición real
REM   - Corrida 3 (válida): Segunda medición real
REM
REM Salida:
REM   - resultados/run-1.json (warmup, descartada)
REM   - resultados/run-2.json (válida)
REM   - resultados/run-3.json (válida)
REM
REM Ejecución:
REM   cd experimentos/medicion-escenario-01
REM   scripts\run-baseline.cmd
REM
REM =============================================================================

setlocal enabledelayedexpansion

echo [%date% %time%] Iniciando medición de línea base ESC-01
echo.

REM Verificar que k6 esté instalado
echo Verificando k6...
k6 --version > nul 2>&1
if errorlevel 1 (
    echo ERROR: k6 no está instalado o no se encuentra en PATH
    echo Descargar desde: https://k6.io/docs/getting-started/installation/
    exit /b 1
)
for /f "delims=" %%a in ('k6 --version') do set k6version=%%a
echo [OK] %k6version%

echo.
echo Verificando backend...
curl -s -f http://localhost:8000/death > nul 2>&1
if errorlevel 1 (
    echo ERROR: Backend no responde en http://localhost:8000
    echo Por favor, ejecutar: cd back ^&^& go run main.go
    exit /b 1
)
echo [OK] Backend disponible en http://localhost:8000

echo.
echo Creando directorio de resultados...
if not exist resultados mkdir resultados
cd /d "%~dp0..\resultados" || (
    echo ERROR: No se pudo cambiar a directorio de resultados
    exit /b 1
)
cd /d "%~dp0.."

echo.
echo ========== CORRIDA 1: WARMUP (DESCARTADA) ==========
echo Propósito: Calentamiento del sistema
echo Salida: resultados/run-1.json
echo.
k6 run scripts/baseline.js --out json=resultados/run-1.json

if errorlevel 1 (
    echo ERROR: Corrida 1 falló
    exit /b 1
)
echo [OK] Corrida 1 completada

echo.
echo Esperando 10 segundos antes de corrida 2...
timeout /t 10 /nobreak

echo.
echo ========== CORRIDA 2: VÁLIDA ==========
echo Propósito: Primera medición real
echo Salida: resultados/run-2.json
echo.
k6 run scripts/baseline.js --out json=resultados/run-2.json

if errorlevel 1 (
    echo ERROR: Corrida 2 falló
    exit /b 1
)
echo [OK] Corrida 2 completada

echo.
echo Esperando 10 segundos antes de corrida 3...
timeout /t 10 /nobreak

echo.
echo ========== CORRIDA 3: VÁLIDA ==========
echo Propósito: Segunda medición real
echo Salida: resultados/run-3.json
echo.
k6 run scripts/baseline.js --out json=resultados/run-3.json

if errorlevel 1 (
    echo ERROR: Corrida 3 falló
    exit /b 1
)
echo [OK] Corrida 3 completada

echo.
echo [%date% %time%] Medición de línea base completada
echo.
echo Archivos generados:
echo   - resultados/run-1.json (warmup, descartada)
echo   - resultados/run-2.json (válida)
echo   - resultados/run-3.json (válida)
echo.
echo Próximos pasos:
echo   1. Extraer p95 latencia de cada archivo JSON
echo   2. Calcular mediana de run-2 y run-3
echo   3. Comparar contra umbral (500 ms)
echo   4. Actualizar dossier/04-escenarios-calidad.md sección 9-10
echo.
echo Referencia: dossier/04-escenarios-calidad.md sección 6 (Método de Medición)

endlocal
