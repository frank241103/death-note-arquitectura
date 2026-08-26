@echo off
setlocal enabledelayedexpansion

echo [%date% %time%] Iniciando siembra de datos...
echo.

REM Verificar backend
echo Verificando backend en http://localhost:8000...
curl -s -f http://localhost:8000/death > nul 2>&1
if errorlevel 1 (
    echo ERROR: Backend no responde
    exit /b 1
)
echo [OK] Backend disponible
echo.

REM Verificar seed.png
if not exist seed.png (
    echo Copiando seed.png desde la raiz...
    copy ..\..\..\seed.png . > nul
)
echo [OK] seed.png listo
echo.

echo Sembrando 3000 registros (esto puede tardar)...
echo.

for /L %%i in (1,1,3000) do (
    curl -s -X POST http://localhost:8000/death -F "fullName=Persona %%i" -F "causeOfDeath=causa %%i" -F "details=registro de carga %%i" -F "photo=@seed.png" > nul
)

echo.
echo [%date% %time%] Contando registros...
curl -s http://localhost:8000/death > temp.json
powershell -Command "(Get-Content temp.json -Raw | ConvertFrom-Json).Count"
del temp.json

echo.
echo [%date% %time%] Siembra completada.
endlocal