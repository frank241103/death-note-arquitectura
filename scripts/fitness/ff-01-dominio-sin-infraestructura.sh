#!/usr/bin/env bash
#
# FF-01 — El dominio no depende de infraestructura
#
# Decisión arquitectónica que la origina: ADR-005 (arquitectura hexagonal).
# Contrato completo: docs/15-fitness-function-01.md
#
# Regla: ningún paquete del dominio (back/api, back/models) puede depender,
# ni directa ni transitivamente, de:
#   (a) cualquier módulo de terceros, o
#   (b) los paquetes de infraestructura de la biblioteca estándar listados
#       en INFRA_STD.
#
# Lo único permitido fuera de la biblioteca estándar es el propio módulo
# backend-avanzada/...
#
# Uso:
#   ./ff-01-dominio-sin-infraestructura.sh                  # comprueba la regla
#   ./ff-01-dominio-sin-infraestructura.sh --prueba-negativa  # comprueba que la regla sabe fallar
#
# Salida: 0 = cumple · 1 = violación detectada · 2 = error de ejecución

set -uo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACK="$RAIZ/back"

# Paquetes que forman el dominio.
PAQUETES_DOMINIO=("./api" "./models")

# Paquetes de la biblioteca estándar que cuentan como infraestructura.
INFRA_STD=(
  "net/http"
  "database/sql"
  "os"
  "net"
)

PREFIJO_PROPIO="backend-avanzada/"

rojo()  { printf '\033[31m%s\033[0m\n' "$*"; }
verde() { printf '\033[32m%s\033[0m\n' "$*"; }

if ! command -v go >/dev/null 2>&1; then
  rojo "ERROR: go no está disponible en el PATH."
  exit 2
fi

cd "$BACK" || { rojo "ERROR: no existe $BACK"; exit 2; }

# ---------------------------------------------------------------------------
# Recolecta las dependencias transitivas del dominio.
# ---------------------------------------------------------------------------
recolectar_dependencias() {
  # -deps  = incluye dependencias transitivas
  # .Standard = true cuando el paquete es de la biblioteca estándar
  go list -deps -f '{{if .Standard}}STD {{.ImportPath}}{{else}}EXT {{.ImportPath}}{{end}}' \
    "${PAQUETES_DOMINIO[@]}" 2>/dev/null
}

evaluar() {
  local dependencias violaciones=0
  dependencias="$(recolectar_dependencias)"

  if [[ -z "$dependencias" ]]; then
    rojo "ERROR: 'go list' no devolvió dependencias. ¿Compila el módulo?"
    return 2
  fi

  echo "Paquetes del dominio evaluados: ${PAQUETES_DOMINIO[*]}"
  echo

  # (a) Dependencias de terceros
  while read -r tipo ruta; do
    [[ "$tipo" == "EXT" ]] || continue
    [[ "$ruta" == "$PREFIJO_PROPIO"* ]] && continue
    rojo "  VIOLACIÓN (terceros): el dominio depende de '$ruta'"
    violaciones=$((violaciones + 1))
  done <<< "$dependencias"

  # (b) Infraestructura de la biblioteca estándar
  local infra
  for infra in "${INFRA_STD[@]}"; do
    if grep -qx "STD $infra" <<< "$dependencias"; then
      rojo "  VIOLACIÓN (infraestructura estándar): el dominio depende de '$infra'"
      violaciones=$((violaciones + 1))
    fi
  done

  if [[ $violaciones -eq 0 ]]; then
    verde "FF-01 CUMPLE: el dominio no depende de infraestructura."
    echo
    echo "Dependencias externas encontradas (todas del propio módulo):"
    grep '^EXT ' <<< "$dependencias" | sed 's/^EXT /  - /'
    return 0
  fi

  echo
  rojo "FF-01 FALLA: $violaciones violación(es)."
  echo
  echo "Qué significa: un paquete del dominio importó infraestructura."
  echo "Eso rompe la decisión registrada en ADR-005 (arquitectura hexagonal):"
  echo "la infraestructura debe entrar por un adaptador, no por un import"
  echo "directo del dominio."
  return 1
}

# ---------------------------------------------------------------------------
# Prueba negativa: inyecta una violación temporal y verifica que se detecta.
# ---------------------------------------------------------------------------
prueba_negativa() {
  local archivo="$BACK/models/ff01_prueba_negativa.go"

  echo "=== PRUEBA NEGATIVA FF-01 ==="
  echo "Inyectando una violación deliberada en models/ ..."
  echo

  cat > "$archivo" <<'GO'
//go:build ff01_prueba_negativa

package models

// Archivo temporal generado por la prueba negativa de FF-01.
// Importa infraestructura a propósito: la regla DEBE rechazarlo.
import _ "net/http"
GO

  # El build tag impide que el archivo entre en una compilación normal,
  # así que lo activamos solo para esta comprobación.
  local salida estado
  salida="$(go list -deps -tags ff01_prueba_negativa \
            -f '{{if .Standard}}STD {{.ImportPath}}{{else}}EXT {{.ImportPath}}{{end}}' \
            "${PAQUETES_DOMINIO[@]}" 2>/dev/null)"

  rm -f "$archivo"
  echo "Archivo temporal eliminado."
  echo

  if grep -qx "STD net/http" <<< "$salida"; then
    verde "PRUEBA NEGATIVA SUPERADA: la regla detecta la violación inyectada."
    estado=0
  else
    rojo "PRUEBA NEGATIVA FALLIDA: la regla NO detectó la violación."
    rojo "La fitness function no sirve: aprobaría código que viola el ADR-005."
    estado=1
  fi

  return $estado
}

# ---------------------------------------------------------------------------

case "${1:-}" in
  --prueba-negativa)
    prueba_negativa
    exit $?
    ;;
  "")
    evaluar
    exit $?
    ;;
  *)
    echo "Uso: $0 [--prueba-negativa]" >&2
    exit 2
    ;;
esac
