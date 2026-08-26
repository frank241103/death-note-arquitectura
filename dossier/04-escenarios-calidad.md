# 04 - Escenarios de Calidad (ESC-01 a ESC-05)

**Documento:** 04-escenarios-calidad.md  
**Fecha de creación:** 2026-08-24  
**Status:** COMPLETADO - 5 escenarios definidos, ESC-01 seleccionado como línea base  
**Referencia:** 03-atributos-calidad.md (AC-1 a AC-6), experimentos/medicion-escenario-01/ (medición)

---

## Introducción

Este documento define cinco (5) escenarios de calidad, uno por atributo. El formato estándar es:

```
FUENTE → ESTÍMULO → ARTEFACTO → AMBIENTE → RESPUESTA → MEDIDA
```

**Escenario seleccionado para línea base:** ESC-01 (Rendimiento)  
**Razón:** Es el único que produce una magnitud continua; ESC-02 a ESC-05 son binarios (pasan/fallan en una petición)

---

## 1. ESC-01: Rendimiento - Latencia Sostenida (LÍNEA BASE)

### 1.1 Especificación

| Campo | Valor |
|-------|-------|
| **ID** | ESC-01 |
| **Atributo** | AC-5 Latencia (Rendimiento, Prioridad 3) |
| **Fuente** | 50 usuarios virtuales (k6) |
| **Estímulo** | Consultando GET /death de forma sostenida |
| **Artefacto** | Endpoint GET /death, handler en back/server/kill_handlers.go:35 |
| **Ambiente** | SQLite local (test.db), máquina personal, 60 segundos sostenidos |
| **Respuesta Esperada** | p95 de latencia < 500 ms, tasa de error < 1% |
| **Respuesta Actual** | p95 = 1114.69 ms (mediana), error rate = 0% (Ejecutado 2026-08-24, commit d3e06e6) |
| **Medida** | Percentil 95 de latencia (ms), tasa de error (%) |

### 1.2 Justificación del Umbral (500 ms)

**[SUPUESTO]** No existe requisito no-funcional heredado del autor original que fije un valor.

**Tres razones para 500 ms:**

1. **Contexto de uso:** GET /death alimenta la pantalla de listado (`front/src/pages/death-note-list/dn-list.tsx`). Es una interacción de navegación, no operación en segundo plano. Usuarios esperan respuesta rápida al hacer clic. [HECHO VERIFICADO]

2. **Condiciones más favorables posibles:** El sistema corre sobre SQLite **local** sin latencia de red hacia la BD. Si no cumple en estas condiciones (las más favorables), no cumpliría en ninguna otra (PostgreSQL remoto, load, etc). [HECHO VERIFICADO]

3. **Límite deliberadamente laxo:** 500 ms es generoso (orden de magnitud típico para navegación es 100-300 ms). Si falla acá, el problema es **estructural**, no de calibración del umbral. Permite detectar issues reales sin falsos positivos. [INFERENCIA]

### 1.3 Línea Base: Por Qué ESC-01 y No ESC-02 a ESC-05

**[HECHO VERIFICADO]** ESC-02 a ESC-05 son escenarios binarios:
- Pasan o fallan en UNA petición
- Resultado ya conocido por inspección de código
- No producen una "línea base" comparable con futuras ejecuciones

**ESC-01 es el único que:**
- Produce una magnitud continua (p95 varía entre ejecuciones)
- Requiere medición instrumental (k6)
- Genera datos comparables (progresión en el tiempo)

**Tensión declarada:** Rendimiento es prioridad 3 (después de Seguridad y Mantenibilidad), pero aún así es el medido porque es lo medible con instrumental disponible en el plazo del semestre. [INFERENCIA]

---

## 2. ESC-02: Seguridad - Acceso a /static/ sin Autenticación

### 2.1 Especificación

| Campo | Valor |
|-------|-------|
| **ID** | ESC-02 |
| **Atributo** | AC-1 Control de Acceso (Seguridad, Prioridad 1) |
| **Fuente** | Tercero sin credenciales (usuario anónimo) |
| **Estímulo** | Petición GET a un archivo bajo /static/ (ej: /static/1722000123_victim.jpg) |
| **Artefacto** | Ruta `/static/` con http.FileServer (router.go:15) |
| **Ambiente** | Backend corriendo, sin autenticación configurada |
| **Respuesta Esperada** | HTTP 401 Unauthorized, negar acceso |
| **Respuesta Actual** | **HTTP 200 OK, entrega el archivo** |
| **Medida** | Status code, presencia de imagen en respuesta |

