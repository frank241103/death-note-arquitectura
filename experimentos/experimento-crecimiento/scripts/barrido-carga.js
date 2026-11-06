// EXPERIMENTO DE CRECIMIENTO EC-01 — Barrido de carga sobre GET /death
//
// Entregable de la semana 11: "experimento de crecimiento con carga aumentada".
//
// Qué responde: ¿cómo escala la latencia cuando crece el número de usuarios
// concurrentes? La línea base (ESC-01) midió UN punto de carga. Esto mide
// CUATRO, para distinguir una curva lineal de una rodilla.
//
// Hipótesis prerregistrada (antes de ejecutar):
//   H1. La latencia p95 crece de forma MÁS QUE LINEAL con el número de VUs.
//   H2. Existe una rodilla: un punto a partir del cual añadir usuarios
//       degrada la latencia de forma desproporcionada.
//
// Criterio de decisión, fijado antes de medir:
//   - Si p95(50 VUs) / p95(5 VUs) > 10  -> crecimiento MÁS QUE LINEAL  -> H1 validada
//   - Si la razón está entre 5 y 10     -> crecimiento APROXIMADAMENTE LINEAL
//   - Si la razón es < 5                -> el sistema absorbe la carga -> H1 refutada
//   (el factor de carga entre 5 y 50 VUs es 10x; de ahí los cortes)
//
// Un resultado que refute H1 se reporta igual. No se ajusta el criterio.
//
// Requisito: backend corriendo y base sembrada.
//   cd back && go run main.go
//
// Uso (desde experimentos/experimento-crecimiento):
//   k6 run scripts/barrido-carga.js --summary-export=resultados/ec-01-barrido.json

import http from 'k6/http';
import { check } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import exec from 'k6/execution';

const BASE = 'http://localhost:8000';

// Una métrica por escalón, para poder comparar sin mezclar.
const p95_05 = new Trend('latencia_05_vus', true);
const p95_10 = new Trend('latencia_10_vus', true);
const p95_25 = new Trend('latencia_25_vus', true);
const p95_50 = new Trend('latencia_50_vus', true);
const bytesRecibidos = new Counter('bytes_respuesta');

export const options = {
  // Los escalones corren EN SERIE (startTime escalonado), nunca a la vez:
  // si se solaparan, cada uno contaminaría al siguiente.
  scenarios: {
    carga_05: { executor: 'constant-vus', vus: 5,  duration: '30s', startTime: '0s',   tags: { escalon: '05' } },
    carga_10: { executor: 'constant-vus', vus: 10, duration: '30s', startTime: '40s',  tags: { escalon: '10' } },
    carga_25: { executor: 'constant-vus', vus: 25, duration: '30s', startTime: '80s',  tags: { escalon: '25' } },
    carga_50: { executor: 'constant-vus', vus: 50, duration: '30s', startTime: '120s', tags: { escalon: '50' } },
  },
  thresholds: {
    // Umbral informativo: se espera que los escalones altos lo crucen.
    // Que lo crucen ES el resultado, no un fallo del experimento.
    'http_req_failed': ['rate<0.05'],
    'checks': ['rate>0.95'],
  },
};

export function setup() {
  const res = http.get(`${BASE}/death`);
  if (res.status !== 200) {
    throw new Error(`setup: GET /death devolvio ${res.status}. Backend caido o base vacia.`);
  }
  let n = 0;
  try {
    const cuerpo = res.json();
    const lista = Array.isArray(cuerpo) ? cuerpo : (cuerpo.data || []);
    n = lista.length;
  } catch (e) { /* el conteo es informativo */ }

  console.log('==== EC-01: barrido de carga sobre GET /death ====');
  console.log(`Registros en base: ${n}`);
  console.log(`Tamano de respuesta: ${(res.body.length / 1024).toFixed(1)} KB`);
  console.log('Escalones: 5 -> 10 -> 25 -> 50 VUs, 30s cada uno, en serie');
  console.log('=================================================');
  return { registros: n, bytes: res.body.length };
}

export default function () {
  const escalon = exec.scenario.name.replace('carga_', '');
  const res = http.get(`${BASE}/death`, { tags: { escalon } });

  check(res, {
    'status 200': (r) => r.status === 200,
    'respuesta no vacia': (r) => r.body && r.body.length > 0,
  });

  bytesRecibidos.add(res.body ? res.body.length : 0);

  // Enruta la duracion a la metrica de su escalon.
  const d = res.timings.duration;
  if (escalon === '05') p95_05.add(d);
  else if (escalon === '10') p95_10.add(d);
  else if (escalon === '25') p95_25.add(d);
  else if (escalon === '50') p95_50.add(d);
}

export function teardown(data) {
  console.log('==== Fin del barrido ====');
  console.log(`Registros al cerrar: ${data.registros}`);
  console.log('Compara latencia_05_vus vs latencia_50_vus en el resumen.');
  console.log('Razon p95(50)/p95(5) > 10  -> crecimiento mas que lineal');
  console.log('=========================');
}
