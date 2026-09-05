# Revisión por pares de arquitectura - UrbanFix

## 1. Información de la revisión

**Proyecto revisado:** UrbanFix

**Repositorio revisado:**  
https://github.com/sam17m2005/backend_urbanfix_Architecture

**Actividad:** Revisión por pares - Semana 6

**Revisor:** Dylam0

## 2. Objetivo

Se realizó una revisión por pares de la documentación arquitectónica del proyecto UrbanFix utilizando los criterios establecidos en el checklist de la Semana 6.

La revisión consistió en contrastar la arquitectura documentada con los archivos, dependencias y configuraciones disponibles en el repositorio, con el propósito de determinar qué elementos pueden verificarse directamente y cuáles requieren mayor evidencia o aclaración.

---

# 3. Revisión de los contenedores

El diagrama de arquitectura identifica como principales contenedores una aplicación móvil, un backend API desarrollado con Flask y una base de datos PostgreSQL.

El backend puede relacionarse con código verificable dentro del repositorio. La carpeta `app` contiene archivos como `__init__.py`, `models.py`, `routes.py` y `utils.py`, que permiten identificar la implementación del backend.

La base de datos PostgreSQL también puede verificarse mediante la configuración del proyecto y el archivo `docker-compose.yml`, donde se define un servicio PostgreSQL.

La aplicación móvil aparece representada en el diagrama, pero no puede ser verificada directamente dentro del repositorio revisado. Esto no permite afirmar que la aplicación móvil no exista; únicamente significa que su implementación no está disponible dentro del repositorio analizado.

### Evaluación

Cumplimiento parcial.

### Recomendación

Agregar una referencia concreta al repositorio o código correspondiente a la aplicación móvil, o indicar expresamente que se trata de un componente externo al repositorio revisado.

---

# 4. Elementos que deberían existir o que requieren verificación

El diagrama identifica integraciones con MapBox API y Gemini API.

Sin embargo, estas integraciones no pueden verificarse directamente mediante las dependencias revisadas del backend. Por esta razón, no es posible determinar únicamente desde este repositorio si corresponden a integraciones implementadas, servicios externos consumidos mediante otro mecanismo, funcionalidades futuras o elementos documentados que todavía no cuentan con evidencia suficiente.

También se observa una configuración de despliegue mediante GitHub Actions y EC2 que corresponde a una configuración histórica descrita en la documentación del proyecto, mientras que la documentación actual presenta Docker como mecanismo de ejecución.

### Evaluación

Existen elementos que requieren aclaración.

### Recomendación

Diferenciar explícitamente entre componentes implementados, integraciones externas, funcionalidades futuras y configuraciones históricas.

---

# 5. Correspondencia entre tecnologías declaradas y dependencias reales

La revisión muestra una correspondencia importante entre las tecnologías declaradas y la implementación disponible.

### Flask

Flask aparece como tecnología del backend, está incluido en las dependencias y es utilizado directamente en el código.

### PostgreSQL

PostgreSQL aparece como base de datos del sistema. Su utilización puede relacionarse con la dependencia `psycopg2-binary` y con el servicio PostgreSQL definido en Docker Compose.

### SQLAlchemy

SQLAlchemy y Flask-SQLAlchemy aparecen en las dependencias y se relacionan con la implementación de los modelos y acceso a datos.

### AWS S3

AWS S3 aparece como tecnología de almacenamiento. La dependencia `boto3` está presente y el código utiliza un cliente S3.

### Docker

Docker puede verificarse mediante `dockerfile` y `docker-compose.yml`.

### GitHub Actions

Existe un workflow dentro de `.github/workflows/deploy.yml`. Sin embargo, la propia documentación diferencia esta configuración de la forma de ejecución actual del proyecto.

### Evaluación

Mayormente verificado.

### Recomendación

Mantener una relación explícita entre cada tecnología, su dependencia o configuración y el archivo donde se utiliza. También sería conveniente indicar cuáles tecnologías corresponden a la arquitectura actual y cuáles pertenecen a configuraciones anteriores.

---

# 6. ¿El diagrama comunica una decisión o solo representa la estructura?

El diagrama comunica adecuadamente la estructura general del sistema, mostrando los principales componentes y sus relaciones.

