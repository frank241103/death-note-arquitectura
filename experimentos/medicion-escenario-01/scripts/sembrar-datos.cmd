@echo off
REM =============================================================================
REM Script: sembrar-datos.cmd
REM Propósito: Reproducir la siembra exacta de datos para línea base ESC-01
REM =============================================================================
REM
REM Requisitos:
REM   - Backend corriendo en http://localhost:8000
REM   - curl.exe disponible en PATH (incluido en Windows 10+)
REM   - PowerShell disponible (para generar seed.png)
REM
REM Contexto histórico:
REM   - Semilla final: 3302 registros
REM   - Composición:
REM     * 2 registros preexistentes (anteriores a medición)
REM     * 300 registros de intento previo fallido (no descartado)
REM     * 3000 registros de esta siembra (loop %i in 1..3000)
REM   - Total: 2 + 300 + 3000 = 3302
REM
REM Ejecución:
REM   cd experimentos/medicion-escenario-01
REM   scripts\sembrar-datos.cmd
REM
REM =============================================================================

setlocal enabledelayedexpansion

echo [%date% %time%] Iniciando siembra de datos para ESC-01
echo.

REM Verificar que el backend esté disponible
echo Verificando backend en http://localhost:8000...
curl -s -f http://localhost:8000/death > nul 2>&1
if errorlevel 1 (
    echo ERROR: Backend no responde en http://localhost:8000
    echo Por favor, ejecutar: cd back ^&^& go run main.go
    exit /b 1
)
echo [OK] Backend disponible

echo.
echo Generando seed.png (imagen PNG 1x1 en base64)...

REM Generar seed.png usando PowerShell (imagen PNG mínima 1x1 en base64)
powershell -Command ^
  "Add-Type -AssemblyName System.Drawing; ^
  [byte[]]$pngBase64 = [Convert]::FromBase64String('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='); ^
  [IO.File]::WriteAllBytes('seed.png', $pngBase64); ^
  Write-Host 'seed.png creado (1x1 PNG)'"

if errorlevel 1 (
    echo ERROR: No se pudo crear seed.png
    exit /b 1
)
echo [OK] seed.png creado

echo.
echo Iniciando loop de siembra (3000 registros)...
echo Esto puede tardar varios minutos...
echo.

set count=0
for /L %%i in (1,1,3000) do (
    set /a count+=1
    if !count! equ 1 (
        echo Primer registro...
    )
    if !count! equ 500 (
        echo 500 registros sembrados...
    )
    if !count! equ 1000 (
        echo 1000 registros sembrados...
    )
    if !count! equ 1500 (
        echo 1500 registros sembrados...
    )
    if !count! equ 2000 (
        echo 2000 registros sembrados...
    )
    if !count! equ 2500 (
        echo 2500 registros sembrados...
    )
    if !count! equ 3000 (
        echo Último registro (3000)...
    )

    curl -s -X POST http://localhost:8000/death ^
      -F "fullName=Persona %%i" ^
      -F "causeOfDeath=causa %%i" ^
      -F "details=registro de carga %%i" ^
      -F "photo=@seed.png" > nul
)

echo.
echo [%date% %time%] Verificando siembra...

REM Verificar el número total de registros
for /f "delims=" %%a in ('curl -s http://localhost:8000/death ^| powershell -Command "$input | ConvertFrom-Json | Measure-Object -Line | Select-Object -ExpandProperty Lines"') do set recordCount=%%a

if defined recordCount (
    echo [OK] Siembra completada
    echo Registros en BD: !recordCount!
    echo.
    echo Esperado: 3302 registros
    echo   - 2 preexistentes
    echo   - 300 de intento previo
    echo   - 3000 de esta siembra
    echo.
    if !recordCount! equ 3302 (
        echo [SUCCESS] Semilla coincide con línea base
    ) else (
        echo [WARNING] Diferencia en recuento (esperado 3302, actual !recordCount!)
        echo Por favor, revisar condiciones.md sección 3 para actualizar semilla
    )
) else (
    echo [ERROR] No se pudo verificar recuento de registros
    exit /b 1
)

echo.
echo [%date% %time%] Script completado

endlocal
