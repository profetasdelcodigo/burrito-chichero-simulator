# Configuración cloud de Burrito Chichero

## Supabase

- Proyecto separado de `SIVEC`: `Burrito Chichero`
- Project ref: `llrnsmucwmhfopokdwsz`
- Región: `sa-east-1`
- URL: `https://llrnsmucwmhfopokdwsz.supabase.co`
- Coste confirmado: `$0/mes`
- Tablas con RLS: `burrito_profiles`, `burrito_campaign_progress`

El cliente usa sesión anónima cuando está habilitada en Supabase. Si el proveedor la rechaza o no hay variables públicas, la beta conserva el modo local y no inventa una sesión online.

## Cloudflare

- Worker: `burritochichero-room`
- Sala usada por la beta: `PIURA1`
- URL WebSocket: `wss://burritochichero-room.burritochichero.workers.dev/ws`
- Capacidad objetivo: 10 jugadores
- Secretos configurados en Cloudflare: `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY`

No se usa `service_role` en el cliente ni en el APK.

## Variables de build

Configura `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` y `VITE_ROOM_URL` antes de `pnpm build`. La clave publishable puede viajar en el cliente; una clave privada de base de datos nunca debe incluirse en el APK.