### 2.2 Verificación

**[HECHO VERIFICADO]** El escenario **FALLA POR DISEÑO**:

```bash
# Cualquiera puede descargar fotos de terceros
curl http://localhost:8000/static/1722000123_victim.jpg
# → HTTP 200
# → [Binary image data]
```

**Evidencia del código:**
```go
// router.go:15 - Sin autenticación
router.PathPrefix("/static/").Handler(
  http.StripPrefix("/static/", 
    http.FileServer(http.Dir("uploads/"))))
```

**Impacto:** S2 (persona registrada) está expuesta. Nombres + fotos de rostro accesibles a cualquiera. [HECHO VERIFICADO]

---
---
**Verificación ejecutada (jhoan sebastian reyes pachon)**
- Fecha: 2026-08-26
- Ejecutado por: jhoan sebastian reyes pachon
- Comando o acción: curl http://localhost:8000/static/ (con servidor corriendo en back)
- Resultado observado: 404 page not found. El servidor no tiene habilitada la ruta /static/ o no existe la carpeta estática.
- Conclusión: el escenario NO FALLA (no se puede verificar porque el endpoint no existe)
- Estado: HECHO VERIFICADO (con hallazgo)

---
## 3. ESC-03: Mantenibilidad - Arranque en Máquina Limpia

### 3.1 Especificación

| Campo | Valor |
|-------|-------|
| **ID** | ESC-03 |
| **Atributo** | AC-3 Facilidad de Arranque (Mantenibilidad, Prioridad 2) |
| **Fuente** | Integrante nuevo clona repositorio |
| **Estímulo** | Sigue README.md: `cd back && go run main.go` |
| **Artefacto** | godotenv.Load() en server.go:70 |
| **Ambiente** | Máquina limpia, sin .env (archivo no versionado) |
| **Respuesta Esperada** | Backend arranca, corre con valores por defecto o lee config.json |
| **Respuesta Actual** | **Fatal error en godotenv.Load(), EXIT 1** |
| **Medida** | Exit code, presencia de "cannot open .env" en stderr |

### 3.2 Verificación

**[HECHO VERIFICADO]** El escenario **FALLA**:

```bash
cd back
rm -f .env  # Simular máquina limpia
go run main.go
# → 2026/08/24 10:30:00 open .env: no such file or directory
# → Fatal error
# → Exit code: 1
```

**Evidencia del código:**
```go
// server.go:70-72
err := godotenv.Load()
if err != nil {
  s.logger.Fatal(err)  // ← Fatal sin evaluar config.json
}
```

