# 15 — Contrato de fitness function FF-01

**Módulo:** 6 (control A6)
**Fecha:** 2026-10-23
**Estado:** ✅ **Ejecutándose en CI**
**Script:** [`scripts/fitness/ff-01-dominio-sin-infraestructura.sh`](../scripts/fitness/ff-01-dominio-sin-infraestructura.sh)

---

## 1. Decisión arquitectónica que la origina

**`ADR-005` — Adopción de arquitectura hexagonal (puertos y adaptadores).**

El ADR-005 decide que el dominio no conoce la infraestructura: la base de
datos, el sistema de archivos y el transporte HTTP entran por adaptadores
detrás de puertos, no por importaciones directas del dominio.

Una decisión así se degrada en silencio. Nadie la viola a propósito: alguien
añade un `import "gorm.io/gorm"` en una estructura de dominio porque es lo más
rápido, el PR se aprueba, y seis meses después la decisión existe solo en el
documento. **Esta fitness function convierte el ADR-005 en una condición que
la build comprueba.**

> Decisión relacionada: `ADR-006` define la matriz de dependencias permitidas
> entre módulos. FF-01 verifica el caso más estricto de esa matriz: el
> dominio no depende de nada externo.

---

## 2. Propiedad comprobable

> **Ningún paquete del dominio depende de infraestructura.**

El dominio son exactamente dos paquetes:

| Paquete | Qué contiene |
|---|---|
| `back/api` | DTOs del contrato (`back/api/kill.go`) |
| `back/models` | Entidades del dominio (`back/models/kill.go`) |

"Depende" significa **dependencia transitiva**, no solo importación directa.
Se obtiene con `go list -deps`, de modo que un paquete de dominio tampoco
puede alcanzar infraestructura a través de un intermediario.

---

## 3. Condición de cumplimiento

La regla **se cumple** cuando el conjunto de dependencias transitivas de
`./api` y `./models` contiene únicamente:

1. Paquetes de la biblioteca estándar de Go, **excepto** los listados en §4; y
2. Paquetes del propio módulo, con prefijo `backend-avanzada/`.

### Estado medido en el commit `6b657dd`

```
$ go list -deps -f '{{if not .Standard}}{{.ImportPath}}{{end}}' ./api ./models
backend-avanzada/api
backend-avanzada/models
```

Cero dependencias de terceros. Las únicas estándar que aparecen son `time` y
`syscall`. **La regla se cumple hoy sin necesidad de refactorizar nada**, lo
cual es deliberado: una fitness function que falla desde el primer día no se
adopta, se desactiva.

---

## 4. Condición de fallo

La build **falla** (código de salida 1) si ocurre cualquiera de estas dos:

**(a) Dependencia de terceros.** Cualquier ruta de importación que no empiece
por `backend-avanzada/` y no sea de la biblioteca estándar. En la práctica:
`gorm.io/*`, `github.com/gorilla/mux`, `github.com/rs/cors`,
`github.com/glebarez/sqlite`, `github.com/joho/godotenv`.

**(b) Infraestructura de la biblioteca estándar.** Aunque sean estándar,
estos paquetes son infraestructura y el dominio no debe alcanzarlos:

| Paquete | Por qué está prohibido en el dominio |
|---|---|
| `net/http` | Transporte. Es lo que convierte una entidad en un handler |
| `database/sql` | Persistencia |
| `os` | Sistema de archivos y entorno — la vía de F-05 y de los `os.Getenv` dispersos (R-05) |
| `net` | Red |

La lista vive en la variable `INFRA_STD` del script. Ampliarla es un cambio de
una línea.

### Qué imprime cuando falla

```
  VIOLACIÓN (terceros): el dominio depende de 'gorm.io/gorm'

FF-01 FALLA: 1 violación(es).

Qué significa: un paquete del dominio importó infraestructura.
Eso rompe la decisión registrada en ADR-005 (arquitectura hexagonal):
la infraestructura debe entrar por un adaptador, no por un import
directo del dominio.
```

