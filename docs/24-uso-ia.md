# 24 — Declaración de uso de inteligencia artificial

**Fase:** IV · **Fecha:** 2026-11-06

> Este documento responde los ocho puntos que exige el sílabo. Amplía
> [`docs/13-critica-propuesta-ia.md`](./13-critica-propuesta-ia.md), que
> mantiene la crítica puntual a las sugerencias de la IA, y no lo reemplaza.

---

## 1. Herramientas utilizadas

| Herramienta | Dónde | Quién la usó |
|---|---|---|
| Asistente conversacional (Claude) | Navegador y terminal | Todo el equipo, en sesiones separadas |
| Complemento de IA integrado en VS Code | Editor | David |
| Asistente conversacional (ChatGPT) | Navegador | Consultas puntuales |

---

## 2. Para qué se utilizaron

| Uso | Alcance real |
|---|---|
| Redacción y estructura de documentos | Alto. Buena parte del dossier se redactó con asistencia |
| Auditoría inicial del código heredado | Alto, pero **el resultado hubo que filtrarlo** (§5) |
| Scripts de k6 y de las fitness functions | Alto. Verificados ejecutándolos |
| Explicación de conceptos (C4, ADR, tácticas, fitness functions) | Alto |
| Diagnóstico de errores de entorno | Alto |
| **Decidir la arquitectura** | **Ninguno.** La elección de estilo, la priorización de drivers y los riesgos aceptados los decidió el equipo |
| **Producir mediciones** | **Ninguno.** Todas las cifras salen de k6 ejecutado sobre la máquina del equipo |

---

## 3. Recomendaciones aceptadas

| # | Recomendación | Por qué se aceptó | Dónde quedó |
|---|---|---|---|
| A-1 | Prerregistrar los umbrales antes de medir | Impide ajustar el criterio al resultado | `docs/experiment/01-preregistro.md` |
| A-2 | Etiquetar afirmaciones como `[HECHO VERIFICADO]` / `[SUPUESTO]` / `[INFERENCIA]` / `[EVIDENCIA FALTANTE]` | Hace visible qué está respaldado | Todo el dossier |
| A-3 | Publicar los JSON crudos y un `SHA256SUMS` | Permite al evaluador recalcular | `medicion-escenario-01/resultados/` |
| A-4 | Declarar la corrida descartada en lugar de borrarla | Una corrida descartada sin declarar es un dato oculto | `02-protocolo.md` §9 |
| A-5 | Comparar `POST` contra `PATCH` para aislar el costo de escritura | Da una cota medible sin instrumentar el handler | `spike-01-integracion/` |
| A-6 | Añadir una prueba negativa a cada fitness function | Una regla que nunca falló puede no estar comprobando nada | `FF-01`, `FF-02` |
| A-7 | Reportar el spike aunque refutara la decisión | El enunciado lo evalúa igual o mejor | `ADR-007` |

---

## 4. Recomendaciones modificadas

| # | Lo propuesto | Lo que hizo el equipo | Motivo |
|---|---|---|---|
| M-1 | Una presentación de 5 diapositivas para el mini-comité | Se descartó | No es un entregable del enunciado. El acta (`docs/14`) cubre el comité |
| M-2 | Un documento C4 por integrante en `.docx` | Se rehízo como tres `.md` en `/docs` | El enunciado pedía exactamente tres archivos `.md` y prohibía un cuarto documento arbitrario |
| M-3 | Renumerar todos los documentos para calzar con el índice del sílabo | Tabla de equivalencias en el README | Renumerar toca ~20 archivos y sus referencias cruzadas. El riesgo de enlaces rotos superaba el beneficio |
| M-4 | Atribuir el 70,8 % del spike al costo de escribir el archivo | Se reformuló como **cota superior** | `POST` y `PATCH` difieren en más que el disco: multipart, `INSERT` vs `UPDATE`, 4× datos |

---

## 5. Recomendaciones rechazadas

| # | Lo propuesto | Por qué se rechazó | Cómo se detectó |
|---|---|---|---|
| R-1 | Un servicio de autenticación externo en el C1 | El código no tiene ninguna autenticación | Lectura de `router.go` |
| R-2 | Una capa de servicios entre handlers y repositorio | No existe: los handlers llaman directo al repositorio | Lectura de `kill_handlers.go` |
| R-3 | "14 issues" en la auditoría inicial | Solo 8 eran reproducibles con un comando | Intento de reproducir cada uno |
| R-4 | Hardware "Intel i7-10700K, 32 GB DDR4, k6 v0.49.0" | Nunca se consultó la máquina | `Get-CimInstance` → HP ProBook 440 G9, i7-1255U, 31,6 GB, k6 v2.2.0 |
| R-5 | Mediana de 1111,83 ms | La real es 1114,69 ms = (1615,73 + 613,66)/2 | Recálculo sobre los datos crudos |
| R-6 | Un documento de migración a C#/Angular de ~2500 líneas marcado "CONFIDENCIAL" | Fuera del alcance; venía de una consulta laboral no relacionada | Revisión de lo que el complemento había añadido |
| R-7 | Una tabla "síncrona vs asíncrona" en el spike, con p95 de 2410,50 ms y 45/112 req/s | **Ninguna de esas cifras existe en los JSON.** El 1730 ms que etiquetaba como asíncrono es el p95 de la operación **síncrona**. Y nunca se implementó nada asíncrono | Contraste contra `post-baseline.json` y `patch-probe.json` |

