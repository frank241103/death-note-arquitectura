package server

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"backend-avanzada/logger"
)

func servidorDePrueba() *Server {
	return &Server{logger: logger.NewLogger()}
}

// manejadorDestino simula el FileServer: si se ejecuta, el acceso se concedió.
func manejadorDestino(llamado *bool) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		*llamado = true
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("contenido del archivo"))
	})
}

// TestMediaAuthDesactivadoDejaPasar verifica que, con el control apagado, el
// comportamiento sea exactamente el de antes.
//
// Importa porque el riesgo aceptado RA-01 depende de esto: el sistema debe
// seguir operando sin autenticación mientras siga siendo local.
func TestMediaAuthDesactivadoDejaPasar(t *testing.T) {
	t.Setenv(envMediaAuthEnabled, "false")

	var llamado bool
	h := servidorDePrueba().autorizarMedia(manejadorDestino(&llamado))

	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/static/a.png", nil))

	if !llamado {
		t.Error("con el control desactivado el archivo debio entregarse")
	}
	if rec.Code != http.StatusOK {
		t.Errorf("codigo = %d; se esperaba 200", rec.Code)
	}
}

// TestMediaAuthActivadoRechazaSinToken cubre T-02 y T-03: sin credencial no se
// entrega nada.
func TestMediaAuthActivadoRechazaSinToken(t *testing.T) {
	t.Setenv(envMediaAuthEnabled, "true")
	t.Setenv(envMediaAuthToken, "token-secreto")

	var llamado bool
	h := servidorDePrueba().autorizarMedia(manejadorDestino(&llamado))

	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/static/a.png", nil))

	if llamado {
		t.Error("FUGA: se entrego el archivo sin token")
	}
	if rec.Code != http.StatusUnauthorized {
		t.Errorf("codigo = %d; se esperaba 401", rec.Code)
	}
	if rec.Header().Get("WWW-Authenticate") == "" {
		t.Error("falta la cabecera WWW-Authenticate en el 401")
	}
}

// TestMediaAuthAceptaTokenValido comprueba las dos vias admitidas.
func TestMediaAuthAceptaTokenValido(t *testing.T) {
	t.Setenv(envMediaAuthEnabled, "true")
	t.Setenv(envMediaAuthToken, "token-secreto")

	casos := []struct {
		nombre   string
		preparar func(*http.Request)
	}{
		{"cabecera Bearer", func(r *http.Request) {
			r.Header.Set("Authorization", "Bearer token-secreto")
		}},
		{"parametro de consulta", func(r *http.Request) {
			q := r.URL.Query()
			q.Set("token", "token-secreto")
			r.URL.RawQuery = q.Encode()
		}},
	}

	for _, c := range casos {
		t.Run(c.nombre, func(t *testing.T) {
			var llamado bool
			h := servidorDePrueba().autorizarMedia(manejadorDestino(&llamado))

			req := httptest.NewRequest(http.MethodGet, "/static/a.png", nil)
			c.preparar(req)

			rec := httptest.NewRecorder()
			h.ServeHTTP(rec, req)

			if !llamado {
				t.Errorf("con token valido el archivo debio entregarse (codigo %d)", rec.Code)
			}
		})
	}
}

// TestMediaAuthRechazaTokenIncorrecto evita que una comparacion laxa deje
// pasar un token parecido.
func TestMediaAuthRechazaTokenIncorrecto(t *testing.T) {
	t.Setenv(envMediaAuthEnabled, "true")
	t.Setenv(envMediaAuthToken, "token-secreto")

	for _, malo := range []string{"token-secret", "token-secretoo", "TOKEN-SECRETO", "", "Bearer"} {
		var llamado bool
		h := servidorDePrueba().autorizarMedia(manejadorDestino(&llamado))

		req := httptest.NewRequest(http.MethodGet, "/static/a.png", nil)
		req.Header.Set("Authorization", "Bearer "+malo)

		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)

		if llamado {
			t.Errorf("FUGA: el token invalido %q fue aceptado", malo)
		}
	}
}

// TestMediaAuthActivadoSinTokenConfiguradoFallaCerrado comprueba que una
// configuracion incompleta deniegue en lugar de dejar pasar.
//
// Es el error de configuracion mas probable: alguien activa el control y
// olvida definir el token. Fallar abierto ahi seria peor que no tener control.
func TestMediaAuthActivadoSinTokenConfiguradoFallaCerrado(t *testing.T) {
	t.Setenv(envMediaAuthEnabled, "true")
	t.Setenv(envMediaAuthToken, "")

	var llamado bool
	h := servidorDePrueba().autorizarMedia(manejadorDestino(&llamado))

	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/static/a.png", nil))

	if llamado {
		t.Error("FUGA: se entrego el archivo con el control activado y sin token configurado")
	}
	if rec.Code != http.StatusUnauthorized {
		t.Errorf("codigo = %d; se esperaba 401", rec.Code)
	}
}

// TestTokenDeLaPeticionPrefiereCabecera fija la precedencia entre las dos vias.
func TestTokenDeLaPeticionPrefiereCabecera(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/static/a.png?token=del-query", nil)
	req.Header.Set("Authorization", "Bearer de-la-cabecera")

	if got := tokenDeLaPeticion(req); got != "de-la-cabecera" {
		t.Errorf("tokenDeLaPeticion() = %q; la cabecera debe tener precedencia", got)
	}
}
