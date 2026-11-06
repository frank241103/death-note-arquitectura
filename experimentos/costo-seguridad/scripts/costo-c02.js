// COSTO DE LA CAPA DE SEGURIDAD — CS-01
//
// Mide el efecto del control C-02 (autorizacion en /static/) sobre el p95.
// Es la medicion que ADR-005 §7 dejo anotada como "no medida" y que el arco
// del curso exige registrar.
//
// DISEÑO DE LA COMPARACION
//
// El objetivo es aislar el costo de VALIDAR, no el de "tener o no un
// manejador". Por eso las dos corridas piden el mismo archivo y ambas lo
// obtienen:
//
//   Corrida A (MEDIA_AUTH_ENABLED=false) -> 200, sin validacion
//   Corrida B (MEDIA_AUTH_ENABLED=true)  -> 200, CON token valido
//
// Las dos llegan al FileServer y leen el mismo archivo del disco. La unica
// diferencia es la comparacion del token. Si en la corrida B se omitiera el
// token, se obtendria un 401 que no toca el disco: eso mediria otra cosa.
//
// Uso:
//   # Corrida A, con el control apagado
//   k6 run scripts/costo-c02.js -e ARCHIVO=seed.png \
//      --summary-export=resultados/cs-01-sin-control.json
//
//   # Corrida B, con el control encendido y token valido
//   k6 run scripts/costo-c02.js -e ARCHIVO=seed.png -e TOKEN=token-de-prueba \
//      --summary-export=resultados/cs-01-con-control.json

import http from 'k6/http';
import { check } from 'k6';

const BASE = 'http://localhost:8000';
const ARCHIVO = __ENV.ARCHIVO || 'seed.png';
const TOKEN = __ENV.TOKEN || '';

export const options = {
  scenarios: {
    acceso_media: {
      executor: 'constant-vus',
      vus: 10,
      duration: '30s',
    },
  },
  thresholds: {
    'http_req_failed': ['rate<0.01'],
    'checks': ['rate>0.99'],
  },
};

export function setup() {
  const params = TOKEN ? { headers: { Authorization: `Bearer ${TOKEN}` } } : {};
  const res = http.get(`${BASE}/static/${ARCHIVO}`, params);

  console.log('==== CS-01: costo del control C-02 ====');
  console.log(`Archivo probado: /static/${ARCHIVO}`);
  console.log(`Token enviado:   ${TOKEN ? 'si' : 'no'}`);
  console.log(`Codigo de prueba: ${res.status}`);
  console.log(`Tamano: ${res.body ? res.body.length : 0} bytes`);

  if (res.status === 404) {
    throw new Error(
      `El archivo /static/${ARCHIVO} no existe (404). Copialo a back/uploads/ ` +
      `antes de medir: la comparacion exige que ambas corridas lo entreguen.`
    );
  }
  if (res.status === 401) {
    throw new Error(
      'El servidor respondio 401. Si el control esta activo, pasa el token con ' +
      '-e TOKEN=<valor>; medir contra un 401 no compara el mismo trabajo.'
    );
  }
  if (res.status !== 200) {
    throw new Error(`Se esperaba 200 y se obtuvo ${res.status}.`);
  }

  console.log('Comprobacion previa correcta: ambas corridas entregaran el archivo.');
  console.log('=======================================');
  return { bytes: res.body.length };
}

export default function () {
  const params = TOKEN ? { headers: { Authorization: `Bearer ${TOKEN}` } } : {};
  const res = http.get(`${BASE}/static/${ARCHIVO}`, params);

  check(res, {
    'status 200': (r) => r.status === 200,
    'cuerpo no vacio': (r) => r.body && r.body.length > 0,
  });
}

export function teardown(data) {
  console.log(`==== Fin CS-01 · ${data.bytes} bytes por peticion ====`);
  console.log('Compara http_req_duration p(95) entre las dos corridas.');
  console.log('La diferencia es el costo de la validacion del token.');
}
