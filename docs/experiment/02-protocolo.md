# 02 - Protocolo de Ejecución del Experimento


## 1. Objetivo

Este protocolo permite que una persona pueda reproducir la medición del escenario ESC-01 sin requerir información adicional del equipo.


## 2. Requisitos previos

Para ejecutar la prueba se requiere:

- Git instalado.
- Go instalado.
- k6 versión 2.2.0.
- Repositorio descargado.
- Sistema operativo Windows.


## 3. Descarga del proyecto

Clonar el repositorio:

git clone https://github.com/frank241103/death-note-arquitectura.git


Ingresar al proyecto:

cd death-note-arquitectura


## 4. Configuración del backend

Ingresar a la carpeta:

cd back


Ejecutar:

go run main.go


El sistema debe quedar disponible en:

http://localhost:8000


## 5. Preparación de datos

La prueba utiliza una base de datos SQLite con 3302 registros.

Los datos se generan mediante:

experimentos/medicion-escenario-01/scripts/sembrar-datos.cmd


## 6. Configuración del experimento

El escenario utiliza:

- 50 usuarios virtuales.
- Duración de 60 segundos.
- Sleep entre peticiones de 1 segundo.
- Umbral p95 menor a 500 ms.


## 7. Ejecución de la prueba

Ingresar:

cd experimentos/medicion-escenario-01


Ejecutar:

k6 run scripts/baseline.js


## 8. Análisis del resultado

La métrica evaluada corresponde a:

metrics.http_req_duration.values.p(95)


Posteriormente se compara contra el umbral definido.


## 9. Corridas realizadas

La primera corrida fue descartada debido a que correspondía al calentamiento inicial del sistema.

Las corridas válidas fueron:

- Corrida 2.
- Corrida 3.


## 10. Condiciones que invalidan la medición

El resultado pierde validez si:

- Cambia el motor de base de datos.
- Cambia la cantidad de registros.
- No se registra el commit evaluado.
- No se registra la máquina utilizada.
- Se cambia la configuración del sistema.
- Se ejecuta con una versión diferente de k6 sin documentarlo.
