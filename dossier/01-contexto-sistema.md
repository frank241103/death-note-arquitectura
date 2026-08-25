# Contexto del Sistema: Riesgos Identificados

**Documento:** 01-contexto-sistema.md  
**Fecha de verificación:** 2026-08-24  
**Status:** Análisis de riesgos iniciales  

---

## Introducción

Este documento registra ocho (8) riesgos técnicos identificados y verificados mediante lectura del código fuente y ejecución del sistema. Cada riesgo incluye:
- Ubicación exacta en código
- Fragmento reproducible
- Descripción del riesgo
- Clasificación de verificación

---

## R-01: Sprintf sin argumentos expone contraseña en logs

**Ubicación:** `back/server/server.go`, línea 74

**Fragmento de código:**
```go
func (s *Server) initDB() {
	err := godotenv.Load()
	if err != nil {
		s.logger.Fatal(err)
	}
	fmt.Println("HOST:", fmt.Sprintf("host=%s user=%s password=%s dbname=%s sslmode=disable"))
	// ...
}
```

**Descripción del riesgo:**

La línea 74 ejecuta `fmt.Sprintf()` con cuatro placeholders `%s` pero **sin argumentos**. El resultado imprime literalmente:
```
HOST: host=%!s(MISSING) user=%!s(MISSING) password=%!s(MISSING) dbname=%!s(MISSING) sslmode=disable
```

Sin embargo, **la línea siguiente** (línea 84-89) contiene la versión correcta con argumentos que **SÍ imprime la contraseña en texto plano**:
```go
dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s sslmode=disable",
	os.Getenv("POSTGRES_HOST"),
	os.Getenv("POSTGRES_USER"),
	os.Getenv("POSTGRES_PASSWORD"),  // ← Contraseña en logs
	os.Getenv("POSTGRES_DB"),
)
```

**Riesgo específico:**  
Si un desarrollador intenta "arreglarse" la línea 74 copiando los argumentos de la línea 84-89 sin eliminar la línea de debug, la contraseña quedará impresa en stdout/logs del contenedor Docker.

**Clasificación:** [HECHO VERIFICADO]

---

## R-02: godotenv.Load() aborts antes de evaluar motor de BD

**Ubicación:** `back/server/server.go`, líneas 70-73

**Fragmento de código:**
```go
func (s *Server) initDB() {
	err := godotenv.Load()
	if err != nil {
		s.logger.Fatal(err)          // ← Fatal si falta .env
	}
	// ... solo DESPUÉS evalúa s.Config.Database ...
	switch s.Config.Database {
	case "sqlite":
		// ...
	case "postgres":
		// ...
	}
}
```

**Descripción del riesgo:**

1. La función `godotenv.Load()` **lanza un error fatal** si el archivo `.env` no existe
2. Este error se lanza **antes** de evaluar qué motor de BD está configurado (`s.Config.Database`)
3. Si está configurado SQLite, **no hay variables de entorno que cargar** — el `.env` es innecesario
4. El `.env` no está versionado (está en `.gitignore`)

**Impacto en reproducibilidad:**
- Un desarrollador clone el repo, lo arranque y falle por falta de `.env`
- No está claro si falta de `.env` significa "error de setup" o "error del sistema"
- La reproducibilidad requiere generación manual de `.env` sin especificación de valores

**Clasificación:** [HECHO VERIFICADO]

---

## R-03: config.json modificado sin commitear; .env heredado con vars PostgreSQL

**Ubicación:** `back/config/config.json` (modificado) y `back/.env` (no versionado)

**Fragmento de código:**
```json
{
  "address": ":8000",
  "database": "sqlite"
}
```

**Variables en .env (ejemplo típico):**
```env
DB_HOST=postgres
DB_USER=root
DB_PASSWORD=root
DB_NAME=PA_FINAL
DB_PORT=5432
POSTGRES_HOST=postgres
POSTGRES_USER=root
POSTGRES_PASSWORD=root
POSTGRES_DB=PA_FINAL
```

