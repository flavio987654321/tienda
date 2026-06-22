-- Limpieza puntual: borra TODOS los registros de auditoría de cuentas eliminadas
-- y todo el historial de acciones de admin (eran datos de prueba).
-- Ejecutar una sola vez en el SQL Editor de Supabase.
-- Esto NO borra usuarios reales — solo el historial de auditoría y acciones de admin.

DELETE FROM "DeletedAccountAudit";
DELETE FROM "AdminActionLog";
