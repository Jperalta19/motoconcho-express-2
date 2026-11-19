# Duelo — fase 1

Dos pistas simultáneas. Los RPCs `duelo` y `viaje` son la única API de mutación. Los helpers no son públicos. No se emiten tokens de sesión por Realtime. Broadcast solo invalida la lectura: nunca concede victorias ni cambia saldos.

Aplicar la migración una sola vez, coordinada con el cliente nuevo. El endpoint antiguo guardar_progreso rechaza totales arbitrarios; clientes en caché deben recargar. `viaje` emite un plan de objetos y acredita únicamente tickets válidos, secuenciados, no repetidos y acotados por tiempo; no es un motor físico autoritativo ni una protección completa contra clientes modificados.

Ejecutar supabase/tests/duelo_phase1.sql: BEGIN/ROLLBACK, usa exclusivamente las cuentas existentes boba_test y jperaltar; cambios de sesiones/saldos son reversibles y no se imprimen secretos. No crea cuentas ni altera admins.

Prueba manual pendiente: dos dispositivos/cuentas, apuesta 50, listos, cuenta atrás, HUD, choque único, choques cercanos y empate, corte de red >10 s, abandono, reconexión, premio/devolución únicos y saldos tras recarga. Verificar también viajes solitarios, powerups y reintento de guardado.
