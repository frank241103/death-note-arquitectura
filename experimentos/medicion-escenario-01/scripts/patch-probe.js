// SPIKE-01 — Sonda de comparación: PATCH /deathUpdate/{id}
//
// Propósito: medir la latencia de una operación que NO escribe archivo en
// disco, para estimar por diferencia cuánto pesa la escritura de imagen
// dentro de POST /death.
//
// Se corre con la MISMA carga que seed-load.js (10 VUs, 300 iteraciones) para
// que la comparación sea válida: misma máquina, misma concurrencia, mismo
// número de peticiones.
//
// Uso:
//   k6 run scripts/patch-probe.js --summary-export=../spike-01-integracion/resultados/patch-probe.json

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

const BASE = 'http://localhost:8000';

const registrosActualizados = new Counter('registros_actualizados');

export const options = {
  scenarios: {
    actualizacion: {
      executor: 'shared-iterations',
      vus: 10,
      iterations: 300,
      maxDuration: '5m',
    },
  },
  thresholds: {
    'http_req_duration': ['p(95)<1000'],
    'http_req_failed': ['rate<0.01'],
    'checks': ['rate>0.99'],
    'registros_actualizados': ['count>295'],
  },
};

// setup() corre una sola vez antes de la prueba: trae los IDs existentes para
// que los VUs no tengan que consultarlos (eso contaminaría la medición).
export function setup() {
  const res = http.get(`${BASE}/death`);
  if (res.status !== 200) {
    throw new Error(
      `setup falló: GET /death devolvió ${res.status}. ` +
      `¿Está el backend arriba y la base sembrada?`
    );
  }

  let ids = [];
  try {
    const cuerpo = res.json();
    const lista = Array.isArray(cuerpo) ? cuerpo : (cuerpo.data || []);
    ids = lista.map((r) => r.id || r.ID).filter((id) => id !== undefined);
  } catch (e) {
    throw new Error(`setup no pudo interpretar la respuesta de GET /death: ${e}`);
  }

  if (ids.length === 0) {
    throw new Error(
      'setup: la base está vacía. Corre primero seed-load.js para sembrar registros.'
    );
  }

  console.log(`setup: ${ids.length} registros disponibles para actualizar`);
  return { ids };
}

const CAUSAS = [
  'Paro cardiaco',
  'Accidente de transito',
  'Caida desde altura',
  'Ahogamiento',
];

export default function (data) {
  // Cada VU toma un ID distinto rotando sobre la lista.
  const indice = (__VU * 1000 + __ITER) % data.ids.length;
  const id = data.ids[indice];

  const payload = JSON.stringify({
    causeOfDeath: CAUSAS[__ITER % CAUSAS.length],
    details: `Actualizado por spike-01 (VU ${__VU}, iter ${__ITER})`,
  });

  const res = http.patch(`${BASE}/deathUpdate/${id}`, payload, {
    headers: { 'Content-Type': 'application/json' },
    tags: { operacion: 'patch_update' },
  });

  const ok = check(res, {
    'PATCH devuelve 200': (r) => r.status === 200,
    'respuesta no vacia': (r) => r.body && r.body.length > 0,
  });

  if (ok) {
    registrosActualizados.add(1);
  }

  // Mismo think time que seed-load.js, para que la comparación sea pareja.
  sleep(1);
}

export function teardown(data) {
  console.log(`teardown: se trabajó sobre ${data.ids.length} IDs`);
}
