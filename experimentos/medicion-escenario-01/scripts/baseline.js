/**
 * k6 Script: Baseline ESC-01
 *
 * Propósito: Medir performance de GET /death
 *
 * Validaciones:
 *   - HTTP Status = 200
 *   - Response body no vacío
 *
 * Salida: resultados/summary-<timestamp>.json
 *
 * Referencia: dossier/04-escenarios-calidad.md sección 2 (ESC-01)
 *             experimentos/medicion-escenario-01/README.md
 *             experimentos/medicion-escenario-01/condiciones.md
 *
 * Estado: Parámetros PENDIENTE de justificar por equipo
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * Configuración de carga
 *
 * Valores prerregistrados en dossier/04-escenarios-calidad.md sección 3.2
 */
export const options = {
  // 50 usuarios virtuales concurrentes (prerregistrado en 04-escenarios-calidad.md)
  vus: 50,

  // 60 segundos de carga sostenida
  duration: '60s',

  thresholds: {
    // Umbral prerregistrado: p95 < 500 ms
    'http_req_duration': ['p(95)<500'],

    // Al menos 99% de los checks deben pasar
    'checks': ['rate>0.99'],

    // Menos de 1% de peticiones fallidas
    'http_req_failed': ['rate<0.01'],
  }
      
};

/**
 * Función principal de prueba
 * Se ejecuta para cada VU en cada iteración
 */
export default function () {
  // Endpoint bajo prueba
  const url = 'http://localhost:8000/death';

  // Hacer request GET
  const response = http.get(url, {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'k6/ESC-01-baseline'
    },
    tags: {
      name: 'GetDeaths',
      scenario: 'ESC-01'
    }
  });

  // Validación 1: Status HTTP debe ser 200
  const status200 = check(response, {
    'status is 200': (r) => r.status === 200,
  });

  // Validación 2: Body no debe estar vacío
  const bodyNotEmpty = check(response, {
    'body is not empty': (r) => r.body.length > 0,
  });

  // Validación 3: Response debe ser JSON válido (si aplica)
  let jsonValid = false;
  try {
    JSON.parse(response.body);
    jsonValid = check(response, {
      'response is valid JSON': (r) => {
        try {
          JSON.parse(r.body);
          return true;
        } catch {
          return false;
        }
      }
    });
  } catch (e) {
    // Si no es JSON, falla silenciosamente
    jsonValid = false;
  }

  // Validación 4: Si es array, debe contener al menos 1 elemento
  let arrayNotEmpty = false;
  try {
    const data = JSON.parse(response.body);
    arrayNotEmpty = check(response, {
      'array contains at least 1 item': (r) => {
        try {
          const parsed = JSON.parse(r.body);
          return Array.isArray(parsed) && parsed.length > 0;
        } catch {
          return false;
        }
      }
    });
  } catch (e) {
    arrayNotEmpty = false;
  }

  // Log de debugging (opcional, activa con -v)
  if (!status200 || !bodyNotEmpty) {
    console.error(
      `ESC-01 FAILED: status=${response.status}, bodyLen=${response.body.length}`
    );
  }

  // Pequeña pausa entre iteraciones (evita saturar)
  sleep(1);
}

/**
 * Setup: Se ejecuta una sola vez antes de todas las pruebas
 * Aquí se puede validar que el endpoint esté disponible
 */
export function setup() {
  console.log('==== ESC-01: Baseline GET /death ====');
  console.log(`Endpoint: http://localhost:8000/death`);
  console.log(`VUs: ${options.vus || 'PENDIENTE'}`);
  console.log(`Duration: ${options.duration || 'PENDIENTE'}`);

  // Intentar conectar
  const testResponse = http.get('http://localhost:8000/death', {
    timeout: '5s'
  });

  if (testResponse.status !== 200) {
    throw new Error(
      `Backend no disponible: GET /death retornó ${testResponse.status}`
    );
  }

  console.log('Backend: OK ✓');
  console.log('====================================\n');
}

/**
 * Teardown: Se ejecuta una sola vez después de todas las pruebas
 * Aquí se pueden hacer limpiezas
 */
export function teardown(data) {
  console.log('==== Teardown ESC-01 ====');
  console.log('Medición completada.');
  console.log('Resultados guardados en: resultados/summary-*.json');
  console.log('========================\n');
}

/**
 * Notas de implementación:
 *
 * 1. Para ejecutar localmente:
 *    cd experimentos/medicion-escenario-01
 *    k6 run scripts/baseline.js
 *
 * 2. Para exportar resultados a JSON:
 *    k6 run scripts/baseline.js --out json=resultados/summary-$(date +%Y-%m-%d).json
 *
 * 3. Para ver logging detallado:
 *    k6 run -v scripts/baseline.js
 *
 * 4. Para ver debugging de HTTP:
 *    k6 run --http-debug=full scripts/baseline.js
 *
 * 5. Documentar parámetros en: experimentos/medicion-escenario-01/condiciones.md
 *    Especialmente: vus, duration, threshold
 *
 * 6. Referencia de k6:
 *    https://k6.io/docs/
 *    https://k6.io/docs/using-k6/checks/
 *    https://k6.io/docs/using-k6/thresholds/
 */
