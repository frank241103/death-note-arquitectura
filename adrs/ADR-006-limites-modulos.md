# ADR-006 — Límites de módulos y dependencias permitidas

**Estado:** Aceptada — pendiente de veredicto del mini-comité 1  
**Fecha:** 2026-10-10  
**Módulo:** 4  
**Decide:** equipo de arquitectura

---

## Contexto

El sistema base no declara límites de módulo explícitos. Los paquetes actuales
organizan archivos por función técnica, pero el paquete `server` concentra el
arranque HTTP, la configuración de base de datos, CORS, routing, handlers y
parte del almacenamiento de imágenes.

Además, los handlers llaman directamente al repositorio, sin una capa
intermedia de aplicación. En la creación de un `Kill`, el mismo handler también
crea el directorio `uploads/` y escribe la imagen en disco. Esta combinación
hace que las reglas de negocio, la persistencia, el transporte HTTP y el manejo
de archivos puedan cambiar dentro de la misma frontera.

El comando `go list -deps ./...` confirma que no existe un paquete `media`; la
responsabilidad está incrustada en `server` y por eso su acoplamiento no aparece
como una importación independiente.

## Fuerzas de decisión

- Mantener un único despliegue adecuado al tamaño actual del sistema.
- Poder probar las reglas de `kill` sin servidor HTTP, base de datos ni disco.
- Evitar que la ubicación física de las imágenes se propague a los handlers.
- Hacer visibles y revisables las dependencias entre responsabilidades.

## Decisión

Definir tres módulos: `kill`, `media` y `platform`, con las siguientes
responsabilidades:

- `kill` gestiona las operaciones, reglas y persistencia de los registros de
  muerte.
- `media` encapsula el almacenamiento y la entrega de archivos de imagen.
- `platform` carga configuración, compone las dependencias, registra rutas y
  arranca el servidor.

Se adopta esta matriz de dependencias:

|  | puede usar `kill` | puede usar `media` | puede usar `platform` |
|---|:---:|:---:|:---:|
| **`kill`** | — | **No** | **No** |
| **`media`** | **No** | — | **No** |
| **`platform`** | **Sí** | **Sí** | — |

`platform` será el único punto de composición y podrá conectar los otros dos
módulos. `kill` no conocerá la implementación de archivos: cuando necesite
guardar una imagen, usará un puerto definido desde su frontera. `media`
implementará ese puerto sin depender de los modelos ni del repositorio de
`kill`.

## Consecuencias

### Positivas

- Los cambios de negocio, almacenamiento y arranque quedan localizados en su
  módulo correspondiente.
- `kill` puede probarse de forma aislada mediante dobles de sus puertos, sin
  base de datos real ni acceso al sistema de archivos.
- La estrategia de almacenamiento puede cambiar sin modificar los handlers ni
  las reglas del dominio.
- Las dependencias permitidas quedan explícitas y pueden revisarse en código.

### Negativas

- Se agregan interfaces, constructores y archivos a un sistema pequeño.
- La ejecución incorpora una capa de indirección entre el caso de uso y las
  implementaciones de repositorio y almacenamiento.
- La migración exige extraer responsabilidades que hoy comparten el paquete
  `server`.

## Alternativas consideradas

**Dejar la estructura actual.** Mantiene menos archivos y evita una migración
inmediata, pero conserva el acoplamiento entre handlers, repositorio y sistema
de archivos. También permite que nuevas responsabilidades sigan acumulándose
en `server`.

**Separar `kill` y `media` como servicios independientes.** Haría visible la
frontera mediante una red, pero introduce despliegues, fallos distribuidos y
latencia adicionales para un sistema pequeño. Los límites requeridos pueden
obtenerse primero dentro del monolito modular.

## Veredicto del mini-comité 1
