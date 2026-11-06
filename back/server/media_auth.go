package server

import (
	"crypto/subtle"
	"net/http"
	"os"
	"strings"
)

// Control C-02 — Autorización en el acceso al almacén de imágenes.
//
// Decisión que implementa: ADR-008 (control de acceso al almacén de imágenes).
// Amenazas que atiende:    T-02 (descarga no autorizada) y T-03 (enumeración
//                          del directorio), ambas confirmadas por la prueba
//                          PS-01 del 2026-11-06.
//
// POR QUÉ ES OPCIONAL Y VIENE DESACTIVADO POR DEFECTO
//
// El riesgo aceptado RA-01 (docs/20-seguridad.md §7) dice que el sistema opera
// sin autenticación mientras siga siendo local y con datos ficticios. Activar
// la autorización por defecto rompería el frontend, que pide las imágenes sin
// credencial alguna.
//
// Por eso el control se instala pero no se impone: queda tras un interruptor.
// Eso permite dos cosas que antes no eran posibles:
//
//   1. Cumplir RA-01 sin renunciar a tener el control escrito y probado.
//   2. MEDIR el costo de la capa de seguridad sobre el p95, que es la medición
//      que ADR-005 §7 dejó anotada como pendiente: se corre el mismo escenario
//      con el interruptor apagado y encendido, y la diferencia es el costo.
//
// Variables de entorno:
//   MEDIA_AUTH_ENABLED=true   activa la validación (por defecto: false)
//   MEDIA_AUTH_TOKEN=<valor>  token que se exige cuando está activa
//
// El token se acepta como `Authorization: Bearer <token>` o como `?token=`.
// La comparación usa subtle.ConstantTimeCompare para no filtrar información
// por el tiempo de respuesta.

const (
	envMediaAuthEnabled = "MEDIA_AUTH_ENABLED"
	envMediaAuthToken   = "MEDIA_AUTH_TOKEN"
)

// mediaAuthConfig se resuelve UNA vez al arrancar, no por petición: leer el
// entorno en cada petición contaminaría la medición de costo.
type mediaAuthConfig struct {
	activo bool
	token  []byte
}

func cargarMediaAuth() mediaAuthConfig {
	activo := strings.EqualFold(os.Getenv(envMediaAuthEnabled), "true")
	return mediaAuthConfig{
		activo: activo,
		token:  []byte(os.Getenv(envMediaAuthToken)),
	}
}

// tokenDeLaPeticion extrae el token de la cabecera Authorization o del
// parámetro de consulta, en ese orden.
func tokenDeLaPeticion(r *http.Request) string {
	if cabecera := r.Header.Get("Authorization"); cabecera != "" {
		if despues, encontrado := strings.CutPrefix(cabecera, "Bearer "); encontrado {
			return strings.TrimSpace(despues)
		}
	}
	return r.URL.Query().Get("token")
}

// autorizarMedia envuelve el manejador de archivos estáticos.
//
// Con el control desactivado se limita a delegar: una comparación booleana,
// de modo que el coste residual es despreciable y la línea base sigue siendo
// comparable con las mediciones anteriores.
func (s *Server) autorizarMedia(siguiente http.Handler) http.Handler {
	cfg := cargarMediaAuth()

	if !cfg.activo {
		s.logger.Printf("C-02 media auth: DESACTIVADO (RA-01 vigente). " +
			"Active con MEDIA_AUTH_ENABLED=true para exigir token en /static/.")
		return siguiente
	}

	if len(cfg.token) == 0 {
		// Activado sin token configurado: se deniega todo en lugar de dejar
		// pasar. Fallar cerrado, no abierto.
		s.logger.Printf("C-02 media auth: ACTIVADO sin %s. Se denegara todo acceso a /static/.", envMediaAuthToken)
	} else {
		s.logger.Printf("C-02 media auth: ACTIVADO. /static/ exige token.")
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		recibido := []byte(tokenDeLaPeticion(r))

		valido := len(cfg.token) > 0 &&
			len(recibido) == len(cfg.token) &&
			subtle.ConstantTimeCompare(recibido, cfg.token) == 1

		if !valido {
			w.Header().Set("WWW-Authenticate", `Bearer realm="media"`)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			// Respuesta deliberadamente escueta: no revela si el recurso
			// existe, lo que cerraría tambien la via de enumeracion (T-03).
			_, _ = w.Write([]byte(`{"status":401,"description":"Unauthorized","message":"token requerido"}`))
			return
		}

		siguiente.ServeHTTP(w, r)
	})
}