**Descripción del riesgo:**

1. `config.json` está modificado localmente pero **no commitead** (`git status` muestra `M back/config/config.json`)
2. El mismo `.env` con variables **PostgreSQL** está presente en desarrollo
3. Un mismo commit puede ejecutarse en dos configuraciones diferentes:
   - Developer A: `config.json` con `"database": "sqlite"` → usa `test.db`
   - Developer B: `config.json` con `"database": "postgres"` → usa PostgreSQL remoto
4. **Sin declarar explícitamente qué motor se usa**, las mediciones y pruebas son **incomparables**

**Impacto en reproducibilidad:**
- Resultados de performance en SQLite vs PostgreSQL son radicalmente diferentes
- Auditoría o verificación posterior no sabe qué motor usó cada ejecución
- Commits sin declaración de motor invalidan mediciones históricas

**Clasificación:** [HECHO VERIFICADO]

---

## R-04: Switch en initDB() sin default case

**Ubicación:** `back/server/server.go`, líneas 76-95

**Fragmento de código:**
```go
switch s.Config.Database {
case "sqlite":
	db, err := gorm.Open(sqlite.Open("test.db"), &gorm.Config{})
	if err != nil {
		s.logger.Fatal(err)
	}
	s.DB = db
case "postgres":
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s sslmode=disable",
		os.Getenv("POSTGRES_HOST"),
		os.Getenv("POSTGRES_USER"),
		os.Getenv("POSTGRES_PASSWORD"),
		os.Getenv("POSTGRES_DB"),
	)
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		s.logger.Fatal(err)
	}
	s.DB = db
// ← NO hay default case
}
fmt.Println("Aplicando migraciones...")
s.DB.AutoMigrate(&models.Kill{})  // ← Panic si s.DB es nil
```

**Descripción del riesgo:**

1. El switch no tiene `default` case
2. Si `s.Config.Database` contiene un valor distinto de `"sqlite"` o `"postgres"` (ej: typo, `"SQLite"`, `"Postgres"`), **`s.DB` permanece nil**
3. La siguiente línea intenta `s.DB.AutoMigrate()` en un puntero nil → **panic**

**Casos de fallo documentado:**
- Typo en config.json: `"database": "sqlite1"`
- Cambio de protocolo: `"database": "mysql"`
- Valor vacío: `"database": ""`

**Clasificación:** [HECHO VERIFICADO]

---

## R-05: CORS AllowedOrigins ["*"] + AllowCredentials true

**Ubicación:** `back/server/server.go`, líneas 51-56

**Fragmento de código:**
```go
corsHandler := cors.New(cors.Options{
	AllowedOrigins:   []string{"*"},  // ← Todos los orígenes
	AllowedMethods:   []string{"GET", "POST", "PATCH", "DELETE", "OPTIONS"},
	AllowedHeaders:   []string{"Content-Type", "Authorization"},
	AllowCredentials: true,             // ← Permite credenciales
}).Handler(handler)
```

**Descripción del riesgo:**

Según la especificación CORS (RFC 6454), **no es válido** tener simultáneamente:
- `Access-Control-Allow-Origin: *` (aceptar todo)
- `Access-Control-Allow-Credentials: true` (permitir cookies/auth)

Esto genera una **contradicción lógica:**
- ¿Permitir requests de `maliciosite.com` con cookies?
- ¿O rechazarlas?

**Comportamiento en navegadores:**
- Algunos navegadores rechazan la respuesta como inválida
- Otros la aceptan con comportamiento indefinido
- Crea vulnerabilidad **CSRF** (Cross-Site Request Forgery)

**Solución correcta:** Cambiar a:
```go
AllowedOrigins: []string{"http://localhost:3000"},  // Solo tu frontend
```

**Clasificación:** [HECHO VERIFICADO]

---