El mensaje nombra la decisión violada, no solo la regla. Quien reciba el fallo
tiene que poder entender por qué existe sin leer este documento.

---

## 5. Prueba negativa

Una regla que nunca ha fallado no está verificada: puede estar comprobando
nada. El script incluye una prueba negativa que **inyecta una violación real y
comprueba que se detecta**.

```
$ ./scripts/fitness/ff-01-dominio-sin-infraestructura.sh --prueba-negativa
=== PRUEBA NEGATIVA FF-01 ===
Inyectando una violación deliberada en models/ ...

Archivo temporal eliminado.

PRUEBA NEGATIVA SUPERADA: la regla detecta la violación inyectada.
```

**Cómo funciona:** crea `back/models/ff01_prueba_negativa.go` con
`import _ "net/http"`, protegido por el *build tag* `ff01_prueba_negativa`
para que no contamine ninguna compilación normal. Evalúa la regla con ese tag
activo, **borra el archivo**, y verifica que la violación fue detectada.

Si la prueba negativa falla, el CI falla: significa que la regla aprobaría
código que viola el ADR-005, y entonces no sirve para nada.

---

## 6. Mecanismo de ejecución en CI

En `.github/workflows/ci.yml`, tras compilar el backend:

```yaml
      - name: FF-01 — El dominio no depende de infraestructura
        run: ./scripts/fitness/ff-01-dominio-sin-infraestructura.sh

      - name: FF-01 — Prueba negativa
        run: ./scripts/fitness/ff-01-dominio-sin-infraestructura.sh --prueba-negativa
```

**Cuándo corre:** en cada `push` a `main` o `develop` y en cada
`pull_request` hacia `main`.

**Efecto de un fallo:** el job termina en rojo y el PR queda marcado.

---

## 7. Cómo se levanta la regla deliberadamente

Una fitness function que no se puede cambiar se termina borrando. Si el equipo
decide que el dominio **sí** debe importar algo hoy prohibido, el
procedimiento es:

1. Escribir un ADR nuevo que registre el cambio de criterio y por qué.
2. Modificar `INFRA_STD` o el prefijo permitido en el script.
3. Actualizar este contrato, incluida su §3.

**No vale desactivar el paso del CI.** El propósito es que relajar el límite
cueste una decisión documentada, no un commit silencioso.

---

## 8. Coherencia entre el ADR y este contrato

| Lo que dice `ADR-005` | Lo que comprueba FF-01 |
|---|---|
| "El dominio no conoce la infraestructura" | Cero dependencias de terceros y de `net/http`, `os`, `net`, `database/sql` en `api` y `models` |
| "La infraestructura entra por adaptadores" | Los adaptadores viven en `server/` y `repository/`, que **no** están en el alcance de la regla y sí importan infraestructura — como corresponde |
| "La migración es incremental" | La regla ya se cumple, así que no bloquea la migración: la protege de retroceder |

### Lo que FF-01 **no** comprueba

`[EVIDENCIA FALTANTE]` Se declara explícitamente para que nadie le atribuya
más alcance del que tiene:

- No comprueba que los puertos del ADR-005 **existan**. Hoy no existen: están
  decididos, no escritos. FF-01 protege el límite del dominio; no obliga a
  crear los adaptadores.
- No comprueba la matriz completa del `ADR-006` (por ejemplo, que `repository`
  no importe `server`). Sería FF-02.
- No comprueba nada en el frontend.

---

## 9. Trazabilidad

| Referencia | Dónde |
|---|---|
| Decisión de origen | `adrs/ADR-005-estilo-hexagonal.md` |
| Matriz de dependencias relacionada | `adrs/ADR-006-limites-modulos.md`, `docs/12-mapa-modular.md` §2 |
| Script | `scripts/fitness/ff-01-dominio-sin-infraestructura.sh` |
| Integración en CI | `.github/workflows/ci.yml` |
| Fila de la matriz de resiliencia | `docs/17-matriz-resiliencia.md`, T-09 |
| Paquetes del dominio | `back/api/kill.go`, `back/models/kill.go` |
