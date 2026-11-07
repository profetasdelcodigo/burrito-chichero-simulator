# Configuración cloud de Burrito Chichero

## Supabase (configuración objetivo)

- Proyecto separado de `SIVEC`: `Burrito Chichero`
- Project ref: `llrnsmucwmhfopokdwsz`
- Región: `sa-east-1`
- URL: `https://llrnsmucwmhfopokdwsz.supabase.co`
- Coste confirmado: `$0/mes`
- Tablas con RLS: `burrito_profiles`, `burrito_campaign_progress`

El cliente usa sesión anónima cuando está habilitada en Supabase. Si el proveedor la rechaza o no hay variables públicas, la beta conserva el modo local y no inventa una sesión online.

## Cloudflare (configuración objetivo; pendiente de despliegue)

- Worker: `burritochichero-room`
- Sala usada por la beta: `PIURA1`
- URL WebSocket prevista: `wss://burritochichero-room.burritochichero.workers.dev/ws`
- Capacidad objetivo: 10 jugadores
- El Worker fuente está en `cloudflare/worker.mjs`; el despliegue todavía debe ejecutarse y verificarse.

No se usa `service_role` en el cliente ni en el APK.

## Variables de build

Configura `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` y `VITE_ROOM_URL` solo después de verificar el Worker con dos clientes. La clave publishable puede viajar en el cliente; una clave privada de base de datos nunca debe incluirse en el APK.
