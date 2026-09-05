# 09 — Walking Skeleton del sistema Death Note

**Sistema:** Death Note
**Repositorio:** https://github.com/frank241103/death-note-arquitectura
**Commit validado:** `b12c4b2`
**Fecha:** 2026-09-04

---

## 1. Qué es y por qué se identifica en lugar de construirse

Un *walking skeleton* es la implementación funcional más delgada posible que
atraviesa todas las capas del sistema de extremo a extremo. Su propósito no es
entregar valor de negocio sino **demostrar que la arquitectura completa se
sostiene**: que las capas se comunican, que el despliegue funciona y que existe
un camino ejecutable sobre el cual construir el resto.

En este proyecto el sistema base fue **adoptado**, no construido por el equipo
(opción C del protocolo de adopción, ver `README.md`). Por lo tanto el walking
skeleton no se implementa: se identifica el recorrido mínimo que ya existe, se
traza capa por capa contra el código y se demuestra su ejecución.

Esta distinción importa metodológicamente. Un walking skeleton propuesto pero no
ejecutado no cumple su función; lo que valida la arquitectura es haberlo corrido.

---

## 2. Camino seleccionado

**`GET /death` — consulta del listado de registros.**

### Justificación de la selección

| Criterio | Cumplimiento |
|---|---|
| Atraviesa todas las capas | Sí: frontend → router → handler → repositorio → ORM → base de datos → respuesta |
| Es el más delgado disponible | Sí: no requiere carga de archivos ni validación de formulario |
| Es observable de extremo a extremo | Sí: se comprueba con una sola petición HTTP |
| Está respaldado por medición | Sí: es el escenario ESC-01, con línea base ejecutada |

Se descartó `POST /death` como esqueleto principal por ser más grueso: exige
`multipart/form-data`, escritura en el sistema de archivos y validación de
campos. Se documenta como camino secundario en la sección 6.

---

## 3. Trazabilidad del esqueleto, capa por capa

| # | Capa | Elemento | Archivo real | Símbolo verificable |
|---|---|---|---|---|
| 1 | Presentación | Vista de listado | `front/src/pages/death-note-list/dn-list.tsx` | Componente de listado que consume el API |
| 2 | Transporte | Middleware CORS | `back/server/server.go` | `cors.New(cors.Options{...}).Handler(handler)` |
| 3 | Enrutamiento | Router | `back/server/router.go` | `router.HandleFunc("/death", s.HandleKills).Methods(http.MethodGet, ...)` |
| 4 | Observabilidad | Middleware de logging | `back/server/router.go` | `router.Use(s.logger.RequestLogger)` |
| 5 | Aplicación | Despachador por método | `back/server/kill_handlers.go` | `HandleKills` → `case http.MethodGet: s.handleGetAllKills(w, r)` |
| 6 | Aplicación | Handler de consulta | `back/server/kill_handlers.go` | `handleGetAllKills` |
| 7 | Acceso a datos | Repositorio | `back/repository/` | `s.KillRepository.FindAll()` |
| 8 | Mapeo objeto-relacional | GORM | `back/server/server.go` | `gorm.Open(sqlite.Open("test.db"), &gorm.Config{})` |
| 9 | Persistencia | SQLite | `back/test.db` | Tabla generada por `s.DB.AutoMigrate(&models.Kill{})` |
| 10 | Transformación | Modelo a DTO | `back/models/` | `v.ToKillResponseDto()` |
| 11 | Serialización | Respuesta JSON | `back/server/kill_handlers.go` | `json.Marshal(result)`, `w.Header().Set("Content-Type", "application/json")` |

**Las once capas están cubiertas por un solo recorrido.** Ningún elemento de la
tabla es hipotético: todos se ejecutan en cada petición.

---

## 4. Ejecución del esqueleto

### Requisitos previos
- Go 1.24.3 disponible en el `PATH`
- Archivo `back/.env` presente (ver limitación L-1 en la sección 7)

### Comandos

```bash
cd back
go mod download
go build ./...
go run main.go
```

Salida esperada del arranque:

```
Inicializando base de datos...
Aplicando migraciones...
Inicializando mux...
Escuchando en el puerto  :8000
```

En una segunda terminal:

```bash
curl http://localhost:8000/death
```

### Evidencia de ejecución

Respuesta obtenida (registro real de la base):

```json
[{"id":1,"faceImageUrl":"/static/1785780123_Captura...png",
  "details":"cae a un barranco","createdAt":"2026-08-03T13:02:03-05:00"}]
```