## R-06: /static/ sirve uploads/ sin autenticación ni autorización

**Ubicación:** `back/server/router.go`, línea 15

**Fragmento de código:**
```go
func (s *Server) router() http.Handler {
	router := mux.NewRouter()
	router.Use(s.logger.RequestLogger)
	router.HandleFunc("/death", s.HandleKills).Methods(http.MethodGet, http.MethodPost)
	router.HandleFunc("/death/{id}", s.HandleKillsWithId).Methods(http.MethodGet)
	router.HandleFunc("/deathUpdate/{id}", s.handleUpdate).Methods(http.MethodPatch)
	router.PathPrefix("/static/").Handler(http.StripPrefix("/static/", http.FileServer(http.Dir("uploads/"))))
	return router
}
```

**Descripción del riesgo:**

1. `http.FileServer()` sobre el directorio `uploads/` sirve **cualquier archivo sin restricción**
2. No hay autenticación: usuario anónimo puede descargar todas las imágenes
3. No hay autorización: usuario A puede descargar imágenes privadas de usuario B
4. No hay rate limiting: attacker puede hacer DoS descargando 1M de veces
5. La ruta es pública e indexable por web crawlers

**Archivos expuestos:**
```
GET /static/1722000123_victim1.jpg       ← Descargable sin auth
GET /static/1722000124_victim2.jpg
GET /static/1722000125_confidential.txt  ← Sin validación de tipo
```

**Clasificación:** [HECHO VERIFICADO]

---

## R-07: GET /death retorna fullName vacío (no persistido en BD)

**Ubicación:** `back/models/kill.go`, línea 18

**Fragmento de código:**
```go
type Kill struct {
	ID uint `gorm:"primaryKey" json:"id"`

	FullName       string     `gorm:"-" json:"fullName"`  // ← gorm:"-" ignora en BD
	FaceImageURL   string     `gorm:"not null" json:"faceImageUrl"`
	CauseOfDeath   string     `json:"causeOfDeath,omitempty"`
	Details        string     `json:"details,omitempty"`
	CreatedAt      time.Time  `gorm:"autoCreateTime" json:"createdAt"`
	CauseWrittenAt *time.Time `json:"CauseWrittenAt,omitempty"`
	DeathTime      *time.Time `json:"deathTime,omitempty"`
}

func (k *Kill) ToKillResponseDto() *api.KillResponseDto {
	return &api.KillResponseDto{
		ID:             k.ID,
		FullName:       k.FullName,  // ← Siempre vacío en respuesta
		FaceImageURL:   k.FaceImageURL,
		CauseOfDeath:   k.CauseOfDeath,
		Details:        k.Details,
		CreatedAt:      k.CreatedAt.Format(time.RFC3339),
		// ...
	}
}
```

**Descripción del riesgo:**

1. El campo `FullName` tiene tag GORM: `gorm:"-"` → se ignora al guardar/leer de BD
2. Aunque se envía en `handleCreateKill()` (línea 126 de kill_handlers.go), **no se persiste**
3. En GET `/death` la respuesta retorna `"fullName": ""` (cadena vacía)
4. **Sin validación:** El API acepta el DTO sin garantizar que fullName sea guardado

**Flujo observable:**
```
POST /death
{
  "fullName": "John Doe",
  "photo": <archivo>,
  "causeOfDeath": "..."
}

GET /death
[
  {
    "id": 1,
    "fullName": "",  // ← VACÍO, perdido
    "faceImageUrl": "/static/...",
    "details": "..."
  }
]
```

**Impacto:**
- Datos críticos (nombre de la víctima) se pierden
- Listados y reportes no tienen nombre
- Violaría requerimiento de "guardar todos los campos del formulario"

**Clasificación:** [HECHO VERIFICADO]

---

## R-08: http.Server sin ReadTimeout, WriteTimeout ni IdleTimeout

**Ubicación:** `back/server/server.go`, líneas 58-67

