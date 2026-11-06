package models

import (
	"reflect"
	"testing"
	"time"
)

// TestFormatTimeNil fija el contrato de formatTime ante un puntero nulo.
//
// Importa porque CauseWrittenAt y DeathTime son punteros que pueden ser nil:
// un registro recién creado no tiene causa escrita. Si formatTime devolviera
// algo distinto de la cadena vacía, el DTO expondría una fecha inventada.
func TestFormatTimeNil(t *testing.T) {
	if got := formatTime(nil); got != "" {
		t.Errorf("formatTime(nil) = %q; se esperaba cadena vacia", got)
	}
}

// TestFormatTimeRFC3339 verifica que el formato de salida sea RFC3339.
func TestFormatTimeRFC3339(t *testing.T) {
	momento := time.Date(2026, 11, 6, 15, 30, 0, 0, time.UTC)

	got := formatTime(&momento)
	quiero := "2026-11-06T15:30:00Z"

	if got != quiero {
		t.Errorf("formatTime() = %q; se esperaba %q", got, quiero)
	}

	// Comprobación de ida y vuelta: lo emitido debe poder volver a leerse.
	if _, err := time.Parse(time.RFC3339, got); err != nil {
		t.Errorf("la salida %q no es RFC3339 valido: %v", got, err)
	}
}

// TestToKillResponseDtoMapeaTodosLosCampos comprueba que el mapeo de dominio a
// DTO no pierda ningún campo.
//
// Es la prueba que protege el contrato de la API: si alguien añade un campo a
// Kill y olvida mapearlo, el endpoint deja de devolverlo en silencio.
func TestToKillResponseDtoMapeaTodosLosCampos(t *testing.T) {
	creado := time.Date(2026, 11, 6, 10, 0, 0, 0, time.UTC)
	escrito := time.Date(2026, 11, 6, 10, 0, 40, 0, time.UTC)
	muerte := time.Date(2026, 11, 6, 10, 1, 0, 0, time.UTC)

	k := &Kill{
		ID:             42,
		FullName:       "Persona de prueba",
		FaceImageURL:   "/static/rostro.png",
		CauseOfDeath:   "Paro cardiaco",
		Details:        "Detalles de prueba",
		CreatedAt:      creado,
		CauseWrittenAt: &escrito,
		DeathTime:      &muerte,
	}

	dto := k.ToKillResponseDto()

	casos := []struct {
		campo  string
		got    interface{}
		quiero interface{}
	}{
		{"ID", dto.ID, uint(42)},
		{"FullName", dto.FullName, "Persona de prueba"},
		{"FaceImageURL", dto.FaceImageURL, "/static/rostro.png"},
		{"CauseOfDeath", dto.CauseOfDeath, "Paro cardiaco"},
		{"Details", dto.Details, "Detalles de prueba"},
		{"CreatedAt", dto.CreatedAt, "2026-11-06T10:00:00Z"},
		{"CauseWrittenAt", dto.CauseWrittenAt, "2026-11-06T10:00:40Z"},
		{"DeathTime", dto.DeathTime, "2026-11-06T10:01:00Z"},
	}

	for _, c := range casos {
		if c.got != c.quiero {
			t.Errorf("dto.%s = %v; se esperaba %v", c.campo, c.got, c.quiero)
		}
	}
}

// TestToKillResponseDtoConPunterosNulos cubre el caso del registro recién
// creado: existe, pero todavía no tiene causa de muerte ni hora.
func TestToKillResponseDtoConPunterosNulos(t *testing.T) {
	k := &Kill{
		ID:           1,
		FullName:     "Sin causa",
		FaceImageURL: "/static/x.png",
		CreatedAt:    time.Date(2026, 11, 6, 10, 0, 0, 0, time.UTC),
		// CauseWrittenAt y DeathTime quedan nil a proposito.
	}

	dto := k.ToKillResponseDto()

	if dto.CauseWrittenAt != "" {
		t.Errorf("CauseWrittenAt = %q; con puntero nil se esperaba cadena vacia", dto.CauseWrittenAt)
	}
	if dto.DeathTime != "" {
		t.Errorf("DeathTime = %q; con puntero nil se esperaba cadena vacia", dto.DeathTime)
	}
	if dto.CreatedAt == "" {
		t.Error("CreatedAt quedo vacio; CreatedAt no es puntero y siempre debe tener valor")
	}
}

// TestFullNameNoSePersiste DOCUMENTA el riesgo R-07, no lo corrige.
//
// El campo FullName lleva la etiqueta `gorm:"-"`, que indica a GORM que NO lo
// persista ni lo recupere. Consecuencia: un Kill leido de la base siempre
// tiene FullName vacio, aunque el DTO lo mapee correctamente.
//
// Esta prueba fija ese comportamiento para que quede visible. Si alguien
// quita el `gorm:"-"` para arreglar R-07, la prueba falla y obliga a
// actualizar la documentacion del riesgo en lugar de cerrarlo en silencio.
func TestFullNameNoSePersiste(t *testing.T) {
	campo, ok := reflect.TypeOf(Kill{}).FieldByName("FullName")
	if !ok {
		t.Fatal("el campo FullName no existe en Kill")
	}

	etiqueta := campo.Tag.Get("gorm")
	if etiqueta != "-" {
		t.Errorf(
			"Kill.FullName tiene gorm:%q, se esperaba \"-\".\n"+
				"Si esto cambio a proposito, R-07 (fullName no persistido) quedo resuelto:\n"+
				"actualiza dossier/01-contexto-sistema.md y docs/16-matriz-fallos.md.",
			etiqueta)
	}
}
