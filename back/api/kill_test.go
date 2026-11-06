package api

import (
	"encoding/json"
	"reflect"
	"strings"
	"testing"
)

// TestKillResponseDtoContratoJSON fija los nombres de campo que la API expone.
//
// Los consumidores del endpoint (el frontend, los scripts de k6, el evaluador)
// dependen de estos nombres exactos. Si alguien renombra un campo, esta prueba
// falla antes de que se rompa un cliente.
func TestKillResponseDtoContratoJSON(t *testing.T) {
	dto := KillResponseDto{
		ID:             7,
		FullName:       "Prueba",
		FaceImageURL:   "/static/a.png",
		CauseOfDeath:   "Causa",
		Details:        "Detalles",
		CreatedAt:      "2026-11-06T10:00:00Z",
		CauseWrittenAt: "2026-11-06T10:00:40Z",
		DeathTime:      "2026-11-06T10:01:00Z",
	}

	crudo, err := json.Marshal(dto)
	if err != nil {
		t.Fatalf("no se pudo serializar el DTO: %v", err)
	}

	var mapa map[string]interface{}
	if err := json.Unmarshal(crudo, &mapa); err != nil {
		t.Fatalf("la salida no es JSON valido: %v", err)
	}

	esperados := []string{
		"id", "fullName", "faceImageUrl", "causeOfDeath",
		"details", "createdAt", "causeWrittenAt", "deathTime",
	}

	for _, campo := range esperados {
		if _, ok := mapa[campo]; !ok {
			t.Errorf("falta el campo %q en el JSON emitido. Emitido: %s", campo, crudo)
		}
	}

	if len(mapa) != len(esperados) {
		t.Errorf("el JSON tiene %d campos y se esperaban %d: %s", len(mapa), len(esperados), crudo)
	}
}

// TestCamposOpcionalesSeOmiten verifica el comportamiento de `omitempty`.
//
// Un registro sin causa de muerte NO debe emitir `causeOfDeath: ""`: debe
// omitir la clave. Es la diferencia entre "no tiene causa" y "la causa es la
// cadena vacia".
func TestCamposOpcionalesSeOmiten(t *testing.T) {
	dto := KillResponseDto{
		ID:           1,
		FullName:     "Sin causa",
		FaceImageURL: "/static/a.png",
		CreatedAt:    "2026-11-06T10:00:00Z",
	}

	crudo, err := json.Marshal(dto)
	if err != nil {
		t.Fatalf("no se pudo serializar: %v", err)
	}

	omitibles := []string{"causeOfDeath", "details", "causeWrittenAt", "deathTime"}
	var mapa map[string]interface{}
	if err := json.Unmarshal(crudo, &mapa); err != nil {
		t.Fatalf("JSON invalido: %v", err)
	}

	for _, campo := range omitibles {
		if _, presente := mapa[campo]; presente {
			t.Errorf("el campo opcional %q no se omitio estando vacio: %s", campo, crudo)
		}
	}

	// Los obligatorios sí deben estar siempre.
	for _, campo := range []string{"id", "fullName", "faceImageUrl", "createdAt"} {
		if _, presente := mapa[campo]; !presente {
			t.Errorf("falta el campo obligatorio %q: %s", campo, crudo)
		}
	}
}

// TestInconsistenciaDeContratoMultipartVsJSON DOCUMENTA el fallo F-08.
//
// KillRequestDto declara etiquetas `json` para todos sus campos, lo que
// sugiere que la creacion acepta JSON. No es asi: `POST /death` exige
// `multipart/form-data` con un archivo `photo` obligatorio
// (back/server/kill_handlers.go), mientras que `PATCH /deathUpdate/{id}` si
// usa JSON.
//
// Esta prueba no corrige la inconsistencia: la deja anclada en el codigo para
// que no se pierda de vista. Ver docs/09-api-eventos-integracion.md §2.
func TestInconsistenciaDeContratoMultipartVsJSON(t *testing.T) {
	tipo := reflect.TypeOf(KillRequestDto{})

	conEtiquetaJSON := 0
	for i := 0; i < tipo.NumField(); i++ {
		if tipo.Field(i).Tag.Get("json") != "" {
			conEtiquetaJSON++
		}
	}

	if conEtiquetaJSON != tipo.NumField() {
		t.Errorf(
			"KillRequestDto tiene %d de %d campos con etiqueta json.\n"+
				"Si se quitaron a proposito, la inconsistencia F-08 pudo resolverse:\n"+
				"actualiza docs/16-matriz-fallos.md y docs/09-api-eventos-integracion.md.",
			conEtiquetaJSON, tipo.NumField())
	}

	// El campo que de verdad viaja como archivo ni siquiera esta en el DTO.
	if _, existe := tipo.FieldByName("Photo"); existe {
		t.Error("KillRequestDto ya declara Photo: el contrato pudo unificarse, revisa F-08")
	}
}

// TestErrorResponseContrato fija la forma de los errores que devuelve la API.
func TestErrorResponseContrato(t *testing.T) {
	e := ErrorResponse{
		Status:      400,
		Description: "Bad Request",
		Message:     "formato invalido",
	}

	crudo, err := json.Marshal(e)
	if err != nil {
		t.Fatalf("no se pudo serializar: %v", err)
	}

	for _, campo := range []string{`"status"`, `"description"`, `"message"`} {
		if !strings.Contains(string(crudo), campo) {
			t.Errorf("falta %s en la respuesta de error: %s", campo, crudo)
		}
	}
}