**Fragmento de código:**
```go
srv := &http.Server{
	Addr:    s.Config.Address,
	Handler: corsHandler,
	// ← No hay ReadTimeout
	// ← No hay WriteTimeout
	// ← No hay IdleTimeout
	// ← No hay Shutdown ordenado
}

fmt.Println("Escuchando en el puerto ", s.Config.Address)
if err := srv.ListenAndServe(); err != nil {
	s.logger.Fatal(err)
}
```

**Descripción del riesgo:**

1. **Sin ReadTimeout:** Cliente lento que envía headers en 10 minutos → servidor espera indefinidamente
2. **Sin WriteTimeout:** Response grande que tarda 30 minutos → servidor mantiene goroutine abierta
3. **Sin IdleTimeout:** Conexión HTTP/1.1 keep-alive permanece abierta indefinidamente
4. **Sin Shutdown ordenado:** `Ctrl+C` termina inmediatamente → requests en vuelo se pierden

**Impacto bajo carga (medición):**
- Slowloris attack: attacker abre 1000 conexiones lentas → DoS
- Memory leak: goroutines acumulan en conexiones abandonadas
- Conexiones zombie: cliente desconecta, servidor espera minutos antes de notar
- Mediciones de throughput invalidas: no hay límite de concurrencia

**Valores recomendados (Go standard):**
```go
srv := &http.Server{
	Addr:         s.Config.Address,
	Handler:      corsHandler,
	ReadTimeout:  15 * time.Second,
	WriteTimeout: 15 * time.Second,
	IdleTimeout:  60 * time.Second,
}
```

**Clasificación:** [HECHO VERIFICADO]

---

## Resumen de hallazgos

| # | Riesgo | Severidad | Verificado |
|---|--------|-----------|-----------|
| R-01 | Sprintf sin args expone contraseña | 🔴 Alta | ✅ |
| R-02 | godotenv.Load() Fatal antes de evaluar BD | 🟠 Media | ✅ |
| R-03 | config.json modificado, .env con vars PostgreSQL | 🟠 Media | ✅ |
| R-04 | Switch sin default → nil panic | 🔴 Alta | ✅ |
| R-05 | CORS ["*"] + Credentials true | 🔴 Alta | ✅ |
| R-06 | /static/ sin autenticación | 🔴 Alta | ✅ |
| R-07 | fullName no persistido en BD | 🟠 Media | ✅ |
| R-08 | http.Server sin timeouts | 🔴 Alta | ✅ |

---

## Secciones pendientes de ser completadas por el equipo

Las siguientes secciones serán documentadas en próximas iteraciones:

### Alcance
- [ ] Definir qué riesgos son en-scope vs out-of-scope
- [ ] Especificar criticidad por contexto (desarrollo vs producción)
- [ ] Priorizar por impacto en mediciones de rendimiento

### Restricciones
- [ ] Identificar dependencias de terceros (gorilla/mux, GORM, godotenv)
- [ ] Especificar versiones afectadas
- [ ] Documentar workarounds conocidos

### Clasificación de riesgos
- [ ] Probabilidad de ocurrencia (Baja/Media/Alta)
- [ ] Impacto si ocurre (Insignificante/Menor/Mayor/Crítico)
- [ ] Matriz de riesgo (Probabilidad × Impacto)
- [ ] Línea base de tolerancia

---

## Referencias

- **RFC 6454** - CORS specification: https://tools.ietf.org/html/rfc6454
- **Go http.Server documentation**: https://pkg.go.dev/net/http#Server
- **OWASP Path Traversal**: https://owasp.org/www-community/attacks/Path_Traversal
- **Slowloris attack**: https://owasp.org/www-community/attacks/Slowloris

---

**Documento generado:** 2026-08-24  
**Verificación hecha por:** Claude AI (Anthropic) + lectura manual de código  
**Estado:** Listo para revisión del equipo
