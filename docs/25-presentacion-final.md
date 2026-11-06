# 25 — Brief ejecutivo y defensa final

**Fase:** IV · **Semana:** 15-16 · **Fecha:** 2026-11-06

---

# PARTE A — Brief ejecutivo (una página, audiencia no técnica)

## El sistema

Una aplicación web para registrar fallecimientos: un nombre, una causa, unos
detalles y una fotografía. Tiene una pantalla para el usuario, un servidor que
procesa y una base de datos que guarda. El equipo **no lo construyó desde
cero**: adoptó un proyecto existente y lo analizó como analizaría un sistema
heredado en una empresa.

## Qué se encontró

El sistema **funciona**, y tiene tres problemas que no se ven usándolo:

1. **Se pone lento cuando varias personas lo usan a la vez.** Con un usuario,
   una consulta tarda 46 milésimas de segundo. Con diez a la vez, una de cada
   veinte tarda **1,7 segundos**: 37 veces más. No es que la operación sea
   cara; es que las peticiones hacen cola.

2. **Cualquiera puede ver todo, sin contraseña.** No hay inicio de sesión. Una
   sola petición devuelve el listado completo —en la prueba, 3302 registros— y
   con él las direcciones de todas las fotografías, que también se descargan
   sin credencial. La fotografía de un rostro junto a un nombre es el dato más
   sensible del sistema y es el que menos protección tiene.

3. **Recién instalado, no arranca.** Faltan dos pasos manuales que nadie había
   documentado. El equipo los descubrió al clonar el repositorio desde cero.

## Qué se decidió

**Reorganizar el sistema por dentro antes de añadirle nada.** Separar las
reglas de negocio de los detalles técnicos —la base de datos, el disco, la
web— para que cada parte pueda cambiarse sin romper las demás. Eso cuesta
**16 unidades de cambio** sobre un sistema de 584 líneas, es reversible, y es
lo que hace *posible* ponerle seguridad después.

**No repartir el sistema en varias piezas.** Es más caro (21 a 25 unidades),
difícil de deshacer, y se descubrió que además **obligaría a cambiar la base
de datos primero** — un costo que nadie había visto.

**Convivir con la lentitud, por ahora.** Se midió que escribir la fotografía
explica hasta el 71 % de la espera. Arreglarlo exige maquinaria que, con un
solo usuario real, cuesta más de lo que resuelve. Está escrito **qué tendría
que pasar** para cambiar de opinión: diez usuarios simultáneos, o fotografías
de más de un megabyte.

## Qué protege la decisión de deshacerse sola

Dos verificaciones automáticas corren **cada vez que alguien sube un cambio**.
Si alguien rompe una de las fronteras acordadas, el cambio se marca en rojo
antes de integrarse. Las dos incluyen una prueba que rompe la regla a
propósito para comprobar que el guardia sabe dar la alarma.

Una decisión escrita se olvida en seis meses. Una decisión verificada no.

## Qué queda pendiente, dicho de frente

Nada de lo anterior está construido todavía: está **decidido, medido y
costeado**. De ocho controles de seguridad propuestos, **uno** funciona. El
despliegue automatizado está escrito pero nunca se ejecutó. Hay cinco
correcciones de una línea cada una que siguen sin hacerse.

El equipo prefirió **medir bien y declarar lo que falta** antes que presentar
como terminado algo que no lo está.

---

# PARTE B — Guion de la defensa

## Las tres preguntas del curso

### 1. ¿Dónde va a doler y cómo lo van a medir?

> Duele en la **cola**, no en el promedio. La mediana de crear un registro es
> 46 ms; el p95 es 1730 ms. Esa razón de 37,7× es la firma de contención: bajo
> concurrencia, las escrituras en disco se encolan.
>
> Lo medimos con k6, con umbral fijado **antes** de medir, commit registrado y
> los JSON crudos publicados. Cuatro corridas de la línea base en dos
> máquinas, una descartada y declarada.
>
> Un dato cierra el argumento: el **mínimo** de `POST` (12,76 ms) es *menor*
> que el de `PATCH` (14,18 ms). Sin concurrencia, escribir el archivo no
> cuesta nada. El problema es la cola, no la operación.

### 2. ¿El sistema llega a una base ejecutable en dos semanas?

