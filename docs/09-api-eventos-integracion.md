# Integración de API, Eventos y Subdominios

## 1. Mapeo de Subdominios y Bounded Contexts

| Subdominio | Tipo | Bounded Context | Responsabilidad Principal |
|---|---|---|---|
| **Gestión de la Death Note** | Core Domain | `KillManagement` | Registro de ejecuciones, validación de reglas de tiempo/causa de muerte. |
| **Identidad y Reglas** | Core Domain | `RulesEngine` | Validación estricta de las reglas del cuaderno. |
| **Notificaciones y Auditoría** | Supporting | `AuditLog` | Registro histórico de eventos y emisión de alertas asíncronas. |
| **Almacenamiento Estático** | Generic | `MediaStore` | Servidor de archivos multimedia (imágenes, reglas en PDF). |
