/**
 * seed-load.js — Escenario de escritura con k6
 *
 * Proposito: insertar registros en el sistema Death Note mediante POST /death,
 * con condiciones de carga explicitas y datos simulados deterministas.
 *
 * Este script NO mide la linea base de rendimiento (eso lo hace baseline.js
 * sobre GET /death). Aqui se ejerce la ruta de escritura, que atraviesa
 * ademas el contenedor "Almacen de archivos" del modelo C2.
 *
 * Trazabilidad C4:
 *   C1  Actor:        Usuario que registra
 *   C2  Contenedores: Backend API -> Base de datos (SQLite)
 *                     Backend API -> Almacen de archivos (uploads/)
 *   C3  Componentes:  Router -> Kill Handlers (handleCreateKill)
 *                     -> Kill Repository (Save) -> GORM
 *   C4  Despliegue:   k6, backend y SQLite en la misma maquina fisica
 *
 * Ejecucion:
 *   k6 run scripts/seed-load.js
 *   k6 run scripts/seed-load.js --summary-export=resultados/seed-run-1.json
 */

import http from 'k6/http';
import { check } from 'k6';
import { Counter, Trend } from 'k6/metrics';

// ---------------------------------------------------------------------------
// 1. CONDICIONES DE CARGA (prerregistradas)
// ---------------------------------------------------------------------------
// VUs: 10 usuarios virtuales concurrentes.
//      Se eligen menos que en la medicion de lectura (50) porque cada
//      insercion escribe un archivo en disco; 50 VUs saturarian el
//      sistema de archivos y la medicion dejaria de representar el API.
// Iteraciones: 300 en total, repartidas entre los VUs.
//      Volumen acotado y reproducible, suficiente para observar el
//      comportamiento sin inflar la base mas alla de lo declarado.
// Umbrales: definidos ANTES de ejecutar.

export const options = {
  scenarios: {
    insercion: {
      executor: 'shared-iterations',
      vus: 10,
      iterations: 300,
      maxDuration: '5m',
    },
  },
  thresholds: {
    'http_req_duration': ['p(95)<1000'],   // escritura: umbral mas laxo que lectura
    'http_req_failed':   ['rate<0.01'],
    'checks':            ['rate>0.99'],
    'registros_creados': ['count>295'],     // tolera hasta 5 fallos
  },
};

// ---------------------------------------------------------------------------
// 2. DATOS SIMULADOS
// ---------------------------------------------------------------------------
// Imagen: PNG de 1x1 pixel. Se usa la MISMA para todos los registros de forma
// deliberada: aisla la variable "tamano de archivo" para que la latencia
// medida refleje el procesamiento del API y no el ancho de banda.
// El archivo debe existir en la misma carpeta que este script.

const IMAGEN = open('./seed.png', 'b');

// Catalogos finitos para generar combinaciones deterministas y legibles.
const CAUSAS = [
  'ataque al corazon', 'accidente de transito', 'caida desde altura',
  'ahogamiento', 'causa no especificada',
];

const DETALLES = [
  'registro de carga automatizada',
  'insercion generada por k6',
  'dato sintetico de prueba',
];

const BASE_URL = 'http://localhost:8000';

// Metricas propias
const registrosCreados = new Counter('registros_creados');
const latenciaEscritura = new Trend('latencia_escritura_ms');

// ---------------------------------------------------------------------------
// 3. VERIFICACION PREVIA
// ---------------------------------------------------------------------------
export function setup() {
  console.log('==== Escenario de insercion: POST /death ====');
  console.log('VUs: 10 | Iteraciones: 300 | Umbral p95: 1000 ms');

  const ping = http.get(`${BASE_URL}/death`, { timeout: '5s' });
  if (ping.status !== 200) {
    throw new Error(`Backend no disponible: GET /death devolvio ${ping.status}`);
  }

  let conteoInicial = 0;
  try {
    conteoInicial = JSON.parse(ping.body).length;
  } catch (e) {
    conteoInicial = -1;
  }
  console.log(`Registros antes de sembrar: ${conteoInicial}`);
  console.log('=============================================\n');

  return { conteoInicial };
}

// ---------------------------------------------------------------------------
// 4. ITERACION
// ---------------------------------------------------------------------------
export default function () {
  // Identificador unico por VU e iteracion: garantiza que no haya colisiones
  // y que el dato sea rastreable hasta el ejecutor que lo genero.
  const id = `${__VU}-${__ITER}`;

  const payload = {
    fullName:     `Persona k6 ${id}`,
    causeOfDeath: CAUSAS[__ITER % CAUSAS.length],
    details:      `${DETALLES[__ITER % DETALLES.length]} (${id})`,
    photo:        http.file(IMAGEN, `seed-${id}.png`, 'image/png'),
  };

  const res = http.post(`${BASE_URL}/death`, payload, {
    tags: { name: 'CreateKill', escenario: 'insercion' },
  });

  latenciaEscritura.add(res.timings.duration);

  const ok = check(res, {
    'status 201 Created':   (r) => r.status === 201,
    'devuelve id':          (r) => { try { return JSON.parse(r.body).id > 0; } catch { return false; } },
    'persiste el nombre':   (r) => { try { return JSON.parse(r.body).fullName.includes('Persona k6'); } catch { return false; } },
    'devuelve faceImageUrl':(r) => { try { return String(JSON.parse(r.body).faceImageUrl).startsWith('/static/'); } catch { return false; } },
  });

  if (ok) registrosCreados.add(1);
}

// ---------------------------------------------------------------------------
// 5. VERIFICACION POSTERIOR
// ---------------------------------------------------------------------------
export function teardown(data) {
  const res = http.get(`${BASE_URL}/death`);
  let conteoFinal = -1;
  try {
    conteoFinal = JSON.parse(res.body).length;
  } catch (e) { /* ignorado */ }

  console.log('\n==== Resultado de la insercion ====');
  console.log(`Registros antes:    ${data.conteoInicial}`);
  console.log(`Registros despues:  ${conteoFinal}`);
  console.log(`Diferencia:         ${conteoFinal - data.conteoInicial}`);
  console.log(`Tamano respuesta:   ${(res.body.length / 1024).toFixed(1)} KB`);
  console.log('Registrar estos valores en condiciones.md');
  console.log('===================================\n');
}