> Ya es ejecutable, con dos pasos manuales que documentamos: copiar
> `.env.example` y crear `back/uploads/`. Los dos son fallos reales,
> F-02 y F-05.
>
> Lo que **no** está ejecutado es el despliegue en contenedores. Está escrito
> en `docker-compose.yml` y nunca se levantó. Encontramos cinco defectos
> leyéndolo —entre ellos que el frontend apunta a `localhost`, que dentro de
> un contenedor es él mismo— pero los reportamos como hallazgos de revisión,
> no como fallos observados, porque no los ejecutamos.

### 3. ¿Qué presión externa cambiaría su decisión correcta?

> Están escritas antes de que ocurran, en `ADR-007` §6:
>
> - **Diez usuarios concurrentes sostenidos** → se reabre la escritura
>   diferida.
> - **Fotografías de más de 1 MB** → medimos con un PNG de 70 bytes; con
>   imágenes reales el efecto es **mayor**, no menor.
> - **Un segundo consumidor del almacén** → se reabre extraer `media`.
> - **Exposición fuera de `localhost`, o datos reales** → el riesgo aceptado
>   RA-01 deja de ser aceptable y la autenticación pasa a obligatoria.
>
> Y una que descubrimos al costear: **replicar obliga a migrar de SQLite
> primero.** No aparecía en ningún documento previo y encarece una decisión
> que parecía barata.

### Pregunta sobre la semilla

> **¿Qué tiene que tener la semilla para que el fenómeno aparezca?**
>
> Tres cosas: **volumen** (3302 registros; con 50 la consulta es instantánea y
> no se ve nada), **concurrencia** (10 VUs; con uno solo la mediana es
> excelente y el p95 no se despega) e **imagen obligatoria en cada inserción**,
> porque el fenómeno vive en la escritura a disco.
>
> Fijamos el tamaño de imagen —un PNG de 1×1, 70 bytes— deliberadamente, para
> aislar el tamaño como variable. Esto acota la conclusión hacia abajo: con
> imágenes reales sería peor.

## Si piden ejecutar algo en vivo

| Petición | Comando |
|---|---|
| Correr una fitness function | `bash scripts/fitness/ff-01-dominio-sin-infraestructura.sh` |
| Demostrar que sabe fallar | el mismo, con `--prueba-negativa` |
| La segunda restricción | `bash scripts/fitness/ff-02-direccion-dependencias.sh` |
| Reproducir la línea base | `k6 run scripts/baseline.js` desde `experimentos/medicion-escenario-01` |
| Intentar una fuga de datos | `bash experimentos/prueba-seguridad-01/prueba-fuga-datos.sh` |

Requisito previo en todos los casos de k6 y PS-01: `cd back && go run main.go`.

## Si introducen una restricción nueva

El procedimiento está escrito y es el mismo que se usó todo el semestre:

1. Identificar qué **condición de revisión** ya escrita se activa
   (`ADR-007` §6, `ADR-008` §5, `docs/18` §4).
2. Si ninguna encaja, **prerregistrar** el criterio antes de medir.
3. Medir, publicar el JSON crudo, registrar el commit.
4. Escribir el ADR con dos alternativas como mínimo, costo en unidades de
   cambio, consecuencias negativas y reversibilidad.
5. Si la decisión fija una frontera, **protegerla con una restricción
   ejecutable** y su prueba negativa.

## Reparto de la defensa

| Integrante | Bloque |
|---|---|
| **David** | Medición, spike y evidencia ejecutable (`docs/23`) |
| **Dylam** | C4, mapa modular y límites (`docs/12`, `ADR-006`) |
| **Sebastián** | Seguridad, crítica a la IA y mini-comité (`docs/20`, `docs/24`, `docs/14`) |
| **John** | API, eventos e integración (`docs/09`, `ADR-007`) |

---

## Trazabilidad

| Afirmación del brief | Fuente |
|---|---|
| 46 ms / 1730 ms / 37,7× | `experimentos/spike-01-integracion/resultados/post-baseline.json` |
| 3302 registros, 557 kB | `experimentos/medicion-escenario-01/resultados/run-2.json` |
| 71 % atribuible a la escritura (cota superior) | `spike-01-integracion/README.md` §4 y §6 |
| 16 / 21 / 25 unidades de cambio | `docs/18-comparacion-distribucion-costos.md` §3 y §4 |
| Replicar exige migrar el motor | `docs/18` §4 |
| 1 de 8 controles implementado | `docs/20-seguridad.md` §6 |
| Dos restricciones en CI con prueba negativa | `docs/15`, `docs/19` |
| Cinco defectos del compose | `docs/21-despliegue-observabilidad.md` §1.3 |
| Condiciones de revisión | `ADR-007` §6, `ADR-008` §5 |
