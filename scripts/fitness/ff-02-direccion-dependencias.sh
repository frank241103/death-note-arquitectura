#!/usr/bin/env bash
#
# FF-02 — La dirección de las dependencias entre módulos se respeta
#
# Decisión arquitectónica que la origina: ADR-006 (límites de módulos).
# Contrato completo: docs/19-fitness-function-02.md
# Mapa modular de referencia: docs/12-mapa-modular.md §2
#
# Qué protege, y en qué se diferencia de FF-01:
#   FF-01 protege ADR-005: que el DOMINIO no toque infraestructura externa.
#   FF-02 protege ADR-006: que la DIRECCIÓN del grafo interno sea
#   platform -> kill, y nunca kill -> platform.
#
# Matriz de ADR-006 (fila importa, columna es importada):
#
#               kill   media   platform
#   kill         —      No        No
#   media        No      —        No
#   platform     Sí     Sí         —
#
# Correspondencia módulo -> paquetes Go en el commit actual:
#   kill      = api, models, repository
#   platform  = server, config, logger
#   media     = aún no existe como paquete; está incrustado en server.
#               Sus reglas quedan declaradas pero NO se comprueban todavía
#               (ver §4 del contrato).
#
# Uso:
#   ./ff-02-direccion-dependencias.sh                    # comprueba la regla
#   ./ff-02-direccion-dependencias.sh --prueba-negativa  # comprueba que sabe fallar
#
# Salida: 0 = cumple · 1 = violación detectada · 2 = error de ejecución

set -uo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACK="$RAIZ/back"
MODULO="backend-avanzada"

# Paquetes que componen cada módulo.
PAQUETES_KILL=("api" "models" "repository")
PAQUETES_PLATFORM=("server" "config" "logger")

rojo()  { printf '\033[31m%s\033[0m\n' "$*"; }
verde() { printf '\033[32m%s\033[0m\n' "$*"; }

if ! command -v go >/dev/null 2>&1; then
  rojo "ERROR: go no está disponible en el PATH."
  exit 2
fi

cd "$BACK" || { rojo "ERROR: no existe $BACK"; exit 2; }

# ---------------------------------------------------------------------------
# Devuelve las dependencias transitivas internas de un paquete.
# ---------------------------------------------------------------------------
deps_internas_de() {
  local paquete="$1" tags="${2:-}"
  local args=(-deps -f '{{if not .Standard}}{{.ImportPath}}{{end}}')
  [[ -n "$tags" ]] && args+=(-tags "$tags")
  go list "${args[@]}" "./$paquete" 2>/dev/null \
    | grep "^$MODULO/" \
    | grep -v "^$MODULO/$paquete\$"
}

evaluar() {
  local tags="${1:-}" violaciones=0 paquete dependencia destino

  echo "Matriz verificada: ADR-006 §2 (docs/12-mapa-modular.md)"
  echo "Módulo kill     -> ${PAQUETES_KILL[*]}"
  echo "Módulo platform -> ${PAQUETES_PLATFORM[*]}"
  echo

  for paquete in "${PAQUETES_KILL[@]}"; do
    [[ -d "$paquete" ]] || continue

    while read -r dependencia; do
      [[ -n "$dependencia" ]] || continue
      destino="${dependencia#"$MODULO"/}"

      for prohibido in "${PAQUETES_PLATFORM[@]}"; do
        if [[ "$destino" == "$prohibido" || "$destino" == "$prohibido"/* ]]; then
          rojo "  VIOLACIÓN: '$paquete' (módulo kill) depende de '$destino' (módulo platform)"
          violaciones=$((violaciones + 1))
        fi
      done
    done <<< "$(deps_internas_de "$paquete" "$tags")"
  done

  if [[ $violaciones -eq 0 ]]; then
    verde "FF-02 CUMPLE: la dirección de dependencias respeta ADR-006."
    echo
    echo "Dependencias internas observadas en el módulo kill:"
    for paquete in "${PAQUETES_KILL[@]}"; do
      [[ -d "$paquete" ]] || continue
      local lista
      lista="$(deps_internas_de "$paquete" "$tags" | sed "s|^$MODULO/|  |" | tr '\n' ' ')"
      printf "  %-12s -> %s\n" "$paquete" "${lista:-(ninguna)}"
    done
    return 0
  fi

  echo
  rojo "FF-02 FALLA: $violaciones violación(es)."
  echo
  echo "Qué significa: un paquete del módulo 'kill' importó uno de 'platform'."
  echo "ADR-006 fija la dirección contraria: platform compone a kill, nunca"
  echo "al revés. Si kill necesita algo de platform, debe declararlo como un"
  echo "puerto en su propia frontera y recibir la implementación por inyección."
  return 1
}

# ---------------------------------------------------------------------------
# Prueba negativa: inyecta una violación temporal y verifica que se detecta.
# ---------------------------------------------------------------------------
prueba_negativa() {
  local archivo="$BACK/repository/ff02_prueba_negativa.go"

  echo "=== PRUEBA NEGATIVA FF-02 ==="
  echo "Inyectando una dependencia prohibida (repository -> config) ..."
  echo

  cat > "$archivo" <<GO
//go:build ff02_prueba_negativa

package repository

// Archivo temporal generado por la prueba negativa de FF-02.
// Importa un paquete del módulo 'platform' a propósito: la regla DEBE
// rechazarlo según la matriz del ADR-006.
import _ "$MODULO/config"
GO

  local salida
  salida="$(deps_internas_de "repository" "ff02_prueba_negativa")"

  rm -f "$archivo"
  echo "Archivo temporal eliminado."
  echo

  if grep -qx "$MODULO/config" <<< "$salida"; then
    verde "PRUEBA NEGATIVA SUPERADA: la regla detecta la violación inyectada."
    return 0
  fi

  rojo "PRUEBA NEGATIVA FALLIDA: la regla NO detectó la violación."
  rojo "FF-02 no sirve: aprobaría código que viola el ADR-006."
  return 1
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
