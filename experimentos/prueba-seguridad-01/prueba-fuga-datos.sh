#!/usr/bin/env bash
#
# PRUEBA DE SEGURIDAD PS-01 — Intento deliberado de fuga de datos
#
# Exigencia del sílabo: debe existir una prueba que intente provocar una fuga
# de datos y permita comprobar el comportamiento del sistema.
#
# Esta prueba NO explota una vulnerabilidad desconocida: ejercita riesgos ya
# documentados (R-06, R-01) para dejar constancia medida de su efecto.
#
# Requisito: el backend debe estar corriendo.
#   cd back && go run main.go      (escucha en :8000)
#
# Uso:
#   bash prueba-fuga-datos.sh              # usa http://localhost:8000
#   bash prueba-fuga-datos.sh http://host:puerto
#
# Salida: resultados/ps-01-resultados.txt  (y por pantalla)

set -uo pipefail

BASE="${1:-http://localhost:8000}"
AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SALIDA="$AQUI/resultados/ps-01-resultados.txt"
mkdir -p "$AQUI/resultados"

exec > >(tee "$SALIDA") 2>&1

echo "========================================================"
echo " PS-01 — Intento deliberado de fuga de datos"
echo " Fecha:   $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo " Destino: $BASE"
echo " Commit:  $(git -C "$AQUI/../.." rev-parse --short HEAD 2>/dev/null || echo 'no disponible')"
echo "========================================================"
echo

fallos=0

# --------------------------------------------------------------------------
# A-01 — Listado completo sin credenciales (riesgo R-01: sin paginación)
# --------------------------------------------------------------------------
echo "--- A-01: GET /death sin ninguna credencial ---"
codigo=$(curl -s -o /tmp/ps01_a01.body -w '%{http_code}' "$BASE/death")
bytes=$(wc -c < /tmp/ps01_a01.body | tr -d ' ')
registros=$(grep -o '"id"' /tmp/ps01_a01.body 2>/dev/null | wc -l | tr -d ' ')
echo "Código HTTP:        $codigo"
echo "Tamaño respuesta:   $bytes bytes"
echo "Registros expuestos: $registros"
if [[ "$codigo" == "200" ]]; then
  echo "RESULTADO: FUGA CONFIRMADA — el listado completo se entrega sin autenticación."
  fallos=$((fallos + 1))
else
  echo "RESULTADO: acceso denegado ($codigo)."
fi
echo

# --------------------------------------------------------------------------
# A-02 — Descubrir un archivo de imagen desde la respuesta anterior
# --------------------------------------------------------------------------
echo "--- A-02: extraer una ruta de imagen del listado ---"
ruta=$(grep -o '/static/[A-Za-z0-9._-]*' /tmp/ps01_a01.body 2>/dev/null | head -1)
if [[ -z "$ruta" ]]; then
  ruta=$(grep -o 'faceImageUrl":"[^"]*' /tmp/ps01_a01.body 2>/dev/null | head -1 | cut -d'"' -f3)
fi
echo "Ruta descubierta: ${ruta:-(ninguna)}"
echo

# --------------------------------------------------------------------------
# A-03 — Acceso directo al archivo sin credenciales (riesgo R-06)
# --------------------------------------------------------------------------
echo "--- A-03: GET al archivo estático sin credencial ---"
if [[ -n "$ruta" ]]; then
  url="$BASE${ruta#"$BASE"}"
  [[ "$ruta" == http* ]] && url="$ruta"
  codigo=$(curl -s -o /tmp/ps01_a03.body -w '%{http_code}' "$url")
  bytes=$(wc -c < /tmp/ps01_a03.body | tr -d ' ')
  tipo=$(file -b --mime-type /tmp/ps01_a03.body 2>/dev/null || echo desconocido)
  echo "URL probada:      $url"
  echo "Código HTTP:      $codigo"
  echo "Tamaño:           $bytes bytes"
  echo "Tipo de contenido: $tipo"
  if [[ "$codigo" == "200" && "$bytes" -gt 0 ]]; then
    echo "RESULTADO: FUGA CONFIRMADA — archivo entregado sin control de acceso (R-06)."
    fallos=$((fallos + 1))
  elif [[ "$codigo" == "404" ]]; then
    echo "RESULTADO: 404 — carpeta uploads/ ausente en este entorno (hallazgo F-05)."
    echo "            NO demuestra que exista control de acceso."
  else
    echo "RESULTADO: acceso denegado ($codigo)."
  fi