Sin embargo, la representación arquitectónica se concentra principalmente en indicar qué componentes existen y cómo se relacionan. Las razones que justifican algunas decisiones arquitectónicas no están suficientemente expresadas dentro del propio diagrama.

Por ejemplo, se identifica Flask, PostgreSQL, Docker y S3, pero no se evidencia directamente en el diagrama qué necesidad o atributo de calidad llevó a seleccionar cada tecnología.

La documentación complementaria explica parte de estas decisiones, especialmente en relación con el cambio entre el despliegue histórico y el uso actual de Docker.

### Evaluación

Cumplimiento parcial.

### Recomendación

Relacionar las decisiones arquitectónicas más importantes con su justificación. Cuando una decisión tenga impacto importante sobre la arquitectura, podría documentarse mediante un ADR.

---

# 7. Diferenciación entre hechos verificados y supuestos

Se identifican varios elementos que pueden comprobarse directamente en el repositorio.

Entre ellos se encuentran:

- Flask.
- PostgreSQL.
- SQLAlchemy.
- AWS S3.
- Docker.
- GitHub Actions.

Estos elementos cuentan con evidencia en código, dependencias o archivos de configuración.

En cambio, la aplicación móvil y las integraciones con MapBox API y Gemini API no presentan el mismo nivel de evidencia dentro del repositorio revisado.

Por lo tanto, se recomienda diferenciar claramente entre información verificada y elementos que están documentados pero que no pueden comprobarse directamente desde el repositorio analizado.

### Evaluación

Cumplimiento parcial.

### Recomendación

Incorporar una clasificación como:

- Verificado.
- Documentado pero no verificable en este repositorio.
- Histórico.
- Supuesto.
- Pendiente de implementación.

---

# 8. Tabla consolidada de hallazgos

| Elemento revisado | Hallazgo | Recomendación |
|---|---|---|
| App Móvil | Está representada como contenedor, pero no puede verificarse directamente en el repositorio revisado | Referenciar el repositorio de la aplicación móvil o indicar que es un componente externo |
| Backend Flask | Puede verificarse mediante el código de la aplicación y sus dependencias | Mantener la referencia directa hacia el código |
| PostgreSQL | Puede verificarse mediante dependencias, configuración y Docker Compose | Mantener la trazabilidad hacia la configuración de PostgreSQL |
| SQLAlchemy | Está declarado y utilizado en el backend | Relacionar la tecnología con los archivos donde se utiliza |
| AWS S3 | Está respaldado por `boto3` y por el código que utiliza el cliente S3 | Mantener la referencia al código correspondiente |
| Docker | Se puede verificar mediante `dockerfile` y `docker-compose.yml` | Diferenciar su utilización actual de configuraciones anteriores |
| Gemini API | Está declarada en la arquitectura, pero no se puede verificar directamente mediante las dependencias revisadas | Indicar dónde se implementa o clasificarla como integración no verificable |
| MapBox API | Está declarada en la arquitectura, pero no se puede verificar directamente mediante las dependencias revisadas | Indicar dónde se implementa o clasificarla como integración no verificable |
| GitHub Actions | Existe un workflow, pero la documentación lo relaciona con una configuración histórica de despliegue | Identificar claramente su estado actual |
| Diagrama C4 | Comunica correctamente la estructura general | Complementarlo con decisiones y justificaciones arquitectónicas |
| Evidencia arquitectónica | Algunos elementos están directamente verificados y otros no | Clasificar cada afirmación según su nivel de evidencia |

---

# 9. Conclusión

La arquitectura documentada de UrbanFix presenta una estructura general clara y existe una correspondencia importante entre varias de las tecnologías declaradas y los elementos disponibles en el repositorio.

El principal aspecto de mejora identificado corresponde a la trazabilidad de los elementos que no pueden comprobarse directamente desde el repositorio, particularmente la aplicación móvil y las integraciones externas con MapBox y Gemini.

También se recomienda diferenciar con mayor claridad la arquitectura actualmente utilizada de las configuraciones históricas de despliegue.

En términos generales, la documentación proporciona una buena base para comprender la solución, pero puede fortalecerse mediante referencias directas al código, clasificación de la evidencia y documentación explícita de las decisiones arquitectónicas.