El recorrido se completó: la petición entró por el router, fue enrutada al
handler, este consultó el repositorio, GORM leyó de SQLite, el resultado se
transformó a DTO y se serializó como JSON.

---

## 5. Qué valida y qué no valida este esqueleto

### Valida
- El sistema compila desde cero en una máquina limpia (`go build ./...` sin errores).
- Las once capas se comunican correctamente.
- Las migraciones se aplican en el arranque (`AutoMigrate`).
- La serialización a JSON es funcional.
- El sistema es medible: el mismo recorrido sostiene el escenario ESC-01.

### No valida
- La ruta de escritura (`POST /death`), que involucra el sistema de archivos.
- El despliegue con contenedores: `docker-compose.yml` existe pero no fue verificado.
- La rama de PostgreSQL, implementada en el código pero no ejecutada.
- El frontend: se verificó el contrato consumido, no su renderizado.

---

## 6. Camino secundario: `POST /death`

Un segundo recorrido, más grueso, atraviesa además el sistema de archivos:

| # | Capa | Elemento | Símbolo verificable |
|---|---|---|---|
| 1 | Enrutamiento | Router | `HandleFunc("/death", ...).Methods(http.MethodPost)` |
| 2 | Aplicación | Parseo multipart | `r.ParseMultipartForm(10 << 20)` |
| 3 | Aplicación | Validación | `if fullName == ""` → HTTP 400 |
| 4 | Sistema de archivos | Recepción de imagen | `r.FormFile("photo")`, `os.Create(savePath)` |
| 5 | Persistencia | Guardado | `s.KillRepository.Save(kill)` |
| 6 | Serialización | Respuesta 201 | `w.WriteHeader(http.StatusCreated)` |

Ejecución verificada:

```bash
curl -X POST http://localhost:8000/death \
  -F "fullName=Prueba Uno" -F "causeOfDeath=prueba" \
  -F "details=registro de prueba" -F "photo=@seed.png"
```

Respuesta obtenida: `{"id":2,"fullName":"Prueba Uno","faceImageUrl":"/static/1787627396_seed.png",...}`

---

## 7. Hallazgos revelados por el esqueleto

Recorrer el sistema de extremo a extremo expuso tres defectos que la lectura
estática del código no había priorizado.

**L-1 · El esqueleto no arranca tras un clon limpio.**
`initDB()` invoca `godotenv.Load()` y aborta con `Fatal` si falta `back/.env`,
**antes** de evaluar qué motor de persistencia está configurado. Con SQLite
ninguna variable de PostgreSQL se usa, pero el archivo sigue siendo obligatorio.
Como está excluido por `.gitignore`, un integrante nuevo no puede ejecutar el
esqueleto. Corresponde al riesgo R-02 y al escenario ESC-03.

**L-2 · El esqueleto no es constante en costo.**
`handleGetAllKills` recupera la totalidad de los registros sin paginar. El costo
del recorrido crece linealmente con el volumen de datos: con 3.302 registros
cada respuesta pesa 557 KB. Medido con k6, el p95 fue de 1114,69 ms contra un
umbral prerregistrado de 500 ms. Corresponde al riesgo R-08 y al escenario ESC-01.

**L-3 · El contrato de entrada no es uniforme entre recorridos.**
El camino de lectura responde JSON; el de escritura exige `multipart/form-data`
pese a que `KillRequestDto` declara etiquetas `json:`. Comprobado: una petición
JSON a `POST /death` es rechazada con `formato inválido: request Content-Type
isn't multipart/form-data`.

---

## 8. Conclusión

El sistema **tiene** un walking skeleton funcional: `GET /death` atraviesa las
once capas y se ejecuta de forma reproducible. La arquitectura se sostiene de
extremo a extremo.

Sin embargo, el esqueleto presenta dos defectos que afectan su función como
cimiento: no arranca sin un artefacto no versionado (L-1) y su costo crece con
el volumen de datos (L-2). Un esqueleto que no se puede levantar en una máquina
nueva no cumple su propósito de validar la arquitectura para el equipo, y uno
cuyo costo no está acotado no sirve como línea base estable.

El siguiente paso derivado es un ADR sobre la introducción de paginación en el
endpoint de listado, evaluando su impacto sobre el frontend, que actualmente
asume recibir la colección completa.

---

## 9. Trazabilidad de la entrega en Git

- **Repositorio:** https://github.com/frank241103/death-note-arquitectura
- **Rama:** `main`
- **Commit:** *f69d9c5*
- **Pull Request:** *#6*
