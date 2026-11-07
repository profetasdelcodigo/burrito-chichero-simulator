# Worker de salas Burrito Chichero

Este directorio contiene el primer backend real para salas pequeñas usando Cloudflare Workers + Durable Objects + WebSockets.

## Despliegue

Desde este directorio, con Wrangler autenticado en la cuenta correcta:

```bash
npx wrangler deploy
```

El endpoint esperado será `wss://<worker-domain>/ws?room=PIURA1`. Antes de cambiar el cliente a modo online hay que comprobar un handshake WebSocket real con dos clientes y confirmar que el participante número 11 recibe `room_full`.

El Worker no contiene claves de Supabase. La persistencia de perfiles y progreso se hace desde el cliente mediante la clave publishable y RLS; una futura versión puede mover esa escritura al Worker si se añade una autenticación de sala adecuada.

Hasta que el despliegue y la prueba de dos clientes terminen, `public/multiplayer/bootstrap.json` debe mantener `signalingUrl` vacío y la interfaz debe seguir mostrando modo local.
