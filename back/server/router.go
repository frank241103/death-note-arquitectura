package server

import (
	"net/http"

	"github.com/gorilla/mux"
)

func (s *Server) router() http.Handler {
	router := mux.NewRouter()
	router.Use(s.logger.RequestLogger)
	router.HandleFunc("/death", s.HandleKills).Methods(http.MethodGet, http.MethodPost)
	router.HandleFunc("/death/{id}", s.HandleKillsWithId).Methods(http.MethodGet)
	router.HandleFunc("/deathUpdate/{id}", s.handleUpdate).Methods(http.MethodPatch)
	// Control C-02 (ADR-008): el acceso a /static/ pasa por autorizacion.
	// Desactivado por defecto segun el riesgo aceptado RA-01; se activa con
	// MEDIA_AUTH_ENABLED=true. Ver server/media_auth.go.
	router.PathPrefix("/static/").Handler(
		s.autorizarMedia(http.StripPrefix("/static/", http.FileServer(http.Dir("uploads/")))))
	return router
}