### Sobre R-7

Es el rechazo más importante del proyecto, por tres razones:

1. **Contaminó el único documento de evidencia del Módulo 5** durante dos
   semanas (commit `357e82b`, 2026-10-09 → corregido 2026-10-23).
2. **Se contradecía con el propio documento**, que dos secciones antes
   presentaba 1730,45 ms como el resultado síncrono.
3. **Entró al repositorio por un integrante que la dio por buena sin
   contrastarla**, no directamente por la herramienta.

Se retiró dejando constancia en `spike-01-integracion/README.md` §9, con la
tabla de qué se quitó y por qué. Borrarla en silencio habría sido incoherente
con `docs/13`, que critica exactamente este tipo de invención.

---

## 6. Supuestos incorrectos encontrados

| # | Supuesto de la IA | Realidad | Impacto |
|---|---|---|---|
| S-1 | El proyecto tiene una arquitectura en capas limpia | Los handlers acceden directo a la persistencia | Afectaba al C4 entero |
| S-2 | El promedio basta para describir la latencia | La mediana es 46 ms y el p95 1730 ms: 37,7× | Habría ocultado el hallazgo principal |
| S-3 | El backend escucha en el puerto 8080 | Escucha en **8000** | El primer `patch-probe.js` falló por esto |
| S-4 | La paginación corresponde al riesgo R-01 | `dossier/01` numera R-01 = contraseña en logs. El repositorio se contradice a sí mismo | Documentado en `docs/16` §4, sin resolver |
| S-5 | El CI fallaba por `npm ci` desincronizado | Fallaba por dos errores de TypeScript: `navigate` y `useEffect` declarados y no usados | El diagnóstico equivocado duró semanas |
| S-6 | La estructura de carpetas del repositorio era visible para quien audita | El README se quedó en el Módulo 3: 9 documentos y 3 ADR existían y no estaban en el índice | Una auditoría externa los dio por inexistentes |

> **S-3, S-5 y S-6 son errores de la propia asistencia que acompañó este
> trabajo**, no del complemento del editor. Se registran igual: el punto del
> ejercicio es qué se verificó, no quién se equivocó.

---

## 7. Cómo se verificaron los resultados

| Tipo de afirmación | Método de verificación |
|---|---|
| Estructura del código | Lectura directa del archivo, citando archivo y línea |
| Riesgos R-01 a R-08 | Reproducción con un comando o captura de pantalla |
| Cifras de latencia | Ejecución de k6 y publicación del JSON crudo |
| Datos de la máquina | `Get-CimInstance Win32_Processor` / `Win32_ComputerSystem` |
| Scripts de k6 | Ejecutados; los que fallaron se corrigieron antes de versionarse |
| Fitness functions | Ejecutadas **y** sometidas a su prueba negativa |
| Elementos del C4 | Contrastados contra el código: 12 verificados, 4 corregidos, 4 eliminados |
| Integridad de resultados | `SHA256SUMS.txt` |

**Regla que el equipo adoptó:** ninguna cifra entra a un documento si no se
puede señalar el archivo que la contiene. Esa regla es la que hizo caer R-4,
R-5 y R-7.

---

## 8. Decisión final del equipo

**La IA se usa para redactar, estructurar, explicar y generar scripts. No se
usa para decidir ni para producir evidencia.**

En concreto:

1. **Toda afirmación sobre el código se verifica leyendo el código.** Cuatro
   sugerencias cayeron por esta regla.
2. **Toda cifra proviene de una ejecución con su salida cruda publicada.**
   Tres cifras inventadas cayeron por esta regla.
3. **Las decisiones arquitectónicas son del equipo.** La IA aportó
   alternativas; la elección de estilo, la priorización de drivers, los
   riesgos aceptados y los veredictos de los ADR los tomó el grupo.
4. **Cuando se detecta contenido inventado ya versionado, se retira dejando
   constancia**, no en silencio.

### Lo que el equipo aprendió

La IA es útil para proponer estructura y vocabulario, y **no puede verificar**.
Rinde cuando el flujo es *proponer → ejecutar → contrastar → documentar*, y
falla cuando se salta el segundo paso: el 100 % de las invenciones detectadas
apareció en afirmaciones que nadie intentó reproducir antes de aceptarlas.

---

## 9. Trazabilidad

| Referencia | Dónde |
|---|---|
| Crítica puntual a las sugerencias | `docs/13-critica-propuesta-ia.md` |
| Corrección de la tabla inventada (R-7) | `experimentos/spike-01-integracion/README.md` §9 |
| Condiciones reales de medición | `experimentos/medicion-escenario-01/condiciones.md` |
| Inconsistencia de S-4 | `docs/16-matriz-fallos.md` §4 |
| Elementos del C4 corregidos y eliminados | `docs/07-c4-componentes.md` |
| Evidencia consolidada | `docs/23-evidencia-ejecutable.md` |