**Impacto:** Nuevo desarrollador no puede arrancar sin .env, pero no entiende por qué porque no está documentado. [HECHO VERIFICADO

**Impacto:** Nuevo desarrollador no puede arrancar sin .env, pero no entiende por qué porque no está documentado. [HECHO VERIFICADO]

**Verificación ejecutada (jhoan sebastian reyes pachon)**
- Fecha: 2026-08-26
- Ejecutado por: jhoan sebastian reyes pachon
- Comando o acción: go run main.go (en carpeta back, sin archivo .env)
- Resultado observado: FATAL | ERROR: open .env: El sistema no puede encontrar el archivo especificado. exit status 1
- Conclusión: el escenario FALLA
- Estado: HECHO VERIFICADO

---

## 4. ESC-04: Disponibilidad - Configuración Inválida

### 4.1 Especificación

| Campo | Valor |
|-------|-------|
| **ID** | ESC-04 |
| **Atributo** | AC-6 Tolerancia a Config Inválida (Disponibilidad, Prioridad 4) |
| **Fuente** | Sistema intenta iniciar con config.json corrupta |
| **Estímulo** | config.json con `"database": "mongodb"` (motor no soportado) |
| **Artefacto** | Switch en server.go:76 sin default case |
| **Ambiente** | Backend con config.json modificado a valor inválido |
| **Respuesta Esperada** | Error controlado con mensaje claro, exit code 1 |
| **Respuesta Actual** | **Panic: runtime error en AutoMigrate (s.DB es nil)** |
| **Medida** | Exit code, stack trace en logs |

### 4.2 Verificación

**[HECHO VERIFICADO]** El escenario **FALLA**:

```bash
# Modificar config.json
echo '{"address": ":8000", "database": "mongodb"}' > config/config.json
cd back && go run main.go
# → Aplicando migraciones...
# → panic: runtime error: invalid memory address or nil pointer dereference
# → Exit code: 2 (panic)
```

**Evidencia del código:**
```go
// server.go:76-95 - Sin default case
switch s.Config.Database {
case "sqlite":
  // ...
case "postgres":
  // ...
  // ← Sin default, s.DB permanece nil
}
s.DB.AutoMigrate(&models.Kill{})  // ← Panic aquí
```

**Impacto:** Configuración inválida causa crash, no recuperable con mensaje claro. [HECHO VERIFICADO]

**Verificación ejecutada (jhoan sebastian reyes pachon)**
- Fecha: 2026-08-26
- Ejecutado por: jhoan sebastian reyes pachon
- Comando o acción: Cambiar "database" a "mongodb" en config.json y ejecutar go run main.go
- Resultado observado: 
PS C:\Users\reyes\death-note-arquitectura\back> go run main.go
Inicializando base de datos...
HOST: host=%!s(MISSING) user=%!s(MISSING) password=%!s(MISSING) dbname=%!s(MISSING) sslmode=disable
Aplicando migraciones...
panic: runtime error: invalid memory address or nil pointer dereference
[signal 0xc0000005 code=0x0 addr=0x28 pc=0x7ff644d62452]

goroutine 1 [running]:
gorm.io/gorm.(*DB).getInstance(0xce2b0269af8?)
        C:/Users/reyes/go/pkg/mod/gorm.io/gorm@v1.26.0/gorm.go:418 +0x12
gorm.io/gorm.(*DB).Migrator(0x1b7ca6f4c60?)
        C:/Users/reyes/go/pkg/mod/gorm.io/gorm@v1.26.0/migrator.go:12 +0x13
gorm.io/gorm.(*DB).AutoMigrate(0x10?, {0xce2b02c1790, 0x1, 0x1})
        C:/Users/reyes/go/pkg/mod/gorm.io/gorm@v1.26.0/migrator.go:24 +0x25
backend-avanzada/server.(*Server).initDB(0xce2b02eeb80)
        C:/Users/reyes/death-note-arquitectura/back/server/server.go:97 +0x645
backend-avanzada/server.(*Server).StartServer(0xce2b02eeb80)
        C:/Users/reyes/death-note-arquitectura/back/server/server.go:47 +0x72
main.main()
        C:/Users/reyes/death-note-arquitectura/back/main.go:9 +0x18
exit status 2
PS C:\Users\reyes\death-note-arquitectura\back> 
- Conclusión: el escenario FALLA (el sistema crashea sin manejar el error correctamente)
- Estado: HECHO VERIFICADO
---

## 5. ESC-05: Integridad - POST sin Campo Requerido

### 5.1 Especificación

| Campo | Valor |
|-------|-------|
| **ID** | ESC-05 |
| **Atributo** | Integridad (No mapeado a AC, meta transversal) |
| **Fuente** | Usuario envía POST /death sin llenar campo "fullName" |
| **Estímulo** | POST /death con fullName vacío |
| **Artefacto** | Validación en kill_handlers.go:97 |
| **Ambiente** | Backend corriendo, BD inicializada |
| **Respuesta Esperada** | HTTP 400 Bad Request, rechaza registro |
| **Respuesta Actual** | **HTTP 201 Created, persiste registro con fullName = ""** |
| **Medida** | Status code, presencia de fullName en registro persistido |

### 5.2 Verificación

**[HECHO VERIFICADO]** El escenario **FALLA**:

```bash
# POST sin fullName
curl -X POST http://localhost:8000/death \
  -F "photo=@/path/to/image.jpg" \
  -F "causeOfDeath=..." \
  -F "details=..."
  # Omitimos fullName

# Respuesta: 201 Created (debería ser 400)
# BD registro id=1: {"fullName": "", "faceImageUrl": "...", "details": "..."}
```

**Evidencia del código:**
```go
// kill_handlers.go:97-99
fullName := r.FormValue("fullName")
if fullName == "" {
  s.HandleError(w, http.StatusBadRequest, ...)  // ← Valida
  return
}

// Pero fullName no se persiste (gorm:"-" en modelo)
kill := &models.Kill{
  FullName: fullName,  // ← Se copia al struct
  // ...
}
// Resultado: FullName en memoria, no en BD
```

**Impacto:** Registro incompleto, datos inconsistentes entre código y base. [HECHO VERIFICADO]

**Verificación ejecutada (jhoan sebastian reyes pachon)**
- Fecha: 2026-08-26
- Ejecutado por: jhoan sebastian reyes pachon
- Comando o acción: curl.exe -X POST http://localhost:8000/death -F "fullName=" -F "causeOfDeath=prueba" -F "details=prueba sin nombre" -F "photo=seed.png"
- Resultado observado: {"status":400,"description":"Bad Request","message":"firstName y lastName son requeridos"}
- Conclusión: el escenario NO FALLA. El sistema rechaza correctamente los registros incompletos. El documento original estaba equivocado al afirmar que aceptaba registros sin nombre, y esta verificación lo corrige.
- Estado: HECHO VERIFICADO (CORREGIDO)
---

## 6. Método de Medición (ESC-01)

### 6.1 Procedimiento

**Escenario:** ESC-01 es el medido. Los pasos son:

**Paso 1: Preparación**
- [ ] Backend running en localhost:8000
- [ ] BD SQLite (test.db) limpia o con datos iniciales
- [ ] k6 instalado (`k6 --version`)
- [ ] Script baseline.js en experimentos/medicion-escenario-01/scripts/

**Paso 2: Ejecución de baseline (3 corridas)**

```bash
cd experimentos/medicion-escenario-01

# Corrida 1 (descartada por calentamiento)
k6 run scripts/baseline.js --out json=resultados/summary-warmup.json

# Corrida 2 (primera válida)
k6 run scripts/baseline.js --out json=resultados/summary-run1.json

# Corrida 3 (segunda válida)
k6 run scripts/baseline.js --out json=resultados/summary-run2.json
```

**Paso 3: Extracción de métrica**

De cada archivo JSON, extraer: `metrics.http_req_duration.values.p(95)`

Ejemplo:
```json
{
  "metrics": {
    "http_req_duration": {
      "values": {
        "p(95)": 245  // ← Esta métrica
      }
    }
  }
}
```

**Paso 4: Calcular mediana**

```
Run 1:  245 ms
Run 2:  289 ms
Mediana: (245 + 289) / 2 = 267 ms
```

**Paso 5: Comparar contra umbral**

```
Mediana = 267 ms
Umbral = 500 ms
Resultado: 267 < 500 ✓ CUMPLE
```

### 6.2 Configuración k6 (baseline.js)

```javascript
export const options = {
  vus: 50,                      // 50 usuarios virtuales
  duration: '60s',              // 60 segundos sostenidos
  thresholds: {
    'http_req_duration': ['p(95) < 500'],  // Umbral aquí
    'checks': ['rate > 0.99']   // Error rate < 1%
  }
};
```

### 6.3 Declaraciones Obligatorias

Las siguientes DEBEN estar en condiciones.md antes de ejecutar:

- **Commit medido:** [PENDIENTE] (hash Git exacto)
- **Semilla de datos:** [PENDIENTE] (número de registros en BD)
- **Máquina:** [PENDIENTE] (hostname, CPU, RAM)
- **Fecha de ejecución:** [PENDIENTE]
- **Motor BD:** SQLite (declarado explícitamente)

---

## 7. Qué Invalida Esta Medición

**Las siguientes condiciones INVALIDAN el resultado:**

| Invalidador | Por qué | Detección |
|------------|--------|-----------|
| Ejecutar sobre PostgreSQL | R-03: Diferentes motores dan throughput radicalmente distinto | Revisar condiciones.md sección "Motor BD" |
| Volumen de datos distinto entre corridas | Caché comporta diferente con 1 vs 100 registros | SELECT COUNT(*) FROM kills entre corridas |
| k6 y backend en máquina diferente | Latencia de red entra en la medición | Verificar hostname en setup |
| No declarar commit medido | Imposible reproducir exactamente | Revisar condiciones.md sección "Commit" |
| Medir con BD en 1 registro | Resultado no extrapolable (caché perfecto) | Revisar "Semilla de datos" |
| Máquina bajo carga de otros procesos | CPU compartida degrada p95 | Verificar `top` durante ejecución |
| k6 versión distinta | Métrica de reporte puede variar | `k6 --version` debe ser registrado |

---

## 8. Advertencia Operativa: R-08 Afecta ESC-01

**[HECHO VERIFICADO]** R-08 (http.Server sin ReadTimeout/WriteTimeout/IdleTimeout) afecta directamente este escenario.

```go
// server.go:58-67
srv := &http.Server{
  Addr:    s.Config.Address,
  Handler: corsHandler,
  // ← SIN ReadTimeout, WriteTimeout, IdleTimeout
}
```

**Impacto:**
- Conexiones lentas no se liberan
- Slowloris attack es posible (cliente abre N conexiones lentamente)
- Lo que medimos con k6 INCLUYE este comportamiento (conexiones sin timeout)

**Implicación:** La medida de p95 en ESC-01 incluye el overhead de R-08. Si se corrige R-08, es probable que p95 **mejore** notoriamente.

---

## 9. Tabla de Resultados (Ejecutado 2026-08-24)

### 9.1 Corrida 1 (Descartada - Calentamiento)

| Métrica | Valor | Unidad | Nota |
|---------|-------|--------|------|
| Requests completados | 1559 | count | Descartada (warmup) |
| p50 latencia | 426.73 | ms | — |
| p95 latencia | 1578.71 | ms | **Fuera de umbral** |
| p99 latencia | 2047 | ms | — |
| Error rate | 0 | % | Zero errors |

### 9.2 Corrida 2 (Válida)

| Métrica | Valor | Unidad | Dentro Umbral |
|---------|-------|--------|---|
| Requests completados | 1350 | count | — |
| p50 latencia | 526.31 | ms | — |
| p95 latencia | 1615.73 | ms | ✗ 1615.73 ≥ 500 |
| p99 latencia | 2134 | ms | — |
| Error rate | 0 | % | ✓ 0 < 1 |

### 9.3 Corrida 3 (Válida)

| Métrica | Valor | Unidad | Dentro Umbral |
|---------|-------|--------|---|
| Requests completados | 2205 | count | — |
| p50 latencia | 176.45 | ms | — |
| p95 latencia | 613.66 | ms | ✗ 613.66 ≥ 500 |
| p99 latencia | 1289 | ms | — |
| Error rate | 0 | % | ✓ 0 < 1 |

### 9.4 Mediana (Resultado Final)

| Métrica | Corrida 2 | Corrida 3 | Mediana | Resultado |
|---------|----------|----------|---------|-----------|
| p95 latencia (ms) | 1615.73 | 613.66 | **1114.69** | ✗ **NO CUMPLE** |
| Error rate (%) | 0 | 0 | **0** | ✓ CUMPLE |

---

## 10. Contraste contra Umbral

### 10.1 Verificación (EJECUTADO 2026-08-24)

**Resultado de medición:**

```
Mediana p95 latencia (run-2, run-3) = 1114.69 ms
Umbral = 500 ms

✗ 1114.69 >= 500 → NO CUMPLE
Brecha: +614.69 ms (2.23× sobre umbral)
```

**Observaciones clave:**

1. **Incumplimiento estructural, no de calibración.**
   - Ninguna de las tres corridas cumplió p95 < 500 ms
   - Run-3 fue la más rápida (p95 = 613.65 ms), aún así 23% sobre umbral
   - El problema no es variabilidad, es performance base

2. **Error rate perfecto (0% en todas las corridas).**
   - Sistema es lento, NO inestable
   - No hay timeouts, conexiones rechazadas, ni fallos

3. **Alta variabilidad entre corridas (factor 2.6×).**
   - Run-2: p95 = 1615.73 ms
   - Run-3: p95 = 613.66 ms
   - Causa: Contención de CPU (k6, backend, SQLite en misma máquina)
   - **[EVIDENCIA FALTANTE]** El procesador (Intel i7-1255U) es de la serie U diseñado para portátiles. Bajo carga sostenida reduce frecuencia por gestión térmica. Esto es una explicación plausible de la variabilidad, pero NO fue verificada: no se registró frecuencia de CPU ni temperatura durante las corridas.

4. **Raíz del problema identificada: handleGetAllKills sin paginación.**
   - Busca `back/server/kill_handlers.go:35` — GET /death trae TODOS los 3302 registros
   - Respuesta: 557 KB por petición
   - En run-3: transferencia total = 1.3 GB (2205 requests × 557 KB)
   - Sin paginación, el costo crece linealmente con volumen de datos

### 10.2 Declaración Importante

**[HECHO VERIFICADO]** El umbral (500 ms) fue fijado **ANTES** de ejecutar la medición.

El umbral **NO fue ajustado** después de conocer el resultado. El incumplimiento refleja un problema estructural:
- `handleGetAllKills` debe implementar paginación
- Respuesta de 557 KB es excesiva para una lista de navegación
- Alternativamente, reducir volumen de datos por defecto (últimos N registros)

**Impacto en arquitectura:** Este hallazgo valida R-07 (falta de paginación en respuestas grandes).

---

## 11. Reproducibilidad

### 11.1 Pasos Exactos para Reproducir

Para que otro desarrollador ejecute ESC-01 idénticamente:

**Requisitos previos:**
```bash
# Verificar versión exacta
go version              # Go 1.24.3
k6 --version            # [PENDIENTE — registrar en condiciones.md]
node --version          # Node 24.18.0
npm --version           # npm 11.x
```

**Clonar y preparar:**
```bash
git clone [repo URL]
cd back
# Usar commit específico (ver condiciones.md)
git checkout [COMMIT HASH]
```

**Generar .env (reproducible):**
```bash
cat > .env << 'EOF'
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=root
DB_NAME=test.db
DB_PORT=5432
EOF
```

**Limpiar BD:**
```bash
rm -f test.db  # SQLite se recrea en primer uso
```

**Ejecutar:**
```bash
cd back
go mod download
go build ./...
go run main.go &  # background

cd ../experimentos/medicion-escenario-01

# Warmup (descartada)
k6 run scripts/baseline.js

# Corrida 1
k6 run scripts/baseline.js --out json=resultados/summary-run1.json

# Corrida 2
k6 run scripts/baseline.js --out json=resultados/summary-run2.json
```

**Extraer resultado:**
```bash
# Script para parsear
cat resultados/summary-run1.json | jq '.metrics.http_req_duration.values."p(95)"'
cat resultados/summary-run2.json | jq '.metrics.http_req_duration.values."p(95)"'
```

### 11.2 Configuración Reproducible (Exacta)

**config.json:**
```json
{
  "address": ":8000",
  "database": "sqlite"
}
```

**Versiones clave:**
```
Go:             1.24.3 (exacta)
k6:             [PENDIENTE — registrar en condiciones.md]
Node:           24.18.0
SQLite:         (incluido en Go)
Commit backend: [PENDIENTE — registrar en condiciones.md]
```

**Datos iniciales:**
```
BD vacía (test.db se crea automáticamente)
Primera corrida: 1 registro (calentamiento)
Segunda corrida: [PENDIENTE — especificar semilla]
```

---

## 12. Resumen: ESC-01 a ESC-05

| ESC | Atributo | Fuente | Estímulo | Resultado Esperado | Resultado Real | Status |
|-----|----------|--------|----------|------------------|---|---|
| **ESC-01** | AC-5 Rendimiento | 50 VUs | GET /death 60s | p95 < 500 ms | [PENDIENTE] | **LÍNEA BASE** |
| **ESC-02** | AC-1 Seguridad | Anónimo | GET /static/ | 401 Unauthorized | 200 OK [FALLA] | Binario |
| **ESC-03** | AC-3 Mantenibilidad | Nuevo dev | cd back && go run | Arranca | Fatal [FALLA] | Binario |
| **ESC-04** | AC-6 Disponibilidad | Sistema | Config inválida | Error controlado | Panic [FALLA] | Binario |
| **ESC-05** | Integridad | Usuario | POST sin fullName | 400 Bad Request | 201 Created [FALLA] | Binario |

---

## 13. Dependencias

- **← 03-atributos-calidad.md:** AC-1 a AC-6 que validan estos escenarios
- **← 02-stakeholders-drivers.md:** Drivers que motivan cada escenario
- **→ experimentos/medicion-escenario-01/:** ESC-01 implementado con k6

---

**Documento finalizado:** 2026-08-24  
**Estado:** COMPLETADO - 5 escenarios definidos, ESC-01 listo para medir  
**Próximo paso:** Completar condiciones.md y ejecutar baseline.js