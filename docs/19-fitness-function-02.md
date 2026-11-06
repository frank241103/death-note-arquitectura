# 19 — Contrato de fitness function FF-02

**Módulo:** 6 · **Fase:** III (segunda restricción ejecutable)
**Fecha:** 2026-11-06
**Estado:** ✅ **Ejecutándose en CI**
**Script:** [`scripts/fitness/ff-02-direccion-dependencias.sh`](../scripts/fitness/ff-02-direccion-dependencias.sh)

---

## 1. Por qué existe una segunda y en qué se diferencia de la primera

El sílabo pide que la segunda restricción ejecutable **proteja otra decisión
arquitectónica**, no que sea una variante de la primera. La diferencia aquí es
de decisión, de alcance y de mecanismo:

| | **FF-01** | **FF-02** |
|---|---|---|
| Decisión protegida | `ADR-005` — arquitectura hexagonal | `ADR-006` — límites de módulos |
| Pregunta que responde | ¿El dominio toca infraestructura **externa**? | ¿La **dirección** del grafo interno es la acordada? |
| Alcance | `api`, `models` | `api`, `models`, `repository` frente a `server`, `config`, `logger` |
| Qué mira | Dependencias hacia fuera del módulo Go | Dependencias **dentro** del módulo Go |
| Cómo falla | Alguien importa `gorm.io/gorm` en una entidad | Alguien importa `backend-avanzada/config` en el repositorio |

Una puede pasar mientras la otra falla. Si `repository` importara `config`,
FF-01 seguiría en verde (`config` no es infraestructura externa y `repository`
no es dominio puro), pero FF-02 fallaría, que es exactamente el caso que
`ADR-006` quiere evitar.

---

## 2. Decisión arquitectónica que la origina

**`ADR-006` — Límites de módulos y dependencias permitidas**, cuya matriz vive
en [`docs/12-mapa-modular.md`](./12-mapa-modular.md) §2:

|  | puede usar `kill` | puede usar `media` | puede usar `platform` |
|---|:---:|:---:|:---:|
| **`kill`** | — | **No** | **No** |
| **`media`** | **No** | — | **No** |
| **`platform`** | **Sí** | **Sí** | — |

La justificación del documento 12 es que `platform` es el **punto de
composición**: crea las implementaciones, las conecta y expone los endpoints.
La dependencia va del exterior hacia los módulos, nunca al revés.

### Correspondencia módulo → paquetes Go

| Módulo | Paquetes Go en el commit actual |
|---|---|
| `kill` | `back/api`, `back/models`, `back/repository` |
| `platform` | `back/server`, `back/config`, `back/logger` |
| `media` | **No existe como paquete.** Está incrustado en `server/kill_handlers.go` |

---

## 3. Propiedad comprobable, cumplimiento y fallo

> **Ningún paquete del módulo `kill` depende, directa ni transitivamente, de un
> paquete del módulo `platform`.**

**Se cumple** cuando las dependencias transitivas internas de `api`, `models` y
`repository` no contienen `backend-avanzada/server`, `.../config` ni
`.../logger`.

**Falla** (código de salida 1) en cuanto aparezca una.

### Estado medido en el commit actual

```
$ bash scripts/fitness/ff-02-direccion-dependencias.sh
Matriz verificada: ADR-006 §2 (docs/12-mapa-modular.md)
Módulo kill     -> api models repository
Módulo platform -> server config logger

FF-02 CUMPLE: la dirección de dependencias respeta ADR-006.

Dependencias internas observadas en el módulo kill:
  api          -> (ninguna)
  models       ->   api
  repository   ->   api   models
```

La regla ya se cumple. Igual que FF-01, es deliberado: una restricción que
nace roja se desactiva en lugar de adoptarse.

### Qué imprime cuando falla

```
  VIOLACIÓN: 'repository' (módulo kill) depende de 'config' (módulo platform)

FF-02 FALLA: 1 violación(es).

Qué significa: un paquete del módulo 'kill' importó uno de 'platform'.
ADR-006 fija la dirección contraria: platform compone a kill, nunca
al revés. Si kill necesita algo de platform, debe declararlo como un
puerto en su propia frontera y recibir la implementación por inyección.
```

---

## 4. Prueba negativa

```
$ bash scripts/fitness/ff-02-direccion-dependencias.sh --prueba-negativa
=== PRUEBA NEGATIVA FF-02 ===
Inyectando una dependencia prohibida (repository -> config) ...

Archivo temporal eliminado.

PRUEBA NEGATIVA SUPERADA: la regla detecta la violación inyectada.
```

Crea `back/repository/ff02_prueba_negativa.go` con
`import _ "backend-avanzada/config"`, protegido por el *build tag*
`ff02_prueba_negativa` para que no contamine ninguna compilación normal.
Evalúa la regla con ese tag activo, **borra el archivo** y verifica que la
violación fue detectada.

Nótese que la violación inyectada es **distinta** de la de FF-01: aquí es una
dependencia interna permitida por Go y prohibida por el ADR, no una
importación de infraestructura.

---

## 5. Mecanismo de ejecución en CI

En `.github/workflows/ci.yml`:

```yaml
      - name: "FF-02 — Dirección de dependencias entre módulos"
        run: bash ./scripts/fitness/ff-02-direccion-dependencias.sh

      - name: "FF-02 — Prueba negativa"
        run: bash ./scripts/fitness/ff-02-direccion-dependencias.sh --prueba-negativa
```

Corre en cada `push` a `main` o `develop` y en cada `pull_request` hacia
`main`. Un fallo deja el job en rojo y marca el PR.

---

## 6. Lo que FF-02 NO comprueba

`[EVIDENCIA FALTANTE]` Se declara para que nadie le atribuya más alcance:

- **Las reglas del módulo `media` no se comprueban todavía**, porque `media` no
  existe como paquete Go: la escritura de imagen sigue incrustada en
  `server/kill_handlers.go:110-121`. La matriz del ADR-006 las declara; FF-02
  las verificará cuando se extraiga el paquete. Mientras tanto, dos de las seis
  celdas de la matriz están sin verificación automática.
- No comprueba ciclos entre paquetes en general, solo la dirección
  `kill → platform`.
- No comprueba el frontend.

---

## 7. Cómo se levanta la regla deliberadamente

Igual que FF-01: escribir un ADR que registre el cambio de criterio, modificar
los arreglos `PAQUETES_KILL` / `PAQUETES_PLATFORM` del script y actualizar este
contrato. **No vale desactivar el paso del CI.**

---

## 8. Trazabilidad

| Referencia | Dónde |
|---|---|
| Decisión de origen | `adrs/ADR-006-limites-modulos.md` |
| Matriz verificada | `docs/12-mapa-modular.md` §2 |
| Script | `scripts/fitness/ff-02-direccion-dependencias.sh` |
| Integración en CI | `.github/workflows/ci.yml` |
| Primera restricción ejecutable | `docs/15-fitness-function-01.md` |
| Consolidación de evidencia | `docs/23-evidencia-ejecutable.md` |
