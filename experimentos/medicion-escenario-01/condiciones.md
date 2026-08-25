# Condiciones de Ejecución - Escenario 01

**Documento:** Parámetros y contexto de medición ESC-01  
**Escenario:** GET /death baseline  
**Status:** PENDIENTE de completar antes de ejecutar  

---

## 1. Identificación de la Ejecución

### 1.1 Fecha y Hora

| Campo | Valor |
|-------|-------|
| **Fecha de ejecución** | PENDIENTE (YYYY-MM-DD) |
| **Hora de inicio** | PENDIENTE (HH:MM:SS UTC) |
| **Zona horaria** | PENDIENTE (UTC, Local, etc) |
| **Duración total** | PENDIENTE (mm:ss) |

### 1.2 Identificación del Código

| Campo | Valor |
|-------|-------|
| **Rama Git** | PENDIENTE (main, develop, etc) |
| **Commit medido** | PENDIENTE (hash completo) |
| **Versión de Go** | PENDIENTE (go version) |
| **Versión de k6** | PENDIENTE (k6 --version) |

### 1.3 Responsable

| Campo | Valor |
|-------|-------|
| **Ejecutado por** | PENDIENTE (nombre/email) |
| **Máquina** | PENDIENTE (hostname) |
| **SO** | PENDIENTE (Windows/Linux/macOS) |

---

## 2. Ambiente de Ejecución

### 2.1 Hardware

| Componente | Valor | Notas |
|-----------|-------|-------|
| **CPU** | PENDIENTE | Marca, modelo, núcleos |
| **RAM Total** | PENDIENTE | GB |
| **RAM Disponible** | PENDIENTE | GB (en momento de medición) |
| **Disco** | PENDIENTE | Tipo (SSD/HDD), espacio libre |
| **Red** | PENDIENTE | Ethernet / WiFi, velocidad |

### 2.2 Software

| Componente | Versión | Instalación |
|-----------|---------|------------|
| **SO** | PENDIENTE | |
| **Go** | PENDIENTE | |
| **Node.js** | PENDIENTE | (si aplica) |
| **k6** | PENDIENTE | |
| **Docker** | PENDIENTE | (si usa Docker) |

### 2.3 Configuración del Servidor Backend

| Parámetro | Valor |
|-----------|-------|
| **URL** | http://localhost:8000 |
| **Protocolo** | HTTP / HTTPS |
| **Ruta** | /death |
| **Método HTTP** | GET |

---

## 3. Configuración de Base de Datos

### 3.1 Motor de BD

| Campo | Valor |
|-------|-------|
| **Motor** | PENDIENTE (SQLite / PostgreSQL / Otro) |
| **Archivo/Host** | PENDIENTE |
| **Puerto** | PENDIENTE |
| **Versión** | PENDIENTE |

### 3.2 Datos de Prueba

| Campo | Valor |
|-------|-------|
| **Número de registros en tabla `kills`** | **1** (al momento de análisis) |
| **Semilla (seed)** | PENDIENTE (qué registros usar) |
| **Tamaño promedio registro** | PENDIENTE (bytes) |
| **Script de limpieza pre-medición** | PENDIENTE (ubicación) |
| **Script de restauración post-medición** | PENDIENTE (ubicación) |

### 3.3 Estado de BD Pre-medición

- [ ] BD íntegra sin errores
- [ ] Índices presentes: PENDIENTE
- [ ] Locks en BD: [ ] Ninguno [ ] PENDIENTE
- [ ] Backups recientes: [ ] Sí [ ] No [ ] PENDIENTE
- [ ] Last vacuum/reindex: PENDIENTE

---

## 4. Configuración de k6

### 4.1 Parámetros de Carga

| Parámetro | Valor | Justificación |
|-----------|-------|--------------|
| **vus** (Virtual Users) | PENDIENTE | ¿Por qué N usuarios? |
| **duration** | PENDIENTE | ¿Por qué N segundos? |
| **ramp-up** | PENDIENTE (s) | Rampa de subida de usuarios |
| **ramp-down** | PENDIENTE (s) | Rampa de bajada de usuarios |

### 4.2 Validaciones

| Validación | Habilitada |
|-----------|-----------|
| HTTP Status = 200 | ✓ Sí |
| Body no vacío | ✓ Sí |
| Latencia < umbral | [ ] Sí PENDIENTE |

### 4.3 Threshold Prerregistrado

| Métrica | Umbral | Justificación |
|---------|--------|--------------|
| **p95 latencia (ms)** | PENDIENTE | ¿Por qué este valor? |
| **Error rate (%)** | PENDIENTE | ¿Tasa aceptable? |
| **Throughput mín (req/s)** | PENDIENTE | ¿Throughput aceptable? |

---

## 5. Configuración de Red

### 5.1 Conectividad

| Aspecto | Valor | Verificado |
|--------|-------|-----------|
| **Backend accesible** | localhost:8000 | [ ] Sí [ ] No |
| **Latencia de red** | PENDIENTE (ms) | [ ] Medida [ ] PENDIENTE |
| **Jitter** | PENDIENTE (ms) | [ ] Bajo [ ] Alto |
| **Packet loss** | PENDIENTE (%) | [ ] 0% [ ] PENDIENTE |
| **Ancho de banda** | PENDIENTE (Mbps) | [ ] Medido [ ] Asumido |

### 5.2 Aislamiento

- [ ] Máquina dedicada a medición (sin otras aplicaciones)
- [ ] Red aislada (sin otro tráfico)
- [ ] Firewall: PENDIENTE
- [ ] Proxy/LB intermedio: PENDIENTE