else
  echo "OMITIDA: no se descubrió ninguna ruta de imagen."
fi
echo

# --------------------------------------------------------------------------
# A-04 — Enumeración del directorio de archivos
# --------------------------------------------------------------------------
echo "--- A-04: GET /static/ (intento de listar el directorio) ---"
codigo=$(curl -s -o /tmp/ps01_a04.body -w '%{http_code}' "$BASE/static/")
echo "Código HTTP: $codigo"
if [[ "$codigo" == "200" ]] && grep -qi "<a href=" /tmp/ps01_a04.body; then
  echo "RESULTADO: FUGA CONFIRMADA — el servidor lista el contenido del directorio."
  fallos=$((fallos + 1))
else
  echo "RESULTADO: no se obtuvo un listado navegable ($codigo)."
fi
echo

# --------------------------------------------------------------------------
# A-05 — Recorrido de rutas (path traversal)
# --------------------------------------------------------------------------
echo "--- A-05: intento de path traversal en /static/ ---"
for intento in "../.env" "..%2f.env" "../../back/.env" "../test.db"; do
  codigo=$(curl -s -o /tmp/ps01_a05.body -w '%{http_code}' "$BASE/static/$intento")
  bytes=$(wc -c < /tmp/ps01_a05.body | tr -d ' ')
  printf "  %-22s -> HTTP %s (%s bytes)\n" "$intento" "$codigo" "$bytes"
  if [[ "$codigo" == "200" && "$bytes" -gt 0 ]]; then
    echo "  RESULTADO: FUGA CRÍTICA — se obtuvo un archivo fuera de uploads/."
    fallos=$((fallos + 1))
  fi
done
echo "RESULTADO: si todos devolvieron 404/400, http.FileServer está saneando la ruta."
echo

# --------------------------------------------------------------------------
# A-06 — CORS con credenciales desde un origen arbitrario (riesgo R-05)
# --------------------------------------------------------------------------
echo "--- A-06: petición cruzada con credenciales desde origen no autorizado ---"
cabeceras=$(curl -s -D - -o /dev/null \
  -H "Origin: https://atacante.example" \
  -H "Cookie: sesion=prueba" \
  "$BASE/death")
echo "$cabeceras" | grep -i "access-control-allow" || echo "  (sin cabeceras Access-Control-Allow-*)"
permite_origen=$(echo "$cabeceras" | grep -ic "access-control-allow-origin")
permite_cred=$(echo "$cabeceras" | grep -ic "access-control-allow-credentials: *true")
if [[ "$permite_origen" -gt 0 && "$permite_cred" -gt 0 ]]; then
  echo "RESULTADO: CONFIGURACIÓN PELIGROSA CONFIRMADA — se permite origen y credenciales (R-05)."
  fallos=$((fallos + 1))
else
  echo "RESULTADO: la combinación origen-comodín + credenciales no se reprodujo en esta respuesta."
fi
echo

# --------------------------------------------------------------------------
echo "========================================================"
echo " RESUMEN PS-01"
echo " Vectores que confirmaron exposición: $fallos"
echo
echo " Esta prueba documenta el comportamiento observado."
echo " No decide qué controles adoptar: eso es docs/20-seguridad.md."
echo " Resultados guardados en: $SALIDA"
echo "========================================================"

exit 0
