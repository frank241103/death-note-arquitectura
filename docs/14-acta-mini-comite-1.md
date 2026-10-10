# Acta del Mini-Comité de Arquitectura #1

* **Fecha:** 2026-10-09
* **Rol Asumido:** Oficial de Seguridad (Security Officer)
* **Equipo Revisado:** Grupo Evaluado (Repo revisado: `ejemplo-grupo-par`)

---

## 1. Rol Asumido
Se asume la perspectiva de **Seguridad (Security Officer)**, enfocando la revisión en la exposición de variables de entorno, gestión de accesos, políticas CORS y aislamiento de secretos.

## 2. Equipo Revisado
Revisión aplicada al proyecto del Grupo Evaluado.

## 3. Preguntas Formuladas

1. ¿Dónde se gestionan y almacenan las credenciales de base de datos en los entornos de desarrollo y producción?
2. ¿Qué mecanismo valida y restringe los accesos a los recursos estáticos servidos mediante el File Server?
3. ¿Cómo maneja la API las políticas CORS para evitar accesos cruzados no autorizados con credenciales explícitas?
4. ¿Qué medidas existen para evitar la fuga de información sensible dentro de los mensajes de error devueltos al cliente HTTP?
5. ¿De qué manera la arquitectura propuesta garantiza la validación e higienización de entradas antes de alcanzar la capa de persistencia?

## 4. Respuestas Recibidas
* El equipo confirmó que las credenciales se leen desde variables de entorno, comprometiéndose a retirar cualquier archivo `.env` del control de versiones.
* Reconocieron la falta de autenticación en el File Server y propusieron incorporar un middleware de autorización previo al despacho de archivos.
* Revisarán la configuración de cabeceras HTTP CORS para restringir los orígenes permitidos.

## 5. Veredicto Emitido por Este Comité
**Ajustada:** Se aprueba la propuesta condicionada a la implementación de mitigaciones de seguridad en el manejo de archivos estáticos y sanitización de variables de entorno antes del despliegue final.

## 6. Veredicto Recibido Sobre Nuestra Propuesta
El comité revisor de nuestro proyecto emitió un veredicto de **Confirmada**, sugiriendo mantener la refactorización a arquitectura hexagonal y formalizar el control de timeouts a nivel del servidor HTTP.