---

## 6. Validación Pre-medición

**Checklist de preparación:**

- [ ] Backend arrancado: `curl http://localhost:8000/death`
- [ ] Respuesta recibida (status 200)
- [ ] BD tiene datos: `PENDIENTE` (verificar registros)
- [ ] k6 instalado: `k6 --version`
- [ ] Script `baseline.js` presente y sintácticamente correcto
- [ ] Directorio `resultados/` existe y es escribible
- [ ] Directorio `logs/` existe (opcional)
- [ ] No hay procesos interfiriendo: PENDIENTE (lista)
- [ ] Sistema térmicamente estable: PENDIENTE (°C CPU)
- [ ] Memoria disponible > X GB: PENDIENTE

---

## 7. Configuración Reproducible

### 7.1 Archivo .env exacto

```env
DB_HOST=PENDIENTE
DB_USER=PENDIENTE
DB_PASSWORD=PENDIENTE
DB_NAME=PENDIENTE
DB_PORT=PENDIENTE
```

**Ubicación:** `back/.env`  
**Versionado:** No (pero copiar valores en este documento)

### 7.2 config.json exacto

```json
{
  "address": ":8000",
  "database": "PENDIENTE"
}
```

**Ubicación:** `back/config/config.json`

### 7.3 Script k6 usado

```
Ubicación: experimentos/medicion-escenario-01/scripts/baseline.js
Checksum (md5): PENDIENTE
Última línea vus: PENDIENTE
Última línea duration: PENDIENTE
```

---

## 8. Observaciones y Condiciones Especiales

### 8.1 Eventos Conocidos Durante Ejecución

| Hora | Evento | Impacto |
|------|--------|--------|
| PENDIENTE | PENDIENTE | PENDIENTE |
| | | |

### 8.2 Alertas del Sistema

- [ ] Sin alertas
- [ ] Alertas registradas: PENDIENTE

### 8.3 Anomalías

- [ ] Ninguna detectada
- [ ] Anomalías: PENDIENTE

---

## 9. Datos de Estado de BD al Momento de Medición

**Nota importante:** Al momento de redactar este documento de arquitectura (2026-08-24), la base de datos contenía **1 solo registro** de prueba.

| Tabla | Registros | Tamaño (aprox) | Última actualización |
|-------|-----------|----------------|-------------------|
| `kills` | 1 | PENDIENTE | PENDIENTE |
| `users` | PENDIENTE | PENDIENTE | PENDIENTE |
| Otra: PENDIENTE | | | |

### Implicaciones para medición

- [ ] Dataset es mínimo (no representa carga real)
- [ ] Resultados de latencia muy optimistas (caché)
- [ ] No mide comportamiento con N registros grandes
- [ ] PENDIENTE: Definir dataset realista para futuras ejecuciones

---

## 10. Resultados Esperados (Hipótesis)

Antes de ejecutar, el equipo especifica expectativas:

| Métrica | Esperado | Racional | Resultado |
|---------|----------|---------|-----------|
| **P50 latencia (ms)** | PENDIENTE | PENDIENTE | PENDIENTE |
| **P95 latencia (ms)** | PENDIENTE | PENDIENTE | PENDIENTE |
| **P99 latencia (ms)** | PENDIENTE | PENDIENTE | PENDIENTE |
| **Throughput (req/s)** | PENDIENTE | PENDIENTE | PENDIENTE |
| **Error rate (%)** | PENDIENTE | PENDIENTE | PENDIENTE |

---

## 11. Post-Ejecución

### 11.1 Archivo de Resultados Generado

| Campo | Valor |
|-------|-------|
| **Archivo JSON** | PENDIENTE (resultados/summary-YYYY-MM-DD.json) |
| **Tamaño archivo** | PENDIENTE (bytes) |
| **Checksum (md5)** | PENDIENTE |
| **Archivo log** | PENDIENTE (logs/execution-YYYY-MM-DD.log) |

### 11.2 Validación de Resultados

- [ ] Archivo creado correctamente
- [ ] JSON válido (parseable)
- [ ] Todas las métricas presentes
- [ ] Valores dentro de rango esperado
- [ ] Checks: 100% pasados / PENDIENTE

### 11.3 Desviaciones Observadas

| Métrica | Esperado | Observado | Varianza | Investigar |
|---------|----------|-----------|----------|-----------|
| PENDIENTE | PENDIENTE | PENDIENTE | PENDIENTE | ☐ Sí ☐ No |
| | | | | |

---

## 12. Firma de Conformidad

**Condiciones verificadas y completas antes de medición:**

| Item | Completado | Fecha | Responsable |
|------|-----------|-------|------------|
| Hardware validado | ☐ | PENDIENTE | PENDIENTE |
| Software validado | ☐ | PENDIENTE | PENDIENTE |
| BD preparada | ☐ | PENDIENTE | PENDIENTE |
| k6 validado | ☐ | PENDIENTE | PENDIENTE |
| Reproducibilidad documentada | ☐ | PENDIENTE | PENDIENTE |
| Medición ejecutada | ☐ | PENDIENTE | PENDIENTE |
| Resultados validados | ☐ | PENDIENTE | PENDIENTE |

---

**Documento creado:** 2026-08-24  
**Status:** PENDIENTE de completar con parámetros reales antes de ejecutar  
**Referencia:** `dossier/04-escenarios-calidad.md` sección 3 (Método de Medición)
